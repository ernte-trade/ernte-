// ===== 🤝 UZATVORIŤ OBCHOD – jednoduchá obrazovka pre obchodníkov =====
// Komodita tlačidlami, množstvo, cena, termín vývozu od–do. Údaje farmára z fotky pečiatky, celý obchod z fotky papiera
// alebo nadiktovaný mikrofónom (Claude ich prečíta a vyplní). Po potvrdení: zmluva + žiadosť o podpis farmárovi
// (do aplikácie hneď, na mobil cez WhatsApp/SMS jedným ťuknutím, s prihlásením, ak ho ešte nemá).
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const tst=(t,ms)=>typeof toast==="function"&&toast(t,ms);
const OK=()=>typeof ROLE!=="undefined"&&(ROLE==="owner"||(typeof can==="function"&&can("deals")));
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const plus=n=>{const d=new Date();d.setDate(d.getDate()+n);return iso(d)};
const nz=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();
const COMS=[["psenica_p","🌾","Pšenica"],["psenica_k","🌾","Pšenica kŕmna"],["kukurica","🌽","Kukurica"],["repka","🌼","Repka"],["soja","🫘","Sója"],["lo","🌻","Slnečnica"],["ho","🌻","Slnečnica HO"],["jacmen_k","🌾","Jačmeň"],["jacmen_s","🍺","Jačmeň slad."],["cirok","🌿","Cirok"]];
const blank=()=>({fid:"",fq:"",F:{nazov:"",ico:"",dic:"",icdph:"",adresa:"",telefon:"",email:"",iban:""},com:"",tons:"",price:"",od:plus(0),do:plus(14),miesto:"",note:"",ai:null,busy:"",done:null,heard:""});
let Q=blank(),REC=null;
const rr=()=>{if(typeof TAB!=="undefined"&&TAB==="qd"&&typeof renderStaff==="function")renderStaff()};
function fPrice(c){const P=((typeof STATE!=="undefined"&&STATE.prices)||[]).find(p=>p.com===c&&p.price!=null);if(!P)return "";const d=typeof window.farmDisc==="function"?+window.farmDisc(c)||0:0;return String(Math.round(+P.price*(1-d/100)*100)/100).replace(".",",")}
const farmers=()=>((typeof STATE!=="undefined"&&STATE.farmers)||[]).filter(f=>f.active!==false);
const selF=()=>Q.fid?farmers().find(f=>f.id===Q.fid):null;

