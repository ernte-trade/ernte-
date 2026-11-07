// ===== 📋 ČAKÁ NA TEBA · 📥 VHOĎ SEM · 🧠 PRAVIDLÁ (iba Martin) =====
// 7. 11. 2026 17:49 PRÍKAZ MAJITEĽA „Všetko sprav“ (zjednodušenie aplikácie):
//  1) všetko, čo čaká na Martina, na jednom mieste hore na Prehľade – zoradené podľa termínu a peňazí, ✅ / ✕ priamo tu (caka_na_teba / caka_act –
//     tie isté funkcie a kontroly ako tlačidlá v sekciách), inak „Otvoriť ›“ = otvorí presne tú časť (ernteGo – ukáže iba ju)
//  3) 📥 Vhoď sem: fotka, PDF alebo Excel → Claude rozpozná, čo to je (vhod_scan), a otvorí správny formulár; nič sa neuloží bez ťuknutia
//  6) 🧠 návrhy pravidiel z tvojich rozhodnutí („toto vždy schvaľuješ – mám to robiť sám?“) + zoznam zapnutých pravidiel s Vypnúť
(function(){
const OK=()=>typeof window.MAIN_OK==="function"&&window.MAIN_OK()&&typeof ROLE!=="undefined"&&ROLE==="owner"&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST&&typeof sb!=="undefined"&&sb;
const E=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const f0=n=>Math.round(+n).toLocaleString("sk-SK");
const tst=(m,ms)=>{try{if(typeof toast==="function")toast(m,ms||5000)}catch(x){}};
const C={L:null,P:[],at:0,busy:false,all:false,err:"",act:{},msg:""};
async function load(force){if(!OK()||C.busy)return;if(!force&&C.at&&Date.now()-C.at<110e3)return;C.busy=true;C.at=Date.now();
  try{const [a,b]=await Promise.all([sb.rpc("caka_na_teba"),sb.rpc("pravidla_list")]);
    if(a.error)C.err=/caka_na_teba/.test(a.error.message)?"Zapne sa po aktualizácii databázy (pár minút).":a.error.message;else{C.err="";C.L=Array.isArray(a.data)?a.data:[]}
    if(!b.error&&Array.isArray(b.data))C.P=b.data}
  catch(x){if(C.L===null)C.err="📡 Bez signálu – skúsim znova."}
  C.busy=false;paint()}
const today=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime()};
const soon=x=>x.due?((Date.parse(x.due)-today())/864e5<=2?1:0):0;
function sorted(){return (C.L||[]).slice().sort((a,b)=>(soon(b)-soon(a))||((+b.eur||0)-(+a.eur||0))||((+b.p||0)-(+a.p||0)))}
function item(x){const k=x.k+"|"+x.id,st=C.act[k]||"";const dk=x.due?new Date(x.due).toLocaleDateString("sk-SK",{day:"numeric",month:"numeric"}):"";
  return `<div class="ckit${x.k==="pravidlo"?" ckrule":""}" data-ckk="${E(k)}"><div class="ckt"><b>${E(x.t)}</b>${x.eur?`<span class="ckeur">${f0(x.eur)} €</span>`:""}${dk?`<span class="ckdue">📅 ${E(dk)}</span>`:""}</div>
   ${x.s?`<small>${E(x.s)}</small>`:""}${st&&st!=="busy"?`<div class="ckerr">⚠️ ${E(st)}</div>`:""}
   <div class="ckb">${x.ok?`<button type="button" class="pri" data-ck="ok" data-k="${E(x.k)}" data-id="${E(x.id)}"${st==="busy"?" disabled":""}>${st==="busy"?"⏳ Chvíľu…":E(x.ok)}</button>`:""}${x.no?`<button type="button" data-ck="no" data-k="${E(x.k)}" data-id="${E(x.id)}"${st==="busy"?" disabled":""}>${E(x.no)}</button>`:""}${x.go?`<button type="button" data-ck="go" data-k="${E(x.k)}" data-id="${E(x.id)}">Otvoriť ›</button>`:""}</div></div>`}
function html(){if(!OK())return "";const L=sorted(),n=L.length,show=C.all?L:L.slice(0,6);
  const vh=`<label class="ckvh"><input type="file" id="ckFile" accept="image/*,application/pdf,.pdf,.xlsx,.xls,.xlsm,.csv,.docx,.txt" hidden>📥 Vhoď sem<small>fotka · PDF · Excel</small></label>`;
  return `<section class="card ckc" id="ckCard" data-nosec><div class="ckh"><div><b class="ckhd">📋 Čaká na teba${n?` <span class="cknum">${n}</span>`:""}</b><small>Všetko na schválenie na jednom mieste – zoradené podľa termínu a peňazí.</small></div>${vh}</div>
   ${C.msg?`<div class="ckok" role="status">${E(C.msg)}</div>`:""}
   ${C.L===null?`<div class="s">${C.err?E(C.err):"⏳ Načítavam…"}</div>`:n?show.map(item).join("")+(n>6?`<button type="button" class="ckall" data-ck="all">${C.all?"▲ Menej":`▼ Zobraziť všetko (${n})`}</button>`:""):`<div class="ckempty">✅ Nič nečaká – všetko je vybavené.</div>`}
   ${C.err&&C.L!==null?`<div class="ckerr">⚠️ ${E(C.err)}</div>`:""}
   ${C.P.length?`<details class="ckp"><summary>🧠 Pravidlá, ktoré robím sám (${C.P.length})</summary>${C.P.map(p=>`<div class="ckpr"><span>${E(p.t)}${p.n?` · použité ${p.n}×`:""}</span><button type="button" data-ck="off" data-k="${E(p.k)}">Vypnúť</button></div>`).join("")}</details>`:""}</section>`}
function place(){const app=document.getElementById("app");if(!app)return;let el=document.getElementById("ckCard");
  if(!OK()||typeof TAB==="undefined"||TAB!=="home"){if(el)el.remove();return}
  if(C.L===null&&!C.busy)load(true);
  const skip=e=>e.matches("nav.tabs,section.ehb,#rdSub,#spatBar,.rokbar,.secbar,.uvodb,script,style,.spatbar,#dmStale,#ernNew,#hlFoc");
  const first=[...app.children].find(e=>!skip(e)&&e.id!=="ckCard");
  if(!el){const d=document.createElement("div");d.innerHTML=html();el=d.firstElementChild;if(!el)return}
  if(first&&el.nextElementSibling!==first)app.insertBefore(el,first);else if(!first&&el.parentNode!==app)app.appendChild(el)}
function paint(){const el=document.getElementById("ckCard");if(!el){place();return}const d=document.createElement("div");d.innerHTML=html();const n=d.firstElementChild;if(!n){el.remove();return}
  const op=el.querySelector("details.ckp[open]");if(op){const x=n.querySelector("details.ckp");if(x)x.open=true}el.replaceWith(n)}
// otvoriť presne tú časť
function go(x){const g=x.go||{};if(g.obopen){const b=document.createElement("button");b.type="button";b.hidden=true;b.dataset.obopen="1";document.body.appendChild(b);b.click();b.remove();return}
  if(g.hash==="#posta"){if(window.leadReplies)window.leadReplies("v");return}
  if(g.hash==="#spolupraca"){if(window.ernteGo)window.ernteGo("deals","#osplCard","🤝 Spolupráca s odberateľmi");else location.hash="#spolupraca";return}
  if(g.hash==="#mastergood"){if(window.ernteGo)window.ernteGo("deals","#mzgCard","🐔 Agro-Somotor");else location.hash="#mastergood";return}
  if(g.tab){if(window.ernteGo)window.ernteGo(g.tab,g.sel||null,g.lab||"");else{try{const b=document.querySelector(`#app>nav.tabs [data-tab="${g.tab}"]`);if(b)b.click()}catch(e){}}}}
const CONF={cena:"Zverejniť novú cenu? Hneď ju uvidia farmári.",nad:"Schváliť cenu nad cenníkom? Farmár potom môže zmluvu podpísať.",pravidlo:"Zapnúť toto pravidlo? Kedykoľvek ho vypneš v Čaká na teba → 🧠 Pravidlá."};
document.addEventListener("click",async e=>{const t=e.target.closest&&e.target.closest("[data-ck]");if(!t||!OK())return;e.preventDefault();e.stopPropagation();
  const a=t.dataset.ck,k=t.dataset.k,id=t.dataset.id,x=(C.L||[]).find(z=>z.k===k&&String(z.id)===String(id));
  if(a==="all"){C.all=!C.all;paint();return}
  if(a==="go"){if(x)go(x);return}
  if(a==="off"){if(!confirm("Vypnúť toto pravidlo? Odteraz to zase pôjde k tebe na schválenie."))return;t.disabled=true;
    const r=await sb.rpc("pravidlo_off",{p_k:k});if(r.error){tst("⚠️ "+r.error.message,7000);t.disabled=false;return}tst("✅ Pravidlo vypnuté.");load(true);return}
  if(a==="ok"||a==="no"){if(!x)return;if(a==="ok"&&CONF[k]&&!confirm(CONF[k]))return;const key=k+"|"+id;C.act[key]="busy";paint();
    try{const r=await sb.rpc("caka_act",{p_k:k,p_id:String(id),p_ok:a==="ok"});if(r.error)throw new Error(r.error.message);
      delete C.act[key];C.L=(C.L||[]).filter(z=>!(z.k===k&&String(z.id)===String(id)));C.msg=(r.data&&r.data.msg)||(a==="ok"?"✅ Hotovo: ":"✕ Zamietnuté: ")+x.t.replace(/^\S+\s/,"");
      paint();setTimeout(()=>{C.msg="";paint()},6000);load(true);
      if(k==="cena"||k==="nad"||k==="odb"){try{if(typeof loadStaff==="function")setTimeout(()=>loadStaff().then(()=>{try{renderStaff()}catch(z){}}),400)}catch(z){}}}
    catch(err){C.act[key]=String(err.message||err).replace(/^.*?:\s*(?=[A-ZÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ⛔📵])/,"");paint()}}},true);

// ---------- 📥 Vhoď sem ----------
function fileData(file){return new Promise((ok,no)=>{if(file.type==="application/pdf"||/\.pdf$/i.test(file.name||"")){if(file.size>5e6)return no(new Error("PDF je väčšie ako 5 MB."));const r=new FileReader();r.onload=()=>ok({data:String(r.result).split(",")[1],mime:"application/pdf"});r.onerror=no;r.readAsDataURL(file);return}
  const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{const k=Math.min(1,1600/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
    c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);ok({data:c.toDataURL("image/jpeg",.85).split(",")[1],mime:"image/jpeg"})};im.onerror=()=>{URL.revokeObjectURL(u);no(new Error("Fotku sa nepodarilo otvoriť (skús JPG alebo PNG)."))};im.src=u})}
const KIND={cennik_odberatela:["🏷️","Cenník / ponuka odberateľa","Načítam ceny do formulára – skontroluješ a uložíš."],obchod_papier:["🤝","Obchod na papieri","Vyplním Uzatvoriť obchod – skontroluješ a uzavrieš."],
  peciatka:["🪪","Pečiatka farmára","Vyplním údaje farmára v Uzatvoriť obchod."],vazny_listok:["⚖️","Vážny lístok","Prečíta ho ERNTE AI a povie, čo s ním."],faktura:["🧾","Faktúra","Prečíta ju ERNTE AI a povie, čo s ňou."],
  zmluva:["📄","Zmluva","Prečíta ju ERNTE AI a povie, čo v nej je."],doprava:["🚛","Doklad k doprave","Prečíta ho ERNTE AI."],ine:["📎","Iný dokument","Prečíta ho ERNTE AI."]};
function sheet(h){let o=document.getElementById("ckSheet");if(!h){if(o)o.remove();return}
  if(!o){o=document.createElement("div");o.id="ckSheet";o.className="ckov";o.addEventListener("click",ev=>{if(ev.target===o)sheet(null)});document.body.appendChild(o)}
  o.innerHTML=`<div class="cks" role="dialog" aria-label="Vhoď sem"><div class="cksh"><b>📥 Vhoď sem</b><button type="button" class="ckx" data-ckv="x" aria-label="Zavrieť">✕</button></div>${h}</div>`}
let VF=null;
async function toAI(file,why){if(!window.aiAskWith||!window.aiReadFile){tst("ERNTE AI sa nenačítala – skús znova.",6000);return}
  try{const a=await window.aiReadFile(file);sheet(null);window.aiAskWith((why?why+" ":"")+"Povedz mi stručne, čo je v tomto súbore dôležité a čo s tým mám v aplikácii ERNTE urobiť (kde to zapísať). Nič neukladaj ani neodosielaj.",[a])}
  catch(x){sheet(`<div class="ckerr">⚠️ ${E(x.message||x)}</div>`)}}
async function route(kind,file){VF=null;sheet(null);
  if(kind==="cennik_odberatela"){if(window.sellScanFile&&window.sellScanFile(file))return;}
  if((kind==="obchod_papier"||kind==="peciatka")&&!/pdf/i.test(file.type)){if(window.qdPhoto&&window.qdPhoto(file,kind==="peciatka"?"peciatka":"papier"))return}
  const K=KIND[kind]||KIND.ine;toAI(file,`Toto je ${K[1].toLowerCase()}.`)}
function chooser(file,res){VF=file;const g=res&&res.druh,K=KIND[g]||null;
  sheet(`${K?`<div class="ckguess">🤖 Je to <b>${E(K[1])}</b>${res.popis?`<small>${E(res.popis)}</small>`:""}</div>`:`<div class="s">Neviem s istotou, čo to je – vyber:</div>`}
   <div class="ckch">${Object.entries(KIND).filter(([k])=>!K||k===g||["cennik_odberatela","obchod_papier","peciatka","ine"].includes(k)).map(([k,v])=>`<button type="button" class="${k===g?"pri":""}" data-ckv="${k}"><span>${v[0]}</span><b>${E(v[1])}</b><small>${E(v[2])}</small></button>`).join("")}</div>`)}
async function vhod(file){if(!file)return;const n=String(file.name||""),ext=(n.split(".").pop()||"").toLowerCase();
  sheet(`<div class="s">⏳ Pozerám, čo je „${E(n||"súbor")}“…</div>`);
  try{
    if(/^(xlsx|xls|xlsm|csv)$/.test(ext)){const X=await fcXlsxLib();const wb=X.read(await file.arrayBuffer(),{type:"array",cellDates:false});
      const rk=window.odbParseRek?window.odbParseRek(X,wb):null;
      if(rk&&rk.length){sheet(`<div class="ckguess">🧾 Je to <b>vyhodnotenie reklamácie od odberateľa</b><small>${rk.length} lístkov.</small></div><div class="s">Reklamácie sa nahrávajú samé, keď prídu e-mailom na <b>erntespol@gmail.com</b> (aj s fotkami). Prepošli tam e-mail od Agro-Somotora – do 15 minút bude v Zúčtovaní farmára.</div><div class="ckch"><button type="button" data-ckv="ine"><span>🤖</span><b>Aj tak nech ho prečíta ERNTE AI</b><small>iba vysvetlenie, nič sa neuloží</small></button></div>`);VF=file;return}
      const r=window.odbParseWB?window.odbParseWB(X,wb):null;
      if(r&&r.rows&&r.rows.length){sheet(null);if(window.zuctSec)window.zuctSec("odb");const b=document.querySelector('#app>nav.tabs [data-tab="zuct"]');if(b)b.click();else{try{TAB="zuct";renderStaff()}catch(x){}}
        let i=0;const w=()=>{const inp=document.getElementById("odFile");if(inp){try{const dt=new DataTransfer();dt.items.add(file);inp.files=dt.files;inp.dispatchEvent(new Event("change",{bubbles:true}));inp.closest(".card,section,div").scrollIntoView({block:"start",behavior:"smooth"});tst(`⚖️ Vážne lístky odberateľa (${r.rows.length}) – skontroluj a ťukni Nahrať.`,7000)}catch(x){tst("Vyber súbor ešte raz tlačidlom 📂 Vybrať Excel.",7000)}return}if(++i<30)setTimeout(w,150)};setTimeout(w,200);return}
      return toAI(file,"Toto je Excel.")}
    if(/^(docx|txt|doc)$/.test(ext))return toAI(file,"");
    const f=await fileData(file);const s=await sb.rpc("vhod_scan",{p_data:f.data,p_mime:f.mime,p_name:n||null});if(s.error)throw new Error(s.error.message);
    const sid=s.data,t0=Date.now();let g=null;while(Date.now()-t0<75e3){await new Promise(z=>setTimeout(z,2000));g=await sb.rpc("sell_scan_get",{sid});if(g.error)throw new Error(g.error.message);if(g.data.status!=="wait")break}
    const res=g&&g.data&&g.data.status==="ok"?g.data.result||{}:null;
    if(res&&KIND[res.druh]&&res.istota==="vysoka"&&res.druh!=="ine"){tst(`🤖 ${KIND[res.druh][0]} ${KIND[res.druh][1]} – ${KIND[res.druh][2]}`,6000);return route(res.druh,file)}
    chooser(file,res)}
  catch(x){VF=file;sheet(`<div class="ckerr">⚠️ ${E(String(x.message||x).replace(/^.*?:\s*(?=[A-ZÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ])/,""))}</div><div class="s">Vyber, čo to je:</div><div class="ckch">${Object.entries(KIND).filter(([k])=>["cennik_odberatela","obchod_papier","peciatka","ine"].includes(k)).map(([k,v])=>`<button type="button" data-ckv="${k}"><span>${v[0]}</span><b>${E(v[1])}</b></button>`).join("")}</div>`)}}
window.ernteVhod=f=>{if(OK())vhod(f)};
document.addEventListener("change",e=>{const t=e.target;if(!t||t.id!=="ckFile")return;const f=t.files&&t.files[0];t.value="";if(f&&OK())vhod(f)},true);
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-ckv]");if(!t)return;e.preventDefault();const v=t.dataset.ckv;if(v==="x"){VF=null;sheet(null);return}if(VF)route(v,VF)},true);
// potiahnuť súbor na Prehľad (počítač)
document.addEventListener("dragover",e=>{if(OK()&&typeof TAB!=="undefined"&&TAB==="home"&&e.dataTransfer&&[...e.dataTransfer.types].includes("Files"))e.preventDefault()});
document.addEventListener("drop",e=>{if(!OK()||typeof TAB==="undefined"||TAB!=="home"||!e.dataTransfer||!e.dataTransfer.files||!e.dataTransfer.files.length)return;if(e.target.closest&&e.target.closest("input,textarea"))return;e.preventDefault();vhod(e.dataTransfer.files[0])});

