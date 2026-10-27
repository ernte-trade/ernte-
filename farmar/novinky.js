// ===== ERNTE · NOVINKY – čo sa v aplikácii zmenilo, kde to je a kto to vidí =====
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const tst=(t,ms)=>(typeof toast==="function"?toast:alert)(t,ms);
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner";
const isF=()=>typeof FARMER!=="undefined"&&!!FARMER;
const dL=d=>new Date(String(d).slice(0,10)+"T12:00:00").toLocaleDateString("sk-SK",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
let N={L:null,busy:false,add:false,seen:0};
try{N.seen=+localStorage.getItem("ernte-nov-seen")||0}catch(x){}
const rr=()=>{if(isF()&&typeof renderFarmer==="function")renderFarmer();else if(typeof renderStaff==="function")renderStaff()};
async function load(){if(N.busy)return;N.busy=true;const r=await sb.from("app_novinky").select("*").order("d",{ascending:false}).order("id",{ascending:false}).limit(300);N.busy=false;
  N.L=r.error?[]:(r.data||[]);rr()}
window.novCnt=()=>{if(N.L===null){load();return 0}return N.L.filter(x=>x.id>N.seen).length};
function seenAll(){const m=Math.max(0,...(N.L||[]).map(x=>x.id));if(m>N.seen){N.seen=m;try{localStorage.setItem("ernte-nov-seen",String(m))}catch(x){}}}
const item=(x,isNew)=>`<div class="card nvi${isNew?" nvnew":""}"><div class="row"><b>${e(x.titul)}</b>${isNew?`<span class="pill w">nové</span>`:""}${OWN()?`<small class="nvz">${e(x.zdroj||"")}</small><button type="button" class="evmini" data-nvdel="${x.id}" aria-label="Zmazať">🗑️</button>`:""}</div>
  ${x.popis?`<p>${e(x.popis)}</p>`:""}<div class="nvm">${x.kde?`<span>📍 <b>Kde:</b> ${e(x.kde)}</span>`:""}${x.kto?`<span>👀 <b>Kto vidí:</b> ${e(x.kto)}</span>`:""}</div></div>`;
window.vNovinky=function(){if(N.L===null){load();return `<div class="card"><div class="s">Načítavam novinky…</div></div>`}
  const seen=N.seen;setTimeout(seenAll,1500);
  let h=`<div class="zt"><h2>🆕 Novinky v aplikácii</h2>`;
  if(OWN())h+=N.add?`<form class="card f nvf" id="nvF"><div class="w t">➕ Pridať novinku</div><label class="w">Názov<input name="titul" required></label><label>Kde to nájdu<input name="kde" placeholder="záložka → sekcia"></label>
    <label>Kto to vidí<input name="kto" placeholder="všetci / zamestnanci / vedúci / strojníci / farmári / majiteľ"></label><label class="w">Čo sa zmenilo<textarea name="popis" rows="3"></textarea></label>
    <div class="w btns"><button class="lime">💾 Uložiť</button><button type="button" data-nvadd>Zrušiť</button></div></form>`:`<div class="btns"><button type="button" data-nvadd>➕ Pridať novinku</button></div>`;
  if(!N.L.length)return h+`<div class="card"><div class="s">Zatiaľ žiadne novinky.</div></div></div>`;
  const G=new Map;for(const x of N.L){const k=String(x.d).slice(0,10);if(!G.has(k))G.set(k,[]);G.get(k).push(x)}
  for(const [d,A] of G)h+=`<h3 class="skh">${e(dL(d))} <small>${A.length}</small></h3><div class="agl">${A.map(x=>item(x,x.id>seen)).join("")}</div>`;
  return h+`</div>`};
// farmár – karta na hlavnej obrazovke (posledných 30 dní)
window.novFarmHTML=function(){if(N.L===null){load();return ""}const d0=new Date(Date.now()-30*864e5).toISOString().slice(0,10),L=N.L.filter(x=>String(x.d)>=d0).slice(0,6);if(!L.length)return "";
  const nw=L.filter(x=>x.id>N.seen).length;
  return `<details class="card nvfarm"${nw?" open":""}><summary>🆕 Novinky v aplikácii${nw?` <span class="cnt">${nw}</span>`:""}</summary>${L.map(x=>item(x,x.id>N.seen)).join("")}<div class="btns"><button type="button" data-nvseen>✓ Prečítané</button></div></details>`};
document.addEventListener("click",async ev=>{const g=s=>ev.target.closest&&ev.target.closest(s);let x;
  if(g("[data-nvadd]")){N.add=!N.add;rr();return}
  if(g("[data-nvseen]")){seenAll();rr();return}
  if(x=g("[data-nvdel]")){if(!confirm("Zmazať novinku?"))return;const r=await sb.from("app_novinky").delete().eq("id",+x.dataset.nvdel);if(r.error){tst("⚠️ "+r.error.message);return}N.L=N.L.filter(y=>y.id!==+x.dataset.nvdel);rr();return}});
document.addEventListener("submit",async ev=>{const f=ev.target;if(f.id!=="nvF")return;ev.preventDefault();const d=new FormData(f),kto=String(d.get("kto")||"").trim(),n=kto.toLowerCase();
  const aud=/všetci|vsetci/.test(n)?["all"]:["owner"].concat(/farm/.test(n)?["farmer"]:[],/zamest|tím|tim/.test(n)?["staff"]:[],/vedúc|veduc/.test(n)?["ev"]:[],/strojn|roľn|roln/.test(n)?["sklad","praca"]:[]);
  const r=await sb.from("app_novinky").insert({titul:String(d.get("titul")).trim(),kde:String(d.get("kde")||"").trim()||null,kto:kto||"majiteľ",aud,popis:String(d.get("popis")||"").trim()||null,zdroj:"majiteľ"}).select().single();
  if(r.error){tst("⚠️ "+r.error.message);return}N.L.unshift(r.data);N.add=false;tst("✓ Novinka pridaná.");rr()});
})();
