// každé tlačidlo, ktoré obsahuje iba ✕ / × / ✖, dostane triedu „xr“ → presný kruh (fit.css)
(function(){const X=/^[×✕✖xX]$/;function mark(r){(r||document).querySelectorAll("button:not(.xr)").forEach(b=>{if(X.test((b.textContent||"").trim())&&!b.children.length)b.classList.add("xr")})}
let q=0;new MutationObserver(()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;try{mark()}catch(x){}})}).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>mark());else mark()})();
