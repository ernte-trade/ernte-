// ===== Štýl dokumentov: DOPRAVA = VALKO s.r.o. · OBCHOD, TRUS, ZÚČTOVANIE = ERNTE spol. s r.o. =====
// brandHead(firma, nadpis, podnadpis, vpravo) = hlavička PDF s logom a údajmi firmy; brandCss(firma) = farby tabuliek.
(function(){
const abs=u=>{try{return new URL(u,location.href).href}catch(x){return u}};
const B=window.BRAND={
 ernte:{n:"ERNTE spol. s r.o.",sub:"Výkup a obchod s poľnohospodárskymi komoditami",addr:"Zbudza 141, 072 23",ids:"IČO 52 341 356",ct:"+421 918 449 991 · jana.valkova@ernte.sk",logo:"logo.png",lh:46,c:"#3f6212",a:"#8bc34a",bg:"#eef5e4",bg2:"#f6faef"},
 valko:{n:"VALKO s.r.o.",sub:"Medzinárodná kamiónová doprava · Valko Logistics",addr:"Zbudza 141, 072 23",ids:"IČO 53 365 241 · IČ DPH SK2121345424",ct:"GMP+ SK24/00000145 · licencia EÚ",logo:"valko-logo.png",lh:38,c:"#1e2a71",a:"#1e2a71",bg:"#e9ecf7",bg2:"#f3f5fb"}};
const E=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
window.brandHead=function(k,title,sub,right){const F=B[k]||B.ernte;
  return `<div class="bhd" style="display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:3px solid ${F.a};padding-bottom:10px;margin-bottom:12px">
   <div style="display:flex;align-items:center;gap:12px"><img src="${abs(F.logo)}" alt="${E(F.n)}" style="height:${F.lh}px;width:auto"><div><b style="display:block;font:800 15px Arial,sans-serif;color:${F.c}">${E(F.n)}</b><small style="display:block;color:#555;font:10px/1.45 Arial,sans-serif">${E(F.sub)}<br>${E(F.addr)} · ${E(F.ids)}<br>${E(F.ct)}</small></div></div>
   <div style="text-align:right"><b style="display:block;font:800 16px/1.25 Arial,sans-serif;color:#111">${title}</b>${sub?`<small style="display:block;color:#555;font:10.5px/1.45 Arial,sans-serif">${sub}</small>`:""}${right||""}</div></div>`};
window.brandCss=function(k){const F=B[k]||B.ernte;return `th{background:${F.bg}!important;color:${F.c}!important}tr.zsr td,tr.sub td{background:${F.bg2}!important}tfoot td{background:${F.bg}!important}.ztt tr:last-child td,.sum tr.t td{background:${F.bg}!important;color:${F.c}!important}.pt h3,.zpt small{color:${F.c}!important}.btn{background:${F.c}!important}`};
// ktorá firma: doprava → VALKO, inak ERNTE
window.brandOf=t=>/doprav|preprav|cmr|jazd|vodi|flotil|n[aá]kladn/i.test(String(t||""))?"valko":"ernte";
})();
