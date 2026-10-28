// ===== ⚙️ PODMIENKY A BONUSY FARMÁRA – individuálne pre každého farmára =====
// Tím (majiteľ / prístup farm_terms): pri každom farmárovi tlačidlo ⚙️ Podmienky → bonus €/t (na všetko alebo na komoditu),
// platnosť od–do, splatnosť, doprava, záloha, kvalita, poznámka pre farmára a interná poznámka.
// Farmár vidí iba svoje: bonus a výslednú „vašu cenu“ pri cenníku + svoje podmienky (nie internú poznámku).
// Cenu pri predaji z aplikácie počíta databáza (farmer_price) – bonus sa započíta automaticky.
(function(){
const isF=()=>typeof FARMER!=="undefined"&&!!FARMER;
const staffOK=()=>!isF()&&typeof ROLE!=="undefined"&&(ROLE==="owner"||(typeof can==="function"&&can("farm_terms")));
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const N=v=>{if(v==null||v==="")return null;const n=+String(v).replace(/\s/g,"").replace(",",".");return isFinite(n)?n:null};
const F2=n=>(Math.round(n*100)/100).toLocaleString("sk-SK",{minimumFractionDigits:0,maximumFractionDigits:2});
const todayS=()=>new Date().toLocaleDateString("sv-SE");
const dSK=d=>d?new Date(d+"T12:00").toLocaleDateString("sk-SK"):"";
const COMS=()=>(typeof MK!=="undefined"?MK:[]);
const cname=c=>{const m=COMS().find(x=>x[0]===c);return m?m[1]:c};
const price=c=>{const p=(typeof STATE!=="undefined"&&STATE.prices||[]).find(x=>x.com===c);return p&&p.price!=null?+p.price:null};
const DOP={ernte:"Odvoz zabezpečí ERNTE (VALKO) – v cene",farmar:"Farmár dovezie sám",odpocet:"Odvoz ERNTE s odpočtom €/t",dohoda:"Podľa dohody"};
let T={},at=0,busy=false,MY=null,myAt=0,open=null;
const active=t=>t&&(!t.bonus_od||t.bonus_od<=todayS())&&(!t.bonus_do||t.bonus_do>=todayS());
const bon=(t,c)=>{if(!active(t)||!t.bonus)return 0;const v=t.bonus[c]!=null&&t.bonus[c]!==""?+t.bonus[c]:+(t.bonus._all||0);return isFinite(v)?v:0};
const hasBon=t=>!!t&&!!t.bonus&&Object.values(t.bonus).some(v=>+v);
async function loadAll(f){if(busy||(!f&&Date.now()-at<60e3))return;busy=true;try{const r=await sb.from("farmer_terms").select("*");if(!r.error){T={};for(const x of r.data||[])T[x.farmer_id]=x;at=Date.now();deco()}}catch(x){}busy=false}
async function loadMy(){if(Date.now()-myAt<120e3)return;myAt=Date.now();try{const r=await sb.rpc("my_terms");const d=r.data&&(Array.isArray(r.data)?r.data[0]:r.data);MY=d||{};if(typeof renderFarmer==="function"&&isF())renderFarmer()}catch(x){MY={}}}

/* ---------- FARMÁR: bonus pri cene + karta „Vaše podmienky“ ---------- */
window.bonusRow=p=>{if(!isF()){return ""}if(MY===null){loadMy();return ""}const b=bon(MY,p.com);if(!b||p.price==null)return "";
  return `<div class="ftb">🎁 Váš individuálny bonus <b>${b>0?"+":""}${F2(b)} €/t</b> → vaša cena <b class="num">${F2(+p.price+b)} €/t</b>${MY.bonus_do?` · platí do ${E(dSK(MY.bonus_do))}`:""}</div>`};
function farmerCard(){if(!MY)return "";const L=[];
  if(MY.splatnost)L.push(["💶","Splatnosť",`${E(MY.splatnost)} dní od dodania`]);
  if(MY.doprava)L.push(["🚛","Doprava",E(DOP[MY.doprava]||MY.doprava)+(MY.doprava==="odpocet"&&MY.doprava_eur?` (${F2(+MY.doprava_eur)} €/t)`:"")]);
  if(+MY.zaloha_pct)L.push(["💰","Záloha",`${F2(+MY.zaloha_pct)} % po podpise zmluvy`]);
  if(MY.kvalita)L.push(["🔬","Kvalita",E(MY.kvalita)]);
  if(hasBon(MY)&&active(MY))L.push(["🎁","Bonus",(+MY.bonus._all?`+${F2(+MY.bonus._all)} €/t na všetky komodity`:"podľa komodity – vidíte ho pri cenách")+(MY.bonus_do?` · do ${E(dSK(MY.bonus_do))}`:"")]);
  if(MY.note_farmer)L.push(["📝","Dohoda",E(MY.note_farmer)]);
  if(!L.length)return "";
  return `<div class="card ftcard" data-ftc="1"><div class="t">🤝 Vaše podmienky s ERNTE</div>${L.map(x=>`<div class="ftrw"><span>${x[0]}</span><div><small>${x[1]}</small><b>${x[2]}</b></div></div>`).join("")}<div class="s">Individuálne podmienky dohodnuté s ERNTE. Platia pre nové obchody.</div></div>`}

/* ---------- TÍM: tlačidlo pri každom farmárovi ---------- */
function deco(){if(!staffOK())return;const app=document.getElementById("app");if(!app)return;
  app.querySelectorAll(".ds-fc").forEach(c=>{const b=c.querySelector("[data-fedit]");if(!b||!b.dataset.fedit||b.dataset.fedit==="new")return;const id=b.dataset.fedit;const t=T[id];
    const box=c.querySelector(".btns");if(box&&!box.querySelector("[data-ftopen]"))box.insertAdjacentHTML("beforeend",`<button type="button" class="ftbtn" data-ftopen="${E(id)}">⚙️ Podmienky</button>`);
    const meta=c.querySelector(".ds-meta");let s=meta&&meta.querySelector(".ftpill");const txt=t?[hasBon(t)?(active(t)?"🎁 bonus":"🎁 bonus (neplatí)")+(+t.bonus._all?` +${F2(+t.bonus._all)} €/t`:""):"",t.splatnost?`💶 ${t.splatnost} dní`:""].filter(Boolean).join(" · "):"";
    if(meta){if(txt){if(!s){meta.insertAdjacentHTML("beforeend",`<span class="ftpill"></span>`);s=meta.querySelector(".ftpill")}if(s.textContent!==txt)s.textContent=txt}else if(s)s.remove()}})}
function form(id){const f=(STATE.farmers||[]).find(x=>x.id===id)||{name:"farmár"};const t=T[id]||{};const b=t.bonus||{};
  const chips=(n,vals,cur,lab)=>`<div class="ftchips">${vals.map(v=>`<button type="button" class="ftchip${String(cur||"")===String(v[0])?" on":""}" data-ftset="${n}" data-v="${E(v[0])}">${E(v[1])}</button>`).join("")}</div>`;
  return `<div class="ftmod" role="dialog" aria-modal="true" aria-label="Podmienky farmára"><form class="ftbox" id="fFT" data-id="${E(id)}">
  <div class="fthd"><div><small>⚙️ Podmienky a bonusy</small><b>${E(f.name)}</b></div><button type="button" class="ftx" data-ftclose aria-label="Zavrieť">✕</button></div>
  <div class="ftsec"><div class="ftst">🎁 Individuálny bonus k cenníku</div>
   <label>Bonus na všetky komodity (€/t)<input name="b__all" inputmode="decimal" value="${E(b._all??"")}" placeholder="napr. 5"></label>
   <details${Object.keys(b).some(k=>k!=="_all"&&b[k]!=null&&b[k]!=="")?" open":""}><summary>Bonus podľa komodity (prepíše bonus na všetko)</summary><div class="ftgrid">
   ${COMS().map(m=>{const p=price(m[0]);return `<label>${E(m[1])}${p!=null?` <i>${F2(p)} €/t</i>`:""}<input name="b_${E(m[0])}" inputmode="decimal" value="${E(b[m[0]]??"")}" placeholder="—"></label>`}).join("")}</div></details>
   <div class="ftrow"><label>Platí od<input type="date" name="bonus_od" value="${E(t.bonus_od||"")}"></label><label>Platí do<input type="date" name="bonus_do" value="${E(t.bonus_do||"")}"></label></div>
   <div class="ftprev" data-ftprev></div></div>
  <div class="ftsec"><div class="ftst">📄 Podmienky obchodu</div>
   <label>Splatnosť (dni)</label>${chips("splatnost",[[7,"7"],[14,"14"],[30,"30"],[45,"45"],[60,"60"]],t.splatnost)}<input name="splatnost" inputmode="numeric" value="${E(t.splatnost??"")}" placeholder="iný počet dní">
   <label>Doprava</label>${chips("doprava",Object.entries(DOP).map(([k,v])=>[k,v.replace(/ – v cene$/,"")]),t.doprava)}<input type="hidden" name="doprava" value="${E(t.doprava||"")}">
   <label class="ftodp"${t.doprava==="odpocet"?"":" hidden"}>Odpočet za dopravu (€/t)<input name="doprava_eur" inputmode="decimal" value="${E(t.doprava_eur??"")}"></label>
   <label>Záloha po podpise (%)<input name="zaloha_pct" inputmode="decimal" value="${E(t.zaloha_pct??"")}" placeholder="0"></label>
   <label>Kvalita / tolerancia<input name="kvalita" value="${E(t.kvalita||"")}" placeholder="napr. vlhkosť do 15 % bez zrážky"></label>
   <label>Poznámka pre farmára <i>(farmár ju vidí)</i><textarea name="note_farmer" rows="2">${E(t.note_farmer||"")}</textarea></label>
   <label>Interná poznámka <i>(farmár ju nevidí)</i><textarea name="note_int" rows="2">${E(t.note_int||"")}</textarea></label></div>
  ${t.updated_at?`<div class="s">Naposledy upravil ${E(t.updated_by||"")} · ${E(new Date(t.updated_at).toLocaleString("sk-SK"))}</div>`:""}
  <div class="ftbtns"><button type="submit" class="pri">💾 Uložiť podmienky</button>${T[id]?`<button type="button" class="dng" data-ftdel="${E(id)}">Zrušiť všetky</button>`:""}</div></form></div>`}
function prev(){const fm=document.getElementById("fFT");if(!fm)return;const el=fm.querySelector("[data-ftprev]");const all=N(fm.b__all.value)||0;
  const rows=COMS().map(m=>{const p=price(m[0]);const i=fm.querySelector(`[name="b_${m[0]}"]`);const v=i&&i.value!==""?N(i.value)||0:all;return p!=null&&v?`<span>${E(m[1])}: <b>${F2(p+v)} €/t</b> <i>(${v>0?"+":""}${F2(v)})</i></span>`:""}).filter(Boolean);
  el.innerHTML=rows.length?`<small>Farmár uvidí cenu:</small>${rows.join("")}`:""}
function show(id){close();open=id;document.body.insertAdjacentHTML("beforeend",form(id));document.documentElement.classList.add("ftlock");prev();const m=document.querySelector(".ftmod");m.addEventListener("click",e=>{if(e.target===m)close()})}
function close(){document.querySelectorAll(".ftmod").forEach(x=>x.remove());document.documentElement.classList.remove("ftlock");open=null}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&open)close()});
document.addEventListener("input",e=>{if(e.target.closest&&e.target.closest("#fFT"))prev()});
document.addEventListener("click",async e=>{const t=e.target;if(!t.closest)return;let x;
  if(x=t.closest("[data-ftopen]")){e.preventDefault();e.stopPropagation();if(!staffOK())return;await loadAll(true);show(x.dataset.ftopen);return}
  if(t.closest("[data-ftclose]")){close();return}
  if(x=t.closest("[data-ftset]")){const fm=x.closest("form");const n=x.dataset.ftset;fm.querySelectorAll(`[data-ftset="${n}"]`).forEach(b=>b.classList.toggle("on",b===x));fm.querySelector(`[name="${n}"]`).value=x.dataset.v;if(n==="doprava")fm.querySelector(".ftodp").hidden=x.dataset.v!=="odpocet";return}
  if(x=t.closest("[data-ftdel]")){if(!confirm("Zrušiť všetky individuálne podmienky a bonusy tohto farmára?"))return;const r=await sb.from("farmer_terms").delete().eq("farmer_id",x.dataset.ftdel);if(r.error){toast("Nepodarilo sa: "+r.error.message,6000);return}delete T[x.dataset.ftdel];close();deco();toast("Podmienky zrušené – platí bežný cenník.");return}},true);
