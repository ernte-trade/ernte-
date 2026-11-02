// ===== 📧 NASTAVENIA → E-MAIL (iba majiteľ) =====
// Microsoft 365 ERNTE má vypnuté SMTP prihlásenie (535 5.7.139 SmtpClientAuthentication is disabled) → odosielanie cez Microsoft Graph
// (OAuth 2.0 client credentials, aplikačné oprávnenie Mail.Send obmedzené ApplicationAccessPolicy iba na odosielaciu schránku).
// Tu: stav každej schránky, odkaz na súhlas správcu (admin consent), uloženie Tenant/Client ID/secret (iba do trezoru databázy),
// 📨 Poslať testovací e-mail a front neodoslaných e-mailov (mail_state, mail_cfg_set, mail_test, mail_requeue).
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER);
const T=(m,ms)=>{try{if(typeof toast==="function")toast(m,ms||5000);else alert(m)}catch(x){}};
const PR=[["ernte","Zmluvy, zúčtovania, faktúry","jana.valkova@ernte.sk"],["ponuky","Ponuky a dopyty","ernte@ernte.sk"],["danube","Danube – zmluvy (Gmail)","danube.commodities.kft@gmail.com"],["valko","VALKO – doprava",""]];
let ST=null,busy=false,open={};
const dt=x=>x?new Date(x).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}):"–";
async function load(){if(busy)return;busy=true;try{const r=await sb.rpc("mail_state");ST=r.error?{err:r.error.message}:(r.data||{})}catch(e){ST={err:String(e&&e.message||e)}}busy=false;paint()}
function paint(){const el=document.getElementById("mgWrap");if(el)el.outerHTML=html()}
function card(p){const k=p[0],s=(ST&&ST[k])||{},g=s.kind==="graph",ok=s.ok;const ten=s.tenant||"ernte.sk",cid=s.client_id||"";
  const cons=cid?`https://login.microsoftonline.com/${encodeURIComponent(ten)}/adminconsent?client_id=${encodeURIComponent(cid)}`:"";
  const st=!s.kind?`<span class="mgb mgn">nenastavené</span>`:ok?`<span class="mgb ${s.last_err&&(!s.last_ok||s.last_err.at>s.last_ok)?"mgw":"mgo"}">${g?"Microsoft Graph":"SMTP"}</span>`:`<span class="mgb mgn">chýba heslo / secret</span>`;
  let h=`<div class="mgc"><div class="mgh"><b>${E(p[1])}</b>${st}</div><div class="s mgt">Schránka: <b>${E(s.from||s.user||p[2]||"–")}</b></div>
   <div class="mgk"><div><small>Posledné odoslané</small><b>${dt(s.last_ok)}</b></div><div><small>Neodoslané vo fronte</small><b>${s.fronta||0}</b></div><div><small>Neaktuálne (iba záznam)</small><b>${s.neaktualne||0}</b></div></div>`;
  if(s.last_err)h+=`<div class="mgerr"><small>Posledná chyba ${dt(s.last_err.at)}</small><div>${E(s.last_err.err||"")}</div></div>`;
  h+=`<div class="btns mgbt">${s.kind?`<button type="button" class="pri" data-mgtest="${k}">📨 Poslať testovací e-mail</button>`:""}${(s.fronta||0)>0?`<button type="button" data-mgre="${k}">🔁 Poslať znova neodoslané (${s.fronta})</button>`:""}<button type="button" data-mgopen="${k}">${open[k]?"▲ Skryť nastavenie":"⚙️ Microsoft Graph"}</button></div>`;
  if(open[k])h+=`<form class="f mgf" data-mgf="${k}"><div class="w s">Postup pre správcu Microsoft 365 (raz):<ol class="mgol">
     <li>Microsoft Entra → <b>Registrácie aplikácií</b> → Nová registrácia „ERNTE odosielanie“ → skopíruj <b>ID aplikácie (Client ID)</b> a <b>ID adresára (Tenant ID)</b>.</li>
     <li>Certifikáty a tajomstvá → Nové tajomstvo klienta → skopíruj <b>Hodnotu</b> (Client secret).</li>
     <li>Oprávnenia rozhrania API → Microsoft Graph → <b>Aplikačné</b> → <b>Mail.Send</b>.</li>
     <li>Ulož údaje nižšie a ťukni <b>Súhlas správcu</b> (prihlási sa globálny správca a potvrdí).</li>
     <li>Obmedzenie iba na odosielaciu schránku (Exchange Online PowerShell):<code class="mgcode">New-ApplicationAccessPolicy -AppId ${E(cid||"<Client ID>")} -PolicyScopeGroupId ${E(s.from||p[2]||"<schránka>")} -AccessRight RestrictAccess -Description "ERNTE odosielanie"</code></li></ol></div>
     <label>Tenant ID / doména<input name="tenant" autocapitalize="off" value="${E(s.tenant||"ernte.sk")}"></label>
     <label>Client ID (ID aplikácie)<input name="client_id" autocapitalize="off" value="${E(cid)}" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"></label>
     <label>Client secret (hodnota)<input name="secret" type="password" autocomplete="new-password" placeholder="${g?"uložené – vyplň iba pri zmene":""}"></label>
     <label>Odosielacia schránka<input name="from" type="email" autocapitalize="off" value="${E(s.from||p[2])}"></label>
     <div class="w s">Tajomstvo sa uloží iba do trezoru databázy – nie do aplikácie ani do repozitára.</div>
     <div class="w btns mgbt"><button type="submit" class="pri">💾 Uložiť Graph</button>${cons?`<a class="btn mgcons" href="${E(cons)}" target="_blank" rel="noopener">🔑 Súhlas správcu (admin consent)</a>`:""}</div></form>`;
  return h+`</div>`}
