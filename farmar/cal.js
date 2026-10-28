// ===== 📅 KALENDÁR MAJITEĽA + 📅 STRETNUTIE (žiadosť od každého používateľa) =====
// Kalendár (záložka 📅) vidí IBA Martin Vaľko / ERNTE spol. (MAIN_OK + main_ok() v databáze).
// Pripomienky chodia do mobilu cez upozornenia aplikácie (iba na jeho zariadenia).
// Každý zamestnanec aj farmár má tlačidlo „📅 Stretnutie“: aplikácia mu ponúkne iba voľné termíny majiteľa,
// najprv preferované (8:00–13:00), porovnané s kalendárom a ostatnými žiadosťami. Detaily kalendára nevidí nikto iný.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const MAIN=()=>typeof window.MAIN_OK==="function"&&window.MAIN_OK();
const logged=()=>(typeof FARMER!=="undefined"&&!!FARMER)||(typeof ROLE!=="undefined"&&!!ROLE);
const TZ="Europe/Bratislava";
const dkey=d=>new Date(d).toLocaleDateString("sv-SE",{timeZone:TZ});
const hm=d=>new Date(d).toLocaleTimeString("sk-SK",{timeZone:TZ,hour:"2-digit",minute:"2-digit"});
const dayL=d=>{const k=dkey(d),t=dkey(Date.now()),z=dkey(Date.now()+864e5);return (k===t?"Dnes · ":k===z?"Zajtra · ":"")+new Date(d).toLocaleDateString("sk-SK",{timeZone:TZ,weekday:"long",day:"numeric",month:"long"})};
const toast_=(m,t)=>{if(typeof toast==="function")toast(m,t||5000)};
const REM=[[0,"v čase"],[15,"15 min"],[60,"1 h"],[180,"3 h"],[1440,"1 deň"],[10080,"týždeň"]];
const REP=[["","neopakovať"],["den","denne"],["tyzden","týždenne"],["mesiac","mesačne"],["rok","ročne"]];
const MST={nova:["čaká na teba","w"],potvrdena:["potvrdené","" ],presunuta:["presunuté – potvrdené","b"],zamietnuta:["zamietnuté","r"],zrusena:["zrušené","g"]};
const MSTU={nova:["⏳ čaká na potvrdenie","w"],potvrdena:["✅ potvrdené","" ],presunuta:["🔁 nový čas – potvrdené","b"],zamietnuta:["❌ zamietnuté","r"],zrusena:["zrušené","g"]};
const pill_=(a)=>`<span class="pill ${a[1]||""}">${E(a[0])}</span>`;
let C={ev:null,mr:null,cfg:null,busy:false,at:0,form:null,showPast:false,move:null};

/* ---------------- MAJITEĽ: záložka Kalendár ---------------- */
async function load(force){if(C.busy||(!force&&C.at&&Date.now()-C.at<45e3))return;C.busy=true;
  try{const since=new Date(Date.now()-14*864e5).toISOString();
    const [a,b,c]=await Promise.all([sb.from("owner_cal").select("*").gte("start_at",since).order("start_at",{ascending:true}).limit(400),
      sb.from("meet_req").select("*").order("start_at",{ascending:true}).limit(200),sb.rpc("meet_cfg")]);
    C.err=a.error?a.error.message:b.error?b.error.message:"";C.ev=a.data||[];try{const au=await sb.from("owner_cal_audio").select("cal_id");const A=new Set((au.data||[]).map(x=>String(x.cal_id)));C.ev.forEach(e=>e.has_audio=A.has(String(e.id)))}catch(x){}C.mr=b.data||[];C.cfg=c.data||{};C.at=Date.now();
    try{const rg=await sb.from("cal_ring").select("cal_id").is("acked_at",null).gte("created_at",new Date(Date.now()-40*6e4).toISOString());C.ring=rg.error?[]:[...new Set((rg.data||[]).map(x=>x.cal_id))]}catch(x){C.ring=[]}}catch(x){C.err=String(x.message||x)}
  C.busy=false;if(typeof TAB!=="undefined"&&TAB==="cal"&&typeof renderStaff==="function")renderStaff()}
window.calNew=function(){if(!MAIN())return false;VO={heard:"",aud:null};C.form="new";try{TAB="cal";if(C.ev===null)load(true);renderStaff();scrollTo(0,0)}catch(x){}return true};
window.calOpenCount=()=>(C.mr||[]).filter(m=>m.status==="nova"&&new Date(m.start_at)>Date.now()).length;
function evRow(e){const past=new Date(e.start_at)<Date.now()-36e5;const rm=(e.remind_min||[]).map(m=>(REM.find(r=>r[0]===m)||[0,m+" min"])[1]).join(", ");
  return `<div class="clev ${e.kind} ${e.done?"done":""} ${past?"past":""}"><div class="clt">${e.all_day?"celý deň":hm(e.start_at)}${e.end_at&&!e.all_day?`<small>${hm(e.end_at)}</small>`:""}</div>
   <div class="clb"><b>${e.kind==="stretnutie"?"":e.kind==="blok"?"⛔ ":"⏰ "}${E(e.title)}</b>${e.place?`<small>📍 ${E(e.place)}</small>`:""}${e.who||e.phone?`<small>${e.who?`👤 ${E(e.who)}`:""}${e.who&&e.phone?" · ":""}${e.phone?`<a href="tel:${E(String(e.phone).replace(/[^0-9+]/g,""))}">📞 ${E(e.phone)}</a>`:""}</small>`:""}${(C.ring||[]).includes(e.id)?`<button type="button" class="clpb clack" data-clack="${e.id}">✓ Beriem na vedomie</button>`:""}${e.note?`<small class="cln">${E(e.note)}</small>`:""}${e.has_audio?`<button type="button" class="clpb" data-clplay="${e.id}">▶︎ 🎙️ Prehrať hlasovku</button>`:""}<small class="clm">🔔 ${E(rm||"bez upozornenia")}${e.rep?" · 🔁 "+E((REP.find(r=>r[0]===e.rep)||[0,e.rep])[1]):""}</small></div>
   <div class="cla"><button type="button" data-cldone="${e.id}" title="${e.done?"Vrátiť":"Hotovo"}" aria-label="${e.done?"Vrátiť":"Hotovo"}">${e.done?"↩︎":"✓"}</button><button type="button" data-cledit="${e.id}" aria-label="Upraviť">✎</button></div></div>`}
