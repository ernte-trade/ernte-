// ===== 🌾 FARMÁR JEDNODUCHO (príkaz majiteľa 31. 10.) =====
// Po úvode LIVE iba veľké dlaždice: 💰 Predať · 🤝 Moje obchody · 🚚 Odvoz · 💶 Ceny · 🌦️ Počasie · 📞 Obchodník.
// Predať = krok za krokom: plodina (zverejnené ceny) → tony → stará úroda na sklade / nová úroda → odvoz (deň a čas) → komu a jazyk zmluvy → Odoslať.
// Ponuku dostanú obchodníci (databáza req_team_push): ERNTE Galajda, Ceperko, Ličko; DANUBE aj Jozsef (po maďarsky).
// Pôvodné časti aplikácie ostávajú – zobrazia sa po ťuknutí na dlaždicu (Späť = šípka hore alebo tlačidlo Späť v telefóne).
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const F_=()=>typeof FARMER!=="undefined"&&FARMER?FARMER:null;
const fc=k=>!window.fcan||fcan(k);
const N=(x,d)=>Number(x).toLocaleString("sk-SK",{minimumFractionDigits:d||0,maximumFractionDigits:d==null?2:d});
const td=()=>new Date().toLocaleDateString("sv-SE");
let FV="home";const W={com:null,tons:"",harvest:null,fwd:null,need:true,date:"",time:"08:00",place:"",sent:null,busy:0};
const T={home:"",predat:"Predať komoditu",hist:"Moje obchody a história",ceny:"Výkupné ceny",odvoz:"Odvoz tovaru",wx:"Počasie",kontakt:"Obchodník a kontakt",sluzby:"Služby strojmi",viac:"Ďalšie"};
const IC={predat:"money",hist:"deals",ceny:"price",odvoz:"trans",wx:"wx",kontakt:"phone",sluzby:"agro",viac:"scroll"};
function secOf(h2){const t=h2.textContent;return /Môj prehľad|požiadavky|Moje obchody/i.test(t)?"hist":/Výkupné ceny/i.test(t)?"ceny":/Počasie/i.test(t)?"wx":/Doprava VALKO|Odvoz/i.test(t)?"odvoz":/Kontakt/i.test(t)?"kontakt":/Žatva|služb|Agro|stroj/i.test(t)?"sluzby":"viac"}
// ---------- obchodníci (farm_contacts) ----------
let CT=null;async function loadCT(){if(CT)return CT;try{const r=await sb.rpc("farm_contacts");CT=(!r.error&&Array.isArray(r.data))?r.data:[]}catch(x){CT=[]}return CT}
window.farmContacts=loadCT;
// kraj podľa PSČ: Košický 04x, 052–053, 055–056, 07x · Prešovský 054, 058–069, 08x, 09x
function kraj(F){const m=String(F&&F.addr||"").match(/\b(0\d{2})\s?\d{2}\b/);if(!m)return null;const p=+m[1];
  if((p>=40&&p<=49)||p===52||p===53||p===55||p===56||(p>=70&&p<=79))return "ke";if(p===54||(p>=58&&p<=69)||(p>=80&&p<=99))return "po";return null}
window.farmKraj=kraj;
function ctHTML(big){const F=F_(),L=CT||[],k=kraj(F);if(!L.length)return `<div class="s">Načítavam…</div>`;
  const S=L.slice().sort((a,b)=>(b.k===k)-(a.k===k));
  return S.map(c=>`<a class="fct${c.k===k||L.length===1?" mine":""}" href="tel:${E(String(c.phone).replace(/[^\d+]/g,""))}"><img src="img/ico/phone.png" alt="" width="40" height="40"><span><small>${E(c.kraj)}${c.k===k?" · váš obchodník":""}</small><b>${E(c.name)}</b><em>${E(c.phone)}</em></span><i>📞 Volať</i></a>`).join("")}