// ---------- obrazovka ----------
window.vQd=function(){if(!OK())return `<div class="card"><div class="s">Uzatvárať obchody môže obchodník s prístupom k obchodom.</div></div>`;
  if(Q.done)return doneHTML();
  const f=selF(),sr=window.SpeechRecognition||window.webkitSpeechRecognition;
  let h=`<div class="qd"><div class="qdh"><h2>🤝 Uzatvoriť obchod</h2><div class="s">Vyplň 4 veci – alebo odfoť / povedz a aplikácia vyplní sama.</div></div>
   <div class="qdbig">
    <label class="qdb"><input type="file" accept="image/*" capture="environment" data-qdfoto="peciatka" hidden><span>📸</span><b>Odfotiť pečiatku</b><small>údaje farmára</small></label>
    <label class="qdb"><input type="file" accept="image/*" capture="environment" data-qdfoto="papier" hidden><span>📝</span><b>Odfotiť papier</b><small>ručne písaný obchod</small></label>
    <button type="button" class="qdb${REC?" rec":""}" data-qdmic="1"><span>${REC?"⏺️":"🎤"}</span><b>${REC?"Počúvam… ťukni = hotovo":"Povedať"}</b><small>${REC?"hovor: farmár, komodita, tony, cena, termín":EDGA?"cez mikrofón na klávesnici":"farmár, komodita, tony, termín"}</small></button>
   </div>
   ${REC||Q.heard?`<div class="card qdheard"><b>🎤 ${REC?"Počúvam":"Počul som"}:</b> <span id="qdHeard">${e(Q.heard||"…")}</span></div>`:""}
   ${!sr&&!REC?`<div class="s">🎤 Ak mikrofón nejde, ťukni do políčka Poznámka a na klávesnici stlač mikrofón – nadiktuj a ťukni <b>Vyplniť z textu</b>.</div>`:""}
   ${Q.busy?`<div class="card qdwait"><span class="qdspin"></span> ${e(Q.busy)}</div>`:""}
   ${Q.ai&&Q.ai.chyba?`<div class="card qdwarn">🤖 ${e(Q.ai.chyba)}</div>`:""}
   <form id="fQd" class="qdform" autocomplete="off">
   <div class="card"><div class="qdn"><i>1</i><b>Farmár</b></div>
    <input class="qdin" id="qdFq" list="qdFarms" placeholder="začni písať meno farmára…" value="${e(f?f.name:Q.fq||Q.F.nazov)}">
    <datalist id="qdFarms">${farmers().map(x=>`<option value="${e(x.name)}">`).join("")}</datalist>
    ${f?`<div class="qdok">✓ ${e(f.name)}${f.ico?" · IČO "+e(f.ico):""}${f.phone?" · "+e(f.phone):" · ⚠️ bez telefónu"}</div>`:`<details class="qdnew"${Q.F.ico||Q.F.adresa||Q.F.telefon?" open":""}><summary>➕ Nový farmár – údaje (alebo odfoť pečiatku)</summary>
      ${[["nazov","Názov / meno"],["ico","IČO","numeric"],["dic","DIČ","numeric"],["icdph","IČ DPH"],["adresa","Adresa"],["telefon","Telefón","tel"],["email","E-mail","email"],["iban","IBAN"]].map(([k,l,m])=>`<label>${l}<input class="qdin" data-qdf="${k}" value="${e(Q.F[k]||"")}"${m?` inputmode="${m}"`:""}></label>`).join("")}</details>`}
   </div>
   <div class="card"><div class="qdn"><i>2</i><b>Komodita</b></div><div class="qdcom">${COMS.map(c=>`<button type="button" class="qdc${Q.com===c[0]?" on":""}" data-qdcom="${c[0]}"><span>${c[1]}</span>${c[2]}</button>`).join("")}</div></div>
   <div class="card"><div class="qdn"><i>3</i><b>Množstvo a cena</b></div>
    <div class="qdrow"><label>Tony<input class="qdin qdnum" id="qdTons" inputmode="decimal" value="${e(Q.tons)}" placeholder="0"></label><label>Cena €/t<input class="qdin qdnum" id="qdPrice" inputmode="decimal" value="${e(Q.price)}" placeholder="${e(Q.com?fPrice(Q.com):"")}"></label></div>
    <div class="qdchips">${[25,50,100,200,300,500].map(n=>`<button type="button" data-qdt="${n}">${n} t</button>`).join("")}</div>
    ${Q.com&&fPrice(Q.com)?`<div class="s">Cenník pre farmárov: <b>${e(fPrice(Q.com))} €/t</b> – ťukni na Cena a uprav, ak ste sa dohodli inak.</div>`:""}</div>
   <div class="card"><div class="qdn"><i>4</i><b>Termín vývozu</b></div>
    <div class="qdrow"><label>Od<input class="qdin" type="date" id="qdOd" value="${e(Q.od)}"></label><label>Do<input class="qdin" type="date" id="qdDo" value="${e(Q.do)}"></label></div>
    <div class="qdchips">${[["Tento týždeň",0,6],["Budúci týždeň",7,13],["Do 14 dní",0,14],["Do konca mesiaca",0,-1]].map(([l,a,b])=>`<button type="button" data-qdod="${a}" data-qddo="${b}">${l}</button>`).join("")}</div>
    <label>Miesto nakládky (nepovinné)<input class="qdin" id="qdMiesto" value="${e(Q.miesto)}" placeholder="napr. sklad Zbudza"></label>
    <label>Poznámka (nepovinné)<textarea class="qdin" id="qdNote" rows="2" placeholder="napr. vlhkosť do 14 %, platba do 30 dní">${e(Q.note)}</textarea></label>
    <button type="button" class="qdsm" data-qdtext="1">🤖 Vyplniť z textu poznámky</button></div>
   <button type="submit" class="qdgo">✅ Uzatvoriť a poslať farmárovi na podpis</button>
   <button type="button" class="qdclr" data-qdclr="1">Začať odznova</button>
   </form></div>`;
  return h};
