// ===== 🌐 JAZYK ZMLUVY PODĽA ŠTÁTU SÍDLA (príkaz majiteľa 31. 10.) =====
// ERNTE: sídlo SK / CZ → zmluva po slovensky; HU → SK | HU; AT, DE → SK | DE; inde → SK | EN (AI preklad, platí slovenské znenie).
// DANUBE: vždy dvojjazyčná SK | HU (vzor S-HU, dnzmluva.js). Jazyk sa dá prepnúť tlačidlom 🌐 pri zmluve (farmers.clang, set_clang).
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const LN={sk:["🇸🇰","SK","slovenčina"],hu:["🇭🇺","HU","maďarčina"],en:["🇬🇧","EN","angličtina"],de:["🇩🇪","DE","nemčina"]};
function country(F){F=F||{};const a=[F.addr,F.name,F.ico,F.dic,F.icdph,F.note].filter(Boolean).join(" "),n=String(F.name||"");
  if(/magyarorsz|maďarsk|madarsk|hungary|ungarn/i.test(a)||/\bHU\s?\d{8}\b/.test(a)||/\b\d{8}-\d-\d{2}\b/.test(a)||/\b(Kft|Zrt|Bt|Nyrt)\.?(\s|$)/.test(n)||/[őűŐŰ]/.test(a))return "HU";
  if(/österreich|osterreich|rakúsk|rakusk|austria/i.test(a)||/\bATU\s?\d{8}\b/.test(a))return "AT";
  if(/deutschland|nemeck|germany/i.test(a)||/\bDE\s?\d{9}\b/.test(a)||/\bGmbH\b/.test(n)&&!/österreich|austria/i.test(a))return "DE";
  if(/česk|cesk|czech/i.test(a)||/\bCZ\s?\d{8,10}\b/.test(a)||/\bs\.\s?r\.\s?o\.\s*,?\s*(Praha|Brno|Ostrava)/i.test(a))return "CZ";
  if(/polsk|polska|poland/i.test(a)||/\bPL\s?\d{10}\b/.test(a)||/Sp\.\s?z\s?o\.?\s?o/i.test(n))return "PL";
  if(/ukrajin|ukraine|україн/i.test(a))return "UA";
  if(/rumun|romania|românia/i.test(a))return "RO";
  return "SK"}
const autoLang=F=>{const c=country(F);return c==="SK"||c==="CZ"?"sk":c==="HU"?"hu":c==="AT"||c==="DE"?"de":"en"};
function langOf(F){return (F&&F.clang&&LN[F.clang])?F.clang:autoLang(F)}
function firmOf(F){return String(F&&F.firma||"ERNTE").toUpperCase()==="DANUBE"?"DANUBE":"ERNTE"}
// čo sa naozaj vytlačí: ERNTE sk → "sk", inak "sk+X"; DANUBE vždy "sk+hu"
function modeOf(F){if(firmOf(F)==="DANUBE")return ["sk","hu"];const l=langOf(F);return l==="sk"?["sk"]:["sk",l]}
const label=F=>modeOf(F).map(l=>LN[l][1]).join(" | ");
window.ernteCountry=country;window.contractLang=langOf;window.contractMode=modeOf;window.contractLangLabel=label;

