// ===== 📞 RANNÝ PLÁN OBCHODNÍKA – komu dnes zavolať (príkaz majiteľa 31. 10.) =====
// Pre majiteľa a obchodníkov (prístup „req“ alebo „deals“). Počíta sa v aplikácii z údajov, ktoré človek aj tak vidí:
//  • nevybavené požiadavky farmárov, • cieľové ceny farmárov dosiahnuté / blízko našej ceny (price_targets, RLS req/deals),
//  • podpísané obchody so zostatkom bez naplánovaného auta, • farmári, ktorí dlho nepredali (60+ dní).
// Každý riadok: 📞 Volať / 💬 WhatsApp (s pripravenou vetou a našou dnešnou cenou – u Ceperka už s jeho úpravou v STATE.prices).
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const IN=()=>typeof ROLE!=="undefined"&&!!ROLE&&!(typeof FARMER!=="undefined"&&FARMER)&&typeof STATE!=="undefined"&&STATE&&Array.isArray(STATE.farmers);
const OK=()=>IN()&&(ROLE==="owner"||(typeof can==="function"&&(can("req")||can("deals"))));
const TABS=["home","req"];
const CN=c=>typeof comName==="function"?comName(c):c;
const f0=n=>n==null||!isFinite(n)?"–":(+n).toLocaleString("sk-SK",{maximumFractionDigits:0});
const tel=p=>{let d=String(p||"").replace(/[^\d+]/g,"");if(!d)return "";if(d.startsWith("+"))return d.slice(1);if(d.startsWith("00"))return d.slice(2);if(d.startsWith("0"))return "421"+d.slice(1);return d};
const days=a=>a?Math.floor((Date.now()-new Date(a).getTime())/864e5):null;
const D={tg:null,tgAt:0,open:null};
function myName(){try{return (STATE.me&&STATE.me.name)||"ERNTE"}catch(x){return "ERNTE"}}
function price(c){const p=(STATE.prices||[]).find(x=>x.com===c&&x.price!=null);return p?+p.price:null}
async function loadTg(){if(D.busyTg)return;D.busyTg=true;try{const r=await sb.from("price_targets").select("farmer_id,com,target,active,hit_at,created_at").eq("active",true).limit(400);D.tg=r.error?[]:(r.data||[])}catch(x){D.tg=[]}D.tgAt=Date.now();D.busyTg=false;paint(true)}
function rows(){const F=STATE.farmers||[],byId=Object.fromEntries(F.map(f=>[f.id,f])),R=STATE.requests||STATE.reqs||[],DL=STATE.deals||[],T=STATE.trips||[],out=[];
  // 1) nevybavené požiadavky
  for(const r of R.filter(r=>r.status==="nova").slice(0,25)){const f=byId[r.farmer_id];if(!f)continue;const h=Math.max(0,Math.round((Date.now()-new Date(r.created_at))/36e5));
    const k=r.kind==="sell"?"chce predať":r.kind==="transport"?"objednal odvoz":r.kind==="agree"?"súhlasí so zmluvou":"poslal správu";
    out.push({p:h>24?1:2,i:"📥",f,t:`${k}${r.com?" · "+CN(r.com):""}${r.tons?" · "+f0(r.tons)+" t":""}`,s:h<1?"práve teraz":h<24?`čaká ${h} h`:`čaká ${Math.round(h/24)} d`,
      msg:`Dobrý deň, tu ${myName()} z ERNTE. Ďakujem za Vašu požiadavku${r.com?" – "+CN(r.com):""}${r.tons?" "+f0(r.tons)+" t":""}. Ozývam sa kvôli dohode.`,go:"req"})}
  // 2) cieľové ceny
  for(const g of (D.tg||[])){const f=byId[g.farmer_id];if(!f)continue;const pc=price(g.com);if(pc==null||!(+g.target>0))continue;const diff=pc-(+g.target);if(diff<-5)continue;
    out.push({p:diff>=0?0:2,i:"🎯",f,t:`${CN(g.com)}: chce ${f0(g.target)} €/t, dnes ponúkame ${f0(pc)} €/t`,s:diff>=0?"CENA DOSIAHNUTÁ – volaj hneď":`chýba ${f0(-diff)} €/t`,
      msg:`Dobrý deň, tu ${myName()} z ERNTE. ${CN(g.com)} dnes vykupujeme za ${f0(pc)} €/t${diff>=0?" – to je Vaša cieľová cena":""}. Chcete predať?`})}
  // 3) podpísané obchody so zostatkom bez auta
  for(const d of DL.filter(d=>["podpisany","odvoz"].includes(d.status))){const left=(+d.tons||0)-(+d.delivered_t||0);if(left<5)continue;const f=byId[d.farmer_id];if(!f)continue;
    const planned=T.some(t=>t.deal_id===d.id&&!["vylozene","zrusena"].includes(t.status));if(planned)continue;
    out.push({p:2,i:"🚛",f,t:`${CN(d.com)} · zmluva ${d.no||""}: zostáva ${f0(left)} t`,s:"bez naplánovaného auta",msg:`Dobrý deň, tu ${myName()} z ERNTE. Kedy Vám môžeme poslať autá na ${CN(d.com)} (zostáva ${f0(left)} t)?`,go:"deals"})}
  // 4) dlho nepredali
  const last={},vol={};for(const d of DL){if(d.status==="zruseny")continue;const t=new Date(d.created_at).getTime();if(!last[d.farmer_id]||t>last[d.farmer_id])last[d.farmer_id]=t;vol[d.farmer_id]=(vol[d.farmer_id]||0)+(+d.tons||0)}
  const sleep=F.filter(f=>f.active!==false&&last[f.id]&&days(last[f.id])>=60&&(f.phone||f.email)).sort((a,b)=>(vol[b.id]||0)-(vol[a.id]||0)).slice(0,8);
  for(const f of sleep){const best=(STATE.prices||[]).filter(p=>p.price!=null).sort((a,b)=>b.price-a.price)[0];
    out.push({p:3,i:"😴",f,t:`nepredal ${days(last[f.id])} dní · spolu ${f0(vol[f.id])} t`,s:"pripomeň sa",msg:`Dobrý deň, tu ${myName()} z ERNTE. Dlho sme sa nepočuli – ${best?CN(best.com)+" dnes vykupujeme za "+f0(best.price)+" €/t. ":""}Máte niečo na predaj?`})}
  const seen=new Set();return out.sort((a,b)=>a.p-b.p).filter(x=>{const k=x.i+x.f.id+x.t;if(seen.has(k))return false;seen.add(k);return true})}
