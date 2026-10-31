// ===== ERNTE · ZRUŠENIE PREPRAVY S DÔVODOM (doprava aj farmár) =====
// Doprava (Tóth, prístup Doprava) zruší objednávku odvozu alebo naplánovanú jazdu – vyberie dôvod a dopíše popis.
// Farmár zruší nakládku – dôvod (dážď, nemá nakladač…) a popis; doprava ho potvrdí jedným ťuknutím.
// Každé zrušenie bliká na červeno (diamant) všetkým, koho sa týka: dopravcovi, obchodníkovi, majiteľovi aj farmárovi,
// kým ho neodklikne „✓ Videl som“. Ukladá sa do existujúcich údajov (požiadavky, jazdy) – nič nové v databáze netreba.
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const say=(t,ms)=>{if(typeof toast==="function")toast(t,ms||4500)};
const isF=()=>typeof FARMER!=="undefined"&&!!FARMER,isS=()=>typeof ROLE!=="undefined"&&!!ROLE&&!isF();
const C=k=>typeof ROLE!=="undefined"&&(ROLE==="owner"||(window.can?can(k):true));
const canTrans=()=>isS()&&(C("trans")||C("assign"));
const seesAlerts=()=>isS()&&(ROLE==="owner"||C("trans")||C("assign")||C("deals")||C("req")||C("deals_qty"));
const RD=["Porucha auta / ťahača","Vodič chorý alebo nedostupný","Počasie – nezjazdná cesta k farme","Auto mešká z predošlej nakládky","Žiadne voľné auto (plná kapacita)","Vykládka u odberateľa zatvorená / neprijíma","Obmedzenie na ceste (uzávierka, kontrola, tonáž)","Chýbajú doklady k prevozu","Iný dôvod"];
const RF=["Dážď / mokrý terén – nedá sa nakladať","Nemám nakladač (porucha alebo nie je k dispozícii)","Nemám ľudí na nakládku","Tovar nie je pripravený (sušenie, čistenie)","Vysoká vlhkosť tovaru","Nezjazdná príjazdová cesta k skladu","Zmena plánu – potrebujem iný termín","Iný dôvod"];
const MK_D="🛑 ZRUŠENÉ DOPRAVOU",MK_F="🛑 ZRUŠENIE OD FARMÁRA";
const who=()=>isF()?FARMER.name:(typeof ME!=="undefined"&&ME&&(ME.staffName||ME.email))||"";
const now=()=>new Date().toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"});
const dSKx=d=>d?new Date(String(d).slice(0,10)+"T12:00").toLocaleDateString("sk-SK",{weekday:"short",day:"numeric",month:"numeric"}):"";
const fN=id=>{const f=((typeof STATE!=="undefined"&&STATE.farmers)||[]).find(x=>x.id===id);return f?f.name:isF()?FARMER.name:"farmár"};
// ---------- okno so zrušením ----------
let M=null;
function modal(opt){M=opt;let m=document.getElementById("cxMod");if(!m){m=document.createElement("div");m.id="cxMod";m.className="cxmod";document.body.appendChild(m);m.addEventListener("click",ev=>{if(ev.target===m)close()})}css();
  const R=opt.farmer?RF:RD;
  m.innerHTML=`<form class="cxbox" id="cxF" role="dialog" aria-modal="true" aria-label="Zrušenie prepravy"><div class="cxhd"><span class="cxdia" aria-hidden="true"></span><b>${opt.farmer?"Zrušiť nakládku":"Zrušiť prepravu"}</b><button type="button" class="cxx" data-cxx aria-label="Zavrieť">✕</button></div>
   <div class="s">${e(opt.title)}</div>
   <fieldset class="cxr"><legend>Dôvod</legend>${R.map((r,i)=>`<label class="cxo"><input type="radio" name="r" value="${e(r)}"${i===0?" required":""}><span>${e(r)}</span></label>`).join("")}</fieldset>
   <label class="cxd">Popis – čo sa stalo, kedy to bude možné<textarea name="d" rows="3" placeholder="${opt.farmer?"napr. po daždi je dvor mokrý, nakladať sa dá od štvrtka":"napr. ťahač v servise, náhradné auto v piatok ráno"}"></textarea></label>
   <div class="s">Zrušenie uvidí ${opt.farmer?"doprava, obchodník aj majiteľ ERNTE":"farmár, obchodník aj majiteľ"} – bude im blikať na červeno.</div>
   <div class="btns"><button type="submit" class="cxgo">🛑 Zrušiť a oznámiť</button><button type="button" data-cxx>Späť</button></div></form>`}