function reqCard(m){const st=MST[m.status]||[m.status];const fut=new Date(m.start_at)>Date.now();
  return `<div class="clreq ${m.status}"><div class="clrh"><span class="ds-av">${E((String(m.who_name||"?").match(/\p{L}/gu)||["?"]).slice(0,2).join("").toUpperCase())}</span><div><b>${E(m.who_name||m.who_email)}</b><small>${m.farmer_id?"farmár":"tím"} · ${E(m.who_email)}</small></div>${pill_(st)}</div>
   <div class="clrt">📅 <b>${E(dayL(m.start_at))}</b> · ${hm(m.start_at)}–${hm(m.end_at)}${m.place?` · 📍 ${E(m.place)}`:""}</div><div class="clrq">💬 ${E(m.topic)}</div>${m.reply?`<div class="s">Tvoja odpoveď: ${E(m.reply)}</div>`:""}
   ${m.status==="nova"&&fut?`<div class="btns"><button type="button" class="lime" data-mrok="${m.id}">✅ Potvrdiť</button><button type="button" data-mrmove="${m.id}">🔁 Iný čas</button><button type="button" class="dng" data-mrno="${m.id}">❌ Zamietnuť</button></div>`:""}
   ${C.move===m.id?moveBox(m):""}</div>`}
function moveBox(m){if(!C.slots)return `<div class="s">Načítavam tvoje voľné časy…</div>`;
  return `<div class="clmv"><div class="s">Vyber nový čas (⭐ = tvoje preferované ${E(C.cfg.pref_from??8)}:00–${E(C.cfg.pref_to??13)}:00):</div>${slotsHTML(C.slots,"data-mrto",m.id)}<label>Správa (nepovinné)<input id="mrMsg" placeholder="napr. v tento deň nemôžem, ale…"></label></div>`}
function slotsHTML(L,attr,id){const by={};for(const s of L){(by[dkey(s.start_at)]=by[dkey(s.start_at)]||[]).push(s)}const days=Object.keys(by).slice(0,10);
  if(!days.length)return `<div class="s">Najbližšie dni nie je voľný termín.</div>`;
  return days.map(k=>`<div class="clsd"><small>${E(dayL(by[k][0].start_at))}</small><div class="clsl">${by[k].map(s=>`<button type="button" class="clsb ${s.pref?"pref":""}" ${attr}="${E(s.start_at)}"${id!=null?` data-id="${id}"`:""}>${s.pref?"⭐ ":""}${hm(s.start_at)}</button>`).join("")}</div></div>`).join("")}
function form(e){e=e||{};const d=e.start_at?new Date(e.start_at):new Date(Date.now()+36e5);const dk=dkey(d),tm=e.start_at?hm(d):"09:00";const dur=e.end_at?Math.round((new Date(e.end_at)-new Date(e.start_at))/6e4):30;const rm=e.remind_min||[15];
  const ch=(n,L,cur,multi)=>`<div class="ftchips" data-chg="${n}"${multi?" data-multi":""}>${L.map(x=>`<button type="button" class="ftchip${(multi?cur.includes(x[0]):String(cur)===String(x[0]))?" on":""}" data-v="${E(x[0])}">${E(x[1])}</button>`).join("")}</div>`;
  return `<form class="card clf" id="fCal" data-id="${E(e.id||"")}"><div class="t">${e.id?"✎ Upraviť":"＋ Nová pripomienka"}</div>
   <div class="clvo"><button type="button" class="clvb" data-clsay>🎤 Povedať</button><button type="button" class="clvb" data-clrec>🎙️ Nahrať hlasovku</button>
    <input type="file" accept="audio/*" capture id="clAudIn" hidden></div>
   <div class="s clvh" id="clHeard">${VO.heard?`🎤 „${E(VO.heard)}“`:"Povedz napr. „V pondelok ráno o ôsmej stretnutie v APD Malčice, poriešiť reklamáciu sóje“ – vyplním čo, kedy a kde. Alebo nahraj hlasovku cez záznamník v telefóne."}</div>
   ${VO.aud||e.has_audio?`<div class="claud">🎙️ ${VO.aud?`<audio controls src="${VO.aud.url}"></audio><button type="button" data-claudx>✕</button>`:`<button type="button" data-clplay="${E(e.id)}">▶︎ Prehrať hlasovku</button>`}</div>`:""}
   <label class="w">Čo<input name="title" required maxlength="200" value="${E(e.title||"")}" placeholder="napr. Zavolať do banky, STK auta, schôdzka s…"></label>
   <div class="ftchips">${[["Dnes",0],["Zajtra",1],["Pozajtra",2],["O týždeň",7]].map(x=>`<button type="button" class="ftchip" data-clday="${x[1]}">${x[0]}</button>`).join("")}</div>
   <div class="clrow"><label>Dátum<input type="date" name="d" required value="${E(dk)}"></label><label>Čas<input type="time" name="t" value="${E(tm)}"${e.all_day?" disabled":""}></label></div>
   <label class="clck"><input type="checkbox" name="all_day"${e.all_day?" checked":""}> celý deň</label>
   <label>Druh</label>${ch("kind",[["pripomienka","⏰ pripomienka"],["blok","⛔ som obsadený (nikto si to nezoberie)"]],e.kind==="stretnutie"?"pripomienka":(e.kind||"pripomienka"))}
   <label>Trvanie</label>${ch("dur",[[15,"15 min"],[30,"30 min"],[60,"1 h"],[120,"2 h"],[240,"4 h"]],dur)}
   <label>Upozorniť do mobilu</label>${ch("rem",REM,rm,true)}
   <label>Opakovať</label>${ch("rep",REP,e.rep||"")}
   <label class="w">Miesto (nepovinné)<input name="place" value="${E(e.place||"")}"></label>
   <div class="clrow"><label>S kým (nepovinné)<input name="who" maxlength="120" value="${E(e.who||"")}" placeholder="meno, firma"></label><label>Telefón (nepovinné)<input name="phone" type="tel" inputmode="tel" maxlength="30" value="${E(e.phone||"")}" placeholder="+421 9…"></label></div>
   <label class="w">Poznámka (nepovinné)<textarea name="note" rows="2">${E(e.note||"")}</textarea></label>
   <div class="w btns"><button type="submit" class="pri">💾 Uložiť</button><button type="button" data-clclose>Zavrieť</button>${e.id?`<button type="button" class="dng" data-cldel="${e.id}">Zmazať</button>`:""}</div></form>`}