// ---------- dvojjazyčná zmluva ERNTE (preklad cez spoločnú pamäť prekladov i18n) ----------
const NUM=/\d+(?:[  .,:\/–-]\d+)*/g;
const norm=t=>{const n=[];return [t.replace(NUM,m=>{n.push(m);return "{"+(n.length-1)+"}"}),n]};
const fill=(d,n)=>d.replace(/\{(\d+)\}/g,(m,i)=>n[+i]!=null?n[+i]:m);
const CL={hu:"Kétnyelvű szerződés SK | HU – eltérés esetén a szlovák nyelvű változat az irányadó.",en:"Bilingual contract SK | EN – in case of any discrepancy the Slovak version shall prevail.",de:"Zweisprachiger Vertrag SK | DE – bei Abweichungen ist die slowakische Fassung maßgebend."};
const SEL="h1,h2,.no,p,li,th,td";
async function contractBi(H,d,F,w){const M=modeOf(F);if(M.length<2||firmOf(F)==="DANUBE")return H;const L=M[1];
  const doc=new DOMParser().parseFromString(H,"text/html");
  const els=[...doc.body.querySelectorAll(SEL)].filter(el=>!el.closest(".pb,.ft")&&!el.querySelector(SEL)&&/\p{L}{2}/u.test(el.textContent));
  const items=els.map(el=>{const t=el.textContent.replace(/\s+/g," ").trim();const [k,n]=norm(t);return {el,k,n}}).filter(x=>x.k.length<=3000);
  const keys=[...new Set(items.map(x=>x.k))],T={};
  const st=m=>{try{const p=w.document.getElementById("bist")||(()=>{w.document.body.innerHTML="<p id='bist' style='font:16px sans-serif;padding:20px;line-height:1.5'></p>";return w.document.getElementById("bist")})();p.innerHTML=m}catch(x){}};
  const t0=Date.now();
  while(true){const miss=keys.filter(k=>T[k]==null);if(!miss.length)break;
    for(let i=0;i<miss.length;i+=100){try{const r=await sb.rpc("i18n_get",{p_lang:L,p_src:miss.slice(i,i+100)});if(!r.error&&r.data)Object.assign(T,r.data)}catch(x){}}
    const done=keys.filter(k=>T[k]!=null).length;if(done===keys.length)break;
    if(Date.now()-t0>240e3){if(!confirm(`Preklad zmluvy (${LN[L][2]}) ešte nie je hotový (${done}/${keys.length}).\n\nOK = otvoriť zmluvu iba po slovensky · Zrušiť = čakať ďalej`))continue;return H}
    st(`🌐 Pripravujem dvojjazyčnú zmluvu SK | ${LN[L][1]}… <b>${done} / ${keys.length}</b><br><small>Preklad robí AI raz – nabudúce sa zmluva otvorí hneď. Zvyčajne 1–3 minúty.</small>`);
    await new Promise(r=>setTimeout(r,6000))}
  for(const x of items){const t=T[x.k];if(!t)continue;const tr=doc.createElement(/^(TD|TH)$/.test(x.el.tagName)?"span":"div");tr.className="bi";tr.lang=L;tr.textContent=fill(t,x.n);
    if(/^(TD|TH)$/.test(x.el.tagName))x.el.appendChild(doc.createElement("br"));x.el.appendChild(tr)}
  const st2=doc.createElement("style");st2.textContent=".bi{display:block;font-style:italic;color:#1d4e89;font-size:.94em;margin-top:1px}td .bi,th .bi{display:inline}.bihd{border:1.5px solid #1d4e89;border-radius:6px;padding:6px 10px;margin:6px 0 10px;font:9.5pt Arial,sans-serif;text-align:center}";doc.head.appendChild(st2);
  const hd=doc.createElement("div");hd.className="bihd";hd.innerHTML=`<b>Dvojjazyčná zmluva SK | ${LN[L][1]}</b> – pri rozpore platí slovenské znenie.<br><i>${E(CL[L])}</i>`;
  const h1=doc.body.querySelector("h1");if(h1)h1.before(hd);else doc.body.prepend(hd);
  doc.documentElement.lang="sk";return "<!doctype html>"+doc.documentElement.outerHTML}
window.contractBi=contractBi;

// ---------- 🌐 prepínač jazyka pri zmluve ----------
const FOf=id=>{if(typeof FARMER!=="undefined"&&FARMER)return FARMER;const d=((typeof STATE!=="undefined"&&STATE.deals)||[]).find(x=>x.id===id);return d?((STATE.farmers||[]).find(f=>f.id===d.farmer_id)||null):null};
function mark(){const app=document.getElementById("app");if(!app)return;
  app.querySelectorAll("[data-cpdf]").forEach(b=>{const F=FOf(b.dataset.cpdf);if(!F)return;const nx=b.nextElementSibling,lb="🌐 "+label(F)+(F.clang?"":" · auto");
    if(nx&&nx.classList.contains("clangb")){if(nx.dataset.lb!==lb){nx.textContent=lb;nx.dataset.lb=lb}return}
    const x=document.createElement("button");x.type="button";x.className="clangb";x.dataset.clf=F.id;x.dataset.lb=lb;x.textContent=lb;x.setAttribute("data-noi18n","");x.title="Jazyk zmluvy";b.after(x)})}