function html(){if(!OWN())return `<div class="card" id="mgWrap"><div class="s">Nastavenie e-mailu vidí iba majiteľ.</div></div>`;
  if(!ST){setTimeout(load,0);return `<div class="card" id="mgWrap"><h2>📧 E-mail</h2><div class="s">Načítavam…</div></div>`}
  if(ST.err)return `<div class="card" id="mgWrap"><h2>📧 E-mail</h2><div class="s">${/mail_state/.test(ST.err)?"Zapne sa po aktualizácii databázy (do pár minút).":E(ST.err)}</div></div>`;
  return `<div class="card" id="mgWrap"><h2>📧 E-mail</h2><div class="s">Microsoft 365 (@ernte.sk) má vypnuté SMTP prihlásenie (chyba 535 5.7.139) – preto odosielanie cez <b>Microsoft Graph</b>. Neodoslané e-maily od 31. 10. sa pošlú znova po prvom úspešnom odoslaní; upozornenia staršie ako 48 h sa iba zaznamenajú. Každé zlyhanie príde do mobilu.</div>
   <div class="mgg">${PR.map(card).join("")}</div></div>`}
window.vMail=html;
document.addEventListener("click",async e=>{const t=e.target.closest&&e.target.closest("[data-mgopen],[data-mgtest],[data-mgre]");if(!t||!document.getElementById("mgWrap"))return;e.preventDefault();
  if(t.dataset.mgopen){const k=t.dataset.mgopen;open[k]=!open[k];paint();return}
  if(t.dataset.mgre){t.disabled=true;const r=await sb.rpc("mail_requeue",{p_prof:t.dataset.mgre});if(r.error)T("Nepodarilo sa: "+r.error.message,7000);else{const d=r.data||{};T(`🔁 Znova odosielam ${d.znova||0}`+(d.neaktualne?` · ${d.neaktualne} neaktuálne iba zaznamenané`:"")+(d.bez_prilohy?` · ${d.bez_prilohy} bez prílohy – pošli z dokumentu`:""),8000)}load();return}
  if(t.dataset.mgtest){t.disabled=true;t.textContent="Odosielam test…";const r=await sb.rpc("mail_test",{p_prof:t.dataset.mgtest});if(r.error){T("Nepodarilo sa: "+r.error.message,7000);load();return}
    for(let i=0;i<30;i++){await new Promise(z=>setTimeout(z,4000));const s=await sb.rpc("mail_status",{p_id:r.data});const st=s.data&&s.data.status;
      if(st==="odoslany"){T("✅ Testovací e-mail odoslaný – pozri si schránku.",8000);load();return}
      if(st==="chyba"){T("⚠️ Test sa neodoslal: "+((s.data&&s.data.err)||"chyba"),12000);load();return}}
    T("Test sa ešte odosiela – výsledok uvidíš o chvíľu.",6000);load()}});
document.addEventListener("submit",async e=>{const f=e.target.closest&&e.target.closest("form[data-mgf]");if(!f)return;e.preventDefault();const fd=new FormData(f),b=f.querySelector("button[type=submit]");if(b)b.disabled=true;
  const r=await sb.rpc("mail_cfg_set",{p_prof:f.dataset.mgf,p:{kind:"graph",tenant:fd.get("tenant"),client_id:fd.get("client_id"),secret:fd.get("secret"),from:fd.get("from")}});
  if(b)b.disabled=false;if(r.error){T("Nepodarilo sa: "+r.error.message,8000);return}T("✅ Microsoft Graph uložený. Ak ešte nie je súhlas správcu, ťukni 🔑 Súhlas správcu, potom 📨 test.",9000);load()});
{const s=document.createElement("style");s.textContent=`#mgWrap .mgg{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))}
#mgWrap .mgc{border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:12px;background:rgba(255,255,255,.04);min-width:0}
#mgWrap .mgh{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;justify-content:space-between}#mgWrap .mgh b{min-width:0;overflow-wrap:anywhere}
#mgWrap .mgb{font-size:.78rem;font-weight:800;padding:3px 10px;border-radius:999px;white-space:nowrap}.mgo{background:rgba(163,230,53,.18);color:#bef264}.mgw{background:rgba(253,230,138,.18);color:#fde68a}.mgn{background:rgba(248,113,113,.16);color:#fca5a5}
#mgWrap .mgt{overflow-wrap:anywhere;margin-top:4px}
#mgWrap .mgk{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:8px 0}#mgWrap .mgk div{background:rgba(0,0,0,.18);border-radius:10px;padding:6px 8px;min-width:0;text-align:center}#mgWrap .mgk small{display:block;opacity:.75;font-size:.72rem;line-height:1.2}#mgWrap .mgk b{font-size:.92rem;overflow-wrap:anywhere}
#mgWrap .mgerr{border-left:3px solid #f87171;padding:4px 8px;margin:6px 0;font-size:.82rem;overflow-wrap:anywhere}#mgWrap .mgerr small{opacity:.75}
#mgWrap .mgbt{flex-wrap:wrap}#mgWrap .mgbt>*{flex:1 1 auto;min-height:42px;white-space:normal}
#mgWrap .mgcons{display:inline-flex;align-items:center;justify-content:center;text-align:center;padding:8px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.25);text-decoration:none;color:inherit;font-weight:700}
#mgWrap .mgol{margin:6px 0 0 18px;padding:0;display:grid;gap:4px}#mgWrap .mgcode{display:block;margin-top:4px;padding:6px 8px;border-radius:8px;background:rgba(0,0,0,.35);font-size:.74rem;overflow-wrap:anywhere;white-space:normal;user-select:all}
#mgWrap .mgf{margin-top:10px}`;document.head.appendChild(s)}
})();
