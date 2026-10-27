// ===== ERNTE · PRÍSTUPY (oprávnenia), TÍM, VÝVOZ BEZ CIEN, PIN, VEĽKÉ PÍSMO, KALKULAČKA =====
// Nastavuje iba majiteľ. Údaje strážia aj pravidlá v databáze (has_perm / fperm), nielen aplikácia.
(function(){
const PCAT=[
 ["req","Požiadavky farmárov","Obchod","predaj, súhlasy, správy"],
 ["price_view","Cenník výkupných cien – vidieť","Obchod",""],
 ["price_edit","Cenník – meniť ceny a platnosť","Obchod",""],
 ["deals","Obchody S CENAMI","Obchod","nákupná cena €/t"],
 ["deals_qty","Obchody BEZ CIEN","Obchod","množstvá, nakládka, vykládka"],
 ["farm","Farmári – kontakty a adresy","Obchod",""],
 ["farm_login","Vytvárať prihlásenia farmárom","Obchod",""],
 ["calc","Kalkulačka nákupnej ceny ERNTE","Obchod","odberatelia, doprava, burza"],
 ["market","Burza a trh (MATIF, CBOT)","Obchod",""],
 ["agro","Agro služby – objednávky a cenník","Obchod","bez nákladov a marže"],
 ["danube","Danube Trade – požiadavky, služby a zmluvy Danube","Obchod","SK / HU"],
 ["trus_price","Kurací trus – ceny a podklady k faktúram","Obchod","bez zisku"],
 ["trans","Doprava – jazdy a objednávky odvozu","Vývoz",""],
 ["trus","Kurací trus – vývozy, autá, váženie","Vývoz","bez cien"],
 ["assign","Prideľovať autá farmárom na vývoz","Vývoz",""],
 ["farmer_gps","Zapínať farmárovi GPS polohu auta","Vývoz","len cestou na nakládku"],
 ["remain","Zostatok nevyvezenej komodity","Vývoz",""],
 ["notes","Poznámky k vývozu a nedodanému tovaru","Vývoz",""],
 ["fleet","Flotila – prehľad a mapa","Flotila",""],
 ["fleet_all","Všetky flotily (EU, sklápače, služobné)","Flotila","inak iba flotila Región"],
 ["drivers","Vodiči a vozidlá – kontrola jázd","Flotila","bez miezd"],
 ["alarms","Alarmy a register porušení","Flotila",""],
 ["diesel","Nafta – burza, tankovania, audit","Flotila",""],
 ["yard","Nádrž na dvore","Flotila",""],
 ["cams","Kamery dvor","Flotila",""],
 ["fleet_cost","Peniaze flotily – náklady","Flotila","bez zisku a miezd"],
 ["fleet_set","Nastavenia flotily (miesta, upozornenia)","Flotila",""],
 ["ev","Evidencia – zapisovať náklady, PHM, nákupy a výkony","Evidencia","bez výnosov, miezd a výsledku"],
 ["praca","Denník prác – zapísať čo robil a koľko ha","Evidencia","roľníci, strojníci"],
 ["sklad","Sklad – vziať a pridať diely (bez cien)","Evidencia","strojníci"],
 ["ev_doch","Dochádzka – dni, dovolenka, PN, pole, víkendy, nadčasy","Evidencia","bez peňazí"],
 ["wx","Počasie","Ostatné",""],
 ["nov","Novinky v aplikácii","Ostatné","čo je v aplikácii nové"],
 ["big","Veľké písmo a tlačidlá","Ostatné","lepšia čitateľnosť"]];
const PLOCK=[["margin","Marža, zisk a predajné ceny odberateľom"],["payroll","Mzdy vodičov"],["costs","Pevné náklady firmy"],["ai","ERNTE AI Podpora"],["team","Tím a prístupy"]];
const PDEF={admin:["req","price_view","deals","farm","farm_login","calc","market","trans","remain","notes","wx","big","nov"],
 dispatch:["req","trans","trus","deals_qty","farm","assign","farmer_gps","remain","notes","fleet","drivers","alarms","cams","yard","diesel","fleet_set","wx","big","ev","ev_doch","sklad","praca","nov"],
 invoice:["req","price_view","deals","farm","trans","remain","wx","nov"]};
const PRESET={
 doprava:{n:"Vedúci dopravy",role:"dispatch",k:["trans","trus","deals_qty","assign","farmer_gps","remain","notes","fleet","drivers","alarms","diesel","yard","cams","fleet_set","big"]},
 veduci:{n:"Vedúci (farma, dielňa)",role:"dispatch",k:["ev","ev_doch","sklad","praca","wx","big"]},
 strojnik:{n:"Strojník / roľník",role:"dispatch",k:["praca","sklad","wx","big"]},
 manazer:{n:"Manažér obchodu",role:"admin",k:["req","price_view","price_edit","deals","farm","farm_login","calc","market","trans","remain","notes","wx","big"]},
 obchodnik:{n:"Obchodník",role:"admin",k:["req","price_view","deals","farm","farm_login","calc","market","trans","remain","notes","wx","big"]},
 fakt:{n:"Fakturácia",role:"invoice",k:["req","price_view","deals","farm","trans","remain","wx"]}};
let PEOPLE=[],PPL=0;async function loadPeople(){PPL=1;try{const r=await sb.from("staff_cfg").select("value").eq("key","team_people").maybeSingle();if(r.data&&Array.isArray(r.data.value)&&r.data.value.length){PEOPLE=r.data.value;if(TAB==="team")renderStaff()}}catch(e){PPL=0}}
const FCAT=[["f_prices","Výkupné ceny (cenník)",""],["f_sell","Ponúknuť komoditu na predaj",""],["f_offer","Navrhnúť vlastnú cenu + fotky zo skladu",""],["f_deals","Moje obchody a dohodnutá cena",""],["f_remain","Zostatok na vývoz (koľko ešte odvezieme)",""],
 ["f_transport","Objednať odvoz",""],["f_trucks","Pridelené autá – ŠPZ, vodič, telefón",""],["f_gps","Poloha auta cestou na nakládku","len keď ju doprava zapne"],
 ["f_notes","Poznámky k vývozu (posielať a čítať)",""],["f_agro","Agro služby – cenník a objednávka prác strojmi",""],["f_wx","Počasie",""],["f_big","Veľké písmo a tlačidlá",""]];
const FREC=["f_prices","f_sell","f_deals","f_remain","f_transport","f_trucks","f_gps","f_notes","f_agro","f_wx","f_big"];
const FDEF=["f_prices","f_sell","f_offer","f_deals","f_remain","f_trucks","f_gps","f_transport","f_wx","f_big","f_agro"];
const FNEVER="Farmár nikdy nevidí: odberateľa, miesto vykládky, burzu, predajné ceny, maržu ani iných farmárov.";
const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
window.PCAT_KEYS=PCAT.map(p=>p[0]);const PKEYS=new Set(PCAT.map(p=>p[0])),LOCKK=new Set(PLOCK.map(p=>p[0]));
const recOf=p=>{const t=norm((p&&p.title)||"");return t.includes("dopr")?"doprava":t.includes("vedu")?"veduci":t.includes("stroj")||t.includes("rolni")||t.includes("traktor")?"strojnik":t.includes("manaz")?"manazer":t.includes("obchod")?"obchodnik":t.includes("faktur")?"fakt":({dispatch:"doprava",admin:"obchodnik",invoice:"fakt"})[p&&p.role]||"obchodnik"};
function pOn(row,k){if(!row)return false;if(row.role==="owner")return true;if(LOCKK.has(k))return false;const v=(row.perms||{})[k];return v===true||v===false?v:(PDEF[row.role]||[]).includes(k)}
window.can=k=>{if(typeof ROLE==="undefined"||!ROLE)return false;if(ROLE==="owner")return true;return pOn(STATE.me||{role:ROLE,perms:{}},k)};
window.canAny=(...k)=>k.some(x=>can(x));
function fDefs(){const g=((STATE.settings||{}).farmer_perms)||{};return g}
window.fcan=k=>{if(typeof FARMER==="undefined"||!FARMER)return true;const v=(FARMER.perms||{})[k];if(v===true||v===false)return v;const g=fDefs()[k];if(g===true||g===false)return g;return FDEF.includes(k)};
// hlavné záložky
const TABP={req:["req","trans","assign"],price:["price_view","price_edit","market"],trans:["trans","assign"],fleet:["fleet"],deals:["deals","deals_qty","remain","notes"],farm:["farm"],wx:["wx"],calc:["calc"],team:["team"],agro:["agro"],trus:["trus","trus_price"],evid:["ev","ev_doch","sklad","praca"],danube:["danube"],nov:["nov"],pred:["pred_owner_only"]};
window.tabOK=k=>ROLE==="owner"||(TABP[k]?TABP[k].some(can):true);
// sekcie flotily
const FSP={dash:["fleet"],fuel:["diesel","yard","cams"],alarm:["alarms"],money:["fleet_cost"],drv:["drivers"],veh:["drivers"],map:["fleet"],set:["fleet_set"]};
const FSUBP={yard:["yard"],cams:["cams"],main:null,cmd:["__owner"],firm:["fleet"],moves:["fleet"],places:["fleet_set"],find:["drivers"]};
window.secOK=k=>ROLE==="owner"||(FSP[k]?FSP[k].some(can):true);
window.subOK=(sec,sub)=>{if(ROLE==="owner")return true;if(sec==="fuel"&&sub==="main")return can("diesel");const p=FSUBP[sub];return !p||p.some(x=>x!=="__owner"&&can(x))};
window.fleetAll=()=>can("fleet_all");

// ===== VEĽKÉ PÍSMO =====
function bigWanted(){let o=null;try{o=localStorage.getItem("ernte-big")}catch(e){}if(o==="1")return true;if(o==="0")return false;
  if(typeof FARMER!=="undefined"&&FARMER)return fcan("f_big");if(typeof ROLE!=="undefined"&&ROLE&&ROLE!=="owner")return can("big");return false}
window.applyBig=()=>{document.documentElement.classList.toggle("big",bigWanted())};
window.bigBtn=()=>`<button type="button" class="ds-theme bigbtn" data-bigui aria-label="Veľké písmo" title="Veľké písmo" aria-pressed="${document.documentElement.classList.contains("big")}">A<sup>+</sup></button>`;
document.addEventListener("click",e=>{const b=e.target.closest("[data-bigui]");if(!b)return;const on=!document.documentElement.classList.contains("big");try{localStorage.setItem("ernte-big",on?"1":"0")}catch(x){}applyBig();
  if(typeof FARMER!=="undefined"&&FARMER)renderFarmer();else if(typeof renderStaff==="function")renderStaff()});

// ===== PIN pri prvom prihlásení + ochrana údajov =====
function pinModal(){return new Promise(res=>{const d=document.createElement("div");d.className="pinmod";d.setAttribute("role","dialog");d.setAttribute("aria-label","Nastavenie vlastného PINu");
  d.innerHTML=`<form class="pinbox" id="fPin"><div class="pinic">🔐</div><h2>Nastavte si vlastný PIN</h2><p>Prihlásili ste sa kódom od ERNTE. Kvôli bezpečnosti si teraz vytvorte <b>vlastný PIN</b> – odteraz sa budete prihlasovať ním.</p>
   <label>Nový PIN (aspoň 6 číslic alebo znakov)<input name="a" type="password" inputmode="numeric" autocomplete="new-password" minlength="6" required></label>
   <label>Zopakujte PIN<input name="b" type="password" inputmode="numeric" autocomplete="new-password" minlength="6" required></label>
   <div class="pinerr" role="alert" aria-live="assertive"></div><button class="pri" type="submit">Uložiť môj PIN</button>
   <p class="pinlaw">🛡️ Ochrana osobných údajov: vaše meno, telefón a e-mail spracúva ERNTE spol. s r.o. (doprava VALKO s.r.o.) iba na účely spolupráce, obchodov a dopravy podľa nariadenia GDPR a zákona č. 18/2018 Z. z. PIN nikomu neprezrádzajte – ERNTE ho nikdy nepozná ani si ho nepýta.</p></form>`;
  document.body.appendChild(d);setTimeout(()=>{const i=d.querySelector("input");if(i)i.focus()},100);
  const er=d.querySelector(".pinerr"),bad=m=>{er.textContent="⚠️ "+m;er.classList.add("on");try{navigator.vibrate&&navigator.vibrate(120)}catch(x){}};
  d.querySelector("form").addEventListener("input",()=>{er.textContent="";er.classList.remove("on")});
  d.querySelector("form").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.target),a=String(f.get("a")).trim(),b=String(f.get("b")).trim();
    if(a.length<6){bad("PIN musí mať aspoň 6 číslic alebo znakov.");return}if(a!==b){bad("PIN sa nezhoduje – zadajte ho dvakrát rovnako.");return}
    if(/^(\d)\1+$/.test(a)||["123456","654321","000000","111111","123123","012345","234567","987654"].includes(a)){bad("Príliš jednoduchý PIN (napr. 123456 alebo 111111) – zvoľte iný.");return}
    const bt=e.target.querySelector("button");bt.disabled=true;bt.textContent="Ukladám…";
    let r;try{r=await sb.auth.updateUser({password:a})}catch(x){r={error:{message:String(x&&x.message||x)}}}
    if(r.error){bt.disabled=false;bt.textContent="Uložiť môj PIN";const m=String(r.error.message||""),c=String(r.error.code||"");
      bad(/same|different from the old/i.test(m+c)?"Nový PIN musí byť iný ako kód, ktorý ste dostali od ERNTE. Zvoľte iný PIN.":
        /weak|pwned|leaked|characters|too short/i.test(m+c)?"Tento PIN je príliš slabý alebo známy z únikov hesiel. Zvoľte iný – napr. 8 číslic, nie po sebe idúcich.":
        /reauth|recent|session|jwt|expired|not authenticated/i.test(m+c)?"Prihlásenie vypršalo. Zavrite stránku, prihláste sa znova kódom od ERNTE a hneď nastavte PIN.":
        /fetch|network|failed/i.test(m)?"Nie je internet alebo je slabý signál. Skúste to znova o chvíľu.":"Nepodarilo sa uložiť PIN ("+m+"). Skúste iný PIN alebo zavolajte ERNTE.");return}
    try{await sb.rpc("pin_done")}catch(x){}d.remove();toast("✓ Váš PIN je uložený. Odteraz sa prihlasujete ním.",5000);res()})})}
