// ===== 🌐 VLASTNÁ DOMÉNA app.ernte.sk (iba majiteľ) =====
// Údaje: domain_status() / domain_check_now() / domain_reg_set() (databáza, pg_cron 'domena' každých 15 min).
// Karta: Prehľad (kým doména nefunguje), Flotila → Nastavenia → 🩺 Diagnostika a 🌐 Doména (registrátor, API kľúč, e-mail pre správcu).
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER);
const D={s:null,at:0,busy:false,prov:null};
const dt=x=>{if(!x)return "";const d=new Date(x);return isNaN(d)?"":d.toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})};
const REC=s=>({type:s.type||"CNAME",name:s.name||"app",host:s.host||"app.ernte.sk",value:s.target||"ernte-trade.github.io",ttl:s.ttl||3600});
const PROV=[["websupport","WebSupport"],["forpsi","Forpsi"],["active24","Active24"],["iny","iný"]];
async function load(force){if(!OWN()||D.busy)return;if(!force&&D.s&&Date.now()-D.at<60e3)return;D.busy=true;
  try{const r=await sb.rpc("domain_status",{p_seen:true});if(!r.error&&r.data){D.s=r.data;if(!D.prov)D.prov=r.data.reg_prov||null}else D.s=D.s||{err:1}}catch(x){D.s=D.s||{err:1}}finally{D.busy=false;D.at=Date.now()}repaint()}
function repaint(){if(typeof renderStaff==="function"&&typeof TAB!=="undefined"&&(TAB==="fleet"||TAB==="home"))try{renderStaff()}catch(x){}}
const done=s=>s&&s.https_ok===true;
function stRow(n,ok,txt,sub){return `<div class="domr"><span><b>${E(n)}</b>${sub?`<small>${sub}</small>`:""}</span><span class="domst ${ok===true?"ok":ok===false?"no":"n"}">${txt}</span></div>`}
function card(full){if(!OWN())return "";if(!D.s){load(false);return `<div class="card domc"><b class="domt">🌐 Doména app.ernte.sk</b><div class="s">Načítavam…</div></div>`}
  const s=D.s,R=REC(s),rg=s.reg||{};
  let h=`<div class="card domc${done(s)?"":" w"}"><b class="domt">🌐 Doména app.ernte.sk${done(s)?" · ✅ funguje":""}</b>`;
  if(!s.dns_ok)h+=`<div class="s">U registrátora domény <b>ernte.sk</b> treba pridať tento DNS záznam${rg.step==="hotovo"?" (cez API už odoslaný – čaká sa na rozšírenie DNS)":""}. Aplikácia ho kontroluje každých 15 min a po overení zapne HTTPS a presmerovanie sama.</div>`;
  h+=`<div class="domrec"><div class="domrh"><span>Typ</span><span>Názov</span><span>Hodnota</span><span>TTL</span></div><div class="domrv"><span><b>${E(R.type)}</b></span><span><b>${E(R.name)}</b><small>${E(R.host)}</small></span><span><b>${E(R.value)}</b></span><span>${E(R.ttl)}</span></div></div>
   <div class="btns"><button type="button" class="copy" data-domcopy="${E(R.value)}">📋 Kopírovať hodnotu</button><button type="button" class="copy" data-domcopy="${E(R.host+" "+R.ttl+" IN "+R.type+" "+R.value+".")}">📋 Kopírovať celý záznam</button><button type="button" data-domcheck>↻ Skontrolovať teraz</button></div>`;
  h+=`<div class="domrows">`+
   stRow("DNS záznam",s.dns_ok===true?true:s.checks?false:null,s.dns_ok?"✓ overený":s.checks?"✗ zatiaľ nie":"⏳ kontrolujem",s.dns_ok?`overený ${E(dt(s.dns_at))}`:s.dns_seen?`teraz ukazuje na ${E(s.dns_seen)}`:"záznam zatiaľ neexistuje")+
   stRow("HTTPS certifikát",s.https_ok===true?true:s.dns_ok?false:null,s.https_ok?"✓ platný":s.dns_ok?"⏳ vydáva sa":"čaká na DNS",s.https_ok?`od ${E(dt(s.https_at))} · Let's Encrypt (GitHub)`:s.dns_ok?"GitHub vydá certifikát zvyčajne do 1 h":"")+
   stRow("Presmerovanie 301",s.dns_ok?true:null,s.dns_ok?"✓ zapnuté":"po overení DNS","ernte-trade.github.io/ernte-/… → app.ernte.sk/… (cesta aj parametre ostávajú, staré odkazy, QR kódy a upozornenia fungujú)")+
   stRow("Kontrola",null,s.last_check&&!/^2000/.test(s.last_check)?E(dt(s.last_check)):"–",`každých 15 min${s.checks?" · "+E(s.checks)+"×":""}${s.shown_at&&!s.dns_ok?` · ak DNS nebude do 48 h (${E(dt(new Date(new Date(s.shown_at).getTime()+48*3600e3)))}), príde upozornenie`:""}`)+
   `</div>`;
  if(s.caa_need)h+=`<div class="box w"><div>⚠️ Doména ernte.sk má záznam CAA, ktorý nepovoľuje Let's Encrypt – pridaj ešte: <b>ernte.sk CAA 0 issue "letsencrypt.org"</b> <button type="button" class="copy" data-domcopy='ernte.sk. 3600 IN CAA 0 issue "letsencrypt.org"'>📋</button></div></div>`;
  if(full)h+=`<div class="s">Po prepnutí sa každý raz prihlási na novej adrese a pridá si ikonu na plochu znova (prehliadač berie novú adresu ako novú stránku). Prihlásenie kódom z e-mailu funguje na oboch adresách. Odkazy v e-mailoch, PDF, QR kódoch a upozorneniach so starou adresou sa presmerujú samé.</div>`;
  if(!full)h+=`<div class="btns"><button type="button" data-fsecgo="set:dom">⚙️ Registrátor a API kľúč</button></div>`;
  return h+`</div>`}