function cfgCard(){const c=C.cfg||{};const D=[[1,"Po"],[2,"Ut"],[3,"St"],[4,"Št"],[5,"Pi"],[6,"So"],[7,"Ne"]];
  return `<details class="card clcfg"><summary>⚙️ Kedy si ťa môžu objednať</summary><form id="fCalCfg" class="clcf">
   <div class="clrow"><label>Preferujem od<input name="pref_from" type="number" min="5" max="22" value="${E(c.pref_from??8)}"></label><label>do<input name="pref_to" type="number" min="6" max="23" value="${E(c.pref_to??13)}"></label></div>
   <div class="clrow"><label>Ponúkať aj od<input name="work_from" type="number" min="5" max="22" value="${E(c.work_from??7)}"></label><label>do<input name="work_to" type="number" min="6" max="23" value="${E(c.work_to??16)}"></label></div>
   <label>Dni</label><div class="ftchips" data-chg="days" data-multi>${D.map(x=>`<button type="button" class="ftchip${(c.days||[1,2,3,4,5]).includes(x[0])?" on":""}" data-v="${x[0]}">${x[1]}</button>`).join("")}</div>
   <div class="clrow"><label>Najskôr o (hodín)<input name="min_hours" type="number" min="0" max="72" value="${E(c.min_hours??3)}"></label><label>Dopredu (dní)<input name="horizon" type="number" min="3" max="60" value="${E(c.horizon??21)}"></label></div>
   <div class="s">Ľudia uvidia iba voľné časy – najprv ⭐ preferované. Obsadené pripomienkou „⛔ som obsadený“, potvrdeným stretnutím alebo inou žiadosťou sa neponúkajú. Sviatky SR sa vynechajú.</div>
   <div class="btns"><button type="submit" class="pri">Uložiť</button></div></form></details>`}
window.vCal=function(){if(!MAIN())return "";if(C.ev===null){load(true);return `<div class="card"><div class="s">Načítavam kalendár…</div></div>`}
  if(C.err)return `<div class="card"><div class="s">${/owner_cal|meet_req|meet_cfg/.test(C.err)?"Kalendár sa zapne po aktualizácii databázy (pár minút).":"⚠️ "+E(C.err)}</div></div>`;
  const now=Date.now(),open=C.mr.filter(m=>m.status==="nova"&&new Date(m.start_at)>now),soon=C.mr.filter(m=>["potvrdena","presunuta"].includes(m.status)&&new Date(m.end_at)>now);
  const fut=C.ev.filter(e=>!e.done&&new Date(e.start_at)>now-36e5),past=C.ev.filter(e=>e.done||new Date(e.start_at)<=now-36e5).reverse();
  const by={};for(const e of fut){(by[dkey(e.start_at)]=by[dkey(e.start_at)]||[]).push(e)}
  let h=`<div class="clhd"><div><small>Iba ty · pripomienky prídu do mobilu</small><h2 class="hubt">📅 Kalendár</h2></div><button type="button" class="pri" data-clnew>＋ Pripomienka</button></div>`;
  if(C.form!==null)h+=form(C.form==="new"?null:C.ev.find(e=>String(e.id)===String(C.form)));
  if(open.length)h+=`<h2>📩 Žiadosti o stretnutie · ${open.length}</h2>${open.map(reqCard).join("")}`;
  h+=`<h2>Najbližšie</h2>`;
  h+=Object.keys(by).length?Object.keys(by).slice(0,30).map(k=>`<div class="card cld"><div class="cldh">${E(dayL(by[k][0].start_at))}</div>${by[k].map(evRow).join("")}</div>`).join(""):`<div class="card"><div class="s">Nič naplánované. Ťukni <b>＋ Pripomienka</b>.</div></div>`;
  if(soon.length)h+=`<details class="card"><summary>🤝 Potvrdené stretnutia · ${soon.length}</summary>${soon.map(reqCard).join("")}</details>`;
  h+=cfgCard();
  if(past.length)h+=`<details class="card"><summary>Hotové a minulé · ${past.length}</summary>${past.slice(0,40).map(evRow).join("")}</details>`;
  const old=C.mr.filter(m=>!["nova"].includes(m.status)&&!soon.includes(m));if(old.length)h+=`<details class="card"><summary>História žiadostí · ${old.length}</summary>${old.slice(-30).reverse().map(reqCard).join("")}</details>`;
  return h};