async function loadMe(){try{const r=await sb.from("staff").select("*").eq("email",String(ME.email).toLowerCase()).maybeSingle();STATE.me=r.data||{role:ROLE,perms:{}}}catch(e){STATE.me={role:ROLE,perms:{}}}}
// zmena prístupov od majiteľa sa prejaví bez odhlásenia: pri návrate do aplikácie a každé 2 minúty
let MEAT=0;async function meRefresh(){if(typeof ROLE==="undefined"||!ROLE||ROLE==="owner"||!STATE.me||Date.now()-MEAT<60000)return;MEAT=Date.now();const old=JSON.stringify([STATE.me.perms,STATE.me.role]);await loadMe();
  if(JSON.stringify([STATE.me.perms,STATE.me.role])!==old&&typeof renderStaff==="function"){if(typeof TAB!=="undefined"&&typeof tabOK==="function"&&!tabOK(TAB)){try{TAB="home"}catch(e){}}renderStaff();if(typeof toast==="function")toast("Prístupy boli upravené.",3000)}}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)meRefresh()});setInterval(()=>{if(!document.hidden)meRefresh()},120000);
const _ss=window.startStaff;window.startStaff=async function(){await loadMe();if(STATE.me&&STATE.me.must_change)await pinModal();applyBig();if(ROLE!=="owner"&&!can("fleet_all")){try{FFLT="region"}catch(e){}}return _ss.apply(this,arguments)};
const _sf=window.startFarmer;window.startFarmer=async function(){if(FARMER&&FARMER.must_change)await pinModal();applyBig();return _sf.apply(this,arguments)};