function mailTxt(){const R=REC(D.s||{});return `Dobrý deň,\n\nprosím o pridanie DNS záznamu pre doménu ernte.sk:\n\nTyp: ${R.type}\nNázov: ${R.name} (${R.host})\nHodnota: ${R.value}\nTTL: ${R.ttl}\n\nZáznam slúži pre webovú aplikáciu ERNTE Trade & Logistic (hosting GitHub Pages). HTTPS certifikát Let's Encrypt vydá GitHub automaticky – ak má doména záznamy CAA, prosím povoliť aj letsencrypt.org.\n\nĎakujem,\nMartin Vaľko\nERNTE spol. s r.o.`}
window.vDomCard=()=>card(false);
window.vDom=function(){if(!OWN())return "";css();let h=`<h2>🌐 Doména app.ernte.sk</h2>`+card(true).replace('<div class="btns"><button type="button" data-fsecgo="set:dom">⚙️ Registrátor a API kľúč</button></div>',"");
  const s=D.s||{},rg=s.reg||{},p=D.prov||s.reg_prov||"websupport",api=p==="websupport"||p==="active24";
  h+=`<form class="card f" id="fDomReg" autocomplete="off"><div class="w t">Registrátor domény ernte.sk</div>
   <div class="w domprov" role="radiogroup">${PROV.map(x=>`<button type="button" data-domprov="${x[0]}" aria-pressed="${p===x[0]}">${x[1]}</button>`).join("")}</div>`;
  if(api)h+=`<label>API kľúč (identifier)<input name="key" autocomplete="off" spellcheck="false" placeholder="${s.reg_key&&s.reg_prov===p?"🔐 uložený – nechaj prázdne":"vlož kľúč"}"></label>
   <label>API secret<input name="secret" type="password" autocomplete="new-password" spellcheck="false" placeholder="${s.reg_key&&s.reg_prov===p?"🔐 uložený – nechaj prázdne":"vlož secret"}"></label>
   <div class="w s">Kľúč sa uloží zašifrovane iba na serveri (trezor databázy) a do prehliadača sa už nikdy nevráti. ${p==="websupport"?"WebSupport: admin.websupport.sk → Môj účet → Bezpečnosť a prihlásenie → API autentifikácia → Vygenerovať nový kľúč.":"Active24: Zákaznícke centrum → Môj účet → API → Nový kľúč (REST API v2)."} Aplikácia potom sama vytvorí záznam CNAME, overí ho a spustí vydanie certifikátu.</div>
   <div class="w btns"><button class="pri" type="submit">🔐 Uložiť a vytvoriť DNS záznam</button></div>`;
  else h+=`<div class="w s">${p==="forpsi"?"Forpsi nemá verejné API na DNS":"Pri inom registrátorovi"} – záznam pridaj v jeho administrácii (DNS → Pridať záznam) alebo pošli správcovi domény tento e-mail:</div>
   <label class="w">E-mail pre správcu domény<textarea rows="11" readonly id="domMail">${E(mailTxt())}</textarea></label>
   <div class="w btns"><button type="button" class="copy" data-domcopy="__mail">📋 Kopírovať e-mail</button><a class="btn" href="mailto:?subject=${encodeURIComponent("DNS záznam app.ernte.sk")}&body=${encodeURIComponent(mailTxt())}">✉️ Otvoriť v pošte</a><button class="pri" type="submit">Uložiť registrátora</button></div>`;
  h+=`</form>`;
  if(rg.step){const ok=rg.step==="hotovo",bad=rg.step==="chyba",wait=["svc","list","add","add_wait"].includes(rg.step);
    h+=`<div class="card"><b class="domt">Výsledok API registrátora</b><div class="domrows">${stRow((PROV.find(x=>x[0]===rg.prov)||[0,rg.prov||""])[1],ok?true:bad?false:null,ok?"✓ OK":bad?"✗ chyba":wait?"⏳ prebieha":"ručne",E(rg.msg||(wait?"spájam sa s registrátorom…":""))+(rg.at?" · "+E(dt(rg.at)):""))}</div>
     ${rg.resp&&(bad||ok)?`<details class="sub"><summary class="s">Odpoveď API${rg.code?" (HTTP "+E(rg.code)+")":""}</summary><pre class="dompre">${E(String(rg.resp).slice(0,500))}</pre></details>`:""}</div>`}
  return h};
