// ===== 💾 ROZPÍSANÉ FORMULÁRE V TELEFÓNE · 📤 ODOSLANIE PO NÁVRATE SIGNÁLU (6. 11. príkaz majiteľa „Offline Auto-Save – bez straty jediného písmena“) =====
// • Každý formulár s pevným kľúčom (id alebo prvý data-atribút – ako formkeep.js) sa pri písaní ukladá do telefónu (localStorage, pre každého zvlášť).
//   Keď sa ten istý formulár znova otvorí prázdny (zatvorená aplikácia, vybitý telefón), vyplní sa sám a ukáže sa „↩️ Doplnené z rozpísaného · ✕ Zahodiť“ (12 h).
// • Bez signálu (navigator.onLine = false) sa formulár NEODOŠLE do prázdna – uloží sa do fronty: „📡 Bez signálu – uložené v telefóne, odošlem samo“.
//   Po návrate signálu: ak je formulár stále na obrazovke, vyplní sa a odošle sám (tou istou cestou ako ťuknutie – kontroly ostávajú);
//   ak nie, hore je „📤 Neodoslané: … · Otvoriť · Zahodiť“. Požiadavka bez signálu z telefónu nikdy neodišla → žiadne dvojité zmluvy.
// • Heslá, kódy, PIN a súbory sa neukladajú nikdy.
(function(){
const IN=()=>typeof sb!=="undefined"&&sb&&typeof ME!=="undefined"&&!!ME&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST;
const EM=()=>String((typeof ME!=="undefined"&&ME&&ME.email)||"").toLowerCase();
const say=(t,ms)=>{if(typeof toast==="function")toast(t,ms||4000)};
const E=x=>String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const keyOf=f=>{if(f.id)return "#"+f.id;const a=[...f.attributes].find(a=>a.name.startsWith("data-")&&a.name!=="data-busy"&&a.name!=="data-fsh");return a?"["+a.name+"="+JSON.stringify(a.value)+"]":null};
const SECRET=el=>el.type==="password"||el.type==="file"||el.type==="hidden"||/pass|hesl|pin|otp|token|kluc|secret|code|kod/i.test(el.name||"")||el.autocomplete==="one-time-code";
const LK=k=>"ernte-fd:"+EM()+":"+k,QK=()=>"ernte-fq:"+EM();
const LS={get:k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch(x){return null}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(x){}},del:k=>{try{localStorage.removeItem(k)}catch(x){}}};
const OK=f=>IN()&&f&&f.tagName==="FORM"&&f.closest&&f.closest("#app")&&!f.closest(".wlc")&&!f.querySelector('input[type="password"]')&&!!keyOf(f);
function nameOf(f){const h=f.querySelector("legend,h2,h3,h4,summary,.t,b");const b=f.querySelector('button[type="submit"],button:not([type])');
  const t=(h&&h.textContent||b&&b.textContent||"formulár").replace(/\s+/g," ").trim();return t.length>48?t.slice(0,46)+"…":t}
function vals(f){const v={};let n=0;
  f.querySelectorAll("input,select,textarea").forEach(el=>{if(!el.name||SECRET(el)||el.disabled)return;
    if(el.type==="checkbox"||el.type==="radio"){if(el.checked!==el.defaultChecked){v[el.name+(el.type==="radio"?"="+el.value:"")]=el.checked;n++}}
    else if(el.tagName==="SELECT"){const di=[...el.options].findIndex(o=>o.defaultSelected);if(el.selectedIndex!==di&&!(di<0&&el.selectedIndex===0)){v[el.name]=el.value;n++}}
    else if(el.type!=="search"&&el.value!==el.defaultValue&&!/ERN-[A-Z]/.test(el.value)){v[el.name]=el.value;n++}});
  return n?v:null}
function fill(f,v){let n=0;for(const [k,val] of Object.entries(v)){
    if(k.includes("=")){const [nm,vv]=k.split("=");const el=[...f.querySelectorAll(`input[type="radio"]`)].find(x=>x.name===nm&&x.value===vv);if(el){el.checked=!!val;el.dispatchEvent(new Event("change",{bubbles:true}));n++}continue}
    const el=[...f.elements].find(x=>x.name===k);if(!el||SECRET(el))continue;
    if(el.type==="checkbox"){el.checked=!!val;el.dispatchEvent(new Event("change",{bubbles:true}))}else{el.value=val;el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}))}n++}
  return n}
