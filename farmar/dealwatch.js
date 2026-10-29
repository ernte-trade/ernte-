// ===== 📊 STRÁŽENIE NÁKUPOV (iba majiteľ) – klesá / drž / predaj, potvrdenie „Prečítal som“ =====
// Údaje: deal_watch_list() (databáza, deal_watch_tick každých 15 min posiela upozornenia). Karta v Obchodoch; na Prehľade iba keď niečo čaká.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER);
const nm=c=>{try{const m=(typeof MK!=="undefined"?MK:[]).find(x=>x[0]===c);if(m)return m[1]}catch(x){}return c};
const f0=n=>n==null||!isFinite(n)?"–":Math.round(n).toLocaleString("sk-SK");
const dk=d=>/^\d{4}-\d\d-\d\d/.test(d||"")?(+d.slice(8,10))+". "+(+d.slice(5,7))+".":"–";
const ST={fall:["📉","KLESÁ – nakúpené drahšie","r"],sell:["⚠️","PREDAJ – rast sa obracia","r"],termin:["⏰","PREDAJ – termín držania uplynul","r"],rise:["📈","DRŽ, NEPREDÁVAJ","ok"],ok:["⏸️","bez zmeny","n"]};
const D={L:null,at:0,busy:false};
async function load(force){if(!OWN()||D.busy)return;if(!force&&D.L&&Date.now()-D.at<60e3)return;D.busy=true;
  try{const r=await sb.rpc("deal_watch_list");D.L=r.error?[]:(r.data||[]);D.at=Date.now()}catch(x){D.L=D.L||[]}finally{D.busy=false}paint()}
const alarm=x=>["fall","sell","termin"].includes(x.state)&&!x.acked;
function row(x){const s=ST[x.state]||ST.ok,d=x.ref!=null&&x.ref0!=null?x.ref-x.ref0:null;
  return `<div class="dwr ${s[2]}${alarm(x)?" al":""}"><div class="dwh"><span>${s[0]}</span><b>${E(s[1])}</b></div>
   <div class="dwm"><b>${E(nm(x.com))}</b> · ${E(x.farmer||"")} · ${E(x.no||"")} · ${f0(x.tons)} t za ${f0(x.buy)} €/t</div>
   <div class="dwm">Trh pri nákupe ${f0(x.ref0)} → teraz <b>${f0(x.ref)}</b> €/t${d!=null?` (<b class="${d>=0?"up":"dn"}">${d>=0?"+":"−"}${f0(Math.abs(d))} €/t</b>, spolu ${d>=0?"+":"−"}${f0(Math.abs(d*(x.tons||0)))} €)`:""}<small>${E(x.src||"")}</small></div>
   ${x.state==="rise"?`<div class="dwm">Drž najneskôr do <b>${dk(x.hold)}</b> alebo kým trh neklesne pod <b>${f0((x.peak||x.ref)-((x.peak||x.ref)-x.ref0)*0.5)}</b> €/t.</div>`:""}
   ${alarm(x)?`<div class="btns"><button type="button" class="lime" data-dwack="${E(x.deal_id)}">✓ Prečítal som</button></div>`:x.state!=="ok"&&x.state!=="rise"?`<div class="dwm"><small>✓ potvrdené</small></div>`:""}</div>`}
function html(home){const L=D.L||[];const A=L.filter(alarm);if(home&&!A.length)return "";
  const show=home?A:L;
  return `<div class="card dwcard${A.length?" al":""}" id="${home?"dwHome":"dwCard"}"><b class="dwt">📊 Stráženie nákupov od farmárov${A.length?` · <span class="cnt">${A.length} čaká</span>`:""}</b>
   ${!home?`<div class="s">Obchody uzavreté od 29. 10. 2026. Pri poklese trhu zvoní a opakuje sa každých 30 min, kým nepotvrdíš. Pri raste: drž do termínu. Stráženie končí zadaním predajnej ceny pri obchode.</div>`:""}
   ${D.L===null?`<div class="s">Načítavam…</div>`:show.length?show.map(row).join(""):`<div class="s">Zatiaľ žiadny nový obchod na stráženie.</div>`}</div>`}
function paint(){if(!OWN()||typeof TAB==="undefined")return;const app=document.getElementById("app");if(!app)return;
  for(const [id,home,tab] of [["dwCard",false,"deals"],["dwHome",true,"home"]]){const old=document.getElementById(id);
    if(TAB!==tab){continue}const h=html(home);if(old){if(!h){old.remove();continue}const d=document.createElement("div");d.innerHTML=h;old.replaceWith(d.firstElementChild);continue}
    if(!h)continue;const anchor=tab==="deals"?app.querySelector("#fDeal"):app.querySelector(".hub,.owh");const d=document.createElement("div");d.innerHTML=h;
    if(anchor)anchor.before(d.firstElementChild);else{const nav=app.querySelector("nav.tabs");(nav||app.firstElementChild).after(d.firstElementChild)}}}
function inject(){if(!OWN()||typeof TAB==="undefined"||(TAB!=="deals"&&TAB!=="home"))return;if(D.L===null||Date.now()-D.at>60e3)load(false);
  if((TAB==="deals"&&!document.getElementById("dwCard"))||(TAB==="home"&&!document.getElementById("dwHome")))paint()}
document.addEventListener("click",async e=>{const b=e.target.closest&&e.target.closest("[data-dwack]");if(!b||!OWN())return;e.preventDefault();b.disabled=true;
  const r=await sb.rpc("deal_watch_ack",{p_deal:b.dataset.dwack});b.disabled=false;if(r.error){toast("Nepodarilo sa: "+r.error.message,6000);return}
  toast("✓ Potvrdené – upozornenie sa už neopakuje (ozve sa pri ďalšej zmene).",5000);await load(true)},true);
{const s=document.createElement("style");s.textContent=`.dwcard .dwt{display:block;margin-bottom:6px}.dwcard.al{border-color:rgba(248,113,113,.6)!important;box-shadow:0 0 0 1px rgba(248,113,113,.35),0 10px 30px -12px rgba(248,113,113,.5)}
.dwcard .cnt{color:#fca5a5}.dwr{padding:10px 0;border-top:1px solid rgba(255,255,255,.08);display:grid;gap:4px}.dwh{display:flex;gap:8px;align-items:center}.dwh span{font-size:1.3rem}
.dwr.r .dwh b{color:#fca5a5}.dwr.ok .dwh b{color:#86efac}.dwr.al{animation:dwp 1.6s ease-in-out infinite}@keyframes dwp{50%{background:rgba(248,113,113,.08)}}
.dwm{font-size:.9rem;line-height:1.4;overflow-wrap:anywhere}.dwm small{display:block;opacity:.7}.dwm .up{color:#86efac}.dwm .dn{color:#fca5a5}`;document.head.appendChild(s)}
let q=0;const sch=()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;try{inject()}catch(x){}})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch();
  setInterval(()=>{if(!document.hidden&&OWN()&&typeof TAB!=="undefined"&&(TAB==="deals"||TAB==="home"))load(true)},120e3)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