// ---------- obnova ----------
let q=0;const sch=()=>{if(q)return;q=1;(window.ernteSoon||requestAnimationFrame)(()=>{q=0;try{place()}catch(x){}})};
(function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch()})();
setInterval(()=>{if(OK()&&!document.hidden&&typeof TAB!=="undefined"&&TAB==="home")load(false)},120e3);
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&OK())load(false)});
window.ernteCakaReload=()=>load(true);
{const s=document.createElement("style");s.textContent=`
.ckc{display:grid;gap:8px;min-width:0;border:1px solid rgba(182,255,59,.55)!important}
.ckh{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:10px;min-width:0}.ckh>div{display:grid;gap:2px;min-width:0;flex:1 1 210px}.ckh small{opacity:.75;line-height:1.35}
.ckhd{font-size:1.08rem;line-height:1.25}.cknum{display:inline-grid;place-items:center;min-width:26px;height:26px;padding:0 7px;border-radius:999px;background:#b6ff3b;color:#05210f;font-size:.85rem;font-weight:900;vertical-align:1px}
.ckvh{flex:none;display:grid;place-items:center;text-align:center;gap:0;min-width:96px;min-height:52px;padding:6px 10px;border-radius:14px;cursor:pointer;font-weight:800;font-size:.9rem;line-height:1.15;
 border:1px dashed rgba(94,234,212,.75);background:rgba(94,234,212,.10);color:inherit}.ckvh small{font-weight:600;font-size:.68rem;opacity:.8}
.ckit{display:grid;gap:4px;padding:10px 12px;border-radius:14px;border:1px solid rgba(148,163,184,.25);background:rgba(255,255,255,.03);min-width:0}
.ckit.ckrule{border-color:rgba(124,196,255,.55);background:rgba(124,196,255,.07)}
.ckt{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;min-width:0}.ckt b{min-width:0;overflow-wrap:anywhere;line-height:1.3;flex:1 1 220px}
.ckeur,.ckdue{flex:none;font-size:.78rem;font-weight:800;padding:2px 8px;border-radius:999px;background:rgba(255,207,90,.16);color:#ffcf5a}.ckdue{background:rgba(34,211,238,.14);color:#22d3ee}
.ckit small{opacity:.8;line-height:1.4;overflow-wrap:anywhere}
.ckb{display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:6px;margin-top:2px}.ckb button{min-height:44px;padding:4px 8px;font-weight:700;font-size:.88rem;white-space:normal;line-height:1.15;min-width:0}
.ckerr{color:#ff6b81;font-size:.85rem;overflow-wrap:anywhere}.ckok{color:#5eead4;font-weight:700;overflow-wrap:anywhere}.ckempty{padding:8px 2px;font-weight:700;color:#5eead4}
.ckall{min-height:44px;font-weight:700}
.ckp summary{cursor:pointer;min-height:40px;display:flex;align-items:center;font-weight:700}.ckpr{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid rgba(148,163,184,.18)}.ckpr span{min-width:0;overflow-wrap:anywhere}.ckpr button{flex:none;min-height:40px}
.ckov{position:fixed;inset:0;z-index:9600;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}
.cks{width:min(100%,640px);max-height:88vh;overflow:auto;padding:16px 14px calc(env(safe-area-inset-bottom,0px) + 18px);border-radius:22px 22px 0 0;background:linear-gradient(160deg,rgba(30,36,52,.98),rgba(16,20,30,.98));border:1px solid rgba(255,255,255,.16);color:#fff;display:grid;gap:10px}
.cksh{display:flex;align-items:center;justify-content:space-between;gap:10px}.cksh b{font-size:1.1rem}.ckx{width:44px;height:44px;border-radius:50%;padding:0;flex:none}
.ckguess{display:grid;gap:3px;padding:10px 12px;border-radius:14px;background:rgba(182,255,59,.08);border:1px solid rgba(182,255,59,.4)}.ckguess small{opacity:.8}
.ckch{display:grid;gap:8px}.ckch button{display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 10px;align-items:center;text-align:left;min-height:56px;padding:8px 12px;border-radius:14px;white-space:normal}
.ckch button span{grid-row:1/3;font-size:1.4rem}.ckch button b{min-width:0;overflow-wrap:anywhere}.ckch button small{grid-column:2;opacity:.8;font-size:.78rem;overflow-wrap:anywhere}`;document.head.appendChild(s)}
})();