const ago=t=>{const m=Math.round((Date.now()-t)/60000);return m<1?"práve teraz":m<60?`pred ${m} min`:`pred ${Math.round(m/60)} h`};
// ---------- priebežné ukladanie ----------
const T={};
function save(f){const k=keyOf(f);if(!k)return;clearTimeout(T[k]);T[k]=setTimeout(()=>{if(!document.body.contains(f))return;const v=vals(f);
  if(v)LS.set(LK(k),{v,at:Date.now(),tab:typeof TAB!=="undefined"?TAB:"",name:nameOf(f)});else LS.del(LK(k))},400)}
document.addEventListener("input",e=>{const f=e.target&&e.target.form;if(OK(f)&&e.isTrusted)save(f)},true);
document.addEventListener("change",e=>{const f=e.target&&e.target.form;if(OK(f)&&e.isTrusted)save(f)},true);
// ---------- obnova prázdneho formulára ----------
const DONE=new WeakSet(),SENTK={};
function restore(){if(!IN())return;document.querySelectorAll("#app form").forEach(f=>{if(DONE.has(f)||!OK(f))return;DONE.add(f);
  const k=keyOf(f);if(SENTK[k]&&Date.now()-SENTK[k]<20000)return;const d=LS.get(LK(k));if(!d||!d.v)return;if(Date.now()-d.at>12*3600e3){LS.del(LK(k));return}
  if(vals(f))return; /* niečo už je vyplnené (formkeep / človek) – nemeniť */
  if(QUEUE().some(q=>q.k===k))return;
  if(!fill(f,d.v))return;
  const c=document.createElement("div");c.className="fschip";c.innerHTML=`<span>↩️ Doplnené z rozpísaného (${E(ago(d.at))})</span><button type="button" data-fsx>✕ Zahodiť</button>`;c.dataset.k=k;f.prepend(c)})}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-fsx]");if(!b)return;e.preventDefault();const c=b.closest(".fschip"),f=c&&c.closest("form");
  if(c){LS.del(LK(c.dataset.k));c.remove()}if(f){f.reset();f.querySelectorAll("input,select,textarea").forEach(el=>el.dispatchEvent(new Event("input",{bubbles:true})))}},true);
// ---------- fronta bez signálu ----------
const QUEUE=()=>LS.get(QK())||[];const QSET=q=>{if(q.length)LS.set(QK(),q);else LS.del(QK());bar()};
document.addEventListener("submit",e=>{const f=e.target;if(!OK(f))return;const k=keyOf(f);
  if(navigator.onLine===false){e.preventDefault();e.stopImmediatePropagation();const v=vals(f)||{};const sb_=e.submitter;
    const q=QUEUE().filter(x=>x.k!==k);q.push({k,v,at:Date.now(),tab:typeof TAB!=="undefined"?TAB:"",name:nameOf(f),sub:sb_?{n:sb_.name||"",v:sb_.value||"",t:(sb_.textContent||"").trim().slice(0,40)}:null});QSET(q);
    LS.set(LK(k),{v,at:Date.now(),tab:typeof TAB!=="undefined"?TAB:"",name:nameOf(f)});
    say("📡 Bez signálu – uložené v telefóne. Odošlem samo, keď sa signál vráti.",6000);return}
  // online: koncept zmažeme, až keď formulár zmizne alebo sa vyprázdni (= uložené)
  SENTK[k]=Date.now();setTimeout(()=>{const g=findForm(k);if(!g||!vals(g))LS.del(LK(k))},4000)},true);
