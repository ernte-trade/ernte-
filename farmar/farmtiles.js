// ===== ERNTE · FARMÁR: DASHBOARD S DLAŽDICAMI HORE =====
// Hneď po prihlásení vidí farmár všetko, čo môže robiť – každá dlaždica ho prenesie na správne miesto (alebo rovno otvorí formulár).
// Zobrazí sa iba to, na čo má farmár prístup (fcan). Odvoz zmluvného tovaru a odvoz bez zmluvy sú oddelené.
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const F=k=>!window.fcan||fcan(k);
const f2=x=>typeof fmt==="function"?fmt(x):String(x);
const leftOf=d=>Math.max(0,(+d.tons||0)-(+d.delivered_t||0));
const okOrder=d=>["podpisany","odvoz"].includes(d.status)&&leftOf(d)>0;
function tiles(){if(typeof FARMER==="undefined"||!FARMER||typeof STATE==="undefined")return "";
  const D=STATE.deals||[],R=STATE.reqs||[],T=(STATE.trips||[]).filter(t=>!["vylozene","zrusena"].includes(t.status));
  const sign=D.filter(d=>d.status==="navrh").length,ord=D.filter(okOrder),left=ord.reduce((s,d)=>s+leftOf(d),0),open=R.filter(r=>r.status==="nova"||r.status==="v_spracovani").length;
  const nP=(STATE.prices||[]).length;
  const L=[];const add=(k,ic,t,sub,go,cls)=>L.push({k,ic,t,sub,go,cls});
  if(F("f_prices")&&F("f_sell"))add("sell","🌾","Predať komoditu",nP?nP+" komodít v cenníku":"cenník","h:Výkupné ceny");
  else if(F("f_prices"))add("prices","💶","Výkupné ceny",nP?nP+" komodít":"","h:Výkupné ceny");
  if(F("f_offer"))add("offer","💰","Navrhnúť cenu","vaša cena a fotky tovaru","offer");
  if(F("f_transport")){add("ordc","🚛","Odvoz zmluvného tovaru",ord.length?`${f2(left)} t na odvoz · prednosť`:"zatiaľ nie je čo odviezť","ordc",ord.length?"hot":"");
    add("ordf","🚚","Odvoz tovaru bez zmluvy","požiadať ERNTE","ordf")}
  if(sign)add("sign","✍️","Podpísať zmluvu",sign===1?"1 zmluva čaká":sign+" zmluvy čakajú","sign","warn");
  if(F("f_deals")||F("f_remain"))add("deals","📄","Moje obchody a zmluvy",D.length?D.length+" "+(D.length===1?"obchod":D.length<5?"obchody":"obchodov"):"zatiaľ žiadne","h:Moje obchody");
  add("reqs","📨","Moje požiadavky",open?open+" otvorené":R.length?"všetko vybavené":"zatiaľ žiadne","h:Moje požiadavky");
  if(F("f_trucks")&&T.length)add("trucks","🚦","Autá VALKO",T.length+" naplánované","h:Doprava VALKO");
  if(F("f_wx"))add("wx","🌦️","Počasie","24 h a 7 dní","h:Počasie");
  if(F("f_prices"))add("tgt","🎯","Moja cieľová cena","ozveme sa sami","h:Moja cieľová cena");
  add("calc","🧮","Kalkulačka sušenia","vlhkosť a nečistoty","calc");
  if(F("f_agro"))add("agro","🚜","Agro služby","stroje a cena","h:Agro služby");
  add("call","📞","Zavolať ERNTE",(typeof contact==="function"&&contact().phone)||"","call");
  return `<h2 class="ftl-h">Čo chcete urobiť?</h2><div class="ftl" role="list">${L.map(x=>`<button type="button" role="listitem" class="ftlb ${x.cls||""}" data-ftl="${e(x.go)}"><span class="ftli" aria-hidden="true">${x.ic}</span><b>${e(x.t)}</b>${x.sub?`<small>${e(x.sub)}</small>`:""}</button>`).join("")}</div>`}