function close(){M=null;const m=document.getElementById("cxMod");if(m)m.remove()}
async function doCancel(r,d){const txt=`${r}${d?" – "+d:""}`;const o=M;if(!o)return;const b=document.querySelector("#cxF .cxgo");if(b){b.disabled=true;b.textContent="Ukladám…"}
  let ok=false;
  try{
    if(o.kind==="req"){// doprava ruší objednávku odvozu
      ok=await reqHandle(o.id,"zamietnuta",`${MK_D} · ${txt} · ${who()} ${now()}`,true)}
    else if(o.kind==="trip"){// doprava ruší naplánovanú jazdu
      const t=(STATE.trips||[]).find(x=>x.id===o.id);const note=`${MK_D} · ${txt} · ${who()} ${now()}`+(t&&t.note?" | "+t.note:"");
      const a=await sb.from("trips").update({status:"zrusena",note:note.slice(0,500),updated_at:new Date().toISOString()}).eq("id",o.id);ok=!a.error;if(a.error)say("Chyba: "+a.error.message,6000)}
    else if(o.kind==="ftrip"||o.kind==="freq"){// farmár ruší – nová správa pre ERNTE
      const t=o.kind==="ftrip"?(STATE.trips||[]).find(x=>x.id===o.id):null,q=o.kind==="freq"?(STATE.reqs||[]).find(x=>x.id===o.id):null;
      const ref=t?`jazda ${dSKx(t.day)}${t.time?" "+t.time:""} · ${t.spz||""} #trip:${t.id}`:q?`objednávka odvozu ${q.pickup_date?dSKx(q.pickup_date):""} #req:${q.id}`:"";
      const a=await sb.from("requests").insert({farmer_id:FARMER.id,kind:"message",deal_id:(t&&t.deal_id)||(q&&q.deal_id)||null,note:`${MK_F} · ${txt} · ${ref}`.slice(0,500)});ok=!a.error;if(a.error)say("Nepodarilo sa odoslať: "+a.error.message,7000)}
  }catch(x){say("Chyba: "+(x&&x.message||x),6000)}
  if(!ok){if(b){b.disabled=false;b.textContent="🛑 Zrušiť a oznámiť"}return}
  close();say(o.farmer?"🛑 Zrušenie odoslané ERNTE – doprava ho uvidí hneď.":"🛑 Preprava zrušená – farmár aj obchodník to uvidia.",5500);
  if(isF()){if(typeof loadFarmer==="function")await loadFarmer();renderFarmer()}else{await loadStaff();renderStaff()}}
