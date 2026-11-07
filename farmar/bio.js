// ===== 🔐 PRIHLÁSENIE BEZ HESLA – Face ID / odtlačok prsta (WebAuthn PRF) + kód e-mailom =====
// Po prihlásení heslom aplikácia ponúkne „Nabudúce Face ID / odtlačkom“. Heslo sa uloží LEN v tomto telefóne, zašifrované kľúčom,
// ktorý vydá iba čip telefónu po overení tváre / prsta (rozšírenie PRF). Bez neho sa heslo rozšifrovať nedá. Server nič nové neukladá.
// Na prihlasovacej obrazovke: veľké tlačidlo 🔐 a „📧 Bez hesla – pošlite mi kód“.
(function(){
const K="ernte-bio",E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const tst=(t,ms)=>typeof toast==="function"?toast(t,ms||4500):alert(t);
const ok=()=>!!(window.PublicKeyCredential&&navigator.credentials&&window.isSecureContext&&window.crypto&&crypto.subtle);
const b64=u=>btoa(String.fromCharCode(...new Uint8Array(u))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const ub64=s=>Uint8Array.from(atob(String(s).replace(/-/g,"+").replace(/_/g,"/")+"===".slice((String(s).length+3)%4)),c=>c.charCodeAt(0));
const rnd=n=>crypto.getRandomValues(new Uint8Array(n));
const saved=()=>{try{const o=JSON.parse(localStorage.getItem(K)||"null");return o&&o.id&&o.ct?o:null}catch(x){return null}};
const HU=()=>{try{return (navigator.language||"").toLowerCase().startsWith("hu")}catch(x){return false}};
async function keyFrom(prf){return crypto.subtle.importKey("raw",await crypto.subtle.digest("SHA-256",prf),"AES-GCM",false,["encrypt","decrypt"])}
async function prfGet(id,salt){const a=await navigator.credentials.get({publicKey:{challenge:rnd(32),rpId:location.hostname,allowCredentials:[{type:"public-key",id:ub64(id)}],
  userVerification:"required",timeout:60000,extensions:{prf:{eval:{first:ub64(salt)}}}}});
  const r=a&&a.getClientExtensionResults&&a.getClientExtensionResults();return r&&r.prf&&r.prf.results&&r.prf.results.first}

// ---------- zapnutie po prihlásení heslom ----------
let pend=null;
document.addEventListener("submit",e=>{const f=e.target;if(!f||f.id!=="fEmail")return;try{const d=new FormData(f),pw=String(d.get("pw")||"").trim();
  if(pw&&typeof loginId==="function")pend={email:loginId(String(d.get("email")||"")),pw,at:Date.now()}}catch(x){}},true);
function offer(){if(!pend||!ok()||saved())return;const P=pend;pend=null;
  try{if(localStorage.getItem(K+"-no")===P.email)return}catch(x){}
  const el=document.createElement("div");el.className="biom";el.innerHTML=`<div class="bioc"><div class="bioi">🔐</div><b>Prihlasovať sa nabudúce Face ID alebo odtlačkom prsta?</b>
   <small>Bez písania hesla – jedným pohľadom alebo prstom. Heslo ostane zašifrované iba v tomto telefóne.</small>
   <small lang="hu">🇭🇺 Legközelebb arccal vagy ujjlenyomattal lép be, jelszó nélkül.</small>
   <div class="biob"><button type="button" class="pri" data-bioon>✅ Zapnúť</button><button type="button" data-biono>Teraz nie</button></div></div>`;
  document.body.appendChild(el);
  el.addEventListener("click",async ev=>{const t=ev.target;
    if(t.closest("[data-biono]")){try{localStorage.setItem(K+"-no",P.email)}catch(x){}el.remove();return}
    if(!t.closest("[data-bioon]"))return;const btn=t.closest("[data-bioon]");btn.disabled=true;
    try{const salt=rnd(32),nm=P.email.endsWith("@tel.ernte.sk")?"+"+P.email.split("@")[0]:P.email;
      const c=await navigator.credentials.create({publicKey:{rp:{name:"ERNTE Trade & Logistic",id:location.hostname},user:{id:rnd(16),name:nm,displayName:"ERNTE · "+nm},challenge:rnd(32),
        pubKeyCredParams:[{type:"public-key",alg:-7},{type:"public-key",alg:-257}],authenticatorSelection:{authenticatorAttachment:"platform",userVerification:"required",residentKey:"preferred"},
        timeout:60000,attestation:"none",extensions:{prf:{eval:{first:salt}}}}});
      const ex=c.getClientExtensionResults?c.getClientExtensionResults():{};const id=b64(c.rawId);
      if(!ex.prf||ex.prf.enabled===false){el.remove();tst("Tento telefón zatiaľ nepodporuje bezpečné prihlásenie odtlačkom pre webové aplikácie. Prihlasuj sa heslom alebo kódom z e-mailu.",8000);return}
      let prf=ex.prf.results&&ex.prf.results.first;if(!prf)prf=await prfGet(id,b64(salt)); // niektoré telefóny vrátia kľúč až pri prvom overení
      if(!prf)throw new Error("bez kľúča");
      const iv=rnd(12),ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},await keyFrom(prf),new TextEncoder().encode(P.pw));
      localStorage.setItem(K,JSON.stringify({id,salt:b64(salt),iv:b64(iv),ct:b64(ct),email:P.email,nm,at:new Date().toISOString()}));
      el.remove();tst("✅ Hotovo – nabudúce sa prihlásiš Face ID / odtlačkom.",5000)}
    catch(x){btn.disabled=false;if(x&&x.name==="NotAllowedError"){el.remove();return}tst("Nepodarilo sa zapnúť: "+(x&&x.message||x),6000)}});
}
setInterval(()=>{if(pend&&typeof ME!=="undefined"&&ME&&String(ME.email||"").toLowerCase()===pend.email){setTimeout(offer,1500)}else if(pend&&Date.now()-pend.at>30000)pend=null},700);

// ---------- prihlasovacia obrazovka ----------
function paint(){const f=document.getElementById("fEmail");if(!f||f.querySelector(".biol"))return;const S=saved();
  const sub=f.querySelector("button[type=submit]");
  if(S&&ok()){const top=document.createElement("div");top.className="biol biotop";top.innerHTML=`<button type="button" class="biogo" data-biogo><span>🔐</span><b>Prihlásiť Face ID / odtlačkom</b><small>${E(S.nm||S.email)}</small></button><button type="button" class="biox" data-biox>Zabudnúť Face ID na tomto telefóne</button>`;f.prepend(top)}
  const box=document.createElement("div");box.className="biol";box.innerHTML=`<button type="button" class="biocode" data-biocode>📧 Bez hesla – pošlite mi kód na e-mail${HU()?" · Kód e-mailben":""}</button>`;
  if(sub)sub.after(box);else f.appendChild(box)}
document.addEventListener("click",async e=>{const t=e.target;
  if(t.closest&&t.closest("[data-biocode]")){e.preventDefault();const f=document.getElementById("fEmail");if(!f)return;const v=String(f.email.value||"").trim();
    if(!v.includes("@")){tst("Kód pošleme na e-mail – napíšte e-mailovú adresu. (Pri telefóne zadajte heslo od ERNTE.)",6000);f.email.focus();return}
    f.pw.value="";f.requestSubmit?f.requestSubmit():f.dispatchEvent(new Event("submit",{cancelable:true,bubbles:true}));return}
  if(t.closest&&t.closest("[data-biox]")){e.preventDefault();try{localStorage.removeItem(K)}catch(x){}document.querySelectorAll(".biol").forEach(b=>b.remove());paint();tst("Face ID / odtlačok na tomto telefóne vypnuté.");return}
  const g=t.closest&&t.closest("[data-biogo]");if(!g)return;e.preventDefault();const S=saved();if(!S)return;g.disabled=true;
  try{const prf=await prfGet(S.id,S.salt);if(!prf)throw new Error("Telefón nevydal kľúč.");
    const pw=new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:ub64(S.iv)},await keyFrom(prf),ub64(S.ct)));
    const r=await sb.auth.signInWithPassword({email:S.email,password:pw});
    if(r.error){try{localStorage.removeItem(K)}catch(x){}g.disabled=false;tst("Heslo sa medzičasom zmenilo – prihláste sa heslom, potom znova zapnite Face ID.",7000);document.querySelectorAll(".biol").forEach(b=>b.remove());paint();return}
    if(typeof enter==="function")await enter(r.data.user)}
  catch(x){g.disabled=false;if(x&&x.name==="NotAllowedError")return;tst("Prihlásenie odtlačkom zlyhalo: "+(x&&x.message||x)+". Prihláste sa heslom.",7000)}},true);
{const s=document.createElement("style");s.textContent=`
.biol{display:grid;gap:8px;margin-top:4px}
.biogo{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:2px 12px;text-align:left;min-height:64px;padding:10px 16px;border-radius:18px;border:1px solid rgba(182,255,59,.6);
 background:linear-gradient(135deg,rgba(182,255,59,.22),rgba(34,211,238,.18));color:#fff;box-shadow:0 0 22px rgba(182,255,59,.25)}
.biogo span{grid-row:1/3;font-size:1.8rem}.biogo b{font-size:1.02rem}.biogo small{opacity:.75;overflow-wrap:anywhere}
.biocode{min-height:48px;border-radius:14px;white-space:normal}
.biox{min-height:40px;background:none!important;border:0!important;color:#9aa3b8!important;font-size:.82rem!important;text-decoration:underline;box-shadow:none!important}
.biom{position:fixed;inset:0;z-index:32000;display:flex;align-items:flex-end;justify-content:center;padding:12px;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
@media(min-width:700px){.biom{align-items:center}}
.bioc{width:min(460px,100%);display:grid;gap:8px;text-align:center;padding:20px 18px calc(18px + env(safe-area-inset-bottom,0px));border-radius:24px;background:linear-gradient(160deg,#1c2433,#0c1018);color:#eef2f7;border:1px solid rgba(182,255,59,.45)}
.bioi{font-size:2.6rem}.bioc small{opacity:.8;overflow-wrap:anywhere}.biob{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:6px}.biob button{flex:1 1 140px;min-height:48px}`;document.head.appendChild(s)}
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,400);return}new MutationObserver(()=>paint()).observe(app,{childList:true});paint()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
