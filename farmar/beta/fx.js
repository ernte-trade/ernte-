// ===== 💱 KURZ ECB EUR / HUF (6. 11. príkaz majiteľa) =====
// fx_get() z databázy (fx_rates, pg_cron `kurz-ecb`) → window.ernteFx {d, rates, conv(suma, z, do)} pre ostatné moduly
// a karta „💱 Kurz ECB“ s prepočtom € ⇄ Ft v záložke Danube Trade (kto ju vidí – majitelia, Jozsef).
(function(){
const IN=()=>typeof sb!=="undefined"&&sb&&typeof ME!=="undefined"&&!!ME;
const E=x=>String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const N=(v,d)=>Number(v).toLocaleString("sk-SK",{minimumFractionDigits:d,maximumFractionDigits:d});
const dd=d=>d?new Date(d+"T12:00").toLocaleDateString("sk-SK",{day:"numeric",month:"numeric",year:"numeric"}):"";
let F=null,busy=false,at=0;const C={eur:"",huf:""};
window.ernteFx={get d(){return F&&F.d},get rates(){return (F&&F.rates)||{}},
  conv(a,from,to){const r=(F&&F.rates)||{},R=c=>String(c).toUpperCase()==="EUR"?1:+r[String(c).toUpperCase()];const x=R(from),y=R(to);return a==null||!x||!y?null:a/x*y}};
/* pri chybe / prázdnej odpovedi najviac raz za 2 min (inak by sa volalo dokola – ako ochrana.js 2. 11.) */
async function load(f){if(busy||!IN()||(!f&&Date.now()-at<(F?3600e3:120e3)))return;busy=true;at=Date.now();try{const r=await sb.rpc("fx_get");if(!r.error&&r.data&&r.data.d)F=r.data}catch(x){}busy=false;at=Date.now();paint()}
function card(){if(!F||!F.rates||!F.rates.HUF)return `<div class="card fxc" id="fxCard"><b>💱 Kurz ECB</b><p class="s">Kurz sa načítava – Európska centrálna banka ho zverejňuje v pracovné dni okolo 16:00.</p></div>`;
  const h=+F.rates.HUF,p=F.prev&&+F.prev.HUF,df=p?h-p:null;
  return `<div class="card fxc" id="fxCard"><div class="fxh"><b>💱 Kurz ECB · ${E(dd(F.d))}</b><span class="fxr">1 € = <b>${E(N(h,2))} Ft</b>${df!=null&&Math.abs(df)>=0.005?` <small class="${df>0?"up":"dn"}">${df>0?"▲":"▼"} ${E(N(Math.abs(df),2))}</small>`:""}</span></div>
   <div class="fxk"><label><span>€</span><input type="text" inputmode="decimal" data-fxin="eur" value="${E(C.eur)}" placeholder="napr. 200" autocomplete="off"></label><span class="fxeq">⇄</span><label><span>Ft</span><input type="text" inputmode="decimal" data-fxin="huf" value="${E(C.huf)}" placeholder="napr. 77 000" autocomplete="off"></label></div>
   <p class="s">Referenčný kurz Európskej centrálnej banky (1 000 Ft = ${E(N(1000/h,2))} €). Na faktúry v Maďarsku platí kurz podľa zákona o DPH – ten potvrdí účtovníčka.</p></div>`}
function paint(){try{if(!IN()||typeof TAB==="undefined"||TAB!=="danube"){return}const app=document.getElementById("app");if(!app)return;
  const h=card();let o=document.getElementById("fxCard");
  if(o){if(o.dataset.h!==h&&!(document.activeElement&&o.contains(document.activeElement))){const t=document.createElement("div");t.innerHTML=h;const n=t.firstElementChild;n.dataset.h=h;o.replaceWith(n)}}
  else{const t=document.createElement("div");t.innerHTML=h;const n=t.firstElementChild;n.dataset.h=h;const a=app.querySelector(":scope > nav.tabs")||app.querySelector(".hero");if(a)a.after(n);else app.prepend(n)}
  load()}catch(x){}}
const num=s=>{const v=parseFloat(String(s).replace(/\s/g,"").replace(",","."));return Number.isFinite(v)?v:null};
document.addEventListener("input",e=>{const i=e.target.closest&&e.target.closest("[data-fxin]");if(!i||!F||!F.rates||!F.rates.HUF)return;const h=+F.rates.HUF,c=i.closest("#fxCard");if(!c)return;
  const v=num(i.value),o=c.querySelector(`[data-fxin="${i.dataset.fxin==="eur"?"huf":"eur"}"]`);C[i.dataset.fxin]=i.value;
  const out=v==null?"":i.dataset.fxin==="eur"?N(v*h,0):N(v/h,2);if(o){o.value=out;C[o.dataset.fxin]=out}});
let q=0;new MutationObserver(()=>{if(q)return;q=1;(window.ernteSoon||requestAnimationFrame)(()=>{q=0;paint()})}).observe(document.documentElement,{childList:true,subtree:true});
setTimeout(()=>load(),5000);
{const s=document.createElement("style");s.textContent=`.fxc{display:grid;gap:8px}.fxh{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.fxr small{font-size:.75rem}.fxr .up{color:#10B981}.fxr .dn{color:#EF4444}
.fxk{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:8px;align-items:center}.fxk label{display:flex;align-items:center;gap:6px;min-width:0}.fxk label span{font-weight:800}.fxk input{flex:1;min-width:0;min-height:48px;font-size:1.05rem}.fxeq{opacity:.7;font-size:1.2rem}`;document.head.appendChild(s)}
})();