// ---------- čo bliká ----------
const AK="ernte-cx-ack",ack=()=>{try{return JSON.parse(localStorage.getItem(AK)||"{}")}catch(x){return {}}},setAck=k=>{const a=ack();a[k]=Date.now();try{localStorage.setItem(AK,JSON.stringify(a))}catch(x){}};
const recent=(t,h)=>!t||Date.now()-new Date(t)<h*3600e3;
function items(){const A=ack(),out=[];const R=(typeof STATE!=="undefined"&&STATE.reqs)||[],T=(typeof STATE!=="undefined"&&STATE.trips)||[];
  const st=s=>String(s||"");
  for(const t of T)if(t.status==="zrusena"&&st(t.note).startsWith(MK_D)&&recent(t.updated_at||t.day,96)){const p=st(t.note).split(" | ")[0].split(" · ");
    out.push({k:"t"+t.id,src:"doprava",title:`Doprava zrušila jazdu ${dSKx(t.day)}${t.time?" "+t.time:""} · ${t.spz||""}`,who:isS()?fN(t.farmer_id):"",why:p[1]||"",by:p[2]||""})}
  for(const q of R)if(q.status==="zamietnuta"&&st(q.reply).startsWith(MK_D)&&recent(q.handled_at||q.created_at,96)){const p=st(q.reply).split(" · ");
    out.push({k:"r"+q.id,src:"doprava",title:`Doprava zrušila objednávku odvozu${q.pickup_date?" na "+dSKx(q.pickup_date):""}`,who:isS()?fN(q.farmer_id):"",why:p[1]||"",by:p[2]||""})}
  for(const q of R)if(q.kind==="message"&&st(q.note).startsWith(MK_F)&&(q.status==="nova"||q.status==="v_spracovani"||recent(q.created_at,48))){const p=st(q.note).split(" · ");
    out.push({k:"f"+q.id,id:q.id,src:"farmar",open:q.status==="nova"||q.status==="v_spracovani",title:`${isS()?fN(q.farmer_id)+" zrušil":"Zrušili ste"} nakládku${p[2]?" · "+p[2].replace(/ #(trip|req):\S+/g,""):""}`,who:isS()?fN(q.farmer_id):"",why:p[1]||"",ref:p.slice(2).join(" · "),phone:((STATE.farmers||[]).find(f=>f.id===q.farmer_id)||{}).phone})}
  return out.filter(x=>!A[x.k]||x.open&&isS()&&canTrans())}
function alertHTML(){const L=items();if(!L.length)return "";
  return `<div class="cxal" role="alert" aria-live="assertive"><div class="cxalh"><span class="cxdia big" aria-hidden="true"></span><b>ZRUŠENÁ PREPRAVA</b><span class="cxcnt">${L.length}</span></div>
   ${L.map(x=>`<div class="cxi"><b>${e(x.title)}</b>${x.who&&!x.title.startsWith(x.who)?`<small>${e(x.who)}</small>`:""}<div class="cxwhy">Dôvod: <b>${e(x.why||"neuvedený")}</b></div>${x.by?`<small>${e(x.by)}</small>`:""}
     <div class="btns">${x.src==="farmar"&&x.open&&isS()&&canTrans()?`<button type="button" class="cxok" data-cxconf="${e(x.id)}">✓ Potvrdiť zrušenie (zrušiť autá)</button>`:""}${x.phone&&isS()?`<a class="btn" href="tel:${e(String(x.phone).replace(/\s/g,""))}">📞 Volať</a>`:""}<button type="button" data-cxack="${e(x.k)}">✓ Videl som</button></div></div>`).join("")}</div>`}
