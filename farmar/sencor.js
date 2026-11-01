// ===== 🏠 Sencor HOME – rýchle otvorenie aplikácie (príkaz majiteľa 1. 11.: „môžem vidieť len ja“) =====
// Iba Martin (MAIN_OK). Sencor nemá verejné prepojenie (API) – tlačidlo otvorí aplikáciu Sencor HOME / jej stránku v obchode.
(function(){
const OK=()=>typeof MAIN_OK==="function"&&MAIN_OK()&&typeof ROLE!=="undefined"&&ROLE==="owner"&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST;
const IOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const URL_IOS="https://apps.apple.com/app/id1586323736",URL_AND="https://play.google.com/store/search?q=Sencor%20HOME&c=apps";
function put(){const r=document.getElementById("refBtn"),b=document.getElementById("sencorBtn");
  if(!OK()){if(b)b.remove();return}if(b||!r||!r.parentNode)return;
  const x=document.createElement("button");x.type="button";x.id="sencorBtn";x.className="topref sencb";x.title="Sencor HOME";x.setAttribute("aria-label","Otvoriť Sencor HOME");x.innerHTML="<span>🏠</span>";
  x.onclick=()=>{window.open(IOS?URL_IOS:URL_AND,"_blank","noopener")};r.parentNode.insertBefore(x,r)}
setInterval(put,2000);setTimeout(put,800);
{const s=document.createElement("style");s.textContent=`#sencorBtn span{font-size:1.15rem;line-height:1}`;document.head.appendChild(s)}
})();
