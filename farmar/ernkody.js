/* 4. 11. 2026 PRÍKAZ MAJITEĽA: prístupové kódy ERN-MAJ/MAN/OBCH/DOD/ODB sa NIKDY nesmú nikam odoslať
   (zdieľanie, kopírovanie, WhatsApp/e-mail odkaz) – platí pre každého, aj pre Martina a Janu. Databáza to isté stráži v mail_jobs. */
(function(){
const RX=/ERN-(MAJ|MAN|OBCH|DOD|ODB)-[A-Z0-9]{4,6}/i;
const has=v=>{try{return RX.test(typeof v==="string"?v:JSON.stringify(v||""))}catch(e){return false}};
function no(){const m="⛔ Prístupové kódy ERN sa nesmú nikam odosielať ani kopírovať. Vidieť ich môže iba Martin a Jana.";
  try{if(typeof toast==="function"){toast(m,6000);return}}catch(e){}try{alert(m)}catch(e){}}
window.ernKodyBlock=has;
if(navigator.share){const sh=navigator.share.bind(navigator);navigator.share=function(d){
  if(d&&(has(d.text)||has(d.title)||has(d.url)||(d.files&&[...d.files].some(f=>has(f.name))))){no();return Promise.reject(new DOMException("ERN kódy","AbortError"))}return sh(d)}}
if(navigator.clipboard&&navigator.clipboard.writeText){const wt=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=function(t){if(has(t)){no();return Promise.reject(new Error("blocked"))}return wt(t)}}
document.addEventListener("copy",e=>{const t=String((document.getSelection&&document.getSelection())||"");if(has(t)){e.preventDefault();e.stopImmediatePropagation();no()}},true);
const wo=window.open;window.open=function(u){if(u&&has(decodeURIComponentSafe(String(u)))){no();return null}return wo.apply(window,arguments)};
function decodeURIComponentSafe(s){try{return decodeURIComponent(s)}catch(e){return s}}
document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("a[href]");if(!a)return;const h=decodeURIComponentSafe(a.getAttribute("href")||"");
  if(/^(mailto:|sms:|https:\/\/(wa\.me|api\.whatsapp|t\.me|mail\.google))/i.test(h)&&has(h)){e.preventDefault();e.stopImmediatePropagation();no()}},true);
})();
