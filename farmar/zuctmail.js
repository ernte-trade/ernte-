// ===== 📥 ZÚČTOVANIE ODBERATEĽA AUTOMATICKY Z GMAILU (príkaz majiteľa 1. 11. 17:37) =====
// Mário Jaczko (Agro-Somotor, m.jaczko@gmail.com) posiela Excel na erntespol@gmail.com. Skript v tom Google účte (Apps Script, každých 15 min)
// pošle prílohy .xls/.xlsx do databázy (zuct_inbox_put s tajným kľúčom – heslo Gmailu nikam neodchádza).
// Tu ich aplikácia majiteľa (Martin / Jana) sama prečíta (parseWB z odb.js) a nahrá do Zúčtovania odberateľa (buyer_import) – ako ručné nahratie Excelu.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER)&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST;
const MAIN=()=>OWN()&&typeof window.MAIN_OK==="function"&&window.MAIN_OK();
const Z={L:null,busy:false,at:0,key:null,show:false,last:null};
const hm=t=>{if(!t)return "";const d=new Date(t);return d.toLocaleDateString("sk-SK",{day:"numeric",month:"numeric"})+" "+d.toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"})};
const BUYER="Agro-Somotor s.r.o.";
async function list(){try{const r=await sb.rpc("zuct_inbox_list");Z.L=r.error?{err:r.error.message}:r.data}catch(x){Z.L={err:String(x)}}}
function b2a(b64){const s=atob(b64),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}
// 🧾 3. 11. príkaz majiteľa: súbor „Reklamácia“ (Rozhodnutie uznám / neuznám) = vyhodnotenie reklamácie, NIE zúčtovanie
// parser reklamácie odberateľa (Agro-Somotor „Reklamácia“ – Rozhodnutie uznám / neuznám)
function parseRek(X,wb){const out={},nz=s=>String(s==null?"":s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g," ").trim();
  const N=v=>{if(v==null||v==="")return null;if(typeof v==="number")return v;const n=parseFloat(String(v).replace(/\s/g,"").replace(",","."));return isFinite(n)?n:null};
  const TK=v=>{if(v==null)return null;let s=String(v).trim().toUpperCase();if(/^\d{3,6}$/.test(s))return "MB26/"+s.padStart(6,"0");return /^[A-Z]{1,4}\d*\/\d+$/.test(s)?s:null};
  let any=false;
  for(const sn of wb.SheetNames){const A=X.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:true,defval:null});let H=null;
    for(const r of A){const c=(r||[]).map(nz);
      if(c.includes("rozhodnutie")&&c.some(x=>/^c\.? ?vl/.test(x))){const f=(re,not)=>c.findIndex(x=>re.test(x)&&!(not&&not.test(x)));
        H={t:f(/^c\.? ?vl/),z:f(/^zuctovanie$/),n:f(/^necistoty ?%?$/),b:f(/^zlomky.*semena ?%?$/),s:f(/^susenie/),tot:f(/\+.*susenie/),d:c.indexOf("rozhodnutie"),
           g:f(/^hruba vaha/),kg:f(/^vaha kg/),p:f(/^jedn\.? ?cena/),v:f(/^hodnota/),pz:f(/^poznamka/)};any=true;continue}
      if(!H)continue;const t=TK(r[H.t]);if(!t)continue;const dec=nz(r[H.d]);if(!/uzn/.test(dec))continue;
      const z=N(r[H.z]),tot=N(r[H.tot]);if(z==null||tot==null)continue;
      out[t]={t,sheet:sn,ok:/^uzn/.test(dec),z:+z.toFixed(4),c:+tot.toFixed(4),n:N(r[H.n]),b:N(r[H.b]),s:N(r[H.s]),g:N(r[H.g]),p:N(r[H.p]),
        why:(H.d+1<r.length&&typeof r[H.d+1]==="string"&&r[H.d+1].trim())||(H.pz>=0&&typeof r[H.pz]==="string"&&r[H.pz].trim()!=="-"?r[H.pz].trim():null)||null}}}
  return any?Object.values(out):null}