function findForm(k){try{return document.querySelector("#app form"+(k.startsWith("#")?k:k))}catch(x){return null}}
function submitNow(it){const f=findForm(it.k);if(!f)return false;fill(f,it.v||{});let b=null;
  if(it.sub)b=[...f.querySelectorAll("button,input[type=submit]")].find(x=>(it.sub.n&&x.name===it.sub.n&&x.value===it.sub.v)||(!it.sub.n&&(x.textContent||"").trim().slice(0,40)===it.sub.t));
  try{f.requestSubmit(b||undefined)}catch(x){try{f.requestSubmit()}catch(y){return false}}return true}
function flush(){if(!IN()||navigator.onLine===false)return;const q=QUEUE();if(!q.length)return;const left=[];
  for(const it of q){if(submitNow(it))say(`📤 Odoslané po návrate signálu: ${it.name}`,5000);else left.push(it)}QSET(left)}
addEventListener("online",()=>setTimeout(flush,1500));
function bar(){let b=document.getElementById("fsQ");const q=IN()?QUEUE():[];if(!q.length){if(b)b.remove();return}
  const h=`<b>📤 Neodoslané pre výpadok signálu</b>${q.map((it,i)=>`<div class="fsqi"><span>${E(it.name)}<small>${E(ago(it.at))}</small></span><button type="button" data-fsqo="${i}">Otvoriť</button><button type="button" data-fsqd="${i}" aria-label="Zahodiť">✕</button></div>`).join("")}`;
  if(!b){b=document.createElement("div");b.id="fsQ";b.setAttribute("role","status");document.body.appendChild(b)}if(b.dataset.h!==h){b.innerHTML=h;b.dataset.h=h}}
document.addEventListener("click",e=>{const o=e.target.closest&&e.target.closest("[data-fsqo],[data-fsqd]");if(!o)return;e.preventDefault();const q=QUEUE();
  if(o.dataset.fsqd!==undefined){const i=+o.dataset.fsqd;if(!confirm(`Zahodiť neodoslaný formulár „${(q[i]||{}).name||""}“?`))return;const it=q.splice(i,1)[0];if(it)LS.del(LK(it.k));QSET(q);return}
  const it=q[+o.dataset.fsqo];if(!it)return;
  const go=()=>{const f=findForm(it.k);if(!f){say("Formulár sa nenašiel – otvor ho ručne, údaje sa doplnia samy.",6000);return}fill(f,it.v||{});f.scrollIntoView({block:"center",behavior:"smooth"});
    QSET(QUEUE().filter(x=>x.k!==it.k));say(navigator.onLine===false?"Stále bez signálu – skontroluj a odošli, keď sa vráti.":"Skontroluj a ťukni Uložiť / Odoslať.",6000)};
  if(it.tab&&typeof TAB!=="undefined"&&TAB!==it.tab){const t=document.querySelector(`#app nav.tabs [data-tab="${CSS.escape(it.tab)}"]`);if(t)t.click();setTimeout(go,700)}else go()},true);
let q0=0;new MutationObserver(()=>{if(q0)return;q0=1;(window.ernteSoon||requestAnimationFrame)(()=>{q0=0;try{restore();bar()}catch(x){}})}).observe(document.documentElement,{childList:true,subtree:true});
setTimeout(()=>{try{flush();bar()}catch(x){}},4000);
{const s=document.createElement("style");s.textContent=`.fschip{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:6px 10px;margin:0 0 8px;border-radius:12px;border:1px solid rgba(6,182,212,.55);background:rgba(6,182,212,.1);font-size:.85rem}
.fschip span{flex:1 1 160px;min-width:0}.fschip button{min-height:40px;padding:0 12px;white-space:nowrap}
#fsQ{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom));z-index:2147481000;width:min(520px,calc(100vw - 16px));display:grid;gap:6px;padding:10px 12px;border-radius:14px;background:#0B0F19;color:#fff;border:1px solid #ffcf5a;box-shadow:0 10px 30px rgba(0,0,0,.5);font-size:.9rem}
.fsqi{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:6px;align-items:center}.fsqi span{overflow-wrap:anywhere}.fsqi small{display:block;opacity:.7;font-size:.75rem}.fsqi button{min-height:44px;padding:0 12px;white-space:nowrap}
.fsqi button[data-fsqd]{width:44px;padding:0;border-radius:50%}`;document.head.appendChild(s)}
})();