/* ---------------- 🎤 hlas: diktovanie a hlasovka z telefónu ---------------- */
let VO={heard:"",aud:null},SR_=null;
const NUM={"jednej":1,"prvej":1,"jedna":1,"druhej":2,"dve":2,"tretej":3,"tri":3,"štvrtej":4,"štyri":4,"piatej":5,"päť":5,"šiestej":6,"šesť":6,"siedmej":7,"sedem":7,"ôsmej":8,"osem":8,"deviatej":9,"deväť":9,"desiatej":10,"desať":10,"jedenástej":11,"jedenásť":11,"dvanástej":12,"dvanásť":12,"trinástej":13,"štrnástej":14,"pätnástej":15,"šestnástej":16,"sedemnástej":17,"osemnástej":18,"devätnástej":19,"dvadsiatej":20};
const DNI=["nedeľ","pondel","utor","stred","štvrt","piat","sobot"];
const MES=["januára","februára","marca","apríla","mája","júna","júla","augusta","septembra","októbra","novembra","decembra"];
function parseSk(raw){let t=" "+String(raw||"").toLowerCase().replace(/[,.!?]/g," ").replace(/\s+/g," ")+" ";const now=new Date();let d=null,h=null,m=0,rem=null,used=[];
  const take=re=>{const x=t.match(re);if(x){used.push(x[0]);t=t.replace(x[0]," ")}return x};
  let x;
  if(x=take(/ (dnes|dneska) /))d=new Date(now);
  else if(x=take(/ (pozajtra) /)){d=new Date(now);d.setDate(d.getDate()+2)}
  else if(x=take(/ (zajtra|zajtra) /)){d=new Date(now);d.setDate(d.getDate()+1)}
  else if(x=take(/ (o|za) (týždeň|tyzden) /)){d=new Date(now);d.setDate(d.getDate()+7)}
  else if(x=take(/ (?:v |vo |na |budúci |budúcu |budúcu )?(pondelok|utorok|stredu|streda|štvrtok|piatok|sobotu|sobota|nedeľu|nedeľa) /)){const i=DNI.findIndex(p=>x[1].startsWith(p));d=new Date(now);let k=(i-d.getDay()+7)%7;if(k===0)k=7;d.setDate(d.getDate()+k)}
  if(!d&&(x=take(/ (\d{1,2})\s*(?:\.|\s)\s*(\d{1,2}|januára|februára|marca|apríla|mája|júna|júla|augusta|septembra|októbra|novembra|decembra)\.?(?:\s*(\d{4}))? /))){const mo=isNaN(+x[2])?MES.indexOf(x[2]):+x[2]-1;d=new Date(x[3]?+x[3]:now.getFullYear(),mo,+x[1]);if(d<new Date(now.getFullYear(),now.getMonth(),now.getDate()))d.setFullYear(d.getFullYear()+1)}
  if(x=take(/ o (\d{1,2})(?::| hodine? | h )?(\d{2})? (minút|minúty|hodín|hodiny|hodinu)? ?/)){if(x[3]&&/min/.test(x[3])){const z=new Date(now.getTime()+(+x[1])*6e4);d=z;h=z.getHours();m=z.getMinutes()}else if(x[3]&&/hod/.test(x[3])){const z=new Date(now.getTime()+(+x[1])*36e5);d=z;h=z.getHours();m=z.getMinutes()}else{h=+x[1];m=x[2]?+x[2]:0}}
  else if(x=take(/ o pol (\S+) /)){const n=NUM[x[1]];if(n){h=n-1;m=30}}
  else if(x=take(/ o (\S+?)(?: hodine)? /)){const n=NUM[x[1]];if(n){h=n;m=0}else{t=" "+x[0].trim()+t;used.pop()}}
  if(x=take(/ (ráno|zrána|skoro ráno) /)){if(h==null){h=8;m=0}}
  else if(x=take(/ (doobeda|dopoludnia|predpoludním) /)){if(h==null){h=9;m=0}}
  else if(x=take(/ (na obed|napoludnie|obed) /)){if(h==null){h=12;m=0}}
  else if(x=take(/ (poobede|popoludní|poobede) /)){if(h==null){h=14;m=0}else if(h<12)h+=12}
  else if(x=take(/ (večer|navečer) /)){if(h==null){h=18;m=0}else if(h<12)h+=12}
  if(h!=null&&h>=1&&h<=6&&!/ráno/.test(used.join(" ")))h+=12;
  if(x=take(/ (pripomeň|upozorni)(?: ma| mi)? (deň|den) (vopred|predtým) /))rem=[1440,60];
  else if(x=take(/ (pripomeň|upozorni)(?: ma| mi)? (hodinu|hoďku) (vopred|predtým) /))rem=[60];
  else if(x=take(/ (pripomeň|upozorni)(?: ma| mi)? (\d+) minút (vopred|predtým) /))rem=[+x[2]];
  let o=" "+String(raw||"").replace(/[,.!?]/g," ").replace(/\s+/g," ")+" ";
  for(const u of used){const w=u.trim().split(/\s+/).map(z=>z.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("\\s+");o=o.replace(new RegExp("(^|\\s)"+w+"(?=\\s|$)","i")," ")}
  const U="A-ZÁÄČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ";let place=null;
  if(x=o.match(new RegExp(" (?:v|vo|na|u) ((?:["+U+"][^ ]*)(?: ["+U+"][^ ]*){0,2})")))place=x[1];
  else if(x=o.match(/ (?:v|vo|na|u) (apd|pd|bps)( [^ ]+)?/i))place=(x[1].toUpperCase()+(x[2]||""));
  let title=o.replace(/\s+/g," ").trim().replace(/^(pripomeň mi|pripomeň|upozorni ma|zapíš|daj mi|mám)\s+/i,"");
  title=title.charAt(0).toUpperCase()+title.slice(1);
  return {d,time:h!=null?String(h).padStart(2,"0")+":"+String(m).padStart(2,"0"):null,rem,place,title}}
function applyVoice(txt,quiet){const f=document.getElementById("fCal");if(!f)return;const p=parseSk(txt);VO.heard=txt;
  const h=document.getElementById("clHeard");if(h)h.textContent=`🎤 „${txt}“`;
  if(p.title)f.title.value=p.title.slice(0,200);if(p.d)f.d.value=dkey(p.d);if(p.time){f.t.value=p.time;f.all_day.checked=false;f.t.disabled=false}
  if(p.place&&!f.place.value)f.place.value=p.place;if(!f.note.value||f.note.value.startsWith("🎤 "))f.note.value="🎤 "+txt;
  if(p.rem){f.querySelectorAll('[data-chg="rem"] .ftchip').forEach(b=>b.classList.toggle("on",p.rem.includes(+b.dataset.v)))}
  if(!quiet)toast_(`✓ Vyplnené: ${p.d?dayL(p.d):"dátum skontroluj"}${p.time?" o "+p.time:""}. Skontroluj a ulož.`,6000)}
const IOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
/* diktovanie cez klávesnicu telefónu – funguje na iPhone vždy (Safari, Chrome, aplikácia z plochy) */
function kbdMode(msg){const f=document.getElementById("fCal");if(!f)return;let tx=document.getElementById("clVoiceTx");
  if(!tx){tx=document.createElement("textarea");tx.id="clVoiceTx";tx.className="clvtx";tx.rows=3;tx.setAttribute("autocapitalize","sentences");tx.setAttribute("lang","sk");
    tx.placeholder="Ťukni na 🎤 na klávesnici a povedz pripomienku…";const h=document.getElementById("clHeard");(h||f.firstChild).after(tx);
    let tm=0;const go=q=>{const v=tx.value.trim();if(v.length>2)applyVoice(v,q)};
    tx.addEventListener("input",()=>{clearTimeout(tm);tm=setTimeout(()=>go(true),1200)});tx.addEventListener("blur",()=>{clearTimeout(tm);go(false)})}
  tx.hidden=false;tx.focus();const h=document.getElementById("clHeard");if(h)h.textContent=msg||"📱 Na klávesnici ťukni na 🎤 (mikrofón dole) a povedz napr. „V pondelok o ôsmej stretnutie v APD Malčice, poriešiť reklamáciu sóje“. Polia sa vyplnia samé, potom ťukni Uložiť."}
async function say(btn){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(SR_){try{SR_.stop()}catch(x){}return}
  if(!SR||IOS){kbdMode();return}
  if(say.wait)return;if(window.micReady){say.wait=1;btn.textContent="🎤 Povoľ mikrofón…";const ok=await micReady();say.wait=0;btn.textContent="🎤 Povedať";if(!ok){kbdMode("🎤 Mikrofón nie je povolený – kým ho povolíš, nadiktuj cez 🎤 na klávesnici.");return}}
  const r=new SR();r.lang="sk-SK";r.interimResults=true;r.continuous=false;let fin="",it="",got=false;SR_=r;btn.classList.add("on");btn.textContent="⏹ Počúvam… ťukni = koniec";
  const guard=setTimeout(()=>{if(!got&&SR_===r){try{r.abort()}catch(x){}}},7000);
  r.onresult=ev=>{got=true;it="";for(let i=ev.resultIndex;i<ev.results.length;i++){if(ev.results[i].isFinal)fin+=ev.results[i][0].transcript+" ";else it+=ev.results[i][0].transcript}const h=document.getElementById("clHeard");if(h)h.textContent="🎤 "+(fin+it)};
  r.onerror=ev=>{const m=window.srErr?srErr(ev.error):(ev.error==="not-allowed"||ev.error==="service-not-allowed"?"🎤 Mikrofón je zakázaný – použi mikrofón na klávesnici.":null);if(m)toast_(m,12000)};
  r.onend=()=>{clearTimeout(guard);SR_=null;btn.classList.remove("on");btn.textContent="🎤 Povedať";const t=(fin+" "+it).trim();
    if(t)applyVoice(t);else kbdMode("🎤 Nič som nezachytil. Na klávesnici ťukni na 🎤 a povedz pripomienku – polia sa vyplnia samé.")};
  try{r.start()}catch(x){clearTimeout(guard);SR_=null;btn.classList.remove("on");btn.textContent="🎤 Povedať";kbdMode()}}
document.addEventListener("change",e=>{if(e.target.id!=="clAudIn")return;const fl=e.target.files&&e.target.files[0];if(fl)attachAud(fl)});
async function attachAud(fl){
  if(fl.size>8*1024*1024){toast_("Hlasovka je príliš dlhá (max. 8 MB, cca 5–8 minút).",7000);return}
  const url=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.readAsDataURL(fl)});
  const f=document.getElementById("fCal");const keep=f?{title:f.title.value,d:f.d.value,t:f.t.value,place:f.place.value,note:f.note.value}:null;
  VO.aud={url,mime:fl.type||"audio/mp4",name:fl.name};renderStaff();
  const g=document.getElementById("fCal");if(g&&keep){g.title.value=keep.title||"🎙️ Hlasová pripomienka";g.d.value=keep.d;g.t.value=keep.t;g.place.value=keep.place;g.note.value=keep.note}
  toast_("🎙️ Hlasovka pripojená. Vyber dátum a čas a ulož – pripomienka príde do mobilu.",6000)}