window.odbParseRek=parseRek;
// spracuje všetky čakajúce súbory (prevzatie v databáze → nikdy dvakrát)
async function run(){if(!OWN()||Z.busy||typeof sb==="undefined"||!sb)return;Z.busy=true;let any=false;
  try{for(let i=0;i<10;i++){const c=await sb.rpc("zuct_inbox_claim");if(c.error||!c.data)break;const it=c.data;any=true;let res={},st="hotovo";
      try{if(!window.odbParseWB)throw new Error("modul Zúčtovanie odberateľa sa nenačítal");const X=await fcXlsxLib();const wb=X.read(b2a(it.b64),{type:"array",cellDates:false});const RK=parseRek(X,wb);
        if(RK){const q=await sb.rpc("buyer_claims_put",{p_inbox:it.id,p_rows:RK});if(q.error)throw new Error(q.error.message);st="reklamacia";res=q.data||{reklamacia:true};
          if(typeof toast==="function")toast(`🧾 Reklamácia – vyhodnotenie od odberateľa (${it.fname}): uznané ${res.uznane||0}, neuznané ${res.neuznane||0}. Uznané zrážky sú prepočítané v Zúčtovaní farmára.`,10000)}
        else{const P=window.odbParseWB(X,wb);
        if(!P.rows.length){st="preskoc";res={info:"v súbore nie sú vážne lístky"}}
        else{const tot={nove:0,aktualizovane:0,nerozdelene:0};let r,au={};
          for(let j=0;j<P.rows.length;j+=200){r=await sb.rpc("buyer_import",{rows:P.rows.slice(j,j+200),p_buyer:BUYER});if(r.error)throw new Error(r.error.message);for(const k in tot)tot[k]+=+r.data[k]||0;au=(r.data&&r.data.auto)||au}
          const ds=P.rows.map(x=>x.d).sort();res={listky:P.rows.length,nove:tot.nove,aktualizovane:tot.aktualizovane,pridelene:au.pridelene||0,navrhy:au.navrhy||0,zostava:au.zostava!=null?au.zostava:tot.nerozdelene,od:ds[0],do:ds[ds.length-1],nezname:P.bad.slice(0,20)}}}}
      catch(x){st="chyba";res={err:String(x&&x.message||x).slice(0,300)}}
      await sb.rpc("zuct_inbox_done",{p_id:it.id,p_status:st,p_result:res});
      if(st==="hotovo"&&typeof toast==="function")toast(`📥 Zúčtovanie z Gmailu nahraté (${it.fname}): ${res.nove} nových, ${res.aktualizovane} aktualizovaných lístkov, pridelené samo ${res.pridelene}, nerozdelené ${res.zostava}.`,10000)}}
  catch(x){}
  Z.busy=false;Z.at=Date.now();await list();if(any){try{window.zdashReload&&zdashReload()}catch(x){}}if(typeof TAB!=="undefined"&&TAB==="zuct"&&typeof renderStaff==="function"&&!(window.formBusy&&formBusy()))renderStaff()}
