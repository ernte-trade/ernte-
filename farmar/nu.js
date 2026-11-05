// ===== 🌱 NOVÁ ÚRODA – NÁKUPNÉ CENY (Cenník: majiteľ + tím s prístupom k Cenníku) – príkaz majiteľa 5. 11. 2026 =====
// Databáza nu_tick (každých 15 min): burza novej úrody = dnešná burza bota + rozdiel kontraktov z krivky (vetva burza-hist) →
// cena každého odberateľa na novú úrodu = burza novej úrody + jeho báza z posledných ponúk (odb_models – model odberateľa voči burze)
// − naša doprava (FCA = 0) → najlepší čistý predaj − marža − poistka = naša nákupná cena. Pokles a zvýšenie do 5 €/t hneď, väčšie zvýšenie potvrdí Martin.
// Tím vidí IBA naše nákupné ceny (nu_ceny; Ceperko so svojou úpravou ako v Cenníku). Odberateľov, ich ceny a výpočet vidí iba Martin (nu_get, MAIN_OK).
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const N=v=>v==null||!isFinite(+v)?"–":Math.round(+v).toLocaleString("sk-SK");
const N1=v=>v==null||!isFinite(+v)?"–":(Math.round(+v*10)/10).toLocaleString("sk-SK");
const SG=v=>v==null||!isFinite(+v)?"–":(+v>0?"+":+v<0?"−":"±")+N1(Math.abs(+v));
const dk=d=>/^\d{4}-\d\d-\d\d/.test(d||"")?(+String(d).slice(8,10))+". "+(+String(d).slice(5,7))+".":"–";
const tk=t=>{if(!t)return"–";const d=new Date(t);return isNaN(d)?"–":d.toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})};
const nm=c=>{try{if(typeof comName==="function")return comName(c)}catch(x){}return c};
const OKV=()=>{try{return typeof ROLE!=="undefined"&&(ROLE==="owner"||(typeof can==="function"&&(can("price_view")||can("price_edit")||can("market"))))}catch(x){return false}};
const MAIN=()=>{try{return typeof MAIN_OK==="function"&&MAIN_OK()&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST}catch(x){return false}};
const ADJ=()=>{const a=+(window.PADJ||0);return typeof ROLE!=="undefined"&&ROLE!=="owner"&&isFinite(a)?a:0};
const D={v:null,g:null,at:0,busy:false,err:""};

async function load(force){if(!OKV()||D.busy||typeof sb==="undefined"||!sb)return;if(!force&&D.at&&Date.now()-D.at<300e3)return;D.busy=true;
  try{const r=await sb.rpc("nu_ceny");if(r.error)D.err=/nu_ceny/.test(r.error.message||"")?"Zapne sa po aktualizácii databázy (pár minút).":r.error.message;else{D.v=r.data||null;D.err=""}
    if(MAIN()){const g=await sb.rpc("nu_get");D.g=g.error?null:(g.data||null)}else D.g=null;D.at=Date.now()}
  catch(x){D.err=String(x&&x.message||x)}finally{D.busy=false}paint()}

// rozpis pre Martina: burza novej úrody, najlepší odberateľ s bázou, doprava, marža, poistka, ďalšie možnosti
function why(c){const g=D.g&&D.g.items&&D.g.items[c];if(!g)return "";const b=g.best,o=(g.opts||[]).slice(1,5);
  const fut=g.nc!=null?`<div><i>Burza novej úrody</i><span>${E(g.kon)} <b>${N1(g.nc)} €/t</b>${g.spr!=null?` <small>(dnes ${E(g.px_k||"")} ${N1(g.px)} ${SG(g.spr)} rozdiel kontraktov z ${dk(g.nc_d)})</small>`:g.nc_d?` <small>(záver ${dk(g.nc_d)})</small>`:""}</span></div>`:`<div><i>Burza novej úrody</i><span>⚠️ chýba krivka kontraktov</span></div>`;
  const bb=b?`<div><i>Najlepší predaj</i><span><b>${E(b.b)}</b> ${E(b.del)}${b.site?" "+E(b.site):""}: ${N1(b.price)} €/t <small>(báza ${SG(b.bas)} z ponuky ${dk(b.bas_d)})</small>${+b.dop?` − doprava ${N1(b.dop)}`:" · odvoz ich"} = <b>${N1(b.net)} €/t</b></span></div>`:`<div><i>Najlepší predaj</i><span>⚠️ žiadna ponuka odberateľa za 30 dní</span></div>`;
  const cl=b?`<div><i>Naša cena</i><span>${N1(b.net)} − marža ${N(g.m)} − poistka ${N(g.buf)} = <b>${N(g.calc)} €/t</b>${g.pub!=null&&g.pub!==g.calc?` · zverejnené ${N(g.pub)}`:""}</span></div>`:"";
  const pd=g.pend?`<div class="nupd">⏳ Zvýšenie na <b>${N(g.pend.p)} €/t</b> (z ${N(g.pub)}) čaká na teba <button type="button" class="pri" data-nuok="${E(c)}">✅ Zverejniť ${N(g.pend.p)} €/t</button></div>`:"";
  const ot=o.length?`<div class="nuo">${o.map(x=>`<small>${E(x.b)} ${E(x.del)}${x.site?" "+E(x.site):""}: ${N1(x.price)}${+x.dop?" − "+N1(x.dop):""} = ${N1(x.net)} €/t</small>`).join("")}</div>`:"";
  return `<details class="nuw"><summary>Prečo táto cena</summary>${fut}${bb}${cl}${pd}${ot}</details>`}