async function play(id,btn){btn.disabled=true;try{const r=await sb.from("owner_cal_audio").select("data").eq("cal_id",+id).maybeSingle();if(!r.data){toast_("Hlasovka sa nenašla.");return}
  const a=document.createElement("audio");a.controls=true;a.autoplay=true;a.src=r.data.data;a.className="clplay";btn.replaceWith(a)}catch(x){toast_("Nepodarilo sa prehrať.")}finally{btn.disabled=false}}

/* ---------------- KAŽDÝ: 📅 Stretnutie ---------------- */
let U={open:false,slots:null,my:null,dur:30,topic:"",place:"Kancelária ERNTE",pick:null,busy:false,err:""};
async function uLoad(){U.err="";try{const [a,b,c]=await Promise.all([sb.rpc("meet_slots",{p_dur:U.dur,p_days:null}),sb.from("meet_req").select("*").order("start_at",{ascending:false}).limit(20),sb.rpc("meet_cfg")]);
  if(a.error)throw a.error;U.slots=(a.data||[]).sort((x,y)=>(y.pref-x.pref)||(new Date(x.start_at)-new Date(y.start_at)));U.all=a.data||[];U.my=b.data||[];U.cfg=c.data||{}}catch(x){U.err=/meet_slots/.test(x.message||"")?"Zapne sa po aktualizácii databázy (pár minút).":String(x.message||x)}uDraw()}
