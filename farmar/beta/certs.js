// ===== 📜 CERTIFIKÁTY ERNTE (3. 11. 2026) – GMP+ a ISCC EU na stiahnutie / poslanie (tím, nie farmári) =====
// Súbory sú v databáze (firm_docs, firm_docs_list / firm_doc_get – owner alebo staff). Karta na Prehľade.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OK=()=>typeof ROLE!=="undefined"&&!!ROLE&&!(typeof FARMER!=="undefined"&&FARMER)&&!window.ERNTE_TEST&&typeof sb!=="undefined"&&!!sb;
const C={L:null,at:0,busy:false};
const dSK=d=>d?new Date(d+"T12:00:00").toLocaleDateString("sk-SK",{day:"numeric",month:"numeric",year:"numeric"}):"";
const left=d=>Math.round((new Date(d+"T00:00:00")-new Date(new Date().toDateString()))/864e5);
async function load(){if(C.busy||Date.now()-C.at<10*60e3)return;C.busy=true;C.at=Date.now();
  try{const r=await sb.rpc("firm_docs_list");C.L=r.error?[]:(r.data||[])}catch(x){C.L=[]}C.busy=false;paint()}
function card(){const L=C.L||[];if(!L.length)return "";
  return `<details class="card hsec certc"><summary><span>📜</span><b>Certifikáty ERNTE</b><small>GMP+ · ISCC EU – stiahnuť alebo poslať odberateľovi</small></summary><div class="certl">${L.map(c=>{const n=c.to?left(c.to):null,cl=n==null?"":n<0?"bad":n<=60?"warn":"ok";
    return `<div class="certi ${cl}"><b>${E(c.title)}</b><small>${E(c.no||"")}</small><small>${E(c.issuer||"")}${c.scope?" · "+E(c.scope):""}</small>
     <em>${n==null?"":n<0?"⛔ neplatný od "+E(dSK(c.to)):"✅ platný do "+E(dSK(c.to))+(n<=60?" · ⚠️ obnoviť (o "+n+" dní)":"")}</em>
     <div class="certb"><button type="button" class="lime" data-certdl="${E(c.id)}">⬇️ Stiahnuť PDF</button>${navigator.share?`<button type="button" data-certsh="${E(c.id)}">📤 Poslať</button>`:""}</div></div>`}).join("")}</div></details>`}
function paint(){const app=document.getElementById("app");if(!app||!OK()||typeof TAB==="undefined"||TAB!=="home")return;const h=card(),old=app.querySelector(".certc");
  if(old){if(old.dataset.h===h)return;const op=old.open;if(!h){old.remove();return}const w=document.createElement("div");w.innerHTML=h;const el=w.firstElementChild;el.dataset.h=h;el.open=op;old.replaceWith(el);return}
  if(!h)return;const w=document.createElement("div");w.innerHTML=h;const el=w.firstElementChild;el.dataset.h=h;
  const due=app.querySelector("#hs-due");if(due&&due.parentNode)due.parentNode.insertBefore(el,due.nextSibling);else app.appendChild(el)}
async function file(id){const r=await sb.rpc("firm_doc_get",{p_id:id});if(r.error||!r.data||!r.data.b64)throw new Error(r.error?r.error.message:"Súbor sa nenašiel.");
  const s=atob(r.data.b64),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return new File([u],r.data.fname||"Certifikát ERNTE.pdf",{type:r.data.mime||"application/pdf"})}
document.addEventListener("click",async e=>{const b=e.target.closest&&e.target.closest("[data-certdl],[data-certsh]");if(!b||!OK())return;e.preventDefault();
  if(typeof busy==="function")busy(b,true);
  try{const f=await file(b.dataset.certdl||b.dataset.certsh);
    if(b.dataset.certsh!==undefined&&navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:f.name})}catch(x){}}
    else{const a=document.createElement("a");a.href=URL.createObjectURL(f);a.download=f.name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000)}}
  catch(x){if(typeof toast==="function")toast("Nepodarilo sa: "+(x.message||x),6000)}
  if(typeof busy==="function")busy(b,false)},true);
{const s=document.createElement("style");s.textContent=`.certc .certl{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:8px;margin-top:8px}
.certc .certi{display:grid;gap:3px;text-align:center;padding:10px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);min-width:0}
.certc .certi small{opacity:.75;font-size:.8rem;overflow-wrap:anywhere}.certc .certi em{font-style:normal;font-size:.85rem}
.certc .certi.ok{border-color:rgba(182,255,59,.4)}.certc .certi.warn{border-color:rgba(251,191,36,.6)}.certc .certi.bad{border-color:rgba(239,68,68,.6)}
.certc .certb{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}.certc .certb>*{flex:1 1 130px;min-height:42px;white-space:normal}
html[data-theme=light] .certc .certi{border-color:rgba(0,0,0,.12);background:rgba(0,0,0,.03)}`;document.head.appendChild(s)}
let q=0;const sch=()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;try{if(OK()&&typeof TAB!=="undefined"&&TAB==="home"){if(C.L)paint();load()}}catch(x){}})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,600);return}new MutationObserver(sch).observe(app,{childList:true});sch()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