function doneHTML(){const D=Q.done,c=COMS.find(x=>x[0]===D.com);
  return `<div class="qd"><div class="card qddone"><div class="qdbigok">✅</div><h2>Zmluva ${e(D.no)} je hotová</h2>
   <div class="s">${e(D.farmer)} · ${e(c?c[2]:D.com)} · <b>${e(D.tons)} t</b> · ${e(D.price)} €/t${D.term?" · vývoz "+e(D.term):""}</div>
   <div class="qdst">📲 Odoslané do aplikácie farmára${D.pushed?" + upozornenie do mobilu":""}. ${D.has_login?"Farmár ju uvidí hore ako „Podpísať teraz“.":"Farmár ešte nemá aplikáciu – pošli mu správu nižšie (je v nej aj prihlásenie)."}</div>
   ${D.login?`<div class="qdst">🔑 Prihlásenie pre farmára vytvorené: <b>${e(D.login)}</b></div>`:""}
   <div class="qdacts">${D.phone?`<a class="qdgo" href="https://wa.me/${e(tel(D.phone))}?text=${encodeURIComponent(D.msg)}" target="_blank" rel="noopener">🟢 Poslať cez WhatsApp</a><a class="qdsec" href="sms:+${e(tel(D.phone))}?&body=${encodeURIComponent(D.msg)}">✉️ Poslať SMS</a>`:`<div class="qdwarn">⚠️ Farmár nemá v aplikácii telefón – skopíruj správu a pošli mu ju.</div>`}
    <button type="button" class="qdsec" data-qdcopy="1">📋 Kopírovať správu</button><button type="button" class="qdsec" data-qdpdf="${e(D.deal_id)}">📄 Zmluva (PDF)</button></div>
   <details class="qdmsg"><summary>Text správy</summary><pre>${e(D.msg)}</pre></details>
   <button type="button" class="qdgo" data-qdclr="1" style="margin-top:12px">➕ Ďalší obchod</button></div></div>`}
const tel=p=>String(p||"").replace(/\D/g,"").replace(/^00/,"").replace(/^0/,"421");

// ---------- zber hodnôt z formulára ----------
function grab(){const g=id=>{const x=document.getElementById(id);return x?x.value:null};
  const v={tons:g("qdTons"),price:g("qdPrice"),od:g("qdOd"),do:g("qdDo"),miesto:g("qdMiesto"),note:g("qdNote"),fq:g("qdFq")};for(const k in v)if(v[k]!=null){if(k==="fq")Q.fq=v.fq;else Q[k]=v[k]}
  document.querySelectorAll("[data-qdf]").forEach(i=>{Q.F[i.dataset.qdf]=i.value});
  if(Q.fq!=null){const m=farmers().find(f=>nz(f.name)===nz(Q.fq));Q.fid=m?m.id:"";if(!m&&Q.fq)Q.F.nazov=Q.fq}}