// ===== TÍM A PRÍSTUPY (iba majiteľ) =====
let TOPEN=null,TADD=null,TEDIT=null;
// z Evidencie: otvorí Tím s predvyplneným menom a funkciou
window.teamAddFrom=function(name,title){const t=norm(title);TADD={name,title:title||"",preset:t.includes("vedu")||t.includes("zastup")?"veduci":t.includes("vodic")||t.includes("dopr")?"doprava":t.includes("admin")||t.includes("faktur")?"fakt":"strojnik"};try{TAB="team"}catch(e){}if(typeof loadTeam==="function"&&!STATE.staff)loadTeam().then(()=>renderStaff());renderStaff();setTimeout(()=>{const i=document.querySelector("#fTeam2 input[name=login]");if(i){i.scrollIntoView({block:"center"});i.focus()}},120)};
function permRows(row,rec){const R=new Set(PRESET[rec].k);let g="",h="";
  for(const [k,l,grp,hint] of PCAT){if(grp!==g){if(g)h+=`</div>`;h+=`<div class="pgrp"><b>${esc(grp)}</b>`;g=grp}
    h+=`<label class="pck"><input type="checkbox" name="p_${k}"${pOn(row,k)?" checked":""}><span>${esc(l)}${R.has(k)?` <em class="prec" title="odporúčam">★</em>`:""}${hint?`<small>${esc(hint)}</small>`:""}</span></label>`}
  return h+`</div><div class="pgrp lock"><b>🔒 Iba majiteľ</b>${PLOCK.map(p=>`<div class="pck dis"><span>${esc(p[1])}</span></div>`).join("")}</div>`}
function staffCard(p){const em=String(p.email||""),isT=em.endsWith("@tel.ernte.sk"),tel=p.phone||(isT?"+"+em.split("@")[0]:""),mail=p.mail||(isT?"":em),own=p.role==="owner",open=TOPEN===em,edit=TEDIT===em,rec=recOf(p);
  const wa=String(tel).replace(/\D/g,"").replace(/^00/,"").replace(/^0/,"421");
  const n=PCAT.filter(x=>pOn(p,x[0])).length;
  return `<div class="ds-fc tmc${open?" open":""}"><div class="ds-hd"><span class="ds-av" aria-hidden="true">${esc(dsIni(p.name))}</span><span class="ds-ttl"><b>${esc(p.name)}</b><small>${esc([p.title||(own?"majiteľ":({admin:"obchod",dispatch:"doprava",invoice:"fakturácia"})[p.role]),p.region].filter(Boolean).join(" · "))}</small><small>${esc([mail,tel].filter(Boolean).join(" · "))}</small></span></div>
   ${own?`<div class="tmst ok">👑 majiteľ – vidí všetko</div>`:`<div class="tmst ${p.must_change?"w":p.pin_at?"ok":""}">${p.must_change?"⏳ čaká na prvé prihlásenie a vlastný PIN":p.pin_at?"✓ vlastný PIN od "+new Date(p.pin_at).toLocaleDateString("sk-SK"):"prihlásenie zo staršej verzie"} · prístupy: <b>${n}</b> z ${PCAT.length}</div>`}
   <div class="btns">${tel?`<a class="btn lime" href="tel:${esc(String(tel).replace(/\s/g,""))}">📞 Volať</a><a class="btn" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>`:""}${mail?`<a class="btn" href="mailto:${esc(mail)}">✉️</a>`:""}
    ${own?"":`<button type="button" data-tedit="${esc(em)}">${edit?"✕ Zavrieť":"✏️ Údaje"}</button><button type="button" class="pri" data-tperm="${esc(em)}">${open?"✕ Zavrieť":"⚙️ Prístupy"}</button><button type="button" data-tcode="${esc(em)}">🔑 Nový kód</button><button type="button" class="dng" data-trm="${esc(em)}">Odobrať</button>`}</div>
   ${edit?`<form class="sub f tinfo" data-tinfo="${esc(em)}"><label class="w">Meno a titul<input name="name" required value="${esc(p.name||"")}"></label><label>Funkcia<input name="title" value="${esc(p.title||"")}" placeholder="napr. obchodník"></label><label>Kraj / oblasť<input name="region" value="${esc(p.region||"")}" placeholder="napr. Košický kraj"></label>
     <label>Telefón<input name="phone" inputmode="tel" value="${esc(p.phone||tel||"")}" placeholder="0905 123 456"></label><label>E-mail (kontaktný)<input name="mail" type="email" autocapitalize="off" value="${esc(p.mail||(isT?"":em))}" placeholder="meno@ernte.sk"></label>
     <div class="w s">Prihlasovacie meno: <b>${esc(isT?"+"+em.split("@")[0]:em)}</b> – zmeníš ho tlačidlom 🔑 Nový kód (nové prihlásenie na iný mobil / e-mail).</div><div class="w btns"><button class="pri" type="submit">💾 Uložiť údaje</button></div></form>`:""}
   ${open?`<form class="sub pform" data-tsave="${esc(em)}"><div class="f"><label>Funkcia<input name="title" value="${esc(p.title||"")}" placeholder="napr. obchodník"></label><label>Kraj / oblasť<input name="region" value="${esc(p.region||"")}" placeholder="napr. Košický kraj"></label><label>Telefón<input name="phone" inputmode="tel" value="${esc(p.phone||tel||"")}"></label></div>
     <div class="s">★ = moje odporúčanie pre funkciu <b>${esc(PRESET[rec].n)}</b>. Zaškrtni, čo má vidieť – platí hneď po uložení, aj v databáze.</div>
     <div class="btns">${Object.entries(PRESET).map(([k,v])=>`<button type="button" class="${k===rec?"lime":""}" data-tpreset="${k}">${k===rec?"★ ":""}${esc(v.n)}</button>`).join("")}</div>
     <div class="pgrid">${permRows(p,rec)}</div><div class="btns"><button class="pri" type="submit">💾 Uložiť prístupy</button></div></form>`:""}</div>`}
