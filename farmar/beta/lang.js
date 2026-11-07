// ===== 🌐 JAZYK APLIKÁCIE: 🇸🇰 SK · 🇭🇺 HU · 🇬🇧 EN · 🇩🇪 DE (príkaz majiteľa 31. 10.) =====
// Slovenčina je zdroj. Pri inom jazyku sa texty na obrazovke preložia cez databázu (i18n_get → preklad AI, spoločná pamäť prekladov),
// čísla sa nahradia {0},{1}… (jeden preklad pre všetky sumy), mená a firmy ostávajú. Preklady sa ukladajú aj v telefóne.
// Nepreklada sa: políčka na písanie, kód, mapy, [data-noi18n]. Prepínač 🌐 v hornej lište (aj na prihlásení).
(function(){
const LS="ernte-lang",LL=[["sk","🇸🇰","Slovenčina"],["hu","🇭🇺","Magyar"],["en","🇬🇧","English"],["de","🇩🇪","Deutsch"]];
let L="sk";try{L=localStorage.getItem(LS)||((navigator.language||"").slice(0,2)==="hu"?"hu":"sk")}catch(e){}
if(!LL.some(x=>x[0]===L))L="sk";
window.ernteLang=()=>L;
const flag=()=>(LL.find(x=>x[0]===L)||LL[0])[1];
function setLang(l){try{localStorage.setItem(LS,l)}catch(e){}location.reload()}
window.ernteSetLang=setLang;
// Danube (maďarskí partneri): prvé prihlásenie po maďarsky, kým si človek sám nevyberie jazyk
window.ernteLangAuto=l=>{let st=null;try{st=localStorage.getItem(LS)}catch(e){}if(st||!l||l===L)return false;try{localStorage.setItem(LS,l)}catch(e){return false}location.reload();return true};

// ---------- prepínač ----------
function btn(){const h=document.querySelector("header.top");if(!h||document.getElementById("langBtn"))return;
  const b=document.createElement("button");b.type="button";b.id="langBtn";b.className="langb";b.setAttribute("data-noi18n","");b.setAttribute("aria-label","Jazyk · Nyelv · Language · Sprache");b.textContent=flag();
  const o=document.getElementById("outBtn");if(o)h.insertBefore(b,o);else h.appendChild(b)}
function menu(){let m=document.getElementById("langMenu");if(m){m.remove();return}
  m=document.createElement("div");m.id="langMenu";m.setAttribute("data-noi18n","");m.setAttribute("role","menu");
  m.innerHTML=LL.map(x=>`<button type="button" role="menuitemradio" aria-checked="${x[0]===L}" data-lang="${x[0]}"${x[0]===L?' class="on"':""}><span>${x[1]}</span>${x[2]}</button>`).join("");
  document.body.appendChild(m);const b=document.getElementById("langBtn");if(b){const r=b.getBoundingClientRect();m.style.top=Math.round(r.bottom+8)+"px";m.style.right=Math.max(8,Math.round(innerWidth-r.right))+"px"}}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("#langBtn,[data-lang]");
  if(!t){const m=document.getElementById("langMenu");if(m&&!m.contains(e.target))m.remove();return}
  e.preventDefault();if(t.id==="langBtn")menu();else{const l=t.dataset.lang;document.getElementById("langMenu").remove();if(l!==L)setLang(l)}},true);
{const s=document.createElement("style");s.textContent=`.langb{flex:0 0 40px;align-self:center;width:40px!important;height:40px!important;min-width:40px;min-height:40px!important;max-height:40px;padding:0!important;border-radius:50%!important;display:grid;place-items:center;font-size:1.25rem;line-height:1;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);aspect-ratio:1}
#langMenu{position:fixed;z-index:10050;display:grid;gap:4px;padding:8px;border-radius:18px;background:rgba(14,22,40,.97);border:1px solid rgba(255,255,255,.2);box-shadow:0 18px 50px rgba(0,0,0,.55);backdrop-filter:blur(12px);min-width:170px}
#langMenu button{display:flex;align-items:center;gap:10px;min-height:46px;padding:8px 14px;border-radius:12px;background:transparent;border:0;color:#fff;font:600 1rem system-ui;text-align:left;justify-content:flex-start;width:100%}
#langMenu button span{font-size:1.3rem}#langMenu button.on{background:rgba(182,255,59,.16);outline:1px solid rgba(182,255,59,.5)}`;document.head.appendChild(s)}
function bootBtn(){btn();if(!document.getElementById("langBtn"))setTimeout(bootBtn,400)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bootBtn);else bootBtn();
if(L==="sk")return;