// ---------- výsledok od Clauda → formulár ----------
function apply(r){if(!r)return;Q.ai=r;const F=r.farmar||{},O=r.obchod||{};
  for(const k of Object.keys(Q.F))if(F[k]&&String(F[k]).trim())Q.F[k]=String(F[k]).trim();
  const ico=String(F.ico||"").replace(/\D/g,"");let m=ico?farmers().find(f=>String(f.ico||"").replace(/\D/g,"")===ico):null;
  if(!m&&F.nazov){const n=nz(F.nazov);m=farmers().find(f=>nz(f.name)===n)||farmers().find(f=>n.length>4&&(nz(f.name).includes(n)||n.includes(nz(f.name))))}
  if(m){Q.fid=m.id;Q.fq=m.name}else if(F.nazov){Q.fid="";Q.fq=F.nazov}
  if(O.komodita&&COMS.some(c=>c[0]===O.komodita))Q.com=O.komodita;
  if(+O.mnozstvo_t>0)Q.tons=String(O.mnozstvo_t).replace(".",",");if(+O.cena_eur_t>0)Q.price=String(O.cena_eur_t).replace(".",",");
  if(/^\d{4}-\d{2}-\d{2}$/.test(O.od||""))Q.od=O.od;if(/^\d{4}-\d{2}-\d{2}$/.test(O.do||""))Q.do=O.do;
  if(O.miesto)Q.miesto=O.miesto;if(O.poznamka)Q.note=[Q.note,O.poznamka].filter(Boolean).join(" · ");
  if(Q.com&&!Q.price)Q.price=fPrice(Q.com)}
async function scan(mode,img,text,thumb){Q.busy=mode==="peciatka"?"Čítam pečiatku…":mode==="papier"?"Čítam papier…":"Spracúvam, čo si povedal…";rr();
  try{const r=await sb.rpc("qd_scan",{p_img:img||null,p_mode:mode,p_text:text||null,p_thumb:thumb||null});if(r.error)throw r.error;const sid=r.data;
    for(let i=0;i<60;i++){await new Promise(ok=>setTimeout(ok,2500));const g=await sb.rpc("ev_scan_get",{sid});if(g.error)throw g.error;const s=g.data||{};
      if(s.status==="ok"){apply(s.result);Q.busy="";tst("✓ Vyplnené – skontroluj a ťukni Uzatvoriť.",5000);rr();return}
      if(s.status==="err")throw new Error(s.err||"Nepodarilo sa prečítať.")}
    throw new Error("Trvá to príliš dlho – skús znova.")}
  catch(x){Q.busy="";tst("⚠️ "+(x.message||x),7000);rr()}}
function shrink(file,max,q){return new Promise((ok,no)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{const s=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);ok(c.toDataURL("image/jpeg",q).split(",")[1])};im.onerror=()=>no(new Error("Fotku sa nepodarilo načítať."));im.src=u})}
// ---------- mikrofón (rozpoznávanie reči v prehliadači, slovenčina) ----------
// Spoľahlivé zastavenie: ťuknutie vždy ukončí (aj keď prehliadač neohlási koniec), strážca 9 s bez zvuku,
// Edge na Androide rozpoznávanie reči nemá funkčné – rovno ponúkne diktovanie cez klávesnicu.
const EDGA=/EdgA\//.test(navigator.userAgent);
let MIC=null;
function kbdDictate(msg){tst(msg||"🎤 Ťukni do Poznámky, na klávesnici stlač mikrofón a nadiktuj: farmár, komodita, tony, cena, termín. Potom ťukni „Vyplniť z textu“.",9000);
  setTimeout(()=>{const n=document.getElementById("qdNote");if(n){n.scrollIntoView({behavior:"smooth",block:"center"});try{n.focus()}catch(x){}}},300)}
function micDone(useIt){const m=MIC;if(!m)return;MIC=null;clearTimeout(m.wd);clearTimeout(m.kill);
  try{m.r.onresult=m.r.onerror=m.r.onend=null}catch(x){}try{m.r.abort()}catch(x){}
  REC=null;Q.heard=(m.fin+" "+m.inter).trim();rr();
  if(useIt&&Q.heard.length>2)scan("hlas",null,Q.heard);else if(useIt&&!m.any)kbdDictate("🎤 Mikrofón v tomto prehliadači nič nezachytil. Nadiktuj cez mikrofón na klávesnici do Poznámky a ťukni „Vyplniť z textu“.")}