document.addEventListener("submit",async e=>{const fm=e.target;if(fm.id!=="fFT")return;e.preventDefault();e.stopPropagation();
  const id=fm.dataset.id,b={};const a=N(fm.b__all.value);if(a)b._all=a;for(const m of COMS()){const i=fm.querySelector(`[name="b_${m[0]}"]`);if(i&&i.value!==""){const v=N(i.value);if(v!=null)b[m[0]]=v}}
  if(Object.values(b).some(v=>Math.abs(v)>200)){toast("Bonus vyzerá príliš vysoký (viac ako 200 €/t). Skontroluj.",6000);return}
  const row={farmer_id:id,bonus:b,bonus_od:fm.bonus_od.value||null,bonus_do:fm.bonus_do.value||null,splatnost:N(fm.splatnost.value),doprava:fm.doprava.value||null,
    doprava_eur:N(fm.doprava_eur.value),zaloha_pct:N(fm.zaloha_pct.value),kvalita:fm.kvalita.value.trim()||null,note_farmer:fm.note_farmer.value.trim()||null,note_int:fm.note_int.value.trim()||null};
  if(row.bonus_od&&row.bonus_do&&row.bonus_do<row.bonus_od){toast("„Platí do“ je skôr ako „Platí od“.",5000);return}
  const btn=fm.querySelector("[type=submit]");btn.disabled=true;
  const r=await sb.from("farmer_terms").upsert(row).select().single();btn.disabled=false;
  if(r.error){toast("Neuložené: "+r.error.message,7000);return}
  T[id]=r.data;close();deco();toast("✓ Podmienky uložené. Farmár ich uvidí pri ďalšom otvorení aplikácie.",5000)},true);