async function copy(t,b){try{await navigator.clipboard.writeText(t);toast("📋 Skopírované.")}catch(x){const a=document.createElement("textarea");a.value=t;document.body.appendChild(a);a.select();try{document.execCommand("copy");toast("📋 Skopírované.")}catch(y){toast("Kopírovanie sa nepodarilo – podrž prst na texte.",4000)}a.remove()}}
document.addEventListener("click",async e=>{const t=e.target;if(!t.closest||!OWN())return;let b;
  if(b=t.closest("[data-domcopy]")){e.preventDefault();copy(b.dataset.domcopy==="__mail"?mailTxt():b.dataset.domcopy,b);return}
  if(b=t.closest("[data-domprov]")){e.preventDefault();D.prov=b.dataset.domprov;repaint();return}
  if(b=t.closest("[data-fsecgo]")){e.preventDefault();const [s,u]=b.dataset.fsecgo.split(":");TAB="fleet";if(typeof fsecGo==="function")fsecGo(s,u);renderStaff();window.scrollTo(0,0);return}
  if(b=t.closest("[data-domcheck]")){e.preventDefault();busy(b,true);try{let r=await sb.rpc("domain_check_now");await new Promise(z=>setTimeout(z,6000));r=await sb.rpc("domain_check_now");if(r.error)toast("Nepodarilo sa: "+r.error.message,6000);else{D.s=r.data;D.at=Date.now();toast(r.data&&r.data.dns_ok?"✓ DNS je overené.":"DNS zatiaľ neukazuje na GitHub.",4500)}}finally{busy(b,false)}repaint();return}
},true);
document.addEventListener("submit",async e=>{const f=e.target;if(f.id!=="fDomReg"||!OWN())return;e.preventDefault();const b=f.querySelector("button[type=submit]");
  const p=D.prov||(D.s&&D.s.reg_prov)||"websupport",fd=new FormData(f);busy(b,true);
  const r=await sb.rpc("domain_reg_set",{p_prov:p,p_key:String(fd.get("key")||"").trim()||null,p_secret:String(fd.get("secret")||"").trim()||null});busy(b,false);
  if(r.error){toast("Nepodarilo sa: "+r.error.message,6000);return}f.reset();toast(r.data&&r.data.api?"🔐 Kľúč uložený na serveri – vytváram DNS záznam…":"Registrátor uložený.",5000);
  await load(true);if(r.data&&r.data.api)setTimeout(async()=>{try{await sb.rpc("domain_check_now")}catch(x){}load(true)},8000)},true);