function menu(btn){document.querySelectorAll(".clmenu").forEach(m=>m.remove());const fid=btn.dataset.clf;const F=(typeof FARMER!=="undefined"&&FARMER&&FARMER.id===fid)?FARMER:(STATE.farmers||[]).find(f=>f.id===fid);if(!F)return;
  const dn=firmOf(F)==="DANUBE",a=autoLang(F),C=country(F);
  const m=document.createElement("div");m.className="clmenu";m.setAttribute("data-noi18n","");
  m.innerHTML=`<b>Jazyk zmluvy</b><small>${dn?"Danube: zmluva je vždy dvojjazyčná SK | HU.":`Sídlo: ${E(C)} → automaticky ${E(LN[a][1]==="SK"?"SK":"SK | "+LN[a][1])}`}</small>`+
    [["","🤖 Automaticky podľa sídla"],["sk","🇸🇰 Slovenčina"],["hu","🇭🇺 SK | Magyar"],["en","🇬🇧 SK | English"],["de","🇩🇪 SK | Deutsch"]].map(o=>`<button type="button" data-clset="${o[0]}" class="${(F.clang||"")===o[0]?"on":""}"${dn&&o[0]&&o[0]!=="hu"?" disabled":""}>${o[1]}</button>`).join("");
  document.body.appendChild(m);const r=btn.getBoundingClientRect();m.style.top=Math.min(innerHeight-m.offsetHeight-8,r.bottom+6)+"px";m.style.left=Math.max(8,Math.min(innerWidth-m.offsetWidth-8,r.left))+"px";m.dataset.clf=fid}
document.addEventListener("click",async e=>{const b=e.target.closest&&e.target.closest(".clangb,[data-clset]");
  if(!b){document.querySelectorAll(".clmenu").forEach(m=>{if(!m.contains(e.target))m.remove()});return}e.preventDefault();e.stopPropagation();
  if(b.classList.contains("clangb")){menu(b);return}
  const m=b.closest(".clmenu"),fid=m.dataset.clf,v=b.dataset.clset||null;m.remove();
  try{const r=await sb.rpc("set_clang",{p_farmer:fid,p_lang:v});if(r.error)throw r.error;
    if(typeof FARMER!=="undefined"&&FARMER&&FARMER.id===fid)FARMER.clang=v;(((typeof STATE!=="undefined"&&STATE.farmers)||[]).find(f=>f.id===fid)||{}).clang=v;mark();
    if(typeof toast==="function")toast("✓ Jazyk zmluvy: "+label((typeof FARMER!=="undefined"&&FARMER&&FARMER.id===fid)?FARMER:(STATE.farmers||[]).find(f=>f.id===fid)||{clang:v}),3500)}
  catch(x){if(typeof toast==="function")toast("Nepodarilo sa: "+(x&&x.message||x),5000)}},true);
{const s=document.createElement("style");s.textContent=`.clangb{min-height:40px;padding:4px 12px!important;font-size:.82rem!important;border-radius:999px!important;background:rgba(56,189,248,.14)!important;border:1px solid rgba(56,189,248,.45)!important;color:#e0f2fe!important;white-space:nowrap}
.clmenu{position:fixed;z-index:10060;display:grid;gap:4px;padding:10px;border-radius:16px;background:rgba(14,22,40,.97);border:1px solid rgba(255,255,255,.2);box-shadow:0 18px 50px rgba(0,0,0,.55);width:min(280px,calc(100vw - 16px));color:#fff}
.clmenu small{opacity:.75;margin-bottom:4px;line-height:1.35}.clmenu button{min-height:44px;text-align:left;justify-content:flex-start;border-radius:10px;background:transparent;border:1px solid transparent;color:#fff;font:600 .95rem system-ui;padding:6px 10px}
.clmenu button.on{background:rgba(182,255,59,.15);border-color:rgba(182,255,59,.5)}.clmenu button:disabled{opacity:.35}`;document.head.appendChild(s)}
let q=0;function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(()=>{if(!q)q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;mark()})}).observe(app,{childList:true,subtree:true});mark()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