function mic(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(MIC||REC){// zastaviť – okamžite, nečaká sa na prehliadač
    if(MIC){MIC.stopping=true;try{MIC.r.stop()}catch(x){}const m=MIC;m.kill=setTimeout(()=>{if(MIC===m)micDone(true)},700)}else{REC=null;rr()}return}
  if(!SR||EDGA){grab();kbdDictate(EDGA?"🎤 Edge na Androide nevie rozpoznávať reč. Ťukni do Poznámky, na klávesnici stlač mikrofón a nadiktuj – potom „Vyplniť z textu“. (V Chrome funguje aj tlačidlo Povedať.)":null);return}
  grab();Q.heard="";const r=new SR();r.lang="sk-SK";r.continuous=true;r.interimResults=true;
  const m={r,fin:"",inter:"",any:false,stopping:false,wd:0,kill:0};MIC=m;
  const arm=()=>{clearTimeout(m.wd);m.wd=setTimeout(()=>{if(MIC===m)micDone(true)},m.any?6000:9000)}; // ticho → koniec
  r.onresult=ev=>{m.any=true;let inter="";for(let i=ev.resultIndex;i<ev.results.length;i++){const t=ev.results[i][0].transcript;if(ev.results[i].isFinal)m.fin+=t+" ";else inter+=t}m.inter=inter;
    Q.heard=(m.fin+inter).trim();const el=document.getElementById("qdHeard");if(el)el.textContent=Q.heard||"…";arm()};
  r.onerror=ev=>{if(ev.error==="not-allowed"||ev.error==="service-not-allowed"){micDone(false);kbdDictate("🎤 Mikrofón je zakázaný alebo ho prehliadač nepodporuje. Povoľ ho v nastaveniach, alebo nadiktuj cez klávesnicu do Poznámky.");}
    else if(ev.error!=="no-speech"&&ev.error!=="aborted")tst("Mikrofón: "+ev.error,5000)};
  // Android niekedy ukončí počúvanie sám po pauze – kým ťa nezastavíš, pokračuje
  r.onend=()=>{if(MIC!==m)return;if(m.stopping){micDone(true);return}try{r.start()}catch(x){micDone(true)}};
  try{r.start();REC=r;arm();rr()}catch(x){MIC=null;REC=null;kbdDictate("🎤 Mikrofón sa nespustil ("+(x.message||x)+"). Nadiktuj cez klávesnicu do Poznámky.")}}

// ---------- udalosti ----------
document.addEventListener("click",async ev=>{const t=ev.target;if(!t.closest||!OK())return;let x;
  if(x=t.closest("[data-qdcom]")){grab();Q.com=x.dataset.qdcom;if(!Q.price)Q.price=fPrice(Q.com);rr();return}
  if(x=t.closest("[data-qdt]")){grab();Q.tons=x.dataset.qdt;rr();return}
  if(x=t.closest("[data-qdod]")){grab();const a=+x.dataset.qdod,b=+x.dataset.qddo;Q.od=plus(a);if(b<0){const d=new Date();Q.do=iso(new Date(d.getFullYear(),d.getMonth()+1,0))}else Q.do=plus(b);rr();return}
  if(t.closest("[data-qdmic]")){mic();return}
  if(t.closest("[data-qdtext]")){grab();const tx=String(Q.note||"").trim();if(tx.length<4){tst("Napíš alebo nadiktuj do Poznámky, napr. „Novák, repka 100 ton, 420 eur, budúci týždeň“.",7000);return}scan("hlas",null,tx);return}
  if(t.closest("[data-qdclr]")){Q=blank();rr();window.scrollTo(0,0);return}
  if(t.closest("[data-qdcopy]")){try{await navigator.clipboard.writeText(Q.done.msg);tst("Skopírované ✓")}catch(y){}return}
  if(x=t.closest("[data-qdpdf]")){if(window.contractPdf)contractPdf(x.dataset.qdpdf);return}});
document.addEventListener("change",async ev=>{const t=ev.target;if(!t||!t.dataset||!t.dataset.qdfoto||!OK())return;const f=t.files&&t.files[0];if(!f)return;grab();
  try{const img=await shrink(f,1600,.82),th=await shrink(f,240,.6);scan(t.dataset.qdfoto,img,null,th)}catch(x){tst(x.message||String(x),6000)}});