// ---------- dlaždice ----------
function tiles(){const F=F_(),P=(STATE.prices||[]).filter(p=>p.price!=null),top=P.slice().sort((a,b)=>b.price-a.price)[0];
  const nd=(STATE.deals||[]).filter(d=>!/zrus|zaplat/.test(d.status||"")).length,nr=(STATE.reqs||[]).filter(r=>r.status==="nova").length,ntr=(STATE.trips||[]).filter(t=>!["vylozene","zrusena"].includes(t.status)).length;
  const L=[];
  if(fc("f_sell")&&P.length)L.push(["predat","Predať komoditu",top?`najvyššia ${E(comName(top.com))} ${N(top.price,0)} €/t`:"",1]);
  if(fc("f_deals")||fc("f_remain"))L.push(["hist","Moje obchody",nd?`${nd} rozbehnuté${nr?` · ${nr} čaká`:""}`:"história a zmluvy"]);
  if(fc("f_transport")||fc("f_trucks"))L.push(["odvoz","Odvoz",ntr?`${ntr} auto naplánované`:"objednať kamión"]);
  if(fc("f_prices"))L.push(["ceny","Výkupné ceny","aktuálne, bez DPH"]);
  if(fc("f_wx"))L.push(["wx","Počasie","24 h a 7 dní"]);
  L.push(["kontakt","Obchodník","zavolať jedným ťuknutím"]);
  if(document.querySelector('#app [data-fsec="sluzby"]'))L.push(["sluzby","Služby strojmi","žatva, pôda, sejba"]);
  if(document.querySelector('#app [data-fsec="viac"]'))L.push(["viac","Ďalšie","poznámky a ciele"]);
  return `<div class="ftiles" data-fsec="home">${L.map((t,i)=>`<button type="button" class="ftile${t[3]?" fbig":""}" data-fv="${t[0]}" style="--i:${i}"><i class="fdsh"></i><img src="img/ico/${IC[t[0]]}.png" alt="" width="56" height="56" draggable="false"><b>${E(t[1])}</b><small>${t[2]}</small></button>`).join("")}</div>`}