function addForm(){const A=TADD||{};return `<form class="card f" id="fTeam2">${A.name?`<div class="w s" style="margin-bottom:2px">Pridávaš: <b>${esc(A.name)}</b></div>`:""}
  <label class="w">Meno a titul<input name="name" required value="${esc(A.name||"")}" placeholder="napr. Ján Novák"></label>
  <label>Funkcia<input name="title" value="${esc(A.title||"")}" placeholder="obchodník"></label><label>Kraj / oblasť<input name="region" value="${esc(A.region||"")}" placeholder="Prešovský kraj"></label>
  <label class="w">Mobil alebo e-mail (prihlasovacie meno)<input name="login" required autocapitalize="off" inputmode="email" placeholder="0905 123 456"></label>
  <label class="w">Prístupy podľa funkcie (doladíš potom v ⚙️ Prístupy)<select name="preset">${Object.entries(PRESET).map(([k,v])=>`<option value="${k}"${k===(A.preset||"obchodnik")?" selected":""}>${esc(v.n)}</option>`).join("")}</select></label>
  <div class="w btns"><button class="pri" type="submit">🔑 Vytvoriť prihlásenie a kód</button>${A.name?`<button type="button" data-tadd="">Zrušiť</button>`:""}</div>
  <div class="w s">Vytvorí sa jednorazový kód. Pošleš ho cez WhatsApp a pri prvom prihlásení si človek nastaví vlastný PIN.</div></form>`}
window.vTeam=function(){const L=STATE.staff;if(!L)return `<div class="card"><div class="s">Načítavam…</div></div>`;if(!PPL&&sb)loadPeople();
  let h="";if(STATE.invite&&STATE.invite.team)h+=inviteBox(STATE.invite,false);
  const miss=PEOPLE.filter(x=>!L.some(p=>norm(p.name).includes(x[0])));
  h+=`<button type="button" class="lime tmaddtop" data-tadd="__new" style="width:100%;min-height:56px;font-size:1.05rem;margin:4px 0 6px">➕ Pridať zamestnanca</button>`;
  h+=`<h2>Tím a prístupy</h2><div class="card tmintro"><b>Ty rozhoduješ, kto čo vidí.</b><div class="s">Pri každom človeku ťukni <b>⚙️ Prístupy</b> a zaškrtni. ★ je moje odporúčanie. Ceny, obchody, flotilu a jazdy chráni aj databáza – kto nemá prístup, údaje vôbec nedostane.</div></div>`;
  const ord={dispatch:1,admin:2,invoice:3},emp=[...L].filter(p=>p.role!=="owner").sort((a,b)=>(ord[a.role]??9)-(ord[b.role]??9)||String(a.name).localeCompare(b.name,"sk")),own=L.filter(p=>p.role==="owner");
  h+=`<h2>Zamestnanci (${emp.length+miss.length})</h2><div class="ds-team">`+emp.map(staffCard).join("")+miss.map(x=>`<form class="ds-fc tmc tmnew" data-tnew="${x[0]}"><div class="ds-hd"><span class="ds-av" aria-hidden="true">${esc(dsIni(x[1].replace(/^(Bc|Mgr|Ing)\.\s*/,"")))}</span><span class="ds-ttl"><b>${esc(x[1])}</b><small>${esc(x[2])} · ${esc(x[3])}</small></span></div>
    <div class="tmst w">➕ ešte nemá prihlásenie · prístupy podľa funkcie <b>${esc(PRESET[x[4]].n)}</b></div>
    <label class="tmlg">Mobil alebo e-mail<input name="login" required autocapitalize="off" inputmode="tel" placeholder="0905 123 456"></label>
    <div class="btns"><button class="pri" type="submit">🔑 Vytvoriť prihlásenie a kód</button></div></form>`).join("")+`</div>`;
  h+=`<details class="card tmmore" id="tmAdd"${TADD?" open":""}><summary>➕ Pridať zamestnanca</summary>${addForm()}</details>`;
  if(own.length)h+=`<details class="tmown"><summary>👑 Majitelia (${own.length})</summary><div class="ds-team">${own.map(staffCard).join("")}</div></details>`;
  return h};
async function teamCode(login,name,role,extra){const pw=genPw()+"-"+String(10+((crypto.getRandomValues(new Uint32Array(1))[0])%90));
  const r=await sb.rpc("set_staff_login",{login_in:login,name_in:name,role_in:role,pw});if(r.error){toast("Nepodarilo sa: "+r.error.message,7000);return null}
  if(extra){const q=await sb.rpc("set_staff_profile",{em:r.data,p:extra.p,t:extra.t||"",r:extra.r||"",ph:extra.ph||""});if(q.error)toast("Prístupy sa neuložili: "+q.error.message,6000)}
  const isT=String(r.data).endsWith("@tel.ernte.sk"),who=isT?login:r.data,tel=isT?String(r.data).split("@")[0]:"";
  STATE.invite={team:1,name,tel,pw,txt:`Dobrý deň, tu je váš prístup do aplikácie ERNTE Trade & Logistic.\n\nPrihlasovacie meno: ${who}\nJednorazový kód: ${pw}\n\nPo prvom prihlásení si nastavíte vlastný PIN (kód potom prestane platiť). PIN nikomu neposielajte.\nAplikáciu si dajte na plochu (Zdieľať → Pridať na plochu).\n\n👉 ERNTE Trade & Logistic: ${APP_URL}`};
  await loadTeam();renderStaff();window.scrollTo(0,0);return r.data}
