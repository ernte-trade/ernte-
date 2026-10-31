// ===== 📅 Ceny na neskorší odber (model Interagros: odber teraz + odber neskôr, −10 €) =====
// Údaje: settings.prices_fwd {c:{com:[{p:"1.–3. 2027",price:502}]}} – zapisuje databáza (ia_tick). Vidia farmári aj tím.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
window.fwdList=c=>{try{const F=(STATE.settings||{}).prices_fwd;return (F&&F.c&&Array.isArray(F.c[c]))?F.c[c].filter(x=>x&&x.price>0&&x.p):[]}catch(x){return []}};
window.fwdLine=c=>{const L=fwdList(c);if(!L.length)return "";
  return `<div class="fwdl">📅 ${L.map(x=>`odber ${E(x.p)}: <b>${Math.round(x.price).toLocaleString("sk-SK")} €/t</b>`).join(" · ")}<small>uvedená cena = odber teraz</small></div>`};
const s=document.createElement("style");s.textContent=`.prow>.fwdl{grid-column:1/-1;order:9}.fwdl{margin-top:3px;font-size:.84rem;line-height:1.35;color:#fde68a;overflow-wrap:anywhere}.fwdl b{color:#fff3c4}.fwdl small{display:block;opacity:.7;color:inherit;font-size:.74rem}html[data-theme=light] .fwdl{color:#92400e}html[data-theme=light] .fwdl b{color:#78350f}`;document.head.appendChild(s);
})();