function css(){if(document.getElementById("domcss"))return;const s=document.createElement("style");s.id="domcss";s.textContent=`
.domc .domt,.domt{display:block;margin-bottom:6px;overflow-wrap:anywhere}.domc.w{border-color:rgba(251,191,36,.55)!important}
.domrec{border:1px solid rgba(255,255,255,.12);border-radius:12px;overflow:hidden;margin:8px 0}
.domrh,.domrv{display:grid;grid-template-columns:minmax(0,.7fr) minmax(0,1.1fr) minmax(0,1.8fr) minmax(0,.6fr);gap:8px;padding:8px 10px;align-items:center}
.domrh{font-size:.75rem;opacity:.7;background:rgba(255,255,255,.04)}.domrv span{min-width:0;overflow-wrap:anywhere}.domrv small{display:block;opacity:.7;font-size:.75rem}
.domrows{display:grid;gap:0;margin-top:6px}.domr{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid rgba(255,255,255,.08);align-items:flex-start}
.domr>span:first-child{min-width:0;flex:1 1 auto;overflow-wrap:anywhere}.domr small{display:block;opacity:.72;font-size:.8rem;line-height:1.35}
.domst{flex:0 0 auto;font-weight:700;white-space:nowrap}.domst.ok{color:#86efac}.domst.no{color:#fca5a5}.domst.n{opacity:.75}
.domprov{display:flex;flex-wrap:wrap;gap:8px}.domprov button{min-height:42px;flex:1 1 120px}.domprov button[aria-pressed=true]{outline:2px solid var(--lime,#a3e635)}
.dompre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.78rem;max-height:200px;overflow:auto}
#domMail{min-height:220px;font-size:.85rem}
@media (max-width:420px){.domrh{display:none}.domrv{grid-template-columns:1fr 1fr}.domrv span:nth-child(3){grid-column:1/-1}}`;document.head.appendChild(s)}
// karta na Prehľade (kým doména nefunguje)
function inject(){if(!OWN()||typeof TAB==="undefined"||TAB!=="home")return;css();const app=document.getElementById("app");if(!app)return;
  if(!D.s||Date.now()-D.at>300e3)load(false);if(!D.s||done(D.s))return;if(document.getElementById("domHome"))return;
  const d=document.createElement("div");d.innerHTML=card(false);const el=d.firstElementChild;el.id="domHome";
  const anchor=app.querySelector(".hub,.owh");if(anchor)anchor.before(el);else{const nav=app.querySelector("nav.tabs");if(nav)nav.after(el)}}
let q=0;const sch=()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;try{css();inject()}catch(x){}})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch()}
boot();
})();
