// ===== 📡 COMMANDER – žiadosť podpore o rozšírenie práv API (VALKO s.r.o., iba majiteľ) =====
// Flotila → Nastavenia → 📡 Commander. Odoslanie cez cmd_support_send (e-mail aplikácie: schránka VALKO, inak ERNTE),
// po 3 pracovných dňoch databáza (cmd_support_tick) skontroluje main:refuel a ak nevracia 200, pošle push.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER);
const C={s:null,busy:false,to:null,subj:null,body:null};
const dd=x=>{if(!x)return "";const d=new Date(x);return isNaN(d)?"":d.toLocaleDateString("sk-SK",{day:"numeric",month:"numeric",year:"numeric"})};
const SUBJ="Žiadosť o rozšírenie práv API – VALKO s.r.o. (IČO 53 365 241)";
const BODY=()=>`Dobrý deň,

ako zákazník COMMANDER (VALKO s.r.o., IČO 53 365 241) Vás prosím o rozšírenie práv nášho API prepoja (konto ERNTE-Farmar) o tieto časti:

1. Refueling imports (import tankovaní z palivových kariet) – API teraz vracia 404 „Missing user rights for refueling imports“. Prosíme o sprístupnenie aj spätne od 1. 10. 2026.
2. Tacho (údaje z tachografov).
3. Contracts (zmluvy).
4. Costcenters (strediská).
5. DeletedVehicles (vyradené vozidlá) – teraz vracia 403.

Údaje používame iba na internú evidenciu nafty, nákladov a jázd našej flotily.

Ďakujem a prajem pekný deň,

Martin Vaľko
konateľ, VALKO s.r.o.
Zbudza 141, 072 23
IČO 53 365 241`;
async function load(){if(!OWN()||C.busy)return;C.busy=true;try{const r=await sb.rpc("cmd_support_get");C.s=!r.error&&r.data?r.data:{err:1}}catch(x){C.s={err:1}}finally{C.busy=false}
  if(typeof TAB!=="undefined"&&TAB==="fleet"&&typeof renderStaff==="function")try{renderStaff()}catch(x){}}
window.cmdReqHTML=function(){if(!OWN())return "";css();if(!C.s){load();return `<div class="card"><b>✉️ Žiadosť podpore Commandera</b><div class="s">Načítavam…</div></div>`}
  const s=C.s,rf=s.refuel||{},to=C.to!=null?C.to:(s.to||""),sent=s.sent_at,ok=+rf.code===200;
  const from=s.valko_mail?"zo schránky VALKO":s.ernte_mail?"zo schránky jana.valkova@ernte.sk (VALKO ešte nie je nastavená)":"";
  let st="";
  if(sent)st=`<div class="box${s.checked_at?(s.ok?"":" w"):""}"><div>📨 Odoslané <b>${E(dd(sent))}</b> na ${E(s.to||"")}. ${s.checked_at?(s.ok?"✅ Kontrola: tankovania už idú (200).":"⚠️ Kontrola "+E(dd(s.checked_at))+": refueling imports stále vracia "+E(s.code||"chybu")+" – pošli pripomienku."):`Kontrola tankovaní <b>${E(dd(s.check_at))}</b> (o 3 pracovné dni).`}</div></div>`;
  return `<details class="card dcw cmdq"${sent&&s.ok?"":" open"}><summary><b>✉️ Žiadosť podpore Commandera o práva API</b><small>${ok?"tankovania ✓ 200":"tankovania "+E(rf.code||"?")}${sent?" · odoslané "+E(dd(sent)):""}</small></summary>
   <form class="f" id="fCmdReq">
    <label class="w">E-mail podpory Commander<input name="to" type="email" inputmode="email" autocomplete="off" placeholder="napr. podpora@… (z e-mailu alebo zmluvy Commander)" value="${E(to)}"></label>
    <label class="w">Predmet<input name="subj" value="${E(C.subj!=null?C.subj:SUBJ)}"></label>
    <label class="w">Text e-mailu (od VALKO s.r.o.)<textarea name="body" rows="14">${E(C.body!=null?C.body:BODY())}</textarea></label>
    <div class="w s">Odošle sa ${from||"z e-mailu aplikácie (najprv ho nastav: Martin → nastavenie schránky)"}. Po 3 pracovných dňoch aplikácia overí, či import tankovaní (main:refuel) vracia 200 – ak nie, príde upozornenie „Commander ešte nepovolil tankovania“.</div>
    <div class="w btns"><button class="pri" type="submit">📨 ${sent?"Odoslať znova (pripomienka)":"Odoslať"}</button><button type="button" data-cmdsave>💾 Uložiť e-mail podpory</button></div>
   </form>${st}</details>`};
const val=f=>{const fd=new FormData(f);C.to=String(fd.get("to")||"").trim();C.subj=String(fd.get("subj")||"");C.body=String(fd.get("body")||"");return fd};
document.addEventListener("input",e=>{const f=e.target.closest&&e.target.closest("#fCmdReq");if(f)val(f)},true);
document.addEventListener("click",async e=>{const b=e.target.closest&&e.target.closest("[data-cmdsave]");if(!b||!OWN())return;e.preventDefault();const f=b.closest("form");val(f);
  busy(b,true);const r=await sb.rpc("cmd_support_save",{p_to:C.to});busy(b,false);if(r.error){toast("Nepodarilo sa: "+r.error.message,6000);return}C.s=r.data;toast("💾 E-mail podpory uložený.");renderStaff()},true);
document.addEventListener("submit",async e=>{const f=e.target;if(f.id!=="fCmdReq"||!OWN())return;e.preventDefault();val(f);const b=f.querySelector("button[type=submit]");
  if(!/^[^@\s,;]+@[^@\s,;]+\.[a-z]{2,}$/i.test(C.to)){toast("Zadaj e-mail podpory Commander.",5000);return}
  if(!confirm(`Odoslať žiadosť na ${C.to}?`))return;busy(b,true);
  const r=await sb.rpc("cmd_support_send",{p_to:C.to,p_subject:C.subj||SUBJ,p_body:C.body||BODY()});busy(b,false);
  if(r.error){toast("Nepodarilo sa: "+r.error.message,7000);return}C.s=r.data;toast("📨 Žiadosť odoslaná. Kontrola tankovaní o 3 pracovné dni.",6000);renderStaff()},true);
function css(){if(document.getElementById("cmdqcss"))return;const s=document.createElement("style");s.id="cmdqcss";s.textContent=`.cmdq{grid-template-columns:minmax(0,1fr)}.cmdq>*,.cmdq .f>*{min-width:0}.cmdq input,.cmdq textarea{width:100%;min-width:0;box-sizing:border-box}.cmdq .box,.cmdq .box div{min-width:0;overflow-wrap:anywhere}.cmdq textarea{min-height:260px;font-size:.88rem;line-height:1.4}.cmdq summary small{overflow-wrap:anywhere}`;document.head.appendChild(s)}
})();