// ---------- predaj krok za krokom ----------
function wizard(){const F=F_(),P=(STATE.prices||[]).filter(p=>p.price!=null&&p.price>0);const dn=String(F.firma||"ERNTE").toUpperCase()==="DANUBE";
  if(W.sent)return `<div class="fwz" data-fsec="predat"><div class="fok"><img src="img/ico/deals.png" alt="" width="84" height="84"><b>Odoslané ✅</b><p>${E(comName(W.sent.com))} · ${N(W.sent.tons)} t. Váš obchodník sa vám ozve${W.sent.need?` a dohodne odvoz na ${E(dSK2(W.sent.date))} ${E(W.sent.time||"")}`:""}.</p></div><div class="fcts">${ctHTML()}</div><button type="button" class="lime fwgo" data-fvhome>← Späť na začiatok</button></div>`;
  const p=P.find(x=>x.com===W.com),fw=W.com&&window.fwdList?fwdList(W.com):[];
  let h=`<div class="fwz" data-fsec="predat"><div class="fst"><span class="fsn">1</span><b>Čo chcete predať?</b></div><div class="fcoms">${P.map(x=>`<button type="button" class="fcom${x.com===W.com?" on":""}" data-wcom="${E(x.com)}">${comImg(x.com,"fci")}<b>${E(comName(x.com))}</b><em>${N(x.price,0)} €/t</em></button>`).join("")||`<div class="s">Cenník sa práve pripravuje – zavolajte obchodníkovi.</div>`}</div>`;
  if(!W.com)return h+`</div>`;
  h+=`<div class="fst" id="fs2"><span class="fsn">2</span><b>Koľko ton?</b></div><div class="fqt">${[25,50,100,200,500].map(t=>`<button type="button" class="${+W.tons===t?"on":""}" data-wt="${t}">${t} t${t===25?"<small>1 kamión</small>":""}</button>`).join("")}</div>
   <label class="fin">alebo napíšte presne<input data-wf="tons" inputmode="decimal" value="${E(W.tons)}" placeholder="napr. 80" autocomplete="off"></label>`;
  if(!(+String(W.tons).replace(",",".")>0))return h+`</div>`;
  h+=`<div class="fst" id="fs3"><span class="fsn">3</span><b>Kedy odber?</b></div><div class="fhv">
   <button type="button" class="${W.harvest==="stara"?"on":""}" data-wh="stara"><img src="img/ico/pkg.png" alt="" width="44" height="44"><b>Stará úroda – mám na sklade</b><small>odvoz hneď · ${N(p.price,0)} €/t</small></button>
   ${fw.length?fw.map((x,i)=>`<button type="button" class="${W.harvest==="nova"&&W.fwd===i?"on":""}" data-wh="nova" data-wfw="${i}"><img src="img/ico/sheaf.png" alt="" width="44" height="44"><b>Nová úroda · odber ${E(x.p)}</b><small>${N(x.price,0)} €/t</small></button>`).join("")
     :`<button type="button" class="${W.harvest==="nova"?"on":""}" data-wh="nova"><img src="img/ico/sheaf.png" alt="" width="44" height="44"><b>Nová úroda (po žatve)</b><small>cenu potvrdí obchodník</small></button>`}</div>`;
  if(!W.harvest)return h+`</div>`;
  h+=`<div class="fst" id="fs4"><span class="fsn">4</span><b>Odvoz</b></div><div class="fneed"><button type="button" class="${W.need?"on":""}" data-wn="1"><img src="img/ico/fleet.png" alt="" width="44" height="44"><b>Pošlite kamión</b></button><button type="button" class="${!W.need?"on":""}" data-wn="0"><img src="img/ico/agro.png" alt="" width="44" height="44"><b>Dovezieme sami</b></button></div>
   ${W.need?`<div class="fdt"><label class="fin">Deň<input type="date" data-wf="date" min="${td()}" value="${E(W.date)}"></label><label class="fin">Čas<input type="time" data-wf="time" value="${E(W.time)}"></label></div><label class="fin">Kde naložiť (nepovinné)<input data-wf="place" value="${E(W.place)}" placeholder="napr. sklad na farme" autocomplete="off"></label>`:""}`;
  if(W.need&&!W.date)return h+`<div class="s fhint">👆 Vyberte deň odvozu.</div></div>`;
  const fwx=W.harvest==="nova"&&W.fwd!=null?fw[W.fwd]:null,price=W.harvest==="nova"?(fwx?fwx.price:null):p.price,tons=+String(W.tons).replace(",",".");
  h+=`<div class="fst" id="fs5"><span class="fsn">5</span><b>Skontrolujte a odošlite</b></div><div class="fsum">
   <div><span>Komodita</span><b>${E(comName(W.com))}</b></div><div><span>Množstvo</span><b>${N(tons)} t</b></div>
   <div><span>Cena</span><b>${price?N(price,0)+" €/t FCA":"potvrdí obchodník"}</b></div><div><span>Úroda</span><b>${W.harvest==="stara"?"stará – na sklade":"nová"+(fwx?" · odber "+E(fwx.p):"")}</b></div>
   <div><span>Odvoz</span><b>${W.need?E(dSK2(W.date))+" o "+E(W.time||"–"):"dovezieme sami"}</b></div>
   <div><span>Kupujúci</span><b>${dn?"Danube Commodities Kft.":"ERNTE spol. s r.o."}</b></div>
   <div><span>Zmluva</span><b>${E(window.contractLangLabel?contractLangLabel(F):"SK")} <button type="button" class="clangb" data-clf="${E(F.id)}" data-noi18n>🌐 zmeniť</button></b></div>
   ${price&&tons?`<div class="ftot"><span>Spolu približne</span><b>${N(price*tons,0)} €</b></div>`:""}</div>
   <button type="button" class="lime fsend" data-wsend ${W.busy?"disabled":""}>${W.busy?"Odosielam…":"📤 Odoslať obchodníkovi"}</button></div>`;
  return h}
