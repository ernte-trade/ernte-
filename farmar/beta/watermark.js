// ===== 🛡 Vodoznak proti únikom =====
// Webová aplikácia v prehliadači NEVIE zabrániť snímke obrazovky (to dokáže len natívna appka).
// Preto cez obrazovku prekrýva jemný, opakovaný vodoznak s menom prihláseného človeka a časom.
// Snímku nezastaví, ale na každom úniku je vidno, KTO a KEDY ju spravil – a tým sa dá dohľadať zdroj.
// Vodoznak neblokuje ovládanie (pointer-events:none), je priehľadný a číta sa cez neho normálne.
(function(){
  const ID="ewm";
  // Meno prihláseného: farmár → meno, personál/majiteľ → meno alebo e-mail, partner → "Partner".
  function nameOf(){
    try{
      if(typeof FARMER!=="undefined"&&FARMER&&FARMER.name)return FARMER.name;
      if(typeof ME!=="undefined"&&ME&&(ME.staffName||ME.email))return ME.staffName||ME.email;
      if(document.querySelector(".trtabs"))return "Partner";
    }catch(e){}
    return "";
  }
  function stamp(){
    const d=new Date(),p=n=>String(n).padStart(2,"0");
    return `${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  // Vytvorí dlaždicu s otočeným textom ako SVG a vráti ju ako background-image.
  function tile(label){
    const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="340" height="190">`
      +`<text x="0" y="110" transform="rotate(-24 0 110)" `
      +`font-family="system-ui,Arial,sans-serif" font-size="15" font-weight="600" `
      +`fill="#808080" fill-opacity="0.16">${esc(label)}</text></svg>`;
    return "url(\"data:image/svg+xml;utf8,"+encodeURIComponent(svg)+"\")";
  }
  function css(){
    if(document.getElementById(ID+"-css"))return;
    const s=document.createElement("style");s.id=ID+"-css";s.textContent=`
#${ID}{position:fixed;inset:0;z-index:2147482000;pointer-events:none;background-repeat:repeat;background-position:0 0}
@media print{#${ID}{display:none!important}}
`;document.head.appendChild(s);
  }
  function tick(){
    const nm=nameOf();
    let el=document.getElementById(ID);
    if(!nm){ if(el)el.remove(); return; }        // neprihlásený → žiadny vodoznak
    css();
    if(!el){el=document.createElement("div");el.id=ID;el.setAttribute("aria-hidden","true");document.body.appendChild(el);}
    el.style.backgroundImage=tile(nm+" · "+stamp());
  }
  // Prvé vykreslenie + obnova času každých 30 s a pri návrate do appky.
  function boot(){tick();setInterval(tick,30000);
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)tick();});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