window.zuctMailRun=run;
// skript pre Google účet erntespol@gmail.com (kľúč doplnený)
function script(k,acct){const C=window.ERNTE_CONFIG||{};return `// ERNTE – zúčtovanie od Agro-Somotora z Gmailu do aplikácie (každých 15 min) + odosielanie e-mailov z aplikácie cez tento Gmail (každých 5 min)
// 1) Vlož celý tento text, ulož (Ctrl+S). 2) Hore vyber funkciu "setup" a klikni ▶ Spustiť. 3) Povoľ prístup k Gmailu (Rozšírené → Prejsť na projekt).
const URL='${C.SUPABASE_URL||"https://cflliscddsgleyeykzje.supabase.co"}/rest/v1/rpc/';
const AK='${C.SUPABASE_KEY||""}';
const KEY='${k}';
const ACCT='${acct||"erntespol@gmail.com"}';
const Q='has:attachment newer_than:60d (from:m.jaczko@gmail.com OR from:agrosomotor.sk OR from:vojkafarm.sk)';
function setup(){ScriptApp.getProjectTriggers().forEach(function(t){ScriptApp.deleteTrigger(t)});ScriptApp.newTrigger('run').timeBased().everyMinutes(15).create();ScriptApp.newTrigger('posta').timeBased().everyMinutes(5).create();run();posta();}
// 📧 e-maily z aplikácie (ponuky, zmluvy, zúčtovania) odošle tento Gmail – bez hesla aplikácie
function posta(){var me=ACCT;try{me=Session.getEffectiveUser().getEmail()||ACCT}catch(e){}var r=rpc('gmail_take',{p_key:KEY,p_acct:me}),x={};try{x=JSON.parse(r.getContentText())}catch(e){return}
  (x.jobs||[]).forEach(function(j){try{var o={name:j.from_name||'ERNTE spol. s r.o.'};if(j.reply_to&&/@/.test(j.reply_to))o.replyTo=j.reply_to;
    if(j.att){o.attachments=[Utilities.newBlob(Utilities.base64Decode(String(j.att).replace(/^data:[^,]+,/,'')),'application/pdf',j.att_name||'Dokument.pdf')]}
    GmailApp.sendEmail(j.to,j.subject||'ERNTE',j.body||'',o);rpc('mail_job_done',{p_id:j.id,p_ok:true,p_err:null});}
  catch(e){rpc('mail_job_done',{p_id:j.id,p_ok:false,p_err:'Gmail: '+String(e).slice(0,250)})}});}
function rpc(f,b){return UrlFetchApp.fetch(URL+f,{method:'post',contentType:'application/json',headers:{apikey:AK,Authorization:'Bearer '+AK},payload:JSON.stringify(b),muteHttpExceptions:true});}
function run(){var P=PropertiesService.getScriptProperties(),done=JSON.parse(P.getProperty('done')||'{}'),n=0,err='';
  try{GmailApp.search(Q,0,40).forEach(function(t){t.getMessages().forEach(function(m){var id=m.getId();if(done[id])return;var ok=true;
    m.getAttachments().forEach(function(a){var nm=a.getName();if(!/\\.xls[xm]?$/i.test(nm))return;
      var r=rpc('zuct_inbox_put',{p_key:KEY,p_msgid:id,p_from:m.getFrom(),p_subject:m.getSubject(),p_date:m.getDate().toISOString(),p_name:nm,p_b64:Utilities.base64Encode(a.getBytes())});
      var x=r.getContentText();if(r.getResponseCode()>=300||/zly kluc|limit/.test(x)){ok=false;err=x.slice(0,200)}else if(/ok/.test(x))n++;});
    if(ok)done[id]=Date.now();});});}catch(e){err=String(e).slice(0,200)}
  var k=Object.keys(done);if(k.length>500)k.sort(function(a,b){return done[a]-done[b]}).slice(0,k.length-500).forEach(function(x){delete done[x]});
  P.setProperty('done',JSON.stringify(done));try{fotky()}catch(e){}rpc('zuct_inbox_ping',{p_key:KEY,p_n:n,p_err:err||null});}
// 📷 fotodokumentácia k reklamácii (jpg/png/heic/webp, PDF iba v e-mailoch o reklamácii) – priloží sa k lístkom v zúčtovaní
function fotky(){var P=PropertiesService.getScriptProperties(),done=JSON.parse(P.getProperty('donef')||'{}');
  GmailApp.search(Q.replace('newer_than:60d','newer_than:21d'),0,30).forEach(function(t){t.getMessages().forEach(function(m){var id=m.getId();if(done[id])return;var ok=true,rk=/reklam|foto/i.test(m.getSubject()||'');
    m.getAttachments().forEach(function(a){var nm=a.getName()||'foto.jpg';if(!(/\\.(jpe?g|png|heic|heif|webp)$/i.test(nm)||(rk&&/\\.pdf$/i.test(nm))))return;if(a.getSize()>9000000)return;
      var r=rpc('zuct_inbox_put',{p_key:KEY,p_msgid:id,p_from:m.getFrom(),p_subject:m.getSubject(),p_date:m.getDate().toISOString(),p_name:nm,p_b64:Utilities.base64Encode(a.getBytes())});
      if(r.getResponseCode()>=300||/zly kluc|limit/.test(r.getContentText()))ok=false;});
    if(ok)done[id]=Date.now();});});
  var k=Object.keys(done);if(k.length>500)k.sort(function(a,b){return done[a]-done[b]}).slice(0,k.length-500).forEach(function(x){delete done[x]});P.setProperty('donef',JSON.stringify(done));}
`}
window.zuctMailHTML=function(){if(!OWN())return "";if(!Z.L){if(!Z.busy)list().then(()=>{if(typeof renderStaff==="function"&&TAB==="zuct")renderStaff()});return `<div class="card zmc"><b>📥 Automaticky z Gmailu</b><div class="s">Načítavam…</div></div>`}
  const L=Z.L;if(L.err)return `<div class="card zmc"><b>📥 Automaticky z Gmailu</b><div class="s">${/zuct_inbox/.test(L.err)?"Zapne sa po aktualizácii databázy (pár minút).":E(L.err)}</div></div>`;
  const p=L.ping,live=p&&p.seen&&Date.now()-Date.parse(p.seen)<75*60e3,I=L.items||[];
  const st={nove:"⏳ čaká",import:"⏳ nahrávam",hotovo:"✅ zúčtovanie",chyba:"⚠️ chyba",preskoc:"↷ bez lístkov",reklamacia:"🧾 reklamácia",foto:"📷 foto"};
  return `<div class="card zmc"><div class="zmh"><b>📥 Automaticky z Gmailu</b><span class="pill ${live?"":"w"}">${live?"🟢 pripojené":p?"🟠 skript nebeží":"⚪ nepripojené"}</span></div>
   <div class="s">Excel so zúčtovaním od <b>Mária Jaczka</b> (m.jaczko@gmail.com, Agro-Somotor) na <b>erntespol@gmail.com</b> sa stiahne sám každých 15 minút a aplikácia ho nahrá sem – lístky sa aktualizujú, pridelenie farmárom ostane, nové sa skúsia prideliť samy. Príde upozornenie do mobilu.${p&&p.seen?` Gmail naposledy skontrolovaný ${hm(p.seen)}.`:""}${p&&p.err?` <b class="zme">${E(p.err)}</b>`:""}</div>
   ${I.length?`<div class="zml">${I.slice(0,6).map(x=>`<div><span>${st[x.status]||E(x.status)}</span><b>${E(x.fname)}</b><small>${hm(x.received||x.at)}${x.result&&x.result.listky&&!x.result.reklamacia?` · ${x.result.listky} lístkov · ${x.result.nove} nových · nerozdelené ${x.result.zostava}`:""}${x.result&&x.result.err?` · ${E(x.result.err)}`:""}${x.result&&x.result.info?` · ${E(x.result.info)}`:""}${x.result&&x.result.reklamacia&&x.result.listky?` · vyhodnotenie reklamácie: uznané ${x.result.uznane}, neuznané ${x.result.neuznane} → prepočítané v Zúčtovaní farmára`:""}${x.foto?` · 📷 ${x.foto} ${x.foto===1?"fotka":x.foto<5?"fotky":"fotiek"}`:""}</small></div>`).join("")}</div>`:""}
   <div class="btns">${MAIN()?`<button type="button" class="${p?"":"lime"}" data-zmset>${p?"⚙️ Nastavenie Gmailu":"🔗 Pripojiť Gmail erntespol@gmail.com"}</button>`:""}<button type="button" data-zmrun>↻ Skontrolovať teraz</button></div>
   ${Z.show&&Z.key?setupHTML():""}</div>`};
