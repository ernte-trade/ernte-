// ===== 💶 KEDY DOSTANEM ZAPLATENÉ (návrh Claude č. 4, schválil Martin) =====
// Dodávateľ (farmár aj obchodná firma) pri každej zmluve v „Moje obchody“ vidí jeden riadok o svojich peniazoch:
//   po prvom vážení „zúčtovanie pripravujeme · očakávaná úhrada do D“ → 🧾 „zúčtovanie pripravené · úhrada do D“ → ✔️ „zaplatené“.
// D = posledné váženie k zmluve (my_deliveries) + splatnosť z podmienok farmára (my_terms.splatnost, „dní od dodania“).
// Nič o odberateľoch ani maržiach. Iba keď má dodávateľ prístup k obchodom (fcan f_deals).
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const isF=()=>typeof FARMER!=="undefined"&&!!FARMER;
const P={at:0,busy:false,sp:null,last:{}};
const T=sk=>sk; /* preklad do HU/EN/DE robí lang.js (texty na obrazovke) */
const dSK=d=>d.toLocaleDateString("sk-SK",{day:"numeric",month:"numeric",year:"numeric"});
async function load(){if(P.busy||Date.now()-P.at<10*60e3)return;P.busy=true;
  try{const [t,v]=await Promise.all([sb.rpc("my_terms"),sb.rpc("my_deliveries")]);
    const td=t&&!t.error&&t.data?(Array.isArray(t.data)?t.data[0]:t.data):null;P.sp=td&&td.splatnost!=null?+td.splatnost:null;
    const L={};for(const x of ((v&&!v.error&&v.data)||[])){if(!x.deal_no||!x.day)continue;if(!L[x.deal_no]||x.day>L[x.deal_no])L[x.deal_no]=x.day}P.last=L}catch(x){}
  P.at=Date.now();P.busy=false;apply()}
function line(d){const st=d.status,del=+d.delivered_t||0,ld=P.last[d.no],due=ld&&P.sp!=null?new Date(new Date(ld+"T12:00:00").getTime()+P.sp*864e5):null;
  const dueTxt=due?T(` · úhrada do <b>${E(dSK(due))}</b>`):"";
  if(st==="zaplateny")return `<span class="fpy ok">✔️ ${T("Zaplatené")}</span>`;
  if(st==="fakturacia")return `<span class="fpy b">🧾 ${T("Zúčtovanie pripravené")}${dueTxt||T(" · úhrada podľa zmluvy")}</span>`;
  if((st==="odvezeny"||st==="odvoz")&&(del>0||ld))return `<span class="fpy">⏳ ${T("Zúčtovanie pripravíme po vážení")}${due?T(` · očakávaná úhrada do <b>${E(dSK(due))}</b>`):""}</span>`;
  return ""}
function apply(){if(!isF()||(window.fcan&&!fcan("f_deals")))return;const D=(typeof STATE!=="undefined"&&STATE.deals)||[];if(!D.length)return;
  if(Date.now()-P.at>10*60e3)load();
  for(const d of D){const b=document.querySelector(`#app [data-cpdf="${CSS.escape(String(d.id))}"]`);const card=b&&b.closest(".card");if(!card)continue;
    const h=line(d);let el=card.querySelector(":scope>.fpay");
    if(!h){if(el)el.remove();continue}
    if(!el){el=document.createElement("div");el.className="fpay";const k=card.querySelector(":scope>.kpis");if(k)k.after(el);else card.appendChild(el)}
    const html=`💶 ${T("Platba")}: ${h}`;if(el.innerHTML!==html)el.innerHTML=html}}
let q=0;const sched=()=>{if(q)return;q=1;(window.ernteSoon||requestAnimationFrame)(()=>{q=0;try{apply()}catch(x){}})};
function wrap(){const o=window.renderFarmer;if(typeof o!=="function"||o.__fpay)return;const w=function(){const r=o.apply(this,arguments);sched();return r};
  Object.keys(o).forEach(k=>{if(!(k in w))w[k]=o[k]});w.__fpay=1;window.renderFarmer=w}
setInterval(wrap,1500);wrap();
{const s=document.createElement("style");s.textContent=`.fpay{margin:8px 0 2px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid var(--line,rgba(255,255,255,.1));font-size:.86rem;line-height:1.4;overflow-wrap:anywhere}
.fpy.ok{color:#4ade80;font-weight:800}.fpy.b{color:#93c5fd}`;document.head.appendChild(s)}
})();