function html(){const v=D.v,L=(v&&v.items)||[],a=ADJ(),M=MAIN();
  if(!L.length){if(!M)return "";const g=D.g||{};return `<div class="card nuc" id="nuCard"><h2>🌱 Výkup – nová úroda</h2><div class="s">${D.err?"⚠️ "+E(D.err):g.at?"Zatiaľ bez ceny – chýba krivka burzy novej úrody alebo čerstvá ponuka odberateľa. Prepočet každých 15 min.":"Načítavam…"}</div></div>`}
  const y=L.reduce((m,x)=>Math.max(m,+x.y||0),0)||"";
  const rows=L.map(x=>{const p=+x.price+a,g=M&&D.g&&D.g.items&&D.g.items[x.com];
    return `<div class="nur${g&&g.pend?" nup":""}"><div class="nut"><b>${E(nm(x.com))}</b><small>dodanie ${E(x.dod||"")}</small></div><b class="num nuv">${N(p)} €/t</b>${M?why(x.com):""}</div>`}).join("");
  const cfg=M&&D.g?`<details class="nuw nucf"><summary>⚙️ Marža a poistka</summary><div class="nucg"><label>Marža €/t<input data-nucm inputmode="decimal" value="${E(String((D.g.cfg&&D.g.cfg.m)??D.g.m??10).replace(".",","))}"></label><label>Poistka €/t<input data-nucb inputmode="decimal" value="${E(String((D.g.cfg&&D.g.cfg.buf)??D.g.buf??5).replace(".",","))}"></label><button type="button" data-nucfg>💾 Uložiť a prepočítať</button></div><small>Poistka chráni pred slabšou bázou pri žatve. Marža predvolene ako „nákup viazaný na predaj“ (${N(D.g.m)} €/t).</small></details>`:"";
  return `<div class="card nuc" id="nuCard"><h2>🌱 Výkup ${E(y)} – nová úroda</h2>
    <div class="s nus">FCA farma, bez DPH · ${a?`upravené pre teba ${a<0?"−":"+"}${N1(Math.abs(a))} €/t · `:""}aktualizované ${E(tk(v.at))}</div>
    <div class="nug">${rows}</div>
    <div class="s">${M?"Pokles ide hneď, zvýšenie nad 5 €/t zverejníš ty. Tím vidí iba naše ceny – bez odberateľov a výpočtu.":"Cena sa mení s burzou na novú úrodu – platí dnes, pred uzatvorením obchodu ju over."}</div>${cfg}</div>`}

function paint(){if(!OKV()||typeof TAB==="undefined"||(TAB!=="price"&&TAB!=="nu"))return;const app=document.getElementById("app");if(!app)return;
  const h=TAB==="nu"?(html()||empty()):html(),old=document.getElementById("nuCard");if(!h){if(old)old.remove();return}
  const d=document.createElement("div");d.innerHTML=h;const n=d.firstElementChild;
  if(old){if(old.dataset.h===n.innerHTML)return;n.dataset.h=n.innerHTML;const dt=[...old.querySelectorAll("details")].map(x=>x.open);n.querySelectorAll("details").forEach((x,i)=>{if(dt[i])x.open=true});old.replaceWith(n);return}
  n.dataset.h=n.innerHTML;const t=app.querySelector(".ds-ptiles"),f=t&&t.closest("form.card,div.card,form");
  if(f&&f.parentElement)f.after(n);else{const a=app.querySelector("#odbCard")||app.querySelector("#trhCard");if(a)a.before(n);else app.appendChild(n)}}
function inject(){if(!OKV()||typeof TAB==="undefined"||(TAB!=="price"&&TAB!=="nu"))return;if(!D.at||Date.now()-D.at>300e3)load(false);if(!document.getElementById("nuCard"))paint()}