function setupHTML(){return `<div class="zms"><b>Jednorazové pripojenie (3 minúty, v počítači alebo v prehliadači mobilu)</b><ol>
   <li>Prihlás sa do Google ako <b>erntespol@gmail.com</b> a otvor <a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener">script.google.com → Nový projekt</a>.</li>
   <li>Zmaž, čo tam je, a vlož celý skript nižšie (tlačidlo 📋 Kopírovať skript). Ulož (💾).</li>
   <li>Hore vyber funkciu <b>setup</b> a klikni <b>▶ Spustiť</b>. Google sa spýta na povolenie: Skontrolovať povolenia → účet erntespol → <i>Rozšírené</i> → <i>Prejsť na projekt (nebezpečné)</i> → Povoliť. (Skript je tvoj – číta iba maily od Jaczka / Agro-Somotora s prílohou Excel.)</li>
   <li>Hotovo – tu sa ukáže 🟢 pripojené a stiahnu sa aj zúčtovania za posledných 60 dní.</li></ol>
   <div class="btns"><button type="button" class="lime" data-zmcopy>📋 Kopírovať skript</button><button type="button" data-zmnew>🔑 Nový kľúč</button></div>
   <textarea class="zmt" readonly data-nocut rows="6">${E(script(Z.key))}</textarea><div class="s">Kľúč v skripte otvára iba vkladanie súborov zúčtovania, nič nečíta. Ak by unikol, daj 🔑 Nový kľúč a skript vlož znova.</div></div>`}