function css(){if(document.getElementById("ftcss"))return;const s=document.createElement("style");s.id="ftcss";s.textContent=`
.ftb{grid-column:1/-1;margin-top:6px;padding:8px 12px;border-radius:12px;font-size:.84rem;background:linear-gradient(135deg,rgba(52,211,153,.16),rgba(34,211,238,.08));border:1px solid rgba(52,211,153,.4);color:var(--ink)}
.ftb b{color:#6ee7b7}.ftcard .t{margin-bottom:8px}.ftrw{display:grid;grid-template-columns:34px 1fr;gap:8px;align-items:start;padding:8px 0;border-top:1px solid var(--line)}.ftrw:first-of-type{border-top:0}
.ftrw>span{font-size:1.2rem;text-align:center}.ftrw small{display:block;color:var(--muted);font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;font-weight:600}.ftrw b{font-weight:600}
.ftpill{color:#6ee7b7}.ftbtn{white-space:nowrap}
html.ftlock,html.ftlock body{overflow:hidden}
.ftmod{position:fixed;inset:0;z-index:3000;background:rgba(2,6,23,.62);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;padding:0}
@media (min-width:700px){.ftmod{align-items:center;padding:24px}}
.ftbox{width:100%;max-width:620px;max-height:92vh;max-height:92dvh;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;background:linear-gradient(180deg,#141c33,#0b1020);border:1px solid rgba(255,255,255,.16);border-radius:26px 26px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom,0px));display:grid;gap:14px;box-shadow:0 -20px 60px rgba(0,0,0,.5)}
@media (min-width:700px){.ftbox{border-radius:26px}}
.fthd{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;position:sticky;top:-18px;margin:-18px -18px 0;padding:18px 18px 10px;background:linear-gradient(180deg,#141c33 80%,rgba(20,28,51,0));z-index:2}
.fthd small{display:block;color:var(--muted);font-size:.74rem;letter-spacing:.08em;text-transform:uppercase;font-weight:600}.fthd b{font-size:1.2rem;letter-spacing:-.02em}
.ftx{width:44px;height:44px;min-height:44px;border-radius:50%;flex:none;padding:0}
.ftsec{display:grid;gap:8px;padding:14px;border-radius:18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
.ftst{font-weight:700;letter-spacing:-.01em}.ftsec label{display:grid;gap:4px;font-size:.82rem;color:var(--muted)}.ftsec label i{font-style:normal;opacity:.8}
.ftsec input,.ftsec textarea{width:100%}.ftrow{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ftgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:8px}
.ftsec summary{cursor:pointer;font-size:.84rem;color:var(--ds-acc,#22d3ee);padding:6px 0}
.ftchips{display:flex;flex-wrap:wrap;gap:6px}.ftchip{min-height:40px;padding:0 14px;border-radius:999px;font-size:.84rem}
.ftchip.on{background:linear-gradient(135deg,#22d3ee,#8b5cf6)!important;color:#fff!important;border-color:transparent!important}
.ftprev{display:flex;flex-wrap:wrap;gap:6px 12px;font-size:.82rem}.ftprev small{width:100%;color:var(--muted)}.ftprev i{font-style:normal;color:#6ee7b7}
.ftbtns{display:flex;flex-wrap:wrap;gap:8px}.ftbtns .pri{flex:1;min-height:52px}
html[data-theme=light] .ftbox{background:linear-gradient(180deg,#f8fafc,#eef3fb);color:#0f172a}html[data-theme=light] .fthd{background:linear-gradient(180deg,#f8fafc 80%,rgba(248,250,252,0))}
html[data-theme=light] .ftb b,html[data-theme=light] .ftpill,html[data-theme=light] .ftprev i{color:#047857}`;document.head.appendChild(s)}

function tick(){css();const app=document.getElementById("app");if(!app)return;
  if(isF()){if(MY===null)loadMy();const h=[...app.querySelectorAll("h2")].find(x=>/Výkupné ceny/.test(x.textContent));let card=h&&h.nextElementSibling;while(card&&card.classList.contains("fdesc"))card=card.nextElementSibling;
    if(card&&!app.querySelector("[data-ftc]")){const html=farmerCard();if(html)card.insertAdjacentHTML("afterend",html)}return}
  if(staffOK()&&typeof TAB!=="undefined"&&TAB==="farm"){loadAll(false);deco()}}
let q=0;const sched=()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;try{tick()}catch(x){}})};
function start(){const app=document.getElementById("app");if(!app){setTimeout(start,300);return}new MutationObserver(sched).observe(app,{childList:true,subtree:true});sched()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