const presetObj=k=>Object.fromEntries(PCAT.map(p=>[p[0],PRESET[k].k.includes(p[0])]));
document.addEventListener("click",async e=>{if(typeof ROLE==="undefined"||ROLE!=="owner")return;const t=e.target;let x;
  if(x=t.closest("[data-tperm]")){TOPEN=TOPEN===x.dataset.tperm?null:x.dataset.tperm;TEDIT=null;renderStaff();return}
  if(x=t.closest("button[data-tedit]")){TEDIT=TEDIT===x.dataset.tedit?null:x.dataset.tedit;TOPEN=null;renderStaff();return}
  if(x=t.closest("[data-tadd]")){const P=PEOPLE.find(p=>p[0]===x.dataset.tadd);TADD=P?{name:P[1],title:P[2],region:P[3],preset:P[4]}:x.dataset.tadd==="__new"?{}:null;renderStaff();setTimeout(()=>{const i=document.querySelector("#fTeam2 input[name=login]");if(i){i.scrollIntoView({block:"center"});i.focus()}},60);return}
  if(x=t.closest("[data-tpreset]")){const f=x.closest("form"),k=PRESET[x.dataset.tpreset];if(!f||!k)return;f.querySelectorAll("input[type=checkbox]").forEach(c=>{c.checked=k.k.includes(c.name.slice(2))});toast("Nastavené podľa: "+k.n+" – ulož.");return}
  if(x=t.closest("[data-tcode]")){const p=(STATE.staff||[]).find(y=>y.email===x.dataset.tcode);if(!p||!confirm("Vytvoriť nový jednorazový kód pre "+p.name+"?\nStarý kód aj PIN prestanú platiť."))return;await teamCode(p.email.replace("@tel.ernte.sk",""),p.name,p.role);return}
},true);
document.addEventListener("submit",async e=>{const f=e.target;
  if(f.dataset&&f.dataset.tnew){e.preventDefault();e.stopPropagation();const P=PEOPLE.find(x=>x[0]===f.dataset.tnew),lg=String(new FormData(f).get("login")||"").trim();if(!P||!lg)return;const b=f.querySelector("button[type=submit]");busy(b,true);
    await teamCode(lg,P[1],PRESET[P[4]].role,{p:presetObj(P[4]),t:P[2],r:P[3]});busy(b,false);return}
  if(f.id==="fTeam2"){e.preventDefault();e.stopPropagation();const d=new FormData(f),k=d.get("preset"),b=f.querySelector("button[type=submit]");busy(b,true);
    const lg=await teamCode(String(d.get("login")).trim(),String(d.get("name")).trim(),PRESET[k].role,{p:presetObj(k),t:d.get("title"),r:d.get("region")});busy(b,false);if(lg)TADD=null;return}
  if(f.dataset&&f.dataset.tinfo){e.preventDefault();e.stopPropagation();const d=new FormData(f),b=f.querySelector("button[type=submit]");busy(b,true);
    const r=await sb.rpc("set_staff_info",{em:f.dataset.tinfo,nm:String(d.get("name")||"").trim(),t:String(d.get("title")||""),r:String(d.get("region")||""),ph:String(d.get("phone")||""),ml:String(d.get("mail")||"").trim()});busy(b,false);
    if(r.error){toast(/set_staff_info/.test(r.error.message)?"Úprava údajov sa zapne po aktualizácii databázy (pár minút).":"Chyba: "+r.error.message,6000);return}TEDIT=null;await loadTeam();renderStaff();toast("✓ Údaje uložené.");return}
  if(f.dataset&&f.dataset.tsave){e.preventDefault();e.stopPropagation();const d=new FormData(f),p={};PCAT.forEach(([k])=>p[k]=d.get("p_"+k)==="on");const b=f.querySelector("button[type=submit]");busy(b,true);
    const r=await sb.rpc("set_staff_profile",{em:f.dataset.tsave,p,t:d.get("title")||"",r:d.get("region")||"",ph:d.get("phone")||""});busy(b,false);
    if(r.error){toast("Chyba: "+r.error.message,6000);return}TOPEN=null;await loadTeam();renderStaff();toast("✓ Prístupy uložené.");return}
},true);

// ===== FARMÁRI: čo vidia (iba majiteľ) =====
let FPSEL="";
function fpRows(get,pre){return FCAT.map(([k,l,h])=>`<label class="pck"><input type="checkbox" name="${pre}${k}"${get(k)?" checked":""}><span>${esc(l)}${FREC.includes(k)?` <em class="prec">★</em>`:""}${h?`<small>${esc(h)}</small>`:""}</span></label>`).join("")}
function farmPermHTML(){const G=((STATE.settings||{}).farmer_perms)||{},gd=k=>G[k]===true||G[k]===false?G[k]:FDEF.includes(k);
  const F=(STATE.farmers||[]).filter(f=>f.active!==false),sel=F.find(f=>f.id===FPSEL),ov=sel&&sel.perms&&Object.keys(sel.perms).length;
  return `<details class="card fpc"${FPSEL?" open":""}><summary><span>👁️</span><b>Čo vidia farmári</b><small>predvolené pre všetkých + výnimky pre konkrétneho farmára</small></summary>
   <div class="sub"><div class="box"><b>🔒 Vždy skryté:</b> ${esc(FNEVER)}</div>
   <form class="sub" id="fFpDef"><b class="sth">Predvolené pre všetkých farmárov</b><div class="pgrid1">${fpRows(gd,"g_")}</div><div class="btns"><button class="pri" type="submit">💾 Uložiť pre všetkých</button></div></form>
   <div class="sub"><b class="sth">Výnimka pre konkrétneho farmára</b><label>Farmár<select id="fpSel"><option value="">– vyber farmára –</option>${F.map(f=>`<option value="${esc(f.id)}"${f.id===FPSEL?" selected":""}>${esc(f.name)}${f.perms&&Object.keys(f.perms).length?" ✱":""}</option>`).join("")}</select></label>
   ${sel?`<form id="fFpOne" data-fid="${esc(sel.id)}"><div class="s">${ov?"✱ Má vlastné nastavenie.":"Teraz platí predvolené – zmeň a ulož pre neho."} ${sel.must_change?"⏳ čaká na vlastný PIN.":sel.pin_at?"✓ vlastný PIN od "+new Date(sel.pin_at).toLocaleDateString("sk-SK")+".":""}</div>
     <div class="pgrid1">${fpRows(k=>{const v=(sel.perms||{})[k];return v===true||v===false?v:gd(k)},"f_")}</div>
     <div class="btns"><button class="pri" type="submit">💾 Uložiť pre ${esc(sel.name)}</button>${ov?`<button type="button" data-fpreset="${esc(sel.id)}">↺ Vrátiť na predvolené</button>`:""}</div></form>`:""}</div></div></details>`}
const _vf=window.vFarm;window.vFarm=function(){return (ROLE==="owner"?farmPermHTML():"")+_vf.apply(this,arguments)};
document.addEventListener("change",e=>{if(e.target.id==="fpSel"){FPSEL=e.target.value;renderStaff()}});
document.addEventListener("submit",async e=>{const f=e.target;if(f.id!=="fFpDef"&&f.id!=="fFpOne")return;e.preventDefault();e.stopPropagation();const d=new FormData(f),pre=f.id==="fFpDef"?"g_":"f_",p={};FCAT.forEach(([k])=>p[k]=d.get(pre+k)==="on");
  const r=f.id==="fFpDef"?await sb.rpc("set_farmer_perm_def",{p}):await sb.rpc("set_farmer_perms",{fid:f.dataset.fid,p});if(r.error){toast("Chyba: "+r.error.message,6000);return}
  await loadStaff();renderStaff();toast("✓ Uložené – farmár to uvidí po obnovení.")},true);