function uHTML(){const nm=(U.cfg&&U.cfg.name)||"Martin Vaľko";const my=(U.my||[]).filter(m=>new Date(m.end_at)>Date.now()-864e5);
  const best=(U.slots||[]).filter(s=>s.pref).slice(0,6);
  const TOP=[["Obchod / zmluva","🤝"],["Cena","💶"],["Odvoz / doprava","🚛"],["Platba / faktúra","🧾"],["Práca / tím","👥"],["Iné","💬"]];
  return `<div class="ftmod clu" role="dialog" aria-modal="true" aria-label="Stretnutie"><div class="ftbox">
   <div class="fthd"><div><small>📅 Stretnutie s majiteľom</small><b>${E(nm)} · ERNTE</b></div><button type="button" class="ftx" data-mtclose aria-label="Zavrieť">✕</button></div>
   ${my.length?`<div class="ftsec"><div class="ftst">Moje termíny</div>${my.map(m=>`<div class="clmy"><div><b>${E(dayL(m.start_at))} · ${hm(m.start_at)}</b><small>${E(m.topic)}${m.reply?" · 💬 "+E(m.reply):""}</small></div>${pill_(MSTU[m.status]||[m.status])}${["nova","potvrdena","presunuta"].includes(m.status)&&new Date(m.start_at)>Date.now()?`<button type="button" class="dng" data-mtcancel="${m.id}">Zrušiť</button>`:""}</div>`).join("")}</div>`:""}
   <div class="ftsec"><div class="ftst">1 · O čom</div><div class="ftchips">${TOP.map(t=>`<button type="button" class="ftchip${U.topic.startsWith(t[0])?" on":""}" data-mttop="${E(t[0])}">${t[1]} ${E(t[0])}</button>`).join("")}</div>
    <textarea id="mtTxt" rows="2" placeholder="Krátko napíšte, čo potrebujete (napr. cena repky na 200 t, nová zmluva…)">${E(U.txt||"")}</textarea></div>
   <div class="ftsec"><div class="ftst">2 · Kde a ako dlho</div><div class="ftchips">${["Kancelária ERNTE","Telefonicky","U mňa (na farme)","Online"].map(p=>`<button type="button" class="ftchip${U.place===p?" on":""}" data-mtplace="${E(p)}">${E(p)}</button>`).join("")}</div>
    <div class="ftchips">${[[30,"30 min"],[60,"1 hodina"]].map(d=>`<button type="button" class="ftchip${U.dur===d[0]?" on":""}" data-mtdur="${d[0]}">${d[1]}</button>`).join("")}</div></div>
   <div class="ftsec"><div class="ftst">3 · Vyberte voľný termín</div>
    ${U.err?`<div class="s">${E(U.err)}</div>`:U.slots===null?`<div class="s">Hľadám voľné termíny…</div>`:`
     ${best.length?`<div class="s">⭐ Odporúčané (najlepšie sa mu hodí ${E((U.cfg&&U.cfg.pref_from)??8)}:00–${E((U.cfg&&U.cfg.pref_to)??13)}:00):</div><div class="clsl">${best.map(s=>`<button type="button" class="clsb pref${U.pick===s.start_at?" on":""}" data-mtpick="${E(s.start_at)}">⭐ ${E(new Date(s.start_at).toLocaleDateString("sk-SK",{timeZone:TZ,weekday:"short",day:"numeric",month:"numeric"}))} · ${hm(s.start_at)}</button>`).join("")}</div>`:""}
     <details${best.length?"":" open"}><summary>Všetky voľné termíny</summary>${slotsHTML(U.all||[],"data-mtpick",null)}</details>`}
   </div>
   <div class="ftbtns"><button type="button" class="pri" data-mtsend${U.pick?"":" disabled"}>📩 ${U.pick?`Poslať žiadosť na ${E(dayL(U.pick))} ${hm(U.pick)}`:"Vyberte termín"}</button></div>
   <div class="s">Termín je rezervovaný, kým ho ${E(nm)} nepotvrdí. Stav uvidíte tu (📅 Stretnutie).</div></div></div>`}
function uDraw(){document.querySelectorAll(".clu").forEach(x=>x.remove());if(!U.open)return;const sc=0;document.body.insertAdjacentHTML("beforeend",uHTML());document.documentElement.classList.add("ftlock");
  const m=document.querySelector(".clu");m.addEventListener("click",e=>{if(e.target===m){U.open=false;uDraw();document.documentElement.classList.remove("ftlock")}});document.querySelectorAll(".clu [data-mtpick]").forEach(b=>b.classList.toggle("on",b.dataset.mtpick===U.pick))}
function uOpen(){U.open=true;U.slots=null;U.pick=null;uDraw();uLoad()}
function uClose(){U.open=false;uDraw();document.documentElement.classList.remove("ftlock")}
function btn(){if(!logged()||MAIN()||window.ERNTE_VIEWAS)return;const app=document.getElementById("app");if(!app)return;const r=app.querySelector(".hrow");if(!r||r.querySelector("[data-mtopen]"))return;
  r.insertAdjacentHTML("afterbegin",`<button type="button" class="mtbtn" data-mtopen title="Dohodnúť stretnutie">📅 Stretnutie</button>`)}