document.addEventListener("input",ev=>{const t=ev.target;if(t&&t.id==="qdFq"){Q.fq=t.value;const m=farmers().find(f=>nz(f.name)===nz(t.value));if(m&&m.id!==Q.fid){grab();rr();setTimeout(()=>{const i=document.getElementById("qdFq");if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},30)}}});
document.addEventListener("submit",async ev=>{if(!ev.target||ev.target.id!=="fQd")return;ev.preventDefault();ev.stopPropagation();grab();
  const num_=v=>{const n=parseFloat(String(v||"").replace(/\s/g,"").replace(",","."));return isFinite(n)?n:0};
  const tons=num_(Q.tons),price=num_(Q.price||fPrice(Q.com));
  if(!Q.fid&&String(Q.F.nazov||Q.fq||"").trim().length<3){tst("1️⃣ Vyber farmára alebo napíš jeho meno (alebo odfoť pečiatku).",6000);return}
  if(!Q.com){tst("2️⃣ Vyber komoditu.",5000);return}if(!(tons>0)){tst("3️⃣ Zadaj množstvo v tonách.",5000);return}if(!(price>0)){tst("3️⃣ Zadaj cenu €/t.",5000);return}
  if(Q.od&&Q.do&&Q.do<Q.od){tst("4️⃣ Dátum Do je pred Od.",5000);return}
  const b=ev.target.querySelector(".qdgo");if(typeof busy==="function")busy(b,true);
  try{const r=await sb.rpc("qd_save",{p:{farmer_id:Q.fid||null,farmar:Object.assign({},Q.F,{nazov:Q.F.nazov||Q.fq}),com:Q.com,tons,price,od:Q.od||null,do:Q.do||null,miesto:Q.miesto||"",note:Q.note||""}});
    if(r.error)throw r.error;const D=Object.assign({com:Q.com,tons:String(tons).replace(".",","),price:String(price).replace(".",",")},r.data);
    // farmár bez prihlásenia: vytvorí sa mu prihlásenie (telefón alebo e-mail) a pošle sa v správe
    let cred="";if(!D.has_login&&(D.phone||D.email)&&(ROLE==="owner"||(typeof can==="function"&&can("farm_login")))&&typeof genPw==="function"){
      const pw=genPw(),usePhone=!!D.phone;const s=await sb.rpc("set_farmer_password",{fid:D.farmer_id,pw,use_phone:usePhone});
      if(!s.error){D.login=usePhone?D.phone:D.email;cred=`\n\nPrihlasovacie meno: ${D.login}\nJednorazový kód: ${pw}\nPo prvom prihlásení si nastavíte vlastný PIN (kód potom prestane platiť).`}}
    const c=COMS.find(x=>x[0]===Q.com),me=(typeof ME!=="undefined"&&ME&&ME.staffName)||"ERNTE";
    D.msg=`Dobrý deň, ERNTE vám posiela na podpis kúpnu zmluvu ${D.no}: ${c?c[2].toLowerCase():Q.com} ${D.tons} t za ${D.price} €/t${D.term?", vývoz "+D.term:""}.\nOtvorte aplikáciu ERNTE – hore ťuknite „Podpísať teraz“. Podpis prstom trvá 30 sekúnd.${cred}\n\nĎakujeme, ${me} · ERNTE\n\n👉 ERNTE Trade & Logistic: ${typeof APP_URL!=="undefined"?APP_URL:location.href.split("#")[0]}`;
    Q.done=D;if(typeof loadStaff==="function")await loadStaff();rr();window.scrollTo(0,0)}
  catch(x){tst("⚠️ "+(x.message||x),8000)}finally{if(typeof busy==="function")busy(b,false)}},true);