async function confirmF(id){const q=(STATE.reqs||[]).find(x=>x.id===id);if(!q)return;const m=String(q.note||"").match(/#trip:(\S+)/),r=String(q.note||"").match(/#req:(\S+)/),p=String(q.note).split(" · ");
  if(m){const a=await sb.from("trips").update({status:"zrusena",note:`🛑 Zrušil farmár · ${p[1]||""}`.slice(0,500),updated_at:new Date().toISOString()}).eq("id",m[1]);if(a.error){say("Jazdu sa nepodarilo zrušiť: "+a.error.message,6000);return}}
  if(r)await reqHandle(r[1],"zamietnuta",`Zrušené na žiadosť farmára: ${p[1]||""}`,true);
  await reqHandle(id,"vybavena",`Zrušenie potvrdené (${who()}). Ozveme sa s novým termínom.`,true);setAck("f"+id);await loadStaff();renderStaff();say("✓ Zrušenie potvrdené – farmár dostal odpoveď.")}
// ---------- tlačidlá v obrazovkách ----------
function injectStaff(){const app=document.getElementById("app");if(!app)return;css();
  if(seesAlerts()&&!app.querySelector(".cxal")){const h=alertHTML();if(h){const box=document.createElement("div");box.innerHTML=h;const at=app.querySelector("nav.tabs")||null;if(at&&at.parentElement===app)at.after(...box.childNodes);else app.prepend(...box.childNodes)}}
  if(!canTrans())return;
  app.querySelectorAll("form[data-tedit]").forEach(f=>{const t=(STATE.trips||[]).find(x=>x.id===f.dataset.tedit);if(!t||["vylozene","zrusena"].includes(t.status)||f.querySelector("[data-cxtrip]"))return;
    const s=f.querySelector(".c-st");if(s){const b=document.createElement("button");b.type="button";b.className="cxbtn";b.dataset.cxtrip=t.id;b.textContent="🛑 Zrušiť";s.appendChild(b)}});
  app.querySelectorAll("[data-rej]").forEach(b=>{const q=(STATE.reqs||[]).find(x=>x.id===b.dataset.rej);if(!q||q.kind!=="transport"||b.parentElement.querySelector("[data-cxreq]"))return;
    const c=document.createElement("button");c.type="button";c.className="cxbtn";c.dataset.cxreq=q.id;c.textContent="🛑 Zrušiť prepravu (dôvod)";b.after(c)})}
function injectFarmer(){if(!isF())return;const app=document.getElementById("app");if(!app)return;css();
  if(!app.querySelector(".cxal")){const h=alertHTML();if(h){const box=document.createElement("div");box.innerHTML=h;const hero=app.querySelector(".hero");if(hero)hero.before(...box.childNodes);else app.prepend(...box.childNodes)}}
  if(window.fcan&&!fcan("f_transport"))return;
  const sent=new Set((STATE.reqs||[]).filter(q=>q.kind==="message"&&String(q.note||"").startsWith(MK_F)).map(q=>(String(q.note).match(/#(?:trip|req):(\S+)/)||[])[1]));
  // naplánované jazdy (Doprava VALKO aj jazdy pri zmluve)
  app.querySelectorAll(".trip").forEach(el=>{if(el.querySelector("[data-cxftrip],.cxsent"))return;const T=(STATE.trips||[]).filter(t=>!["vylozene","zrusena","nalozene"].includes(t.status));
    const txt=el.textContent;const t=T.find(x=>txt.includes(x.spz||"auto VALKO")&&txt.includes(new Date(x.day+"T12:00").toLocaleDateString("sk-SK",{weekday:"short",day:"numeric",month:"numeric"})));if(!t)return;
    const d=document.createElement("div");d.className="btns";d.innerHTML=sent.has(t.id)?`<span class="pill r cxsent">🛑 zrušenie odoslané</span>`:`<button type="button" class="cxbtn" data-cxftrip="${e(t.id)}">🛑 Nemôžem nakladať – zrušiť</button>`;el.appendChild(d)});
  // otvorené objednávky odvozu (ešte bez áut) – v Moje požiadavky
  const H=[...app.querySelectorAll("h2")].find(h=>/Moje požiadavky/i.test(h.textContent));if(!H)return;let card=H.nextElementSibling;while(card&&!(card.classList&&card.classList.contains("card")&&card.querySelector(".row")))card=card.nextElementSibling;if(!card||card.querySelector(".cxfreq"))return;
  const open=(STATE.reqs||[]).filter(q=>q.kind==="transport"&&(q.status==="nova"||q.status==="v_spracovani")&&!sent.has(q.id));if(!open.length)return;
  const w=document.createElement("div");w.className="cxfreq";w.innerHTML=open.map(q=>`<div class="row"><span class="s">🚚 Odvoz ${q.pickup_date?dSKx(q.pickup_date):""}${q.com&&typeof comName==="function"?" · "+e(comName(q.com)):""}</span><button type="button" class="cxbtn" data-cxfreq="${e(q.id)}">🛑 Zrušiť</button></div>`).join("");card.appendChild(w)}
function css(){if(document.getElementById("cxCss"))return;const s=document.createElement("style");s.id="cxCss";s.textContent=`
@keyframes cxBlink{0%,100%{box-shadow:0 0 0 2px rgba(255,59,48,.9),0 0 28px rgba(255,59,48,.65),inset 0 0 22px rgba(255,59,48,.25)}50%{box-shadow:0 0 0 2px rgba(255,59,48,.35),0 0 6px rgba(255,59,48,.2),inset 0 0 6px rgba(255,59,48,.08)}}
@keyframes cxDia{0%,100%{transform:rotate(45deg) scale(1);filter:drop-shadow(0 0 8px #ff3b30)}50%{transform:rotate(45deg) scale(.82);filter:drop-shadow(0 0 2px #ff3b30)}}
.cxal{position:relative;overflow:hidden;display:grid;gap:10px;margin:8px 0 12px;padding:16px;border-radius:24px;color:#fff;
 background:radial-gradient(260px 160px at 100% 0%,rgba(255,120,110,.35),transparent 70%),linear-gradient(145deg,#5c0a12 0%,#2a0508 55%,#1a0306 100%);border:1px solid rgba(255,90,80,.8);animation:cxBlink 1.1s ease-in-out infinite}
.cxal::before{content:"";position:absolute;right:-34px;top:-34px;width:120px;height:120px;transform:rotate(45deg);border-radius:18px;background:linear-gradient(135deg,rgba(255,120,110,.55),rgba(255,59,48,.08) 60%,transparent);pointer-events:none}
.cxalh{display:flex;align-items:center;gap:12px;font-size:1.05rem;letter-spacing:.12em}.cxcnt{margin-left:auto;min-width:30px;height:30px;padding:0 8px;border-radius:99px;display:grid;place-items:center;background:#ff3b30;font-weight:800}
.cxdia{display:inline-block;width:16px;height:16px;border-radius:4px;background:linear-gradient(135deg,#ffd1cc,#ff3b30 55%,#a3000b);transform:rotate(45deg);animation:cxDia 1.1s ease-in-out infinite;flex:none}.cxdia.big{width:22px;height:22px}
.cxi{display:grid;gap:4px;padding:12px;border-radius:16px;background:rgba(0,0,0,.28);border:1px solid rgba(255,120,110,.35)}.cxi small{opacity:.8}.cxwhy{font-size:.95rem}.cxwhy b{color:#ffb4ad}
.cxi .btns button,.cxi .btns .btn{min-height:42px}.cxok{background:linear-gradient(135deg,#ff6b5e,#ff3b30)!important;color:#fff!important;border:0!important;font-weight:800}
.cxbtn{border-color:rgba(255,90,80,.7)!important;color:#ff8a80!important;background:rgba(255,59,48,.08)!important;font-weight:700}
.cxfreq{display:grid;gap:6px;margin-top:8px;border-top:1px solid rgba(255,255,255,.08);padding-top:8px}
.cxmod{position:fixed;inset:0;z-index:10080;background:rgba(10,0,2,.72);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center}@media(min-width:700px){.cxmod{align-items:center}}
.cxbox{width:min(540px,100%);max-height:92vh;overflow:auto;display:grid;gap:12px;padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px));border-radius:24px 24px 0 0;background:linear-gradient(160deg,#2a0b10,#120306);border:1px solid rgba(255,90,80,.6);color:#fff}@media(min-width:700px){.cxbox{border-radius:24px}}
.cxhd{display:flex;align-items:center;gap:12px;font-size:1.1rem}.cxx{margin-left:auto;min-height:40px;min-width:40px;padding:0;border-radius:50%}
.cxr{border:0;padding:0;margin:0;display:grid;gap:6px}.cxr legend{font-weight:700;margin-bottom:6px}.cxo{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);cursor:pointer}
.cxo::before,.cxo::after{display:none!important}.cxo input{width:20px;height:20px;min-height:0;accent-color:#ff3b30}.cxo:has(input:checked){border-color:#ff3b30;background:rgba(255,59,48,.14)}
.cxd{display:grid;gap:6px}.cxd textarea{width:100%;font-size:16px;border-radius:14px;padding:12px}.cxgo{background:linear-gradient(135deg,#ff6b5e,#ff3b30)!important;color:#fff!important;border:0!important;font-weight:800;min-height:52px}
html[data-theme=light] .cxbox{background:#fff;color:#1a0306}
@media (prefers-reduced-motion:reduce){.cxal,.cxdia{animation:none}}`;document.head.appendChild(s)}
document.addEventListener("click",ev=>{const g=s=>ev.target.closest&&ev.target.closest(s);let x;
  if(x=g("[data-cxtrip]")){ev.preventDefault();ev.stopPropagation();const t=(STATE.trips||[]).find(y=>y.id===x.dataset.cxtrip);modal({kind:"trip",id:t.id,title:`${fN(t.farmer_id)} · ${dSKx(t.day)} ${t.time||""} · ${t.spz||""} · ${t.driver||""}`});return}
  if(x=g("[data-cxreq]")){ev.preventDefault();ev.stopPropagation();const q=(STATE.reqs||[]).find(y=>y.id===x.dataset.cxreq);modal({kind:"req",id:q.id,title:`${fN(q.farmer_id)} · odvoz ${q.pickup_date?dSKx(q.pickup_date):""}${q.com&&typeof comName==="function"?" · "+comName(q.com):""}`});return}
  if(x=g("[data-cxftrip]")){ev.preventDefault();const t=(STATE.trips||[]).find(y=>y.id===x.dataset.cxftrip);modal({kind:"ftrip",id:t.id,farmer:1,title:`Nakládka ${dSKx(t.day)} ${t.time||""} · auto ${t.spz||"VALKO"}`});return}
  if(x=g("[data-cxfreq]")){ev.preventDefault();const q=(STATE.reqs||[]).find(y=>y.id===x.dataset.cxfreq);modal({kind:"freq",id:q.id,farmer:1,title:`Objednávka odvozu ${q.pickup_date?dSKx(q.pickup_date):""}`});return}
  if(g("[data-cxx]")){close();return}
  if(x=g("[data-cxack]")){setAck(x.dataset.cxack);const i=x.closest(".cxi");if(i)i.remove();const al=document.querySelector(".cxal");if(al&&!al.querySelector(".cxi"))al.remove();return}
  if(x=g("[data-cxconf]")){confirmF(x.dataset.cxconf);return}},true);
document.addEventListener("submit",ev=>{if(ev.target.id!=="cxF")return;ev.preventDefault();ev.stopPropagation();const fd=new FormData(ev.target),r=String(fd.get("r")||""),d=String(fd.get("d")||"").trim();if(!r){say("Vyberte dôvod.");return}doCancel(r,d)},true);
function wrap(n,fn){const o=window[n];if(typeof o!=="function"||o["__cx"+n])return;const w=function(){const r=o.apply(this,arguments);try{fn()}catch(x){}return r};w["__cx"+n]=1;Object.keys(o).forEach(k=>{try{if(!(k in w))w[k]=o[k]}catch(x){}});window[n]=w;try{fn()}catch(x){}}
const t=setInterval(()=>{wrap("renderStaff",injectStaff);wrap("renderFarmer",injectFarmer)},400);setTimeout(()=>clearInterval(t),60000);
// nové zrušenie od farmára → hneď obnoviť (ostatné zmeny chodia cez existujúce živé kanály)
setInterval(()=>{if(document.hidden)return;if(isS()&&seesAlerts()&&typeof loadStaff==="function"&&!(window.formBusy&&formBusy())&&!document.getElementById("cxMod"))loadStaff().then(()=>{if(items().length&&!document.querySelector(".cxal"))renderStaff()})},90000);
window.cxItems=items;
})();