document.addEventListener("click",async e=>{const x=e.target.closest("[data-fpreset]");if(!x)return;const r=await sb.rpc("set_farmer_perms",{fid:x.dataset.fpreset,p:{}});if(r.error){toast(r.error.message);return}await loadStaff();renderStaff();toast("Vrátené na predvolené.")});

// ===== OBCHODY BEZ CIEN · VÝVOZ · ZOSTATKY · POZNÁMKY =====
let OPS=null,OPSN={},OPSF="left",OPSA=null,OPSQ="",OPSC="",OPSL=40;
async function loadOps(){const r=await sb.rpc("ops_deals");OPS=r.error?{err:r.error.message}:r.data||[];
  if(can("notes")&&Array.isArray(OPS)&&OPS.length){const n=await sb.from("deal_notes").select("*").order("created_at",{ascending:false}).limit(500);OPSN={};for(const x of n.data||[])(OPSN[x.deal_id||"f"+x.farmer_id]=OPSN[x.deal_id||"f"+x.farmer_id]||[]).push(x)}
  if(TAB==="deals")renderStaff()}
window.loadOps=loadOps;
const NK={vyvoz:["🚚","vývoz"],nedodane:["⚠️","nedodaný tovar"],farmar:["👨‍🌾","od farmára"],obchodnik:["🤝","od obchodníka"]};
function opsHTML(){if(OPS===null){loadOps();return `<div class="card"><div class="s">Načítavam vývoz…</div></div>`}
  if(OPS.err)return `<div class="card"><div class="s">Vývoz sa zapne po aktualizácii databázy (pár minút). ${esc(OPS.err)}</div></div>`;
  const q=norm(OPSQ),base=OPS.filter(d=>(OPSF!=="left"||+d.left_t>0)&&(!q||norm([d.farmer,d.no,comName(d.com),d.addr,d.load_place].join(" ")).includes(q)));
  const L=base.filter(d=>!OPSC||d.com===OPSC),sumL=a=>a.reduce((s,d)=>s+(+d.left_t||0),0),tot=sumL(L);
  const coms={};for(const d of base){if(!(+d.left_t>0)&&OPSF==="left")continue;const c=coms[d.com]=coms[d.com]||{t:0,n:0};c.t+=+d.left_t||0;c.n++}
  const CL=Object.entries(coms).sort((a,b)=>b[1].t-a[1].t);
  const fm={};for(const d of L){if(!(+d.left_t>0))continue;const k=d.farmer||"?";const x=fm[k]=fm[k]||{t:0,n:0,com:new Set()};x.t+=+d.left_t;x.n++;x.com.add(d.com)}
  const FL=Object.entries(fm).sort((a,b)=>b[1].t-a[1].t);
  let h=`<h2>Vývoz od farmárov${can("deals")?"":" · bez cien"}</h2><div class="ops-k"><div class="hl"><small>Zostáva vyviezť${OPSC?" · "+esc(comName(OPSC)):""}</small><b>${fmt(tot,1)} t</b></div><div><small>${OPSF==="left"?"Obchodov so zostatkom":"Obchodov"}</small><b>${L.length}</b></div><div><small>Farmárov</small><b>${FL.length}</b></div><div><small>Dnes jázd</small><b>${(STATE.trips||[]).filter(t=>t.day===today()&&t.status!=="zrusena").length}</b></div></div>
   <div class="card f"><label class="w">Hľadať farmára / obchod / komoditu<input id="opsQ" value="${esc(OPSQ)}" placeholder="meno, obec, komodita" autocomplete="off"></label><div class="w btns seg2"><button type="button" data-opsf="left" aria-pressed="${OPSF==="left"}">Len so zostatkom</button><button type="button" data-opsf="all" aria-pressed="${OPSF==="all"}">Všetky</button></div>
   <div class="w opsc"><button type="button" data-opsc="" aria-pressed="${!OPSC}"><b>Všetky komodity</b><small>${fmt(sumL(base),1)} t</small></button>${CL.map(([c,v])=>`<button type="button" data-opsc="${esc(c)}" aria-pressed="${OPSC===c}">${typeof comImg==="function"?comImg(c):""}<b>${esc(comName(c))}</b><small>${fmt(v.t,1)} t · ${v.n}×</small></button>`).join("")}</div></div>`;
  if(FL.length>1)h+=`<details class="card hsec"${OPSC||q?" open":""}><summary><span>👨‍🌾</span><b>Nevyvezené podľa farmárov${OPSC?" · "+esc(comName(OPSC)):""}</b><small>${FL.length} farmárov · ${fmt(tot,1)} t</small></summary><div class="opsfl">${FL.map(([f,v])=>`<button type="button" data-opsfarm="${esc(f)}"><span><b>${esc(f)}</b><small>${[...v.com].map(c=>esc(comName(c))).join(", ")} · ${v.n} ${v.n===1?"obchod":"obchody"}</small></span><b class="num">${fmt(v.t,1)} t</b></button>`).join("")}</div></details>`;
  if(!L.length)return h+`<div class="card"><div class="s">Žiadny obchod${OPSF==="left"?" so zostatkom":""}.</div></div>`;
  const more=L.length>OPSL;return h+L.slice(0,OPSL).map(d=>{const pct=+d.tons>0?Math.min(100,(+d.delivered_t||0)/(+d.tons)*100):0,N=OPSN[d.id]||[],T=(STATE.trips||[]).filter(t=>t.deal_id===d.id&&t.status!=="zrusena").sort((a,b)=>String(b.day).localeCompare(a.day)),op=OPSA===d.id;
   const tel=String(d.phone||"").replace(/\s/g,"");
   return `<div class="card opc"><div class="row"><span class="t">${esc(d.farmer)}</span>${pill(DST[d.status]||[d.status])}</div>
    <div class="opcom">${comImg(d.com,"cico")}<b>${esc(comName(d.com))}</b><span class="s">obchod ${esc(d.no)}${d.term?" · do "+esc(d.term):""}</span></div>
    <div class="opk"><div><small>Dohodnuté</small><b>${fmt(d.tons,1)} t</b></div><div><small>Vyvezené</small><b>${fmt(d.delivered_t,1)} t</b></div><div class="${+d.left_t>0?"hl":""}"><small>Zostáva</small><b>${fmt(d.left_t,1)} t</b></div></div>
    <div class="opbar"><i style="width:${pct.toFixed(0)}%"></i></div>
    <div class="opl"><div><span>📍 Nakládka</span><b>${esc(d.load_place||d.addr||"nezadané")}</b></div>${canAny("deals_qty","deals","trans")?`<div><span>🏭 Vykládka</span><b>${esc(d.dests||"zatiaľ nezadaná")}</b></div>`:""}</div>
    ${T.length?`<div class="optr">${T.slice(0,6).map(t=>`<div class="optri"><b>${esc(dSK(t.day))}${t.time?" "+esc(t.time):""}</b><span>🚛 ${esc(t.spz||"")}${t.driver?" · "+esc(t.driver):""}</span>${pill(TST[t.status]||[t.status])}${can("farmer_gps")&&["naplanovana","na_ceste","nakladka"].includes(t.status)?`<button type="button" class="${t.gps_farmer?"lime":""}" data-tgps="${esc(t.id)}" data-v="${t.gps_farmer?0:1}" title="Farmár vidí polohu auta cestou na nakládku">📍 GPS farmárovi: ${t.gps_farmer?"ZAP":"VYP"}</button>`:""}</div>`).join("")}</div>`:`<div class="s">Zatiaľ žiadna jazda.</div>`}
    ${can("notes")?`<div class="opn">${N.slice(0,5).map(n=>`<div class="opni ${n.kind}"><b>${NK[n.kind][0]} ${esc(NK[n.kind][1])}${n.tons?` · ${fmt(n.tons,1)} t`:""}</b><span>${esc(n.body)}</span><small>${esc(n.author_name||n.author||"")} · ${new Date(n.created_at).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})}${n.for_farmer?" · 👁️ vidí farmár":""}</small></div>`).join("")}</div>`:""}
    <div class="btns">${tel?`<a class="btn lime" href="tel:${esc(tel)}">📞 ${esc(String(d.farmer).split(" ")[0])}</a>`:""}${can("assign")&&+d.left_t>0?`<button type="button" class="pri" data-opsa="${esc(d.id)}">${op?"✕ Zavrieť":"🚛 Prideliť autá"}</button>`:""}${can("notes")?`<button type="button" data-opsn="${esc(d.id)}">📝 Poznámka</button>`:""}</div>
    ${op?`<form class="f sub" id="fOpsA" data-deal="${esc(d.id)}" data-fid="${esc(d.farmer_id)}"><div class="w s">Vyber autá pre ${esc(d.farmer)}:</div><div class="w tgrid">${(STATE.trucks||[]).filter(t=>t.active).map(t=>`<label class="tchk"><input type="checkbox" name="tk" value="${t.no}"><span><b>č.${t.no} · ${esc(t.spz)}</b><small>${esc(t.driver||"bez vodiča")}</small></span></label>`).join("")}</div>
      <label>Deň<input name="day" type="date" required value="${esc(today())}"></label><label>Od koľkej<input name="time" type="time" value="07:00"></label>
      <label class="w pck"><input type="checkbox" name="gps" checked><span>📍 Farmár uvidí polohu auta cestou na nakládku<small>vykládku a odberateľa nikdy nevidí</small></span></label>
      <label class="w">Poznámka pre farmára (nepovinné)<input name="note" placeholder="napr. príjazd cez dvor"></label>
      <div class="w btns"><button class="pri" type="submit">Potvrdiť autá farmárovi</button></div></form>`:""}
    ${OPSA==="n"+d.id?`<form class="f sub" id="fOpsN" data-deal="${esc(d.id)}" data-fid="${esc(d.farmer_id)}"><label>Typ<select name="kind"><option value="vyvoz">🚚 vývoz</option><option value="nedodane">⚠️ nedodaný tovar</option><option value="obchodnik">🤝 od obchodníka</option></select></label><label>Tony (nepovinné)<input name="tons" inputmode="decimal"></label>
      <label class="w">Poznámka<textarea name="body" required maxlength="2000" placeholder="napr. farmár nedodal 2 t – vlhké, dovezie v piatok"></textarea></label><label class="w pck"><input type="checkbox" name="ff"><span>Zobraziť aj farmárovi</span></label>
      <div class="w btns"><button class="pri" type="submit">Uložiť poznámku</button></div></form>`:""}</div>`}).join("")+(more?`<div class="btns"><button type="button" data-opsmore="1">Zobraziť ďalšie (${L.length-OPSL})</button></div>`:"")}