function css(){if(document.getElementById("ftlCss"))return;const s=document.createElement("style");s.id="ftlCss";s.textContent=`
.ftl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:2px 0 6px}@media(min-width:620px){.ftl{grid-template-columns:repeat(3,minmax(0,1fr))}}
.ftlb{display:grid;align-content:start;justify-items:start;gap:3px;text-align:left;min-height:104px;padding:14px;border-radius:20px;white-space:normal;line-height:1.2}
.ftlb .ftli{font-size:1.7rem;line-height:1;margin-bottom:4px}.ftlb b{font-size:.98rem}.ftlb small{font-size:.76rem;opacity:.75;font-weight:500}
.ftlb.hot{border-color:rgba(182,255,59,.6)!important;box-shadow:0 0 0 1px rgba(182,255,59,.25) inset}.ftlb.warn{border-color:rgba(255,196,87,.7)!important}
.ftl-h{margin-top:6px}.ftl-flash{animation:ftlF 1.6s ease}@keyframes ftlF{0%,60%{box-shadow:0 0 0 3px rgba(182,255,59,.7)}100%{box-shadow:none}}`;document.head.appendChild(s)}
function inject(){if(typeof FARMER==="undefined"||!FARMER)return;const app=document.getElementById("app");if(!app||app.querySelector(".ftl"))return;css();
  const hero=app.querySelector(".hero");const box=document.createElement("div");box.innerHTML=tiles();if(!box.innerHTML)return;
  const anchor=hero||app.querySelector(".hrow");if(anchor)anchor.after(...box.childNodes);else app.prepend(...box.childNodes)}
// dlaždice vždy hneď pod menom farmára (iné moduly vkladajú svoje karty tiež za hlavičku)
function place(){const app=document.getElementById("app"),hero=app&&app.querySelector(".hero"),h=app&&app.querySelector("h2.ftl-h"),g=app&&app.querySelector(".ftl");if(!hero||!h||!g)return;
  if(hero.nextElementSibling===h&&h.nextElementSibling===g)return;hero.after(h,g)}
function wrap(){const o=window.renderFarmer;if(typeof o!=="function"||o.__ftl)return;const w=function(){const r=o.apply(this,arguments);try{inject();place();setTimeout(place,0);setTimeout(place,400)}catch(x){}return r};w.__ftl=1;Object.keys(o).forEach(k=>{try{if(!(k in w))w[k]=o[k]}catch(x){}});window.renderFarmer=w}
const t=setInterval(wrap,400);setTimeout(()=>clearInterval(t),60000);wrap();
function toH(txt){const H=[...document.querySelectorAll("#app h2")].find(h=>h.textContent.toLowerCase().includes(txt.toLowerCase())&&!h.classList.contains("ftl-h"));
  if(!H){if(typeof toast==="function")toast("Táto časť sa ešte načítava – skúste o chvíľu.");return}
  H.scrollIntoView({behavior:"smooth",block:"start"});const n=H.nextElementSibling;if(n){n.classList.remove("ftl-flash");void n.offsetWidth;n.classList.add("ftl-flash")}}
function toSel(sel){setTimeout(()=>{const el=document.querySelector(sel);if(el){el.scrollIntoView({behavior:"smooth",block:"start"});const i=el.querySelector("input,select");if(i)try{i.focus({preventScroll:true})}catch(x){}}},80)}
document.addEventListener("click",ev=>{const b=ev.target.closest&&ev.target.closest("[data-ftl]");if(!b)return;ev.preventDefault();const g=b.dataset.ftl;
  if(g.startsWith("h:"))return toH(g.slice(2));
  if(g==="offer"){if(window.offerOpen)offerOpen();return}
  if(g==="ordf"){try{ORDER="__free"}catch(x){}renderFarmer();return toSel("#fOrderFree")}
  if(g==="ordc"){const L=(STATE.deals||[]).filter(okOrder);if(!L.length){toH("Moje obchody");if(typeof toast==="function")toast("Zatiaľ nemáte podpísanú zmluvu s tovarom na odvoz. Použite „Odvoz tovaru bez zmluvy“.",6000);return}
    if(L.length===1){try{ORDER=L[0].id}catch(x){}renderFarmer();return toSel("#fOrder")}toH("Moje obchody");if(typeof toast==="function")toast("Pri zmluve ťuknite „Objednať odvoz“.",4000);return}
  if(g==="sign"){const d=(STATE.deals||[]).find(x=>x.status==="navrh");const s=d&&document.querySelector(`[data-fsign="${CSS.escape(d.id)}"],[data-agree="${CSS.escape(d.id)}"]`);if(s){s.click();return}return toH("Moje obchody")}
  if(g==="calc"){const s=document.querySelector("[data-susopen]");if(s){s.click();setTimeout(()=>{const c=document.querySelector(".card.sus,[data-susopen]");c&&c.scrollIntoView({behavior:"smooth",block:"start"})},150)}return}
  if(g==="call"){const p=typeof contact==="function"&&contact().phone;if(p)location.href="tel:"+String(p).replace(/\s/g,"");return}},true);
window.farmTilesHTML=tiles;
})();