document.addEventListener("click",async e=>{const b=e.target.closest&&e.target.closest("[data-zmset],[data-zmrun],[data-zmcopy],[data-zmnew]");if(!b||!OWN())return;e.preventDefault();
  if(b.dataset.zmrun!==undefined){if(typeof busy==="function")busy(b,true);await run();if(typeof busy==="function")busy(b,false);if(typeof toast==="function")toast("Skontrolované.",2500);return}
  if(!MAIN())return;
  if(b.dataset.zmset!==undefined||b.dataset.zmnew!==undefined){if(b.dataset.zmnew!==undefined&&!confirm("Vytvoriť nový kľúč? Starý skript prestane fungovať – musíš doň vložiť nový."))return;
    const r=await sb.rpc("zuct_inbox_key",{p_new:b.dataset.zmnew!==undefined});if(r.error){toast("Nepodarilo sa: "+r.error.message,6000);return}Z.key=r.data;Z.show=b.dataset.zmset!==undefined?!Z.show||b.dataset.zmnew!==undefined:true;renderStaff();return}
  if(b.dataset.zmcopy!==undefined){const t=script(Z.key,b.dataset.gscopy||"erntespol@gmail.com");try{await navigator.clipboard.writeText(t);toast("📋 Skript pre "+(b.dataset.gscopy||"erntespol@gmail.com")+" skopírovaný – vlož ho na script.google.com.",5000)}catch(x){const a=document.querySelector(".zmt");if(a){a.focus();a.select()}toast("Označ text v okne a skopíruj ho.",4000)}}},true);
// 🔗 priamy odkaz …/farmar/#gmail-skript – okno so skriptom a postupom (iba Martin)
async function gsOpen(){if(!MAIN()||document.getElementById("gsOv"))return;let k=Z.key;if(!k){const r=await sb.rpc("zuct_inbox_key",{p_new:false});if(r.error){toast("Nepodarilo sa: "+r.error.message,6000);return}k=Z.key=r.data}
  const d=document.createElement("div");d.id="gsOv";d.className="gsov";d.innerHTML=`<div class="gsbox"><div class="zmh"><b>📧 Gmail – posielanie e-mailov bez hesla</b><button type="button" class="gsx" data-gsx>✕</button></div>
   <ol><li>Ťukni <b>📋 Kopírovať skript</b> (nižšie).</li>
   <li>Otvor <a href="https://script.google.com/home" target="_blank" rel="noopener">script.google.com</a> (účet <b>erntespol@gmail.com</b>) → projekt <b>„Projekt bez mena“</b> → súbor <b>Kód.gs</b>.</li>
   <li>Označ v ňom <b>všetko</b> (podrž prst → Vybrať všetko) a <b>zmaž</b>. Vlož skopírovaný skript. Ulož 💾.</li>
   <li>Hore v zozname funkcií vyber <b>setup</b> → <b>▶ Spustiť</b>.</li>
   <li>Google sa spýta na povolenie: <b>Skontrolovať povolenia</b> → erntespol → <b>Rozšírené</b> → <b>Prejsť na projekt</b> → <b>Povoliť</b> (teraz aj „Odosielať e-maily“).</li>
   <li>Hotovo – e-maily z aplikácie idú z Gmailu do 5 minút, neodoslané ponuky sa pošlú samy. Zmluvy a zúčtovania pôjdu z <b>erntevykup@gmail.com</b>, keď ten istý skript vložíš aj tam (nový projekt v tom účte, kroky 2–5); dovtedy idú z erntespol.</li></ol>
   <div class="btns"><button type="button" class="lime" data-gscopy="erntespol@gmail.com">📋 Skript pre erntespol (ponuky)</button><button type="button" class="lime" data-gscopy="erntevykup@gmail.com">📋 Skript pre erntevykup (zmluvy, zúčtovania)</button></div><div class="s">Každý skript vlož do svojho Google účtu – nič v ňom netreba meniť.</div>
   <textarea class="zmt" readonly data-nocut rows="5">${E(script(k))}</textarea></div>`;document.body.appendChild(d)}