// obchodník (rola obchod) začína na tejto obrazovke
const _ss=window.startStaff;if(typeof _ss==="function")window.startStaff=async function(){let had=false;try{had=!!sessionStorage.getItem("ernte-tab")}catch(x){}if(!had&&typeof ROLE!=="undefined"&&ROLE==="admin")TAB="qd";return _ss.apply(this,arguments)};
{const s=document.createElement("style");s.textContent=`.qd{display:grid;gap:12px}.qdh h2{margin:0;font-size:1.6rem}.qdbig{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.qdb{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:120px;border-radius:22px;padding:12px;text-align:center;cursor:pointer;background:linear-gradient(160deg,rgba(52,211,153,.22),rgba(34,211,238,.14));border:1px solid rgba(255,255,255,.18);color:inherit;font:inherit}
.qdb span{font-size:2.4rem}.qdb b{font-size:1.05rem}.qdb small{opacity:.75;font-size:.8rem}.qdb.rec{background:linear-gradient(160deg,rgba(248,113,113,.4),rgba(251,146,60,.25));box-shadow:0 0 0 2px rgba(248,113,113,.6)}
@keyframes qdp{50%{box-shadow:0 0 0 8px rgba(248,113,113,.25)}}.qdheard{font-size:1.05rem}.qdwait{display:flex;gap:10px;align-items:center;font-size:1.05rem}
.qdspin{width:22px;height:22px;border:3px solid rgba(255,255,255,.25);border-top-color:#bef264;border-radius:50%;animation:qds 1s linear infinite}@keyframes qds{to{transform:rotate(360deg)}}
.qdwarn{border-color:rgba(251,191,36,.5)!important;background:rgba(251,191,36,.1)!important;padding:10px 12px;border-radius:14px}
.qdform{display:grid;gap:12px}.qdform .card{display:grid;gap:10px}.qdn{display:flex;gap:10px;align-items:center;font-size:1.15rem}.qdn i{font-style:normal;width:32px;height:32px;border-radius:50%;background:#bef264;color:#0b1220;font-weight:800;display:flex;align-items:center;justify-content:center}
.qdin{width:100%;min-height:54px;font-size:18px!important;border-radius:14px;padding:0 14px}textarea.qdin{padding:10px 14px;min-height:70px}.qdnum{font-size:24px!important;font-weight:700}
.qdok{padding:10px 12px;border-radius:14px;background:rgba(190,242,100,.12);border:1px solid rgba(190,242,100,.4);font-weight:600}.qdnew{display:grid;gap:8px}.qdnew summary{cursor:pointer;font-weight:600;padding:6px 0}.qdnew label{display:grid;gap:4px;margin-top:6px}
.qdcom{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}.qdc{min-height:64px;border-radius:16px;font-size:1.05rem;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px}.qdc span{font-size:1.5rem}.qdc.on{background:linear-gradient(90deg,#34d399,#22d3ee)!important;color:#05210f!important;border-color:transparent!important}
.qdrow{display:grid;grid-template-columns:1fr 1fr;gap:10px}.qdrow label,.qdform>.card>label{display:grid;gap:4px}.qdchips{display:flex;flex-wrap:wrap;gap:6px}.qdchips button{min-height:42px;border-radius:12px;padding:0 14px}
.qdgo{display:flex;align-items:center;justify-content:center;width:100%;min-height:64px;border-radius:20px;font-size:1.2rem;font-weight:800;border:0;background:linear-gradient(90deg,#34d399,#22d3ee);color:#05210f;text-decoration:none}
.qdsec{display:flex;align-items:center;justify-content:center;min-height:52px;border-radius:16px;font-weight:700;text-decoration:none;width:100%}.qdclr,.qdsm{min-height:44px;border-radius:14px}
.qddone{text-align:center;display:grid;gap:10px}.qdbigok{font-size:3.5rem}.qdst{padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.06);text-align:left}.qdacts{display:grid;gap:8px}.qdmsg pre{white-space:pre-wrap;text-align:left;font:13px/1.4 inherit}
@media(max-width:520px){.qdbig{grid-template-columns:1fr 1fr 1fr}.qdb{min-height:104px}.qdb span{font-size:2rem}.qdb small{display:none}}`;document.head.appendChild(s)}
})();
