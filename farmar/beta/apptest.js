// ===== 🧪 DIAGNOSTIKA → AUTOMATICKÉ TESTY (iba majiteľ) =====
// Výsledky workflowu app-test (každých 15 min, náhradná databáza s vymyslenými údajmi): chyby, upozornenia, čas načítania,
// vizuálne rozdiely oproti schválenej verzii, automatické vrátenie verzie. Snímky chýb: vetva app-test/shots (verejné, bez osobných údajov).
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER);
const RAW="https://raw.githubusercontent.com/ernte-trade/ernte-/app-test/shots/";
let D=null,busy=false;
const dt=x=>x?new Date(x).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}):"–";
const sec=ms=>ms==null?"–":(ms/1000).toFixed(1).replace(".",",")+" s";
async function load(){if(busy)return;busy=true;try{const r=await sb.rpc("app_test_get");D=r.error?{err:r.error.message}:(r.data||{})}catch(e){D={err:String(e&&e.message||e)}}busy=false;const el=document.getElementById("atWrap");if(el)el.outerHTML=html()}
function html(){if(!OWN())return "";
  if(!D){setTimeout(load,0);return `<div class="card" id="atWrap"><h2>🧪 Automatické testy</h2><div class="s">Načítavam…</div></div>`}
  if(D.err)return `<div class="card" id="atWrap"><h2>🧪 Automatické testy</h2><div class="s">${/app_test_get/.test(D.err)?"Zapne sa po aktualizácii databázy (do pár minút).":E(D.err)}</div></div>`;
  const R=D.runs||[],L=R[0],d7=D.d7||{};
  let h=`<div class="card" id="atWrap"><h2>🧪 Automatické testy</h2><div class="s">Každých 15 min sa aplikácia sama prejde ako majiteľ, obchodník, doprava a farmár (344 – 1440 px, vymyslené údaje).</div>
   <div class="atk"><div><small>Posledný test</small><b class="${L?(L.ok?"ato":"atb"):""}">${L?(L.ok?"✅ OK":"❌ chyba"):"zatiaľ nebežal"}</b><small>${L?dt(L.at):""}</small></div>
   <div><small>7 dní: behov / s chybou</small><b>${d7.n||0} / ${d7.fail||0}</b></div><div><small>Priem. načítanie</small><b>${sec(d7.load_avg)}</b></div><div><small>Vrátené nasadenia</small><b>${d7.rollback||0}</b></div></div>`;
  if(L&&!L.ok)h+=`<div class="atl atbad"><b>Chyby</b><ul>${(L.fails||[]).slice(0,12).map(x=>`<li>${E(x)}</li>`).join("")}</ul>${(L.shots||[]).length?`<div class="atsh">${L.shots.slice(0,6).map(f=>`<a href="${RAW+encodeURIComponent(f)}" target="_blank" rel="noopener">📷 ${E(f)}</a>`).join("")}</div>`:""}</div>`;
  // 7. 11. („ČO TO JE???“): nie je to chyba – porovnanie novej verzie (Martin, Jana) s verziou tímu a farmárov; ukáže sa iba pri väčšej zmene (≥ 10 %)
  {const V=L?(L.vis||[]).filter(v=>+v.pct>=10):[];if(V.length)h+=`<details class="atl"><summary>🎨 Po zverejnení novej verzie sa viditeľne zmení ${V.length} ${V.length===1?"obrazovka":V.length<5?"obrazovky":"obrazoviek"} (nie je to chyba)</summary><div class="s">Porovnanie novej verzie (máš ju ty a Jana) s verziou, ktorú majú tím a farmári. Rozdiel = zmeny, ktoré sa ostatným ukážu, keď novú verziu zverejníš.</div><ul>${V.slice(0,10).map(v=>`<li>${E(v.shot)} – ${String(v.pct).replace(".",",")} %</li>`).join("")}</ul></details>`}
  if(L&&(L.warns||[]).length)h+=`<details class="atl"><summary>Upozornenia (${L.warns.length})</summary><ul>${L.warns.slice(0,20).map(x=>`<li>${E(x)}</li>`).join("")}</ul></details>`;
  if(R.length>1)h+=`<details class="atl"><summary>Posledné behy (${R.length})</summary><ul>${R.map(x=>`<li>${x.ok?"✅":"❌"} ${dt(x.at)} · ${E(x.sha||"")} · ${sec(x.load_avg)}${x.rollback?" · ↩️ vrátené "+E(x.rollback):""}</li>`).join("")}</ul></details>`;
  return h+`</div>`}
window.vAppTest=html;
{const s=document.createElement("style");s.textContent=`#atWrap .atk{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,140px),1fr));gap:8px;margin:10px 0}
#atWrap .atk>div{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:8px;text-align:center;min-width:0}
#atWrap .atk small{display:block;opacity:.75;font-size:.74rem}#atWrap .atk b{display:block;font-size:1.05rem;overflow-wrap:anywhere}.ato{color:#bef264}.atb{color:#fca5a5}
#atWrap .atl{margin-top:8px;font-size:.85rem;overflow-wrap:anywhere}#atWrap .atl ul{margin:4px 0 0 18px;padding:0}#atWrap .atbad{border-left:3px solid #f87171;padding-left:8px}
#atWrap .atsh{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}#atWrap .atsh a{min-height:40px;display:inline-flex;align-items:center;padding:0 10px;border-radius:10px;border:1px solid rgba(255,255,255,.2);color:inherit;text-decoration:none;max-width:100%;overflow-wrap:anywhere}`;document.head.appendChild(s)}
})();