document.addEventListener("click",async e=>{const b=e.target.closest&&e.target.closest("[data-gsx],[data-gscopy]");if(!b)return;e.preventDefault();
  if(b.dataset.gsx!==undefined){const o=document.getElementById("gsOv");o&&o.remove();if(location.hash==="#gmail-skript")history.replaceState(null,"",location.pathname+location.search);return}
  const t=script(Z.key,b.dataset.gscopy||"erntespol@gmail.com");try{await navigator.clipboard.writeText(t);toast("📋 Skript pre "+(b.dataset.gscopy||"erntespol@gmail.com")+" skopírovaný – vlož ho na script.google.com.",5000)}catch(x){const a=document.querySelector("#gsOv .zmt");if(a){a.focus();a.select()}toast("Označ text v okne a skopíruj ho.",4000)}},true);
{const gs=setInterval(()=>{if(location.hash!=="#gmail-skript"){return}if(MAIN()&&typeof sb!=="undefined"&&sb){clearInterval(gs);gsOpen()}},1500);setTimeout(()=>clearInterval(gs),5*60e3);
 window.addEventListener("hashchange",()=>{if(location.hash==="#gmail-skript")gsOpen()})}
window.gmailSkript=gsOpen;
// automaticky: po štarte, každých 5 min a pri návrate do aplikácie (iba majiteľ – Martin alebo Jana)
const st=setInterval(()=>{if(OWN()&&typeof sb!=="undefined"&&sb&&typeof STATE!=="undefined"&&STATE.deals){clearInterval(st);setTimeout(run,6000);setInterval(()=>{if(!document.hidden)run()},5*60e3);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&Date.now()-Z.at>60e3)run()})}},2000);setTimeout(()=>clearInterval(st),10*60e3);
{const s=document.createElement("style");s.textContent=`.zmc{display:grid;gap:8px}.zmh{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.zme{color:#fca5a5}
.zml{display:grid;gap:4px}.zml>div{display:grid;grid-template-columns:auto 1fr;gap:2px 8px;padding:6px 10px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);font-size:.82rem}.zml b{overflow-wrap:anywhere}.zml small{grid-column:1/-1;opacity:.7}
.zms{display:grid;gap:8px;padding:10px 12px;border-radius:14px;border:1px solid rgba(182,255,59,.4);background:rgba(182,255,59,.06)}.zms ol{margin:0;padding-left:20px;display:grid;gap:6px;font-size:.86rem;line-height:1.45}.zms a{color:#a5f3fc}
.gsov{position:fixed;inset:0;z-index:9990;background:rgba(0,0,0,.6);display:flex;align-items:flex-start;justify-content:center;padding:max(12px,env(safe-area-inset-top)) 10px 12px;overflow:auto}.gsbox{width:min(560px,100%);display:grid;gap:10px;padding:14px;border-radius:18px;background:#0f1a14;border:1px solid rgba(182,255,59,.4)}.gsbox ol{margin:0;padding-left:20px;display:grid;gap:7px;font-size:.88rem;line-height:1.45}.gsbox a{color:#a5f3fc}.gsx{width:38px;height:38px;border-radius:50%;padding:0;flex:none}
.zmt{width:100%;min-height:120px;font:12px/1.4 ui-monospace,Menlo,monospace!important;white-space:pre;overflow:auto;resize:vertical}`;document.head.appendChild(s)}
})();