const _vd=window.vDeals;window.vDeals=function(){let h="";if(can("deals"))h+=_vd.apply(this,arguments);if(canAny("deals_qty","remain","notes")&&(!can("deals")||ROLE!=="owner"))h+=opsHTML();else if(ROLE==="owner")h+=`<div class="btns" style="margin-top:14px"><button type="button" data-opsshow="1">🚚 Vývoz a zostatky (pohľad dopravy, bez cien)</button></div>`+(STATE.opsShow?opsHTML():"");return h};
document.addEventListener("input",e=>{if(e.target.id==="opsQ"){OPSQ=e.target.value;clearTimeout(e.target._t);OPSL=40;const p=e.target.selectionStart;e.target._t=setTimeout(()=>{renderStaff();const i=document.getElementById("opsQ");if(i){i.focus();try{i.setSelectionRange(p,p)}catch(x){}}},180)}});
document.addEventListener("click",async e=>{const t=e.target;let x;
  if(x=t.closest("[data-opsshow]")){STATE.opsShow=!STATE.opsShow;renderStaff();return}
  if(x=t.closest("[data-opsf]")){OPSF=x.dataset.opsf;OPSL=40;renderStaff();return}
  if(x=t.closest("[data-opsc]")){OPSC=x.dataset.opsc;OPSL=40;renderStaff();return}
  if(x=t.closest("[data-opsfarm]")){OPSQ=x.dataset.opsfarm;OPSL=40;renderStaff();const i=document.getElementById("opsQ");if(i)i.scrollIntoView({block:"center",behavior:"smooth"});return}
  if(x=t.closest("[data-opsmore]")){OPSL+=60;renderStaff();return}
  if(x=t.closest("[data-opsa]")){OPSA=OPSA===x.dataset.opsa?null:x.dataset.opsa;renderStaff();return}
  if(x=t.closest("[data-opsn]")){OPSA=OPSA==="n"+x.dataset.opsn?null:"n"+x.dataset.opsn;renderStaff();return}
  if(x=t.closest("[data-tgps]")){x.disabled=true;const r=await sb.rpc("trip_gps",{tid:x.dataset.tgps,val:x.dataset.v==="1"});if(r.error){toast("Chyba: "+r.error.message,6000);x.disabled=false;return}await loadStaff();renderStaff();toast(x.dataset.v==="1"?"📍 Farmár teraz vidí polohu auta.":"Poloha pre farmára vypnutá.");return}});