/* ---------------- udalosti ---------------- */
document.addEventListener("input",e=>{if(e.target.id==="mtTxt")U.txt=e.target.value});
document.addEventListener("click",async e=>{const t=e.target;if(!t.closest)return;let x;
  if(t.closest("[data-mtopen]")){uOpen();return}
  if(t.closest("[data-mtclose]")){uClose();return}
  if(x=t.closest("[data-mttop]")){U.topic=x.dataset.mttop;uDraw();return}
  if(x=t.closest("[data-mtplace]")){U.place=x.dataset.mtplace;uDraw();return}
  if(x=t.closest("[data-mtdur]")){U.dur=+x.dataset.mtdur;U.pick=null;U.slots=null;uDraw();uLoad();return}
  if(x=t.closest("[data-mtpick]")){U.pick=x.dataset.mtpick;uDraw();const s=document.querySelector("[data-mtsend]");if(s)s.scrollIntoView({block:"nearest",behavior:"smooth"});return}
  if(t.closest("[data-mtsend]")){if(!U.pick)return;const topic=[U.topic,(U.txt||"").trim()].filter(Boolean).join(": ");if(!topic){toast_("Napíšte, o čom chcete hovoriť.");return}
    const b=t.closest("[data-mtsend]");b.disabled=true;const r=await sb.rpc("meet_ask",{p_start:U.pick,p_dur:U.dur,p_topic:topic,p_place:U.place,p_alt:[]});b.disabled=false;
    if(r.error){toast_("⚠️ "+r.error.message,7000);U.pick=null;uLoad();return}
    toast_("✓ Žiadosť odoslaná. Keď ju potvrdí, uvidíte to v 📅 Stretnutie.",6000);U.txt="";U.topic="";U.pick=null;uLoad();return}
  if(x=t.closest("[data-mtcancel]")){if(!confirm("Zrušiť tento termín?"))return;const r=await sb.rpc("meet_cancel",{p_id:+x.dataset.mtcancel});if(r.error)toast_("⚠️ "+r.error.message);else toast_("Termín zrušený.");uLoad();return}
  if(!MAIN())return;
  if(x=t.closest("[data-clsay]")){say(x);return}
  if(t.closest("[data-clrec]")){if(window.micCanRecord&&micCanRecord()){micRecord(480).then(f=>{if(f)attachAud(f)});return}const i=document.getElementById("clAudIn");if(i){i.value="";i.click()}return}
  if(t.closest("[data-claudx]")){VO.aud=null;renderStaff();return}
  if(x=t.closest("[data-clplay]")){play(x.dataset.clplay,x);return}
  if(t.closest("[data-clnew]")){VO={heard:"",aud:null};C.form="new";renderStaff();scrollTo(0,0);return}
  if(t.closest("[data-clclose]")){C.form=null;VO={heard:"",aud:null};renderStaff();return}
  if(x=t.closest("[data-clack]")){const r=await sb.rpc("cal_ack_ev",{p_id:+x.dataset.clack});if(r.error)toast_("⚠️ "+r.error.message);else{C.ring=(C.ring||[]).filter(i=>i!==+x.dataset.clack);toast_("✓ Beriem na vedomie – zvonenie stíchlo.");renderStaff()}return}
  if(x=t.closest("[data-cledit]")){C.form=x.dataset.cledit;renderStaff();scrollTo(0,0);return}
  if(x=t.closest("[data-clday]")){const f=x.closest("form");f.d.value=dkey(Date.now()+(+x.dataset.clday)*864e5);return}
  if(x=t.closest("[data-chg] .ftchip")){const g=x.closest("[data-chg]");if(g.hasAttribute("data-multi"))x.classList.toggle("on");else g.querySelectorAll(".ftchip").forEach(b=>b.classList.toggle("on",b===x));return}
  if(x=t.closest("[data-cldone]")){const ev=C.ev.find(e=>String(e.id)===x.dataset.cldone);const r=await sb.from("owner_cal").update({done:!ev.done}).eq("id",ev.id);if(r.error)toast_("⚠️ "+r.error.message);else{ev.done=!ev.done;renderStaff()}return}
  if(x=t.closest("[data-cldel]")){if(!confirm("Zmazať pripomienku?"))return;const r=await sb.from("owner_cal").delete().eq("id",+x.dataset.cldel);if(r.error)toast_("⚠️ "+r.error.message);else{C.form=null;load(true)}return}
  if(x=t.closest("[data-mrok]")){const r=await sb.rpc("meet_decide",{p_id:+x.dataset.mrok,p_act:"ok",p_reply:null,p_start:null});if(r.error)toast_("⚠️ "+r.error.message);else toast_("✓ Potvrdené – je v kalendári, pripomeniem deň a hodinu vopred.");load(true);return}
  if(x=t.closest("[data-mrno]")){const why=prompt("Dôvod / správa pre neho (nepovinné):","");if(why===null)return;const r=await sb.rpc("meet_decide",{p_id:+x.dataset.mrno,p_act:"no",p_reply:why||null,p_start:null});if(r.error)toast_("⚠️ "+r.error.message);load(true);return}
  if(x=t.closest("[data-mrmove]")){const id=+x.dataset.mrmove;C.move=C.move===id?null:id;C.slots=null;renderStaff();if(C.move){const m=C.mr.find(q=>q.id===id);const r=await sb.rpc("meet_slots",{p_dur:Math.round((new Date(m.end_at)-new Date(m.start_at))/6e4),p_days:null});C.slots=r.data||[];renderStaff()}return}
  if(x=t.closest("[data-mrto]")){const msg=(document.getElementById("mrMsg")||{}).value||null;const r=await sb.rpc("meet_decide",{p_id:+x.dataset.id,p_act:"move",p_reply:msg,p_start:x.dataset.mrto});if(r.error)toast_("⚠️ "+r.error.message);else toast_("✓ Presunuté a potvrdené.");C.move=null;load(true);return}
});
document.addEventListener("submit",async e=>{const f=e.target;if(f.id==="fCal"){e.preventDefault();e.stopPropagation();if(!MAIN())return;
    const on=n=>[...f.querySelectorAll(`[data-chg="${n}"] .ftchip.on`)].map(b=>b.dataset.v);const all=f.all_day.checked;
    const st=new Date(`${f.d.value}T${all?"08:00":(f.t.value||"09:00")}:00`);const dur=+(on("dur")[0]||30);
    const row={title:f.title.value.trim(),kind:on("kind")[0]||"pripomienka",start_at:st.toISOString(),end_at:new Date(st.getTime()+dur*6e4).toISOString(),all_day:all,
      remind_min:on("rem").map(Number).sort((a,b)=>b-a),reminded:[],rep:on("rep")[0]||null,place:f.place.value.trim()||null,note:f.note.value.trim()||null};
    {const w=(f.who&&f.who.value||"").trim(),ph=(f.phone&&f.phone.value||"").trim(),old=f.dataset.id?C.ev.find(x=>String(x.id)===f.dataset.id):null;
     if(w||(old&&old.who))row.who=w||null;if(ph||(old&&old.phone))row.phone=ph||null}
    if(!row.title)return;const id=f.dataset.id;const b=f.querySelector("[type=submit]");b.disabled=true;
    const r=id?await sb.from("owner_cal").update(row).eq("id",+id).select("id").single():await sb.from("owner_cal").insert(row).select("id").single();b.disabled=false;
    if(r.error){toast_("⚠️ "+r.error.message,7000);return}
    if(VO.aud&&r.data){const a=await sb.from("owner_cal_audio").upsert({cal_id:r.data.id,mime:VO.aud.mime,data:VO.aud.url});if(a.error)toast_("Hlasovka sa neuložila: "+a.error.message,7000)}
    VO={heard:"",aud:null};C.form=null;toast_(row.kind==="blok"&&!row.remind_min.length?"✓ Uložené.":"✓ Uložené – zazvoním deň vopred o 18:00, 1 h a 15 min pred začiatkom.");load(true);return}
  if(f.id==="fCalCfg"){e.preventDefault();e.stopPropagation();if(!MAIN())return;const n=k=>+f[k].value;
    const p={pref_from:n("pref_from"),pref_to:n("pref_to"),work_from:n("work_from"),work_to:n("work_to"),min_hours:n("min_hours"),horizon:n("horizon"),days:[...f.querySelectorAll('[data-chg="days"] .ftchip.on')].map(b=>+b.dataset.v)};
    if(p.pref_to<=p.pref_from||p.work_to<=p.work_from){toast_("Čas „do“ musí byť neskôr ako „od“.");return}
    const r=await sb.rpc("meet_cfg_set",{p});if(r.error)toast_("⚠️ "+r.error.message);else{C.cfg=r.data;toast_("✓ Uložené.")}return}},true);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&U.open)uClose()});
