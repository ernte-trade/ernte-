// ===== 💡 POSLEDNÁ CENA FARMÁRA PRI ZADÁVANÍ OBCHODU (návrh Claude č. 5, schválil Martin) =====
// Pod políčkom Cena v „Nový obchod“ (#fDeal) aj v „🤝 Uzatvoriť obchod“ (qd.js, #qdPrice) jeden riadok:
// „naposledy: Kukurica 170 €/t · 12. 10. 2026 (K2026/7)“ – iba naše nákupné ceny od TOHTO farmára (STATE.deals, ktoré obchodník aj tak vidí).
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const N=x=>(+x).toLocaleString("sk-SK",{maximumFractionDigits:2});
const CN=c=>typeof comName==="function"?comName(c):c;
const dt=d=>{const m=String(d||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${+m[3]}. ${+m[2]}. ${m[1]}`:""};
const nz=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();
function deals(){if(typeof STATE==="undefined")return [];return [].concat(STATE.deals||[],STATE.dealsArch||[]).filter(d=>d&&d.price>0&&d.status!=="zruseny")}
function last(fid,com){if(!fid)return null;const L=deals().filter(d=>d.farmer_id===fid).sort((a,b)=>String(b.signed_at||b.created_at||"").localeCompare(String(a.signed_at||a.created_at||"")));
  if(!L.length)return null;const same=com?L.find(d=>d.com===com):null;return {same,any:same?null:L[0],n:L.length}}
function txt(fid,com){const r=last(fid,com);if(!r)return fid?`<span>💡 S týmto farmárom zatiaľ nemáme žiadny obchod.</span>`:"";
  const d=r.same||r.any;return `<span>💡 naposledy${r.same?"":" (iná komodita)"}: <b>${E(CN(d.com))} ${N(d.price)} €/t</b> · ${E(dt(d.signed_at||d.created_at))}${d.no?` (${E(d.no)})`:""}</span>`}
function put(inp,html){if(!inp)return;let lab=inp.closest("label")||inp;if(lab.parentElement&&lab.parentElement.classList.contains("qdrow"))lab=lab.parentElement;let el=lab.nextElementSibling;
  if(!el||!el.classList||!el.classList.contains("lpx")){if(!html)return;el=document.createElement("div");el.className="lpx s";lab.after(el)}
  if(!html){el.remove();return}if(el.innerHTML!==html)el.innerHTML=html}
function apply(){if(typeof STATE==="undefined"||typeof FARMER!=="undefined"&&FARMER)return;
  const f=document.getElementById("fDeal");
  if(f){const fid=f.querySelector('input[name="farmer"]'),com=f.querySelector('#dCom,select[name="com"]');put(f.querySelector("#dPrice"),fid&&fid.value?txt(fid.value,com&&com.value):"")}
  const qp=document.getElementById("qdPrice");
  if(qp){const fq=document.getElementById("qdFq"),F=(STATE.farmers||[]).find(x=>fq&&nz(x.name)===nz(fq.value)),c=document.querySelector(".qdc.on[data-qdcom]");put(qp,F?txt(F.id,c&&c.dataset.qdcom):"")}}
let q=0;const sched=()=>{if(q)return;q=1;(window.ernteSoon||requestAnimationFrame)(()=>{q=0;try{apply()}catch(x){}})};
["input","change","click"].forEach(ev=>document.addEventListener(ev,e=>{if(e.target&&e.target.closest&&e.target.closest("#fDeal,.qd,#qdFq,[data-qdcom],[data-dfp],.dfl"))sched()},true));
function wrap(){const o=window.renderStaff;if(typeof o!=="function"||o.__lpx)return;const w=function(){const r=o.apply(this,arguments);sched();return r};
  Object.keys(o).forEach(k=>{if(!(k in w))w[k]=o[k]});w.__lpx=1;window.renderStaff=w}
setInterval(wrap,1500);wrap();
{const s=document.createElement("style");s.textContent=`.lpx{margin:-2px 0 6px;font-size:.8rem;line-height:1.35;opacity:.9;overflow-wrap:anywhere;grid-column:1/-1}.lpx b{color:var(--acc,#b6ff3b)}`;document.head.appendChild(s)}
})();
