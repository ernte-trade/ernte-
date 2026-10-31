// ===== 🔑 NOVÉ HESLÁ PRE NEPRIHLÁSENÝCH (príkaz majiteľa 31. 10.) =====
// Majiteľ v Tíme: kto sa ešte neprihlásil (+ menovite vybraní) dostane nové heslo „Meno-1234.“ (invite_reset),
// pri prvom prihlásení si musí nastaviť vlastné silné heslo a zaškrtnúť GDPR (perms.js pinModal).
// Heslá sú IBA v pamäti tejto obrazovky – nikde sa neukladajú. Pozvánka: odkaz app.ernte.sk s automatickým prihlásením.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const tst=(t,ms)=>typeof toast==="function"?toast(t,ms||4000):alert(t);
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER)&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST;
const D={pend:null,at:0,res:null,busy:0,names:"Tímk"};
const base=()=>"https://app.ernte.sk/farmar/";
const b64=o=>btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const link=r=>base()+"#prihlas="+b64({u:r.login,k:r.pw});
const first=n=>String(n||"").replace(/^(PD|SHR|AGRO|Ing\.?|Mgr\.?|Bc\.?)\s+/i,"").split(/\s+/)[0]||"";
const msg=r=>`Dobrý deň${r.k==="tim"&&first(r.name)?" "+first(r.name):""},\n\npripravili sme vám prístup do aplikácie ERNTE${r.k==="farmar"?" – výkupné ceny, vaše zmluvy, odvozy a zúčtovanie":""}.\nStačí ťuknúť na odkaz nižšie – prihlási vás to samo. Potom si nastavíte vlastné heslo.\n\nPrihlasovacie meno: ${r.login}\nHeslo na prvé prihlásenie: ${r.pw}\n\nMartin Vaľko, ERNTE spol. s r.o.\n\n👉 ERNTE Trade & Logistic: ${link(r)}`;
const tel=p=>String(p||"").replace(/[^\d+]/g,"").replace(/^00/,"+").replace(/^0(\d{9})$/,"+421$1").replace(/^\+/,"");

function html(){const p=D.pend;
  const tim=p&&p.tim||[],far=p?p.farmar:"…",g=p?p.gdpr_chyba:"…";
  let h=`<section class="card hinv" id="hinvCard"><h2>🔑 Nové heslá pre neprihlásených</h2>
  <div class="hinvs"><span>👥 Tím bez prihlásenia: <b>${p?tim.length:"…"}</b>${tim.length?` <small>(${E(tim.join(", "))})</small>`:""}</span><span>🌾 Farmári bez prihlásenia: <b>${E(far)}</b></span><span>🛡️ Bez súhlasu GDPR: <b>${E(g)}</b> <small>(opýta sa ich pri ďalšom otvorení)</small></span></div>
  <label class="ldl">Aj títo (aj keď sa už prihlásili), oddeľte čiarkou<input type="text" data-hinvn value="${E(D.names)}" autocomplete="off"></label>
  <button type="button" class="pri" data-hinvgo ${D.busy?"disabled":""}>${D.busy?"Generujem…":"🔑 Vygenerovať nové heslá a pozvánky"}</button>`;
  if(D.res){h+=D.res.length?`<p class="hinvw">⚠️ Heslá vidíte <b>iba teraz</b> – nikde sa neukladajú. Pošlite pozvánky hneď.</p><div class="hinvl">`+D.res.map((r,i)=>`<div class="hinvr" data-hi="${i}"><div class="hinvh"><b>${E(r.name)}</b><small>${r.k==="tim"?"tím":"farmár"} · ${E(r.login)}</small></div>
    <div class="hinvpw">${E(r.pw)}</div><div class="hinvb"><button type="button" data-hia="wa">💬 WhatsApp</button><button type="button" data-hia="sms">📱 SMS</button><button type="button" data-hia="mail">✉️ E-mail</button><button type="button" data-hia="pdf">📄 PDF</button><button type="button" data-hia="cp">📋 Kopírovať</button></div></div>`).join("")+`</div>`:`<p class="hinvp">Nikto nečaká – všetci sa už prihlásili.</p>`}
  return h+`</section>`}

