// ===== ERNTE · BONUSOVÝ VZOREC (−5 % a bonus až +5 %) – ZRUŠENÝ 28. 10. 2026 na žiadosť majiteľa =====
// Farmári, obchodníci aj tím vidia jednu cenu: presne tú, ktorá je zverejnená v cenníku (automaticky podľa výkupu VSK + burza).
// Žiadne percentá, žiadna zľava ani bonusová kalkulačka.
// Databáza (farmer_price, cieľové ceny, predaj od farmára) berie zľavu z nastavenia price_bonus –
// preto ho majiteľ / človek s cenníkom pri otvorení aplikácie raz nastaví na 0 %.
(function(){
window.farmDisc=()=>0;
window.bonusRow=()=>"";
let done=false;
async function fix(){if(done)return;if(typeof ROLE==="undefined"||!ROLE||(typeof FARMER!=="undefined"&&FARMER)||typeof STATE==="undefined"||!STATE.settings||typeof sb==="undefined")return;
  done=true;if(!(ROLE==="owner"||(typeof can==="function"&&can("price_edit"))))return;
  const b=STATE.settings.price_bonus;const zero=b&&Object.keys(b).length===1&&b._def&&+b._def.max===0;if(zero)return;
  const v={_def:{max:0,rules:[]}};try{const r=await sb.from("settings").upsert({key:"price_bonus",value:v});if(!r.error)STATE.settings.price_bonus=v;else done=false}catch(x){done=false}}
const t=setInterval(()=>{fix();if(done)clearInterval(t)},2000);setTimeout(()=>clearInterval(t),10*60e3);
})();