document.addEventListener("click",async e=>{const b=e.target.closest&&e.target.closest("[data-nuok],[data-nucfg]");if(!b||!MAIN())return;e.preventDefault();
  if(typeof busy==="function")busy(b,true);let r;
  try{if(b.dataset.nuok!==undefined)r=await sb.rpc("nu_ok",{p_com:b.dataset.nuok});
    else{const c=document.getElementById("nuCard"),num=s=>parseFloat(String(s||"").replace(/\s/g,"").replace(",","."));
      const m=num(c&&c.querySelector("[data-nucm]")&&c.querySelector("[data-nucm]").value),bf=num(c&&c.querySelector("[data-nucb]")&&c.querySelector("[data-nucb]").value);
      if(!isFinite(m)||!isFinite(bf)){if(typeof busy==="function")busy(b,false);if(typeof toast==="function")toast("Zadaj maržu aj poistku (€/t).",4000);return}
      r=await sb.rpc("nu_cfg_set",{p_m:m,p_buf:bf})}}catch(x){r={error:{message:String(x&&x.message||x)}}}
  if(typeof busy==="function")busy(b,false);
  if(r&&r.error){if(typeof toast==="function")toast("Neuložené: "+r.error.message,7000);return}
  if(typeof toast==="function")toast(b.dataset.nuok!==undefined?"✅ Cena na novú úrodu zverejnená.":"✅ Uložené – ceny na novú úrodu prepočítané.",4000);load(true)},true);

const s=document.createElement("style");s.textContent=`
.nuc .nus{margin:-2px 0 6px}.nug{display:grid;gap:0}
.nur{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:4px 10px;padding:9px 0;border-top:1px solid rgba(255,255,255,.08);min-width:0}
.nur:first-child{border-top:0}.nut{display:flex;flex-direction:column;min-width:0}.nut b{overflow-wrap:anywhere}.nut small{opacity:.72;font-size:.76rem}
.nuv{font-size:1.08rem;color:#86efac;white-space:nowrap}.nup .nuv{color:#fcd34d}
.nuw{grid-column:1/-1;min-width:0}.nuw>summary{cursor:pointer;font-size:.8rem;opacity:.8;min-height:32px;display:flex;align-items:center}
.nuw>div{display:grid;grid-template-columns:7.2em minmax(0,1fr);gap:6px;padding:4px 0;font-size:.82rem;line-height:1.4}.nuw>div>i{font-style:normal;opacity:.65}.nuw>div>span{min-width:0;overflow-wrap:anywhere}
.nuw small{opacity:.75}.nupd{display:flex!important;flex-wrap:wrap;gap:6px 10px;align-items:center;padding:8px 10px!important;border-radius:12px;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.45)}
.nupd button{white-space:normal}.nuo{display:grid!important;grid-template-columns:1fr!important;gap:2px!important}.nuo small{overflow-wrap:anywhere}
.nucf{margin-top:6px;border-top:1px solid rgba(255,255,255,.08)}.nucg{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:8px;align-items:end}
.nucg label{display:flex;flex-direction:column;gap:3px;min-width:0;font-size:.8rem}.nucg input{width:100%;min-width:0}.nucg button{grid-column:1/-1;white-space:normal}
html[data-theme=light] .nuv{color:#15803d}html[data-theme=light] .nup .nuv{color:#b45309}`;document.head.appendChild(s);

let q=0;const sch=()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;try{inject()}catch(x){}})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch();
  setInterval(()=>{if(!document.hidden&&OKV()&&typeof TAB!=="undefined"&&(TAB==="price"||TAB==="nu"))load(true)},600e3)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
window.nuReload=()=>load(true);
// 🌱 samostatná sekcia „Výkup 2027“ v lište (5. 11. 22:27 príkaz majiteľa „daj obchodníkom novú sekciu, aby to mali viditeľné“) – vidí, kto má Cenník
function empty(){return `<div class="card nuc" id="nuCard"><h2>🌱 Výkup – nová úroda</h2><div class="s">${D.err?"⚠️ "+E(D.err):D.at?"Ceny na novú úrodu sa práve prepočítavajú – skús o chvíľu.":"Načítavam…"}</div></div>`}
window.vNu=function(){if(!D.at||Date.now()-D.at>300e3)load(false);return html()||empty()};
window.nuTabLabel=()=>{const L=(D.v&&D.v.items)||[];const y=L.reduce((m,x)=>Math.max(m,+x.y||0),0)||(()=>{const d=new Date();return d.getFullYear()+(d.getMonth()>=6?1:0)})();return "Výkup "+y};
})();