function put(){const app=document.getElementById("app");if(!app)return;const old=document.getElementById("hinvCard");
  const show=OWN()&&typeof TAB!=="undefined"&&TAB==="team";if(!show){if(old)old.remove();return}
  if(old&&old.contains(document.activeElement)&&document.activeElement.tagName==="INPUT")return;
  const h=html();let hs=0;for(let i=0;i<h.length;i++)hs=(hs*31+h.charCodeAt(i))|0;hs=String(hs);if(old&&old.dataset.h===hs)return;
  const d=document.createElement("div");d.innerHTML=h;const el=d.firstElementChild;el.dataset.h=hs;if(old){old.replaceWith(el);return}
  const ta=document.getElementById("taCard");if(ta){ta.after(el);return}
  const a=app.querySelector("nav.tabs")||app.querySelector(".hero");if(a)a.after(el);else app.prepend(el)}
async function load(){D.at=Date.now();try{const r=await sb.rpc("invite_pending");if(!r.error)D.pend=r.data||{}}catch(e){}put()}

document.addEventListener("input",e=>{if(e.target.dataset&&"hinvn" in e.target.dataset)D.names=e.target.value},true);
document.addEventListener("click",async e=>{const t=e.target.closest&&e.target.closest("[data-hinvgo],[data-hia]");if(!t||!OWN())return;e.preventDefault();
  if("hinvgo" in t.dataset){const names=D.names.split(",").map(s=>s.trim()).filter(s=>s.length>=3);
    const n=(D.pend&&D.pend.tim?D.pend.tim.length:0)+(+(D.pend&&D.pend.farmar)||0);
    if(!confirm(`Vygenerovať nové heslá? Týka sa to ${n} neprihlásených${names.length?" + "+names.join(", "):""}. Ich staré heslá prestanú platiť.`))return;
    D.busy=1;put();try{const r=await sb.rpc("invite_reset",{p_names:names.length?names:null});if(r.error)throw r.error;D.res=r.data||[];tst(`✓ Nové heslá: ${D.res.length}. Pošlite pozvánky.`,5000)}
    catch(x){tst("Nepodarilo sa: "+(x&&x.message||x),6000)}D.busy=0;put();load();return}
  const r=D.res&&D.res[+t.closest("[data-hi]").dataset.hi];if(!r)return;const m=msg(r),a=t.dataset.hia;
  if(a==="wa"){const p=tel(r.phone);window.open((p?"https://wa.me/"+p:"https://wa.me/")+"?text="+encodeURIComponent(m),"_blank","noopener")}
  else if(a==="sms"){location.href="sms:"+(r.phone?String(r.phone).replace(/\s/g,""):"")+"?&body="+encodeURIComponent(m)}
  else if(a==="mail"){const em=/@/.test(r.login)?r.login:"";location.href="mailto:"+em+"?subject="+encodeURIComponent("Prístup do aplikácie ERNTE")+"&body="+encodeURIComponent(m)}
  else if(a==="pdf"){if(window.inviteCardSend)window.inviteCardSend({txt:m.replace(/\n\n👉[\s\S]*$/,"").replace("Heslo na prvé prihlásenie:","Heslo:"),pw:r.pw,name:r.name,team:r.k==="tim"},"pdf",t);else tst("PDF pozvánka nie je dostupná.")}
  else if(a==="cp"){try{await navigator.clipboard.writeText(m);tst("✓ Skopírované – vložte do správy.")}catch(x){prompt("Skopírujte:",m)}}},true);

{const s=document.createElement("style");s.textContent=`.hinv h2{margin:0 0 6px}.hinvp{margin:6px 0;line-height:1.5;opacity:.92}.hinvs{display:grid;gap:6px;margin:10px 0;font-size:.92rem}.hinvs small{opacity:.75}
.hinvw{background:rgba(245,158,11,.14);border:1px solid rgba(245,158,11,.45);border-radius:12px;padding:10px;margin:12px 0 8px}
.hinvl{display:grid;gap:10px}.hinvr{border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:12px;background:rgba(255,255,255,.04);display:grid;gap:8px;min-width:0}
.hinvh{display:grid;gap:2px;min-width:0}.hinvh small{opacity:.7;overflow-wrap:anywhere}.hinvpw{font:800 1.25rem/1.2 ui-monospace,Menlo,monospace;color:#b6ff3b;letter-spacing:.04em;text-align:center;padding:8px;border-radius:12px;background:rgba(0,0,0,.25);overflow-wrap:anywhere}
.hinvb{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:6px}.hinvb button{min-height:44px;padding:6px 8px;font-size:.88rem;white-space:nowrap}`;document.head.appendChild(s)}

let q=0;const sch=()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;if(!OWN()){put();return}if(TAB==="team"&&Date.now()-D.at>120e3)load();put()})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