const dSK2=d=>{const m=String(d||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${+m[3]}. ${+m[2]}. ${m[1]}`:""};
// sprievodca je stále ten istý prvok – prekreslenie z pozadia (formkeep, obnovenie) ho iba vráti späť, ťuknutie sa nestratí
let WZ=null;function wzEl(){if(!WZ){WZ=document.createElement("div");WZ.className="fwz";WZ.dataset.fsec="predat";WZ.innerHTML=wizInner()}return WZ}
const wizInner=()=>{const d=document.createElement("div");d.innerHTML=wizard();return d.firstElementChild.innerHTML};
function paintWz(){const w=wzEl();const a=document.activeElement,k=a&&a.dataset&&a.dataset.wf,pos=k&&a.selectionStart;
  w.innerHTML=wizInner();
  if(k){const i=document.querySelector(`#app .fwz [data-wf="${k}"]`);if(i){i.focus();try{if(pos!=null)i.setSelectionRange(pos,pos)}catch(x){}}}}
const next=id=>setTimeout(()=>{const e=document.getElementById(id);if(e)e.scrollIntoView({behavior:"smooth",block:"start"})},60);
// ---------- zobrazenie ----------
function apply(){const app=document.getElementById("app"),F=F_();if(!app||!F)return;
  const hero=app.querySelector(":scope>.hero");if(!hero)return;
  hero.dataset.fsec="*";
  let bar=app.querySelector(":scope>.fvbar");
  if(FV!=="home"){const t=`<button type="button" data-fvhome>← Späť</button><b>${E(T[FV]||"")}</b>`;if(!bar){bar=document.createElement("div");bar.className="fvbar";bar.dataset.fsec="*";hero.after(bar)}if(bar.dataset.v!==FV){bar.innerHTML=t;bar.dataset.v=FV}}else if(bar)bar.remove();
  {const th=tiles();let hs=0;for(let i=0;i<th.length;i++)hs=(hs*31+th.charCodeAt(i))|0;const x=app.querySelector(":scope>.ftiles");
   if(!x||x.dataset.h!==String(hs)){const d=document.createElement("div");d.innerHTML=th;const el=d.firstElementChild;el.dataset.h=String(hs);if(x)x.replaceWith(el);else (bar||hero).after(el)}
   const y=app.querySelector(":scope>.ftiles");if(FV==="home"&&y&&hero.nextElementSibling!==y)hero.after(y)}
  if(FV==="predat"){const z=wzEl(),anc=app.querySelector(":scope>.fvbar")||hero;if(anc.nextElementSibling!==z)anc.after(z)}
  else{const z=app.querySelector(":scope>.fwz");if(z)z.remove()}
  if(FV==="kontakt"&&!app.querySelector(":scope>.fctc")){const d=document.createElement("div");d.className="card fctc";d.dataset.fsec="kontakt";d.innerHTML=`<div class="fcts">${ctHTML()}</div>`;(app.querySelector(":scope>.fvbar")||hero).after(d);loadCT().then(()=>{d.innerHTML=`<div class="fcts">${ctHTML()}</div>`})}
  let key="pre";for(const el of app.children){if(el.tagName==="H2"&&!el.dataset.fsec)el.dataset.fsec=secOf(el);
    if(el.tagName==="H2")key=el.dataset.fsec;else if(!el.dataset.fsec&&el.classList.contains("susbtn"))el.dataset.fsec="ceny";
    const k=el.dataset.fsec||(el.tagName==="H2"?key:key),show=k==="*"||k===FV||(FV==="home"&&(k==="pre"||k==="home"));
    if(el.dataset.fsec==null&&el.tagName!=="H2"&&key!=="pre")el.dataset.fsec=key;
    if(el.hidden!==!show)el.hidden=!show}}
function go(v){if(v===FV)return;FV=v;try{if(v!=="home")history.pushState({fv:v},"");}catch(x){}
  if(v==="predat"&&W.sent){Object.assign(W,{com:null,tons:"",harvest:null,fwd:null,need:true,date:"",place:"",sent:null})}if(v==="predat")paintWz();
  if(typeof renderFarmer==="function")renderFarmer();window.scrollTo({top:0,behavior:"instant"})}
window.farmGo=go;
window.farmSell=(c,t)=>{Object.assign(W,{com:c,tons:t?String(t):"",harvest:null,fwd:null,sent:null});if(FV!=="predat")go("predat");else paintWz();setTimeout(()=>{const e=document.getElementById(t?"fs3":"fs2");if(e)e.scrollIntoView({behavior:"smooth",block:"start"})},300)};
addEventListener("popstate",()=>{if(F_()&&FV!=="home"){FV="home";if(typeof renderFarmer==="function")renderFarmer()}});
// ťuknutie platí pre tlačidlo, na ktoré prst dopadol (keď sa stránka medzitým o kúsok posunie – zatvorenie klávesnice / kalendára)
const SELW="[data-fv],[data-fvhome],[data-wcom],[data-wt],[data-wh],[data-wn],[data-wsend]";let PD=null;
document.addEventListener("pointerdown",e=>{const t=e.target.closest&&e.target.closest(SELW);PD=t?{el:t,t:Date.now()}:null},true);
document.addEventListener("click",async e=>{if(!F_())return;let t=e.target.closest&&e.target.closest(SELW);if(!t&&PD&&Date.now()-PD.t<900&&PD.el.isConnected&&e.target.closest&&e.target.closest(".fwz,#app"))t=PD.el;PD=null;if(!t)return;e.preventDefault();
  if(t.dataset.fv){go(t.dataset.fv);return}
  if("fvhome" in t.dataset){if(history.state&&history.state.fv){history.back()}else{FV="home";renderFarmer()}return}
  if(t.dataset.wcom){W.com=t.dataset.wcom;W.harvest=null;W.fwd=null;paintWz();next("fs2");return}
  if(t.dataset.wt){W.tons=t.dataset.wt;paintWz();next("fs3");return}
  if(t.dataset.wh){W.harvest=t.dataset.wh;W.fwd=t.dataset.wfw!=null?+t.dataset.wfw:null;paintWz();next("fs4");return}
  if(t.dataset.wn){W.need=t.dataset.wn==="1";paintWz();if(!W.need)next("fs5");return}
  if("wsend" in t.dataset){if(W.busy)return;const F=F_(),p=(STATE.prices||[]).find(x=>x.com===W.com),fw=window.fwdList?fwdList(W.com):[],fwx=W.harvest==="nova"&&W.fwd!=null?fw[W.fwd]:null;
    const tons=+String(W.tons).replace(",",".");if(!(tons>0)){toast("Napíšte počet ton.");return}if(W.need&&!W.date){toast("Vyberte deň odvozu.");return}
    const note=[W.harvest==="stara"?"Stará úroda – na sklade":"Nová úroda"+(fwx?" · odber "+fwx.p:""),W.need?"Pošlite kamión":"Dovezie sám",window.contractLangLabel?"zmluva "+contractLangLabel(F):""].filter(Boolean).join(" · ");
    W.busy=1;paintWz();
    const row={farmer_id:F.id,kind:"sell",com:W.com,price:W.harvest==="nova"?(fwx?fwx.price:null):(p?p.price:null),tons,pickup_date:W.need?W.date:null,pickup_time:W.need?(W.time||null):null,place:W.need&&W.place?String(W.place).slice(0,200):null,note:note.slice(0,500),harvest:W.harvest,clang:window.contractLang?contractLang(F):null};
    let r=await sb.from("requests").insert(row);
    if(r.error&&/harvest|clang|column/i.test(r.error.message||"")){delete row.harvest;delete row.clang;r=await sb.from("requests").insert(row)}
    W.busy=0;if(r.error){paintWz();toast("Nepodarilo sa odoslať. Skúste znova alebo zavolajte obchodníkovi.",6000);return}
    W.sent={com:W.com,tons,need:W.need,date:W.date,time:W.time};loadCT().then(paintWz);paintWz();window.scrollTo({top:0,behavior:"smooth"});
    try{navigator.vibrate&&navigator.vibrate([30,40,30])}catch(x){}
    if(typeof loadFarmer==="function")loadFarmer().catch(()=>{});return}},true);
document.addEventListener("input",e=>{const k=e.target.dataset&&e.target.dataset.wf;if(!k||!F_())return;const was=+String(W.tons).replace(",",".")>0,wd=!!W.date;W[k]=e.target.value;
  if((k==="tons"&&was!==(+String(W.tons).replace(",",".")>0))||(k==="date"&&wd!==!!W.date))paintWz();
  if(k==="date"&&W.date)next("fs5")},true);
// ---------- obalenie renderFarmer ----------
function wrap(){const o=window.renderFarmer;if(typeof o!=="function"||o.__fapp)return false;
  const w=function(){const y0=window.scrollY;const r=o.apply(this,arguments);try{if(F_()){apply();if(FV!=="home"&&Math.abs(window.scrollY-y0)>2)window.scrollTo(0,y0);if(!CT)loadCT().then(()=>{if(FV==="kontakt"||W.sent)renderFarmer()})}}catch(x){console.warn(x)}return r};
  Object.keys(o).forEach(k=>{if(!(k in w))w[k]=o[k]});w.__fapp=1;window.renderFarmer=w;return true}
(function tw(n){if(!wrap()&&n<80)setTimeout(()=>tw(n+1),250)})(0);
// moduly, ktoré vkladajú karty neskôr (popisy, inštalácia…): pridelia sa do sekcie podľa predchádzajúceho nadpisu
let q=0;function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,400);return}
  new MutationObserver(()=>{if(!F_()||q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;apply()})}).observe(app,{childList:true})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
{const s=document.createElement("style");s.textContent=`
#app>[hidden]{display:none!important}
.ftiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0}
.ftile{position:relative;overflow:hidden;display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:150px;padding:16px 10px!important;border-radius:26px!important;text-align:center;color:#fff!important;
 background:linear-gradient(150deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 55%,rgba(124,92,255,.12))!important;border:1px solid rgba(255,255,255,.22)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 14px 34px rgba(0,0,0,.35)!important;backdrop-filter:blur(16px) saturate(150%);-webkit-backdrop-filter:blur(16px) saturate(150%)}
.ftile img{width:56px;height:56px;filter:drop-shadow(0 8px 10px rgba(0,0,0,.45));animation:ftbob 3.4s ease-in-out infinite;animation-delay:calc(var(--i)*-.45s)}
.ftile b{font:800 1.08rem/1.2 var(--f-head,system-ui)}.ftile small{font-size:.84rem;opacity:.85;line-height:1.3}
.ftile.fbig{grid-column:1/-1;min-height:170px;background:linear-gradient(140deg,rgba(182,255,59,.32),rgba(34,211,238,.18) 60%,rgba(124,92,255,.18))!important;border-color:rgba(182,255,59,.6)!important}
.ftile.fbig img{width:72px;height:72px}.ftile.fbig b{font-size:1.3rem}
.ftile .fdsh{position:absolute;inset:-40% -60%;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.22) 50%,transparent 60%);animation:ftsh 6s ease-in-out infinite;animation-delay:calc(var(--i)*.7s);pointer-events:none}
@keyframes ftbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes ftsh{0%,70%{transform:translateX(-60%)}100%{transform:translateX(60%)}}
.fvbar{display:flex;align-items:center;gap:12px;margin:10px 0 4px}.fvbar button{min-height:48px;padding:0 18px;border-radius:999px;font-weight:800}.fvbar b{font:800 1.15rem var(--f-head,system-ui)}
.fwz{display:grid;gap:10px;margin:8px 0 20px}.fst{display:flex;align-items:center;gap:10px;margin-top:10px;scroll-margin-top:80px}.fst b{font:800 1.1rem var(--f-head,system-ui)}
.fsn{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:var(--grad,linear-gradient(135deg,#d2ff6e,#22d3ee));color:#06110a;font-weight:900;flex:none}
.fcoms{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
.fcom,.fqt button,.fhv button,.fneed button{display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:64px;padding:10px!important;border-radius:20px!important;text-align:center;background:rgba(255,255,255,.07)!important;border:1.5px solid rgba(255,255,255,.18)!important;color:#fff!important}
.fcom .fci img{width:64px;height:64px;object-fit:cover;border-radius:16px}.fcom b{font-size:1rem}.fcom em{font-style:normal;font-weight:800;color:#d9ff8a}
.fcom.on,.fqt button.on,.fhv button.on,.fneed button.on{border-color:#b6ff3b!important;background:rgba(182,255,59,.18)!important;box-shadow:0 0 0 2px rgba(182,255,59,.35),0 8px 24px rgba(182,255,59,.22)!important}
.fqt{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px}.fqt button{font:800 1.15rem system-ui}.fqt small{font-size:.72rem;font-weight:600;opacity:.8}
.fhv,.fneed{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.fhv button b,.fneed button b{font-size:1rem;line-height:1.25}.fhv small{opacity:.85}
.fin{display:grid;gap:4px;font-size:.88rem;opacity:.95}.fin input{min-height:54px;font-size:1.15rem;border-radius:16px}.fdt{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fsum{display:grid;gap:0;border-radius:20px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);overflow:hidden}
.fsum>div{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.08);flex-wrap:wrap}.fsum>div:last-child{border-bottom:0}.fsum span{opacity:.75}.fsum b{text-align:right;display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.ftot{background:rgba(182,255,59,.12)}.ftot b{font-size:1.2rem;color:#d9ff8a}
.fsend,.fwgo{min-height:64px!important;font-size:1.2rem!important;border-radius:22px!important}
.fok{display:grid;justify-items:center;gap:8px;text-align:center;padding:20px 10px}.fok b{font:900 1.6rem var(--f-head,system-ui)}.fok p{margin:0;line-height:1.5}
.fcts{display:grid;gap:10px}.fct{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:14px;border-radius:20px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);color:#fff;text-decoration:none}
.fct.mine{border-color:rgba(182,255,59,.6);background:rgba(182,255,59,.10)}.fct span{display:grid;gap:1px;min-width:0}.fct small{opacity:.75}.fct b{font-size:1.08rem}.fct em{font-style:normal;opacity:.9;overflow-wrap:anywhere}
.fct i{font-style:normal;font-weight:800;padding:10px 14px;border-radius:999px;background:var(--grad,linear-gradient(135deg,#d2ff6e,#9be83a));color:#06110a;white-space:nowrap}
.fhint{text-align:center;opacity:.85}
@media (max-width:380px){.ftile{min-height:132px}.fct{grid-template-columns:auto 1fr}.fct i{grid-column:1/-1;text-align:center}}
@media (prefers-reduced-motion:reduce){.ftile img,.ftile .fdsh{animation:none}}
html[data-theme=light] .ftile,html[data-theme=light] .fcom,html[data-theme=light] .fct,html[data-theme=light] .fqt button,html[data-theme=light] .fhv button,html[data-theme=light] .fneed button{color:#0f172a!important}`;document.head.appendChild(s)}
})();