// ---------- preklad ----------
document.documentElement.lang=L;
const CK="ernte-i18n-"+L;let C={};try{C=JSON.parse(localStorage.getItem(CK)||"{}")||{}}catch(e){C={}}
let saveT=0;const save=()=>{clearTimeout(saveT);saveT=setTimeout(()=>{try{const k=Object.keys(C);if(k.length>4000)k.slice(0,k.length-4000).forEach(x=>delete C[x]);localStorage.setItem(CK,JSON.stringify(C))}catch(e){}},800)};
const SKIP=/^(SCRIPT|STYLE|TEXTAREA|INPUT|SELECT|OPTION|CODE|PRE|NOSCRIPT|IFRAME|CANVAS|VIDEO|svg|SVG)$/;
const NUM=/\d+(?:[  .,:\/–-]\d+)*/g;
function norm(t){const n=[];const k=t.replace(NUM,m=>{n.push(m);return "{"+(n.length-1)+"}"});return [k,n]}
const fill=(d,n)=>d.replace(/\{(\d+)\}/g,(m,i)=>n[+i]!=null?n[+i]:m);
const want=t=>t.length>=2&&t.length<=600&&/\p{L}{2}/u.test(t)&&!/^[\w.+-]+@[\w.-]+$/.test(t)&&!/^https?:\/\//.test(t);
const ST=new WeakMap();   // uzol → {src, dst, n, at}
const miss=new Set();let tries=0,reqT=0,busy=0;
function skipEl(el){for(let e=el;e&&e!==document.body;e=e.parentElement){if(SKIP.test(e.tagName)||e.isContentEditable||e.hasAttribute&&(e.hasAttribute("data-noi18n")||e.classList.contains("leaflet-container")))return true}return false}
function tr(src){const [k,n]=norm(src);const d=C[k];if(d==null){miss.add(k);return null}return fill(d,n)}
function doText(nd){const v=nd.nodeValue;if(!v)return;const s=ST.get(nd);if(s&&v===s.dst)return;
  const t=v.trim();if(!want(t))return;
  if(s){if(Date.now()-s.at<2000){if(++s.n>4)return}else s.n=0}  // ochrana proti zacykleniu s iným modulom
  const d=tr(t);if(d==null||d===t)return;const out=v.replace(t,()=>d);const o=s||{n:0};o.src=t;o.dst=out;o.at=Date.now();ST.set(nd,o);nd.nodeValue=out}
const AT=["placeholder","title","aria-label"];
function doAttr(el){for(const a of AT){const v=el.getAttribute(a);if(!v)continue;const key="data-i18n-"+a;const prev=el.getAttribute(key);
  if(prev&&v===el.__i18n?.[a])continue;const t=v.trim();if(!want(t))continue;const d=tr(t);if(d==null||d===t)continue;
  (el.__i18n||(el.__i18n={}))[a]=d;el.setAttribute(key,"1");el.setAttribute(a,d)}}
function walk(root){if(!root)return;if(root.nodeType===3){if(root.parentElement&&!skipEl(root.parentElement))doText(root);return}
  if(root.nodeType!==1||skipEl(root))return;
  if(root.hasAttribute&&AT.some(a=>root.hasAttribute(a)))doAttr(root);
  const w=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:n=>{if(n.nodeType!==1)return NodeFilter.FILTER_ACCEPT;if(SKIP.test(n.tagName)||n.hasAttribute("data-noi18n")||n.isContentEditable||n.classList.contains("leaflet-container"))return NodeFilter.FILTER_REJECT;return AT.some(a=>n.hasAttribute(a))?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}});
  let n;while((n=w.nextNode())){if(n.nodeType===3)doText(n);else doAttr(n)}
  if(miss.size)ask()}
function ask(){if(reqT||busy)return;reqT=setTimeout(fetchMiss,350)}
async function fetchMiss(){reqT=0;if(typeof sb==="undefined"||!sb||!miss.size)return;busy=1;
  const arr=[...miss].slice(0,250);let got=0;
  try{const r=await sb.rpc("i18n_get",{p_lang:L,p_src:arr});if(!r.error&&r.data){for(const k in r.data){if(r.data[k]){C[k]=r.data[k];miss.delete(k);got++}}}}catch(e){}
  arr.forEach(k=>{if(C[k]==null&&tries>8)miss.delete(k)});busy=0;
  if(got){save();tries=0;walk(document.body)}
  if(miss.size){tries++;reqT=setTimeout(fetchMiss,tries<3?4000:15000)}}
// zmeny na obrazovke
const pend=new Set();let q=0;
const run=()=>{q=0;const a=[...pend];pend.clear();for(const n of a){if(n.isConnected)walk(n)}};
new MutationObserver(ms=>{for(const m of ms){if(m.type==="characterData")pend.add(m.target);else if(m.type==="attributes"){if(!m.target.getAttribute("data-i18n-"+m.attributeName)||m.target.getAttribute(m.attributeName)!==m.target.__i18n?.[m.attributeName])pend.add(m.target)}else m.addedNodes.forEach(x=>pend.add(x))}
  if(pend.size&&!q)q=(window.ernteSoon||requestAnimationFrame)(run)}).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:AT});
function start(){walk(document.body);document.title&&(()=>{const d=tr(document.title);if(d)document.title=d})()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
// toast/alert/confirm – krátke texty aj cez preklad (ak ho už máme)
const _a=window.alert;window.alert=t=>_a.call(window,tr(String(t))||t);
const _c=window.confirm;window.confirm=t=>_c.call(window,tr(String(t))||t);
})();