document.addEventListener("submit",async e=>{const f=e.target;if(f.id!=="fOpsA"&&f.id!=="fOpsN")return;e.preventDefault();e.stopPropagation();const d=new FormData(f),b=f.querySelector("button[type=submit]");busy(b,true);
  if(f.id==="fOpsA"){const nos=d.getAll("tk").map(Number);if(!nos.length){busy(b,false);toast("Vyber aspoň jedno auto.");return}
    const rows=nos.map(n=>{const t=STATE.trucks.find(y=>y.no===n);return {farmer_id:f.dataset.fid,deal_id:f.dataset.deal,truck_no:n,spz:t.spz,driver:t.driver,driver_phone:t.phone,day:d.get("day"),time:d.get("time")||null,note:d.get("note")||null,gps_farmer:d.get("gps")==="on"}});
    let a=await sb.from("trips").insert(rows);if(a.error&&/gps_farmer/.test(a.error.message)){rows.forEach(r=>delete r.gps_farmer);a=await sb.from("trips").insert(rows)}
    busy(b,false);if(a.error){toast("Chyba: "+a.error.message,6000);return}OPSA=null;await loadStaff();await loadOps();toast("✓ Autá pridelené – farmár ich vidí.");return}
  const r=await sb.from("deal_notes").insert({deal_id:f.dataset.deal,farmer_id:f.dataset.fid,kind:d.get("kind"),body:String(d.get("body")).trim(),tons:d.get("tons")?num(d.get("tons")):null,for_farmer:d.get("ff")==="on",author_name:ME.staffName||null});
  busy(b,false);if(r.error){toast("Chyba: "+r.error.message,6000);return}OPSA=null;await loadOps();toast("✓ Poznámka uložená.")},true);

// ===== KALKULAČKA ERNTE (z Claude app) =====
window.vCalc=function(){requestAnimationFrame(calcFit);return (window.susCardHTML?susCardHTML():"")+`<div class="calcw" id="calcW"><iframe class="calcfr" src="kalkulacka.html?v=20261026c" title="ERNTE Kalkulačka nákupnej ceny" allow="clipboard-write"></iframe></div>`};
function calcFit(){const w=document.getElementById("calcW");if(!w)return;const hd=document.querySelector("header.top"),nv=document.querySelector("#app>.tabs,.tabs");
  let top=hd?Math.max(0,hd.getBoundingClientRect().bottom):0,bot=0;if(nv){const r=nv.getBoundingClientRect();if(r.top>innerHeight/2)bot=Math.max(0,innerHeight-r.top);else top=Math.max(top,r.bottom)}w.style.top=top+"px";w.style.bottom=bot+"px"}
addEventListener("resize",()=>calcFit());addEventListener("orientationchange",()=>setTimeout(calcFit,300));

// ===== FARMÁR: poznámky k vývozu =====
window.farmNotesHTML=function(){if(!fcan("f_notes"))return "";const N=STATE.fnotes;if(N===undefined){STATE.fnotes=null;sb.from("deal_notes").select("*").order("created_at",{ascending:false}).limit(30).then(r=>{STATE.fnotes=r.data||[];renderFarmer()});return ""}
  return `<h2>Poznámky k vývozu</h2><div class="card">${(N||[]).map(n=>`<div class="opni ${n.kind}"><b>${n.kind==="farmar"?"👨‍🌾 vy":"ERNTE"}${n.tons?` · ${fmt(n.tons,1)} t`:""}</b><span>${esc(n.body)}</span><small>${new Date(n.created_at).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})}</small></div>`).join("")||`<div class="s">Zatiaľ žiadne poznámky.</div>`}
   <form class="f sub" id="fFNote"><label class="w">Napíšte ERNTE k vývozu<textarea name="body" required maxlength="2000" placeholder="napr. zvyšok 5 t bude pripravený v pondelok"></textarea></label><div class="w btns"><button class="pri" type="submit">Odoslať poznámku</button></div></form></div>`};
document.addEventListener("submit",async e=>{if(e.target.id!=="fFNote")return;e.preventDefault();e.stopPropagation();const d=new FormData(e.target),b=e.target.querySelector("button");busy(b,true);
  const deal=(STATE.deals||[]).find(x=>["podpisany","odvoz"].includes(x.status));
  const r=await sb.from("deal_notes").insert({farmer_id:FARMER.id,deal_id:deal?deal.id:null,kind:"farmar",body:String(d.get("body")).trim(),author_name:FARMER.name});busy(b,false);
  if(r.error){toast("Nepodarilo sa: "+r.error.message,6000);return}STATE.fnotes=undefined;renderFarmer();toast("✓ Poznámka odoslaná ERNTE.")},true);

// ===== POMOCNÍK „Ako to funguje“ pre nové časti =====
try{Object.assign(HELP,{
 team:{t:"Tím a prístupy",i:"👥",r:"Ty rozhoduješ, kto z tímu čo vidí. Platí aj v databáze.",s:[
  ["Pridať človeka","Ťukni na pripraveného človeka (napr. ＋ Ján Novák) alebo vyplň formulár, zadaj mobil a ťukni <b>Vytvoriť prihlásenie a kód</b>. Pošli ho cez <b>WhatsApp</b>."],
  ["Prvé prihlásenie","Človek sa prihlási mobilom a jednorazovým kódom. Aplikácia ho hneď požiada o <b>vlastný PIN</b> – kód potom prestane platiť. Ty PIN nikdy nevidíš."],
  ["Prístupy","Pri človeku ťukni <b>⚙️ Prístupy</b>, zaškrtni čo má vidieť a ulož. ★ je moje odporúčanie pre jeho funkciu; tlačidlami Vedúci dopravy / Obchodník / Manažér nastavíš všetko naraz."],
  ["Čo vidíš iba ty","Marža, zisk, predajné ceny odberateľom, mzdy, pevné náklady, ERNTE AI a Tím – tie sa nedajú nikomu prideliť."]]},
 calc:{t:"Kalkulačka",i:"🧮",r:"Kalkulačka nákupnej ceny ERNTE – tá istá ako v Claude app.",s:[
  ["Čo počíta","Odberateľ a plodina, doprava, kvalita, burza a trh, cenník nákupu, obchody s farmármi a autá VALKO."],
  ["Kto ju vidí","Iba ľudia s prístupom „Kalkulačka“. Interné odpočty vidí len majiteľ."],
  ["Celá obrazovka","Dole je odkaz Otvoriť kalkulačku na celú obrazovku."]]}});
 if(HELP.deals)HELP.deals.s=(HELP.deals.s||[]).concat([["Vývoz bez cien","Doprava vidí obchody BEZ cien: dohodnuté, vyvezené a <b>zostávajúce tony</b>, nakládku, vykládku, jazdy a poznámky. Tu prideľuje autá a zapína farmárovi <b>📍 GPS</b> – farmár vidí auto len cestou na nakládku, nikdy vykládku ani odberateľa."]]);
}catch(e){}
})();

// odkaz na aplikáciu v zobrazených správach: namiesto https://… logo a názov ERNTE Trade & Logistic
window.appLinkHTML=function(t){const u=typeof APP_URL!=="undefined"?APP_URL:location.href.split("#")[0],chip=`<span class="applink"><img src="logo.png" alt="">ERNTE Trade &amp; Logistic</span>`;
  return String(t).split(u).map(x=>esc(x).replace(/https?:\/\/\S+/g,chip)).join(chip)};
