// ===== ZÚČTOVANIE ODBERATEĽA (iba majiteľ) =====
// Excel od odberateľa (Agro-Somotor…) má všetky lístky na ERNTE. Tu ho nahráš do aplikácie a lístky rozdelíš farmárom
// (aj novým zákazníkom). Pridelené lístky sa hneď zarátajú do zmlúv farmára a do Zúčtovania farmára.
(function(){
const O={q:"",LA:null,ed:null,M:null,imp:null,L:null,busy:false,d0:"",d1:"",only:"nerozd",com:"",plate:"",sel:new Set(),fq:"",nf:false,buyer:""};
try{O.buyer=localStorage.getItem("ernte-odb-buyer")||"Agro-Somotor s.r.o."}catch(x){O.buyer="Agro-Somotor s.r.o."}
const iso=d=>d.toISOString().slice(0,10);
if(!O.d0){const t=new Date();O.d1=iso(t);t.setDate(t.getDate()-21);O.d0=iso(t)}
const nz=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();
function comOf(n){n=nz(n);if(/soj|szoja/.test(n))return "soja";if(/psen|buza/.test(n))return /krm/.test(n)?"psenica_k":"psenica_p";if(/kukur|kukor/.test(n))return "kukurica";
  if(/rep|repce/.test(n))return "repka";if(/jacm|arpa/.test(n))return /slad/.test(n)?"jacmen_s":"jacmen_k";if(/slnec|napra/.test(n))return "lo";if(/cirok/.test(n))return "cirok";return null}
function xDate(v){if(v instanceof Date&&!isNaN(v))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,"0")}-${String(v.getDate()).padStart(2,"0")}`;
  if(typeof v==="number"&&v>40000&&v<60000)return new Date(Date.UTC(1899,11,30)+v*864e5).toISOString().slice(0,10);
  const m=String(v||"").match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);if(m)return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;const m2=String(v||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return m2?m2[0]:null}
const N=v=>{if(v==null||v==="")return null;const x=typeof v==="number"?v:num(String(v).replace(/\s/g,""));return isFinite(x)?x:null};
// čítanie Excelu odberateľa: hárky po komoditách, sekcia tovaru + sekcia Sušenie (body vlhkosti, kg)
function parseWB(X,wb){const rows=[],dry={},bad=[];
  for(const sn of wb.SheetNames){const A=X.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:true,defval:null});let mode=null,sec=sn,cu=null;
    for(const r0 of A){const r=(r0||[]).concat(Array(12).fill(null));const tk=typeof r[1]==="string"?r[1].trim():"";const d=xDate(r[0]);
      if(d&&/^[A-Z]{1,4}\d*\/?\d+/.test(tk)){
        if(mode==="dry"){dry[tk]={dp:N(r[5]),dk:N(r[7])};continue}
        const k=comOf(r[2]||sec)||comOf(sn);if(!k){bad.push(tk);continue}
        const pr=N(r[8]);rows.push({t:tk,d,k,p:String(r[3]||"").replace(/\s/g,"")||null,g:N(r[4]),i:N(r[5])!=null?Math.round(N(r[5])*100)/100:null,n:N(r[7]),
          s:pr==null?null:pr<5?Math.round(pr*100000)/100:pr,v:N(r[9]),o:String(r[10]||"").replace(/_x000D_|\r|\n/g," ").trim()||null,cu});continue}
      if(typeof r[0]==="string"&&typeof r[1]==="string"&&r.slice(2,11).every(v=>v==null||v==="")){
        if(/^[A-Z]{2}\d{3,}$/.test(r[0].trim())){cu=r[1].trim();continue}
        if(/su[sš]en|sz[aá]r[ií]t/i.test(r[1]))mode="dry";else{mode="goods";sec=r[1]}}}}
  for(const x of rows){const q=dry[x.t];if(q){x.dp=q.dp;x.dk=q.dk}}
  return {rows,bad}}
async function readFile(f){const X=await fcXlsxLib();const wb=X.read(await f.arrayBuffer(),{type:"array",cellDates:false});return parseWB(X,wb)}
const sumBy=(L,f)=>L.reduce((s,x)=>s+(+f(x)||0),0);
function impHTML(){const I=O.imp;
  let h=`<div class="card f"><h2 class="w odh">1️⃣ Nahrať Excel od odberateľa</h2>
   <label>Odberateľ<input id="odBuyer" value="${esc(O.buyer)}" list="odBuyers"></label><datalist id="odBuyers"><option value="Agro-Somotor s.r.o."></datalist>
   <label class="btn pri" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;min-height:44px">📂 Vybrať Excel (.xlsx)<input type="file" id="odFile" accept=".xlsx,.xls,.xlsm" hidden></label>
   <div class="w s">Zúčtovanie odberateľa (hárky Sója, Pšenica, Kukurica…): vážny lístok, ŠPZ, hrubá váha, nečistoty, čistá váha, cena, hodnota a sušenie. Lístky, ktoré už v aplikácii sú, sa len aktualizujú a <b>pridelenie farmárovi ostane</b>.</div></div>`;
  if(!I)return h;
  if(I.err)return h+`<div class="card"><div class="s">⚠️ ${esc(I.err)}</div></div>`;
  const by={};for(const x of I.rows)(by[x.k]=by[x.k]||[]).push(x);
  h+=`<div class="card"><b>${esc(I.name)} · ${I.rows.length} lístkov · ${fmt(sumBy(I.rows,x=>x.v),2)} €</b>${I.bad.length?`<div class="s">⚠️ Neznámy tovar pri lístkoch: ${esc(I.bad.join(", "))}</div>`:""}
   <div class="hrt"><table><thead><tr><th>Komodita</th><th>Lístky</th><th>Hrubá t</th><th>Čistá t</th><th>Sušenie kg</th><th>€/t</th><th>Hodnota €</th></tr></thead><tbody>${Object.entries(by).map(([k,L])=>`<tr><td><b>${esc(comName(k))}</b></td><td>${L.length}</td><td>${fmt(sumBy(L,x=>x.g)/1000,3)}</td><td>${fmt(sumBy(L,x=>x.n)/1000,3)}</td><td>${fmt(sumBy(L,x=>x.dk),0)}</td><td>${[...new Set(L.map(x=>x.s))].map(v=>fmt(v,2)).join(", ")}</td><td>${fmt(sumBy(L,x=>x.v),2)}</td></tr>`).join("")}</tbody></table></div>
   <div class="btns"><button type="button" class="pri" data-odsave="1">💾 Uložiť ${I.rows.length} lístkov do aplikácie</button><button type="button" data-odx="1">Zrušiť</button></div></div>`;
  return h}
function load(){if(O.busy)return;O.busy=true;sb.rpc("buyer_tickets",{d0:O.d0||null,d1:O.d1||null}).then(r=>{O.busy=false;O.L=r.error?{err:/does not exist|could not find/i.test(r.error.message)?"Zapne sa po aktualizácii databázy (pár minút).":r.error.message}:r.data||[];renderStaff()})}
function loadAll(){if(O.busyA)return;O.busyA=true;sb.rpc("buyer_tickets",{d0:null,d1:null}).then(r=>{O.busyA=false;O.LA=r.error?{err:r.error.message}:r.data||[];renderStaff()})}
const qn=s=>nz(s).replace(/[\s\/.-]+/g,"");
function hit(x,q){const w=nz(q).split(/\s+/).filter(Boolean);const hay=nz([x.t,x.fn,x.afn,x.p,x.dn,x.cu,x.b,x.o,comName(x.k),dSK(x.d)].join(" ")),hc=qn(hay);return w.every(t=>hay.includes(t)||hc.includes(qn(t)))}
function view(){if(O.q.trim()){const L=Array.isArray(O.LA)?O.LA:[];return L.filter(x=>hit(x,O.q)).slice(0,100)}const L=Array.isArray(O.L)?O.L:[];return L.filter(x=>(O.only==="all"||(O.only==="nerozd"?!x.f:O.only==="auto"?x.f&&x.by==="auto":!!x.f))&&(!O.com||x.k===O.com)&&(!O.plate||x.p===O.plate))}
function listHTML(){let h=`<div class="card f"><h2 class="w odh">2️⃣ Rozdeliť lístky farmárom</h2>
   <label>Od<input type="date" id="odD0" value="${esc(O.d0)}"></label><label>Do<input type="date" id="odD1" value="${esc(O.d1)}"></label>`;
  if(O.L===null){load();return h+`<div class="w s">Načítavam lístky…</div></div>`}
  if(O.L.err)return h+`<div class="w s">${esc(O.L.err)}</div></div>`;
  const A=O.L,nr=A.filter(x=>!x.f),V=view(),coms=[...new Set(A.map(x=>x.k))],plates=[...new Set(A.filter(x=>!O.com||x.k===O.com).map(x=>x.p).filter(Boolean))].sort();
  h+=`<div class="w btns seg2">${[["nerozd",`Nerozdelené (${nr.length})`],["auto",`🤖 Samé (${A.filter(x=>x.f&&x.by==="auto").length})`],["rozd",`Pridelené (${A.length-nr.length})`],["all",`Všetky (${A.length})`]].map(k=>`<button type="button" data-odonly="${k[0]}" aria-pressed="${O.only===k[0]}">${k[1]}</button>`).join("")}</div>
   <div class="w s">Nerozdelené: <b>${nr.length} lístkov · ${fmt(sumBy(nr,x=>x.g)/1000,3)} t hrubá · ${fmt(sumBy(nr,x=>x.v),2)} €</b></div>
   <label>Komodita<select id="odCom"><option value="">všetky</option>${coms.map(k=>`<option value="${esc(k)}"${O.com===k?" selected":""}>${esc(comName(k))}</option>`).join("")}</select></label>
   <label>ŠPZ<select id="odPlate"><option value="">všetky</option>${plates.map(k=>`<option value="${esc(k)}"${O.plate===k?" selected":""}>${esc(k)}</option>`).join("")}</select></label></div>`;
  const M=O.M,sug=V.filter(x=>!x.f&&x.af),aut=V.filter(x=>x.f&&x.by==="auto");if(M===null){O.M=0;sb.rpc("odb_model").then(r=>{O.M=r.error?{}:r.data||{};renderStaff()})}
  h+=`<div class="card odai"><b>🤖 Automatické rozdelenie</b><div class="s">Aplikácia hľadá farmára sama: <b>jazda VALKO</b> naplánovaná farmárovi (ŠPZ + deň) · <b>GPS miesto nakládky</b> auta pred príchodom k odberateľovi · <b>vlastné auto farmára</b> · jediná otvorená zmluva. Isté prideľuje sama (🤖), ostatné navrhne. Každé tvoje pridelenie ju naučí, kde farmár nakladá.${M&&M.spots!=null?`<br>Model pozná <b>${M.spots}</b> miest nakládky (${M.farmers} farmárov) · GPS nakládka pri ${M.gps} lístkoch${M.buyer_places?"":" · ⚠️ vo Flotile → Miesta chýba miesto typu Odberateľ – pridaj Agro-Somotor, presnosť stúpne"}.`:""}</div>
   <div class="btns"><button type="button" data-odauto="1">🤖 Spustiť automatiku</button>${sug.length?`<button type="button" class="pri" data-odconf="1">✓ Potvrdiť návrhy (${sug.length})</button>`:""}${aut.length?`<button type="button" data-odok="1">👍 Potvrdiť samé (${aut.length})</button>`:""}</div></div>`;
  // výber farmára + pridelenie
  const sel=[...O.sel].filter(t=>A.some(x=>x.t===t)),SL=A.filter(x=>O.sel.has(x.t));
  h+=`<div class="card f odbar"><label class="w">Farmár / zákazník<input id="odFq" list="odFarms" value="${esc(O.fq)}" placeholder="začni písať meno…" autocomplete="off"></label>
   <datalist id="odFarms">${(STATE.farmers||[]).map(f=>`<option value="${esc(f.name)}">`).join("")}</datalist>
   <div class="w s">Označené: <b>${sel.length} lístkov · ${fmt(sumBy(SL,x=>x.g)/1000,3)} t · ${fmt(sumBy(SL,x=>x.v),2)} €</b></div>
   <div class="w btns"><button type="button" class="pri" data-odasg="1"${sel.length?"":" disabled"}>✓ Prideliť farmárovi</button><button type="button" data-odall="1">☑️ Označiť zobrazené (${V.length})</button>${sel.length?`<button type="button" data-odnone="1">Zrušiť označenie</button><button type="button" data-odun="1">↩️ Zrušiť pridelenie</button>`:""}<button type="button" data-odnf="1">➕ Nový zákazník</button></div>
   ${O.nf?`<form id="fOdNf" class="w odnf"><b>➕ Nový zákazník (farmár)</b><label>Meno / firma *<input name="name" required value="${esc(O.fq)}"></label><label>IČO<input name="ico" inputmode="numeric"></label><label>Telefón<input name="phone" type="tel"></label><label>Adresa<input name="addr"></label>
     <div class="s">Ostatné údaje (DIČ, IBAN, e-mail, prihlásenie) doplníš neskôr v záložke Farmári.</div><div class="btns"><button type="submit" class="pri">💾 Uložiť zákazníka</button><button type="button" data-odnf="0">Zrušiť</button></div></form>`:""}</div>`;
  if(!V.length)return h+`<div class="card"><div class="s">${O.only==="nerozd"&&A.length?"✅ Všetky lístky v tomto období sú rozdelené.":"Žiadne lístky v tomto období. Nahraj Excel hore alebo zmeň dátumy."}</div></div>`;
  h+=rowsHTML(V);
  return h}
function rowsHTML(V){return `${V.map(x=>`<label class="odr${O.sel.has(x.t)?" on":""}"><input type="checkbox" data-odt="${esc(x.t)}"${O.sel.has(x.t)?" checked":""}>
     <span class="odm"><b>${esc(x.t)}</b> · ${esc(dSK(x.d))} · ${esc(comName(x.k))} · <span class="klp">${esc(x.p||"–")}</span><small>${fmt(x.g/1000,3)} t hrubá · nečist. ${fmt(x.i,1)} % · čistá ${fmt(x.n/1000,3)} t${x.m!=null?` · vlhkosť ${fmt(x.m,1)} %`:""}${x.dk?` · sušenie ${fmt(x.dk,0)} kg`:""}${x.pr!=null?` · bielk. ${fmt(x.pr,1)} %`:""}${x.ol!=null?` · olej ${fmt(x.ol,1)} %`:""}${O.q&&x.cu?` · ${esc(x.cu)}`:""}</small></span>
     <span class="odv"><b>${fmt(x.v,2)} €</b><button type="button" class="oded" data-oded="${esc(x.t)}" aria-label="Upraviť lístok">✏️ Upraviť</button>${x.ed?`<em class="odfx" title="${esc("Opravené "+new Date(x.ed).toLocaleString("sk-SK")+" · "+(x.eb||""))}">✎ opravené</em>`:""}${x.f?`<em class="odf">${x.by==="auto"?"🤖":"👨‍🌾"} ${esc(x.fn||"")}${x.dn?` · ${esc(x.dn)}`:" · bez zmluvy"}</em>`:`<em class="odf no">nerozdelené</em>`}</span>${!x.f&&x.af?`<span class="odsg ${x.as>=85?"hi":x.as>=60?"mid":"lo"}">🤖 návrh: <b>${esc(x.afn||"")}</b> · ${x.as} %<small>${esc(x.aw||"")}</small></span>`:!x.f&&x.aw?`<span class="odsg lo"><small>${esc(x.aw)}</small></span>`:x.by==="auto"&&x.aw?`<span class="odsg hi"><small>🤖 ${esc(x.aw)}</small></span>`:""}</label>${O.ed===x.t?edHTML(x):""}`).join("")}</div>`}
const nv=v=>v==null?"":String(v).replace(".",",");
const COMS=["soja","repka","kukurica","psenica_p","psenica_k","jacmen_k","jacmen_s","lo","cirok"];
function edHTML(x){const F=(k,l,v,a)=>`<label>${l}<input name="${k}" value="${esc(nv(v))}" ${a||'inputmode="decimal"'}></label>`;
  return `<form class="odedf" data-odedf="${esc(x.t)}"><b class="w">✏️ Oprava lístka ${esc(x.t)}${x.fn?` · ${esc(x.fn)}`:""}</b>
   <label>Dátum<input type="date" name="d" value="${esc(x.d||"")}" required></label>
   <label>Komodita<select name="k">${[...new Set(COMS.concat(x.k?[x.k]:[]))].map(k=>`<option value="${k}"${k===x.k?" selected":""}>${esc(comName(k))}</option>`).join("")}</select></label>
   ${F("p","ŠPZ",x.p,'autocapitalize="characters"')}${F("g","Hrubá váha kg",x.g)}${F("i","Nečistoty %",x.i)}${F("n","Čistá váha kg",x.n)}${F("m","Vlhkosť %",x.m)}${F("dk","Sušenie kg",x.dk)}${F("pr","Bielkoviny %",x.pr)}${F("ol","Olej %",x.ol)}${F("s","Cena €/t",x.s)}${F("v","Hodnota €",x.v)}
   ${F("cu","Zákazník u odberateľa",x.cu,'autocomplete="off"')}<label class="w">Poznámka<input name="o" value="${esc(x.o||"")}"></label>
   <div class="w s">Hodnota sa prepočíta sama z čistej váhy × ceny (dá sa prepísať). Po uložení sa prepočíta zmluva a zúčtovanie farmára; oprava sa zapíše do histórie a nové nahratie Excelu ju neprepíše.</div>
   ${(x.fx&&Object.keys(x.fx).length)?`<div class="w s">✎ Už opravené: ${esc(Object.keys(x.fx).join(", "))}${x.eb?" · "+esc(x.eb):""}</div>`:""}
   <div class="w btns"><button type="submit" class="pri">💾 Uložiť opravu</button><button type="button" data-oded="">Zrušiť</button></div></form>`}
function srchHTML(){let h=`<div class="card f odsc"><form id="fOdQ" class="w odq"><label>🔎 Hľadať lístok / zákazníka<input id="odQ" type="search" value="${esc(O.q)}" placeholder="č. lístka, farmár, ŠPZ, zmluva…" autocomplete="off" enterkeyhint="search"></label><button class="pri">Hľadať</button>${O.q?`<button type="button" data-odqx="1">✕ Zrušiť</button>`:""}</form>`;
  if(!O.q.trim())return h+`<div class="w s">Vo všetkých obdobiach · lístok potom ✏️ upravíš a uložíš opravu.</div></div>`;
  if(O.LA===null){loadAll();return h+`<div class="w s">Hľadám vo všetkých lístkoch…</div></div>`}if(O.LA.err)return h+`<div class="w s">${esc(O.LA.err)}</div></div>`;
  const V=view();return h+`<div class="w s">Nájdené: <b>${V.length}${V.length>=100?"+":""}</b> lístkov pre „${esc(O.q)}“${V.length?` · ${fmt(sumBy(V,x=>x.g)/1000,3)} t · ${fmt(sumBy(V,x=>x.v),2)} €`:""}</div></div>`+(V.length?rowsHTML(V):`<div class="card"><div class="s">Nič sa nenašlo. Skús časť čísla lístka (napr. 3698), meno alebo ŠPZ.</div></div>`)}
window.odbHTML=function(){if(ROLE!=="owner")return "";return srchHTML()+(O.q.trim()?"":impHTML()+listHTML())+`<div class="s">🔒 Vidíš iba ty. Farmár po pridelení vidí len svoje lístky a svoje zúčtovanie – nikdy odberateľa ani predajnú cenu.</div>`};
const farmId=n=>{const v=nz(n);const f=(STATE.farmers||[]).find(x=>nz(x.name)===v);return f?f.id:null};
async function assign(b,fid){const T=[...O.sel];if(!T.length)return;busy(b,true);const r=await sb.rpc("deliveries_assign",{p_tickets:T,p_farmer:fid});busy(b,false);
  if(r.error){toast("Chyba: "+r.error.message,7000);return}const d=r.data||{};O.sel.clear();O.L=null;window.zdashReload&&zdashReload();
  toast(fid?`✓ ${d.n} lístkov pridelených: ${d.farmer}.${d.bez_zmluvy?` ⚠️ ${d.bez_zmluvy} bez zmluvy – farmár nemá zmluvu na túto komoditu (pridaj ju v Obchodoch).`:" Zarátané do jeho zmlúv a zúčtovania."}`:`↩️ Pridelenie zrušené (${d.n} lístkov).`,8000);renderStaff()}
document.addEventListener("change",async e=>{const t=e.target;if(!t||ROLE!=="owner")return;
  if(t.id==="odFile"){const f=t.files&&t.files[0];if(!f)return;try{const r=await readFile(f);O.imp={name:f.name,rows:r.rows,bad:r.bad};if(!r.rows.length)O.imp.err="V súbore som nenašiel žiadne vážne lístky (stĺpce Dátum, Vážny lístok, Tovar, ŠPZ…)."}catch(x){O.imp={err:"Súbor sa nepodarilo prečítať: "+(x&&x.message||x)}}renderStaff();return}
  if(t.id==="odBuyer"){O.buyer=t.value.trim();try{localStorage.setItem("ernte-odb-buyer",O.buyer)}catch(x){}return}
  if(t.id==="odD0"||t.id==="odD1"){O[t.id==="odD0"?"d0":"d1"]=t.value;O.L=null;window.zdashReload&&zdashReload();renderStaff();return}
  if(t.id==="odCom"){O.com=t.value;O.plate="";renderStaff();return}
  if(t.id==="odPlate"){O.plate=t.value;renderStaff();return}
  if(t.id==="odFq"){O.fq=t.value;return}
  if(t.dataset&&t.dataset.odt!=null){t.checked?O.sel.add(t.dataset.odt):O.sel.delete(t.dataset.odt);renderStaff()}});
document.addEventListener("input",e=>{if(e.target&&e.target.id==="odFq")O.fq=e.target.value});
document.addEventListener("click",async e=>{const t=e.target;if(!t.closest||ROLE!=="owner")return;let x;
  if(x=t.closest("[data-odsave]")){const I=O.imp;if(!I||!I.rows)return;busy(x,true);let tot={nove:0,aktualizovane:0,nerozdelene:0},r;
    for(let i=0;i<I.rows.length;i+=200){r=await sb.rpc("buyer_import",{rows:I.rows.slice(i,i+200),p_buyer:O.buyer||null});if(r.error)break;for(const k in tot)tot[k]+=+r.data[k]||0}
    busy(x,false);if(r.error){toast("Chyba: "+r.error.message,8000);return}
    const ds=I.rows.map(x=>x.d).sort();O.d0=ds[0];O.d1=ds[ds.length-1];O.imp=null;O.L=null;window.zdashReload&&zdashReload();O.only="nerozd";
    const au=(r.data&&r.data.auto)||{};O.M=null;toast(`✓ ${tot.nove} nových, ${tot.aktualizovane} aktualizovaných lístkov. 🤖 Pridelené samo: ${au.pridelene||0}, návrhy: ${au.navrhy||0}, nerozdelené: ${au.zostava!=null?au.zostava:tot.nerozdelene}.`,9000);renderStaff();return}
  if(x=t.closest("[data-odauto]")){busy(x,true);const r=await sb.rpc("deliveries_auto",{p_apply:true});busy(x,false);if(r.error){toast("Chyba: "+r.error.message,7000);return}const d=r.data||{};O.L=null;window.zdashReload&&zdashReload();O.M=null;
    toast(`🤖 Pridelené samo: ${d.pridelene} · návrhy: ${d.navrhy} · GPS nájdené: ${d.gps} · nerozdelené: ${d.zostava}`,8000);renderStaff();return}
  if(x=t.closest("[data-odconf]")){const T=view().filter(v=>!v.f&&v.af).map(v=>v.t);if(!T.length)return;busy(x,true);const r=await sb.rpc("deliveries_confirm",{p_tickets:T});busy(x,false);if(r.error){toast("Chyba: "+r.error.message,7000);return}
    O.L=null;window.zdashReload&&zdashReload();O.M=null;toast(`✓ ${r.data.n} návrhov potvrdených a pridelených. Model sa z nich naučil.`,6000);renderStaff();return}
  if(x=t.closest("[data-odok]")){const T=view().filter(v=>v.f&&v.by==="auto").map(v=>v.t);busy(x,true);const r=await sb.rpc("deliveries_ok",{p_tickets:T});busy(x,false);if(r.error){toast("Chyba: "+r.error.message,7000);return}
    O.L=null;window.zdashReload&&zdashReload();O.M=null;toast(`👍 ${r.data} automatických pridelení potvrdených.`,5000);renderStaff();return}
  if(t.closest("[data-odx]")){O.imp=null;renderStaff();return}
  if(x=t.closest("[data-oded]")){e.preventDefault();e.stopPropagation();O.ed=x.dataset.oded||null;renderStaff();if(O.ed)setTimeout(()=>{const f=document.querySelector(".odedf");if(f)f.scrollIntoView({block:"nearest",behavior:"smooth"})},60);return}
  if(t.closest("[data-odqx]")){O.q="";O.ed=null;renderStaff();return}
  if(x=t.closest("[data-odonly]")){O.only=x.dataset.odonly;renderStaff();return}
  if(t.closest("[data-odall]")){view().forEach(v=>O.sel.add(v.t));renderStaff();return}
  if(t.closest("[data-odnone]")){O.sel.clear();renderStaff();return}
  if(x=t.closest("[data-odnf]")){O.nf=x.dataset.odnf!=="0";const i=document.getElementById("odFq");if(i)O.fq=i.value;renderStaff();return}
  if(x=t.closest("[data-odun]")){await assign(x,null);return}
  if(x=t.closest("[data-odasg]")){const i=document.getElementById("odFq");if(i)O.fq=i.value;const fid=farmId(O.fq);
    if(!fid){toast(O.fq?`„${O.fq}“ nie je medzi farmármi – vyber zo zoznamu alebo ťukni ➕ Nový zákazník.`:"Vyber farmára (začni písať meno).",6000);if(O.fq){O.nf=true;renderStaff()}return}
    await assign(x,fid);return}});
document.addEventListener("submit",async e=>{const f=e.target;if(!f||ROLE!=="owner")return;
  if(f.id==="fOdQ"){e.preventDefault();e.stopPropagation();const v=(document.getElementById("odQ")||{}).value||"";O.q=v.trim();O.ed=null;O.LA=null;renderStaff();return}
  if(!f.dataset||!f.dataset.odedf)return;e.preventDefault();e.stopPropagation();const t0=f.dataset.odedf,fd=new FormData(f),b=f.querySelector("button[type=submit]");
  const A=[].concat(Array.isArray(O.L)?O.L:[],Array.isArray(O.LA)?O.LA:[]),x=A.find(y=>y.t===t0)||{};const p={},NUM=["g","i","n","m","dk","pr","ol","s","v"],TXT=["d","k","p","cu","o"];
  for(const k of NUM){const raw=String(fd.get(k)||"").trim(),v=raw===""?null:num(raw.replace(/\s/g,""));if(raw!==""&&!isFinite(v)){toast("Neplatné číslo: "+k);return}const o=x[k]==null?null:+x[k];if((v==null?null:Math.round(v*1e4)/1e4)!==(o==null?null:Math.round(o*1e4)/1e4))p[k]=v}
  for(const k of TXT){let v=String(fd.get(k)||"").trim();if(k==="p")v=v.toUpperCase().replace(/\s/g,"");if(v!==String(x[k]==null?"":k==="d"?String(x[k]).slice(0,10):x[k]))p[k]=v||null}
  if(p.d===null){toast("Dátum je povinný.");return}
  if(!Object.keys(p).length){toast("Nič sa nezmenilo.");return}
  busy(b,true);const r=await sb.rpc("buyer_ticket_edit",{p_ticket:t0,p});busy(b,false);
  if(r.error){toast("Chyba: "+(/could not find|does not exist/i.test(r.error.message)?"Úprava sa zapne po aktualizácii databázy (pár minút).":r.error.message),8000);return}
  O.ed=null;O.L=null;O.LA=null;window.zdashReload&&zdashReload();toast(`✓ Lístok ${t0} opravený (${Object.keys(p).length} ${Object.keys(p).length===1?"údaj":"údaje"}). Zúčtovanie farmára prepočítané.`,6000);renderStaff()},true);
document.addEventListener("input",e=>{const f=e.target&&e.target.closest&&e.target.closest(".odedf");if(!f||!/^(n|s)$/.test(e.target.name))return;const n=num(String(f.n.value).replace(/\s/g,"")),s=num(String(f.s.value).replace(/\s/g,""));if(isFinite(n)&&isFinite(s)&&f.v)f.v.value=String(Math.round(n*s/10)/100).replace(".",",")});
document.addEventListener("submit",async e=>{if(!e.target||e.target.id!=="fOdNf")return;e.preventDefault();e.stopPropagation();const f=e.target,fd=new FormData(f),b=f.querySelector("button[type=submit]");
  const row={name:String(fd.get("name")||"").trim(),active:true};for(const k of ["ico","phone","addr"]){const v=String(fd.get(k)||"").trim();if(v)row[k]=v}
  if(row.name.length<3){toast("Napíš meno alebo názov firmy.");return}
  if((STATE.farmers||[]).some(x=>nz(x.name)===nz(row.name))){O.fq=row.name;O.nf=false;toast("Tento zákazník už existuje – vybraný.");renderStaff();return}
  busy(b,true);const r=await sb.from("farmers").insert(row).select().single();busy(b,false);
  if(r.error){toast("Nepodarilo sa uložiť: "+r.error.message,7000);return}
  (STATE.farmers=STATE.farmers||[]).push(r.data);O.fq=r.data.name;O.nf=false;toast(`✓ Zákazník ${r.data.name} pridaný. Teraz označ lístky a ťukni Prideliť.`,6000);renderStaff()},true);
})();