document.addEventListener("change",e=>{if(e.target.name==="all_day"&&e.target.form&&e.target.form.id==="fCal")e.target.form.t.disabled=e.target.checked});

function css(){if(document.getElementById("clcss"))return;const s=document.createElement("style");s.id="clcss";s.textContent=`
.clhd{display:flex;justify-content:space-between;align-items:flex-end;gap:10px}.clhd small{color:var(--muted);font-size:.78rem}.clhd .pri{min-height:48px}
.cld{display:grid;gap:2px;padding:12px 14px!important}.cldh{font-weight:700;letter-spacing:-.01em;text-transform:capitalize;margin-bottom:4px}
.clev{display:grid;grid-template-columns:62px 1fr auto;gap:10px;align-items:start;padding:10px 0;border-top:1px solid var(--line)}.cld .clev:first-of-type{border-top:0}
.clev.done{opacity:.5}.clev.done b{text-decoration:line-through}.clt{font-weight:700;font-variant-numeric:tabular-nums;font-size:1.02rem}.clt small{display:block;color:var(--muted);font-weight:500;font-size:.76rem}
.clev.stretnutie .clt{color:#67e8f9}.clev.blok .clt{color:#fca5a5}.clb{display:grid;gap:2px;min-width:0}.clb small{color:var(--muted);font-size:.8rem;overflow-wrap:anywhere}.clb .cln{white-space:pre-line}
.cla{display:flex;gap:6px}.cla button{width:42px;height:42px;min-height:42px;padding:0;border-radius:12px}
.clreq{display:grid;gap:8px;padding:14px;border-radius:20px;border:1px solid rgba(251,191,36,.45);background:linear-gradient(150deg,rgba(251,191,36,.12),rgba(255,255,255,.03));margin-bottom:10px}
.clreq.potvrdena,.clreq.presunuta{border-color:rgba(52,211,153,.4);background:rgba(52,211,153,.06)}.clreq.zamietnuta,.clreq.zrusena{opacity:.7;border-color:var(--line)}
.clrh{display:grid;grid-template-columns:40px 1fr auto;gap:10px;align-items:center}.clrh small{display:block;color:var(--muted);font-size:.76rem}.clrt{font-size:.92rem}.clrq{font-size:.92rem}
.clmv{display:grid;gap:8px}.clsd{display:grid;gap:6px;margin-top:8px}.clsd>small{color:var(--muted);text-transform:capitalize;font-weight:600}
.clsl{display:flex;flex-wrap:wrap;gap:6px}.clsb{min-height:42px;padding:0 12px;border-radius:12px;font-size:.88rem;font-variant-numeric:tabular-nums}
.clsb.pref{border-color:rgba(52,211,153,.55)!important;background:linear-gradient(135deg,rgba(52,211,153,.18),rgba(34,211,238,.08))!important}
.clsb.on{background:linear-gradient(135deg,#22d3ee,#8b5cf6)!important;color:#fff!important;border-color:transparent!important}
.clf{display:grid;gap:10px}.clf label{display:grid;gap:4px;font-size:.84rem;color:var(--muted)}.clrow{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.clf .clck{display:flex!important;flex-direction:row;align-items:center;gap:8px;color:var(--ink)}.clf .clck input{width:22px;height:22px;min-height:0}
.clcfg summary,.card>summary{cursor:pointer;font-weight:700}.clcf{display:grid;gap:10px;margin-top:10px}.clcf label{display:grid;gap:4px;font-size:.84rem;color:var(--muted)}
.clmy{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:8px 0;border-top:1px solid var(--line)}.clmy:first-of-type{border-top:0}.clmy small{display:block;color:var(--muted);font-size:.78rem}
.clvo{display:grid;grid-template-columns:1fr 1fr;gap:8px}.clvb{min-height:56px!important;font-size:1rem!important;border-color:rgba(34,211,238,.45)!important;background:linear-gradient(135deg,rgba(34,211,238,.16),rgba(139,92,246,.14))!important}
.clvb.on{background:linear-gradient(135deg,#ef4444,#f97316)!important;color:#fff!important}.clvtx{width:100%;margin-top:8px;font-size:16px;border-radius:14px;padding:10px 12px}.clvh{font-style:italic}
.claud{display:flex;align-items:center;gap:8px}.claud audio,.clplay{width:100%;max-width:420px;height:40px}.clpb{justify-self:start;min-height:36px!important;padding:0 12px!important;font-size:.8rem!important;margin:4px 0}
.mtbtn{min-height:40px;padding:0 14px;border-radius:999px;font-size:.84rem;border-color:rgba(34,211,238,.45)!important;background:linear-gradient(135deg,rgba(34,211,238,.16),rgba(139,92,246,.12))!important}
.clu textarea{width:100%;margin-top:6px}
html[data-theme=light] .clev.stretnutie .clt{color:#0e7490}html[data-theme=light] .clev.blok .clt{color:#b91c1c}`;document.head.appendChild(s)}
function tick(){css();btn()}
let q=0;const sched=()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;try{tick()}catch(x){}})};
function start(){const app=document.getElementById("app");if(!app){setTimeout(start,300);return}new MutationObserver(sched).observe(app,{childList:true});sched();
  setTimeout(()=>{if(MAIN())load(true)},3000);setInterval(()=>{if(MAIN())load(false)},60e3)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