function html(){const L=rows();if(!L.length)return `<div class="card pln" id="plnCard"><h2>📞 Môj plán na dnes</h2><div class="s">Dnes nikto nečaká – všetko vybavené. 👍</div></div>`;
  const open=D.open===true||(D.open===null&&L.length<=6),show=open?L:L.slice(0,4),hot=L.filter(x=>x.p<=1).length;
  return `<div class="card pln" id="plnCard"><h2>📞 Môj plán na dnes · ${L.length}${hot?` <span class="plh">${hot} hneď</span>`:""}</h2>
   ${show.map(x=>{const t=tel(x.f.phone);return `<div class="plr${x.p===0?" hot":""}"><div class="pli">${x.i}</div><div class="plt"><b>${E(x.f.name)}</b><span>${E(x.t)}</span><small>${E(x.s)}</small></div>
     <div class="plb">${t?`<a class="plc" href="tel:+${E(t)}" aria-label="Volať ${E(x.f.name)}">📞</a><a class="plw" href="https://wa.me/${E(t)}?text=${encodeURIComponent(x.msg)}" target="_blank" rel="noopener" aria-label="WhatsApp ${E(x.f.name)}">💬</a>`:x.f.email?`<a class="plw" href="mailto:${E(x.f.email)}?subject=${encodeURIComponent("ERNTE")}&body=${encodeURIComponent(x.msg)}" aria-label="E-mail">✉️</a>`:`<small class="plno">bez kontaktu</small>`}</div></div>`}).join("")}
   ${L.length>4?`<div class="btns"><button type="button" class="ghost" data-plnt>${open?"Menej":"Zobraziť všetko ("+L.length+")"}</button></div>`:""}</div>`}
function paint(force){const app=document.getElementById("app");if(!app||typeof TAB==="undefined")return;const old=document.getElementById("plnCard");
  if(!OK()||!TABS.includes(TAB)){if(old)old.remove();return}
  if(!D.tgAt&&!D.busyTg)loadTg();
  const h=html();if(old&&!force&&old.dataset.h===String(h.length)+h.slice(-40))return;
  const d=document.createElement("div");d.innerHTML=h;const el=d.firstElementChild;el.dataset.h=String(h.length)+h.slice(-40);
  if(old){old.replaceWith(el);return}const a=app.querySelector("nav.tabs")||app.querySelector(".hero");if(a){let b=a;while(b.nextElementSibling&&/^(dropCard|ldCard|taCard)$/.test(b.nextElementSibling.id||"")||b.nextElementSibling&&b.nextElementSibling.classList.contains("instc"))b=b.nextElementSibling;b.after(el)}else app.prepend(el)}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-plnt]");if(!b)return;e.preventDefault();const L=rows();D.open=!(D.open===true||(D.open===null&&L.length<=6));paint(true)},true);
{const s=document.createElement("style");s.textContent=`.pln h2{text-align:center}.plh{font-size:.75rem;padding:2px 8px;border-radius:10px;background:rgba(248,113,113,.2);color:#fca5a5;vertical-align:middle}
.plr{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 0;border-top:1px solid rgba(255,255,255,.08)}
.plr.hot{background:linear-gradient(90deg,rgba(182,255,59,.12),transparent);border-radius:12px;padding-left:6px}
.pli{font-size:1.4rem}.plt{display:grid;gap:1px;min-width:0}.plt b,.plt span{overflow-wrap:anywhere}.plt span{font-size:.9rem}.plt small{opacity:.65;font-size:.78rem}.plr.hot .plt small{color:#d9ff9e;opacity:1;font-weight:700}
.plb{display:flex;gap:6px}.plb a{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;text-decoration:none;font-size:1.15rem;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06)}
.plb .plc{background:linear-gradient(135deg,#b6ff3b,#22d3ee);border:0}.plno{opacity:.5;font-size:.72rem;max-width:60px;text-align:right}.pln .btns{justify-content:center}
@media(max-width:460px){.plr{grid-template-columns:auto minmax(0,1fr)}.plb{grid-column:2;justify-content:flex-start}.plb a{width:auto;min-width:96px;border-radius:12px;padding:0 12px;font-size:.95rem;gap:6px;display:flex;align-items:center;justify-content:center}.plb .plc::after{content:"Volať";font-weight:800;color:#06110a;font-size:.9rem}.plb .plw::after{content:"Napísať";font-weight:700;font-size:.9rem;color:#eef2f7}}`;document.head.appendChild(s)}
let q=0;const sch=()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;paint()})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch();setInterval(()=>{if(!document.hidden&&OK()){D.tgAt=0;loadTg()}},300000)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
