// ===== ERNTE · TERMÍNY A POVINNOSTI: odoslať správu alebo PDF =====
// Pri každej povinnosti: 💬 Poslať správu (WhatsApp, e-mail… cez menu telefónu) a 📄 PDF (upozornenie s logom).
// Údaje berie z hub.js (window.ERNTE_DUE). Nič sa neukladá na server.
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const say=(t,ms)=>{if(typeof toast==="function")toast(t,ms||4000)};
const dSK=d=>new Date(d+"T12:00:00").toLocaleDateString("sk-SK",{day:"numeric",month:"numeric",year:"numeric"});
const left=d=>Math.round((new Date(d+"T00:00:00")-new Date(new Date().toDateString()))/864e5);
const leftTxt=n=>n<0?"už platí":n===0?"dnes":n===1?"zajtra":`o ${n} dní`;
// čo treba urobiť – podľa typu povinnosti (všeobecné kroky, konkrétny postup over s účtovníčkou / právnikom)
function todo(t){const s=String(t).toLowerCase();
  if(s.includes("eudr"))return ["Zistiť, ktoré dodávky sóje (a iných komodít EUDR) sa týkajú ERNTE.","Od dodávateľov zbierať geolokáciu pozemkov a vyhlásenia o pôvode.","Pripraviť vyhlásenie o náležitej starostlivosti (due diligence) pred vývozom alebo uvedením na trh.","Overiť postup a registráciu v informačnom systéme EÚ."];
  if(s.includes("e-faktúr")||s.includes("peppol"))return ["Overiť s účtovníčkou a dodávateľom softvéru (KROS), že vie posielať a prijímať e-faktúry cez Peppol.","Zaregistrovať ERNTE aj VALKO u poskytovateľa Peppol (prístupový bod).","Vyžiadať od odberateľov a dodávateľov ich Peppol identifikátor.","Otestovať prvé e-faktúry pred termínom."];
  if(s.includes("mýt"))return ["Zistiť harmonogram výmeny palubných jednotiek pre vozidlá VALKO.","Skontrolovať zmluvu s poskytovateľom mýta a platobné karty.","Naplánovať výmenu jednotiek tak, aby autá nestáli."];
  if(s.includes("efti")||s.includes("ecmr"))return ["Pripraviť sa na elektronické prepravné doklady (eCMR).","Overiť s dopravcami a odberateľmi, či eCMR prijímajú.","Vybrať certifikovanú eFTI platformu."];
  return ["Overiť, čo presne povinnosť znamená pre ERNTE a VALKO.","Určiť zodpovednú osobu a termín prípravy."]}
function text(d){const n=left(d[0]),T=todo(d[2]);
  return `📅 *Termín a povinnosť – ERNTE · VALKO*\n\n${d[1]} *${d[2]}*\n🗓️ Termín: *${dSK(d[0])}* (${leftTxt(n)})\n📜 ${d[3]}\n\n*Čo treba urobiť:*\n${T.map((x,i)=>`${i+1}. ${x}`).join("\n")}\n\nKonkrétny postup prosím overte s účtovníčkou alebo právnikom.\n\n👉 ERNTE Trade & Logistic: ${typeof APP_URL!=="undefined"?APP_URL:location.href.split("#")[0]}`}
async function shareText(d){const t=text(d);
  if(navigator.share){try{await navigator.share({text:t});return}catch(x){if(x&&x.name==="AbortError")return}}
  location.href="https://wa.me/?text="+encodeURIComponent(t)}
// ---------- PDF (A4, logo, termín, kroky) ----------
const img=src=>new Promise(ok=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>ok(null);i.src=src});
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function wrap(g,t,maxW){const out=[];let line="";for(const w of String(t).split(/\s+/).filter(Boolean)){const tt=line?line+" "+w:w;if(g.measureText(tt).width>maxW&&line){out.push(line);line=w}else line=tt}if(line)out.push(line);return out}
async function draw(d){try{await Promise.all(['600 40px "Sora"','400 30px "Inter"','700 30px "Inter"'].map(f=>document.fonts.load(f)))}catch(x){}
  const W=1240,H=1754,P=96,logo=await img("logo.png"),cv=document.createElement("canvas");cv.width=W;cv.height=H;const g=cv.getContext("2d");
  g.fillStyle="#fff";g.fillRect(0,0,W,H);const gr=g.createLinearGradient(0,0,W,0);gr.addColorStop(0,"#0B1510");gr.addColorStop(1,"#1F4A2A");g.fillStyle=gr;g.fillRect(0,0,W,250);
  g.fillStyle="#F3F1EA";rr(g,P,64,230,122,24);g.fill();if(logo){const ih=92,iw=logo.width*ih/logo.height;g.drawImage(logo,P+(230-iw)/2,79,iw,ih)}
  g.fillStyle="#B6FF3B";g.font='700 26px "Inter",sans-serif';g.fillText("TERMÍNY A POVINNOSTI",P+270,112);g.fillStyle="#fff";g.font='600 44px "Sora",sans-serif';g.fillText("Upozornenie na povinnosť",P+270,166);
  g.fillStyle="#C9D6CC";g.font='400 24px "Inter",sans-serif';g.fillText("ERNTE spol. s r.o. · VALKO · vytvorené "+new Date().toLocaleDateString("sk-SK"),P+270,206);
  let y=340;const n=left(d[0]);
  g.fillStyle="#14231B";g.font='600 50px "Sora",sans-serif';for(const l of wrap(g,d[2],W-P*2)){g.fillText(l,P,y);y+=66}
  y+=24;const bw=W-P*2,col=n<=30?"#C0392B":n<=90?"#B7791F":"#2F6B3A";
  rr(g,P,y,bw,150,26);g.fillStyle=n<=30?"#FDECEA":n<=90?"#FFF5E1":"#EEF6DC";g.fill();g.strokeStyle=col;g.lineWidth=3;g.stroke();
  g.fillStyle=col;g.font='700 26px "Inter",sans-serif';g.fillText("TERMÍN",P+40,y+56);g.fillStyle="#14231B";g.font='600 56px "Sora",sans-serif';g.fillText(dSK(d[0]),P+40,y+120);
  g.textAlign="right";g.fillStyle=col;g.font='700 44px "Sora",sans-serif';g.fillText(leftTxt(n),P+bw-40,y+100);g.textAlign="left";y+=200;
  g.fillStyle="#56655B";g.font='700 24px "Inter",sans-serif';g.fillText("PRÁVNY ZÁKLAD / TÝKA SA",P,y);y+=44;g.fillStyle="#14231B";g.font='400 32px "Inter",sans-serif';for(const l of wrap(g,d[3],W-P*2)){g.fillText(l,P,y);y+=44}
  y+=40;g.fillStyle="#56655B";g.font='700 24px "Inter",sans-serif';g.fillText("ČO TREBA UROBIŤ",P,y);y+=30;
  todo(d[2]).forEach((t,i)=>{y+=20;g.fillStyle="#EEF6DC";rr(g,P,y,64,64,16);g.fill();g.fillStyle="#2F6B3A";g.font='600 34px "Sora",sans-serif';g.textAlign="center";g.fillText(String(i+1),P+32,y+45);g.textAlign="left";
    g.fillStyle="#14231B";g.font='400 31px "Inter",sans-serif';let yy=y+42;for(const l of wrap(g,t,W-P*2-100)){g.fillText(l,P+96,yy);yy+=42}y=Math.max(y+64,yy-20)+16});
  y+=40;rr(g,P,y,W-P*2,110,20);g.fillStyle="#F4F6F1";g.fill();g.fillStyle="#56655B";g.font='400 26px "Inter",sans-serif';let yy=y+46;
  for(const l of wrap(g,"Kroky sú orientačné. Konkrétny postup a termíny prosím overte s účtovníčkou, daňovým poradcom alebo právnikom.",W-P*2-60)){g.fillText(l,P+30,yy);yy+=36}
  g.fillStyle="#9CC72A";g.fillRect(0,H-90,W,4);g.fillStyle="#14231B";g.font='600 24px "Inter",sans-serif';g.fillText("ERNTE Trade & Logistic · Zbudza 141 · +421 918 449 991",P,H-44);
  return {cv,link:{x:P,y:64,w:230,h:122}}}
async function sendPdf(d,btn){const lab=btn&&btn.textContent;if(btn){btn.disabled=true;btn.textContent="Pripravujem…"}
  try{const {cv,link}=await draw(d);const url=typeof APP_URL!=="undefined"?APP_URL:location.href.split("#")[0];
    const blob=window.inviteCardPdf?inviteCardPdf(cv,link,url):await new Promise(r=>cv.toBlob(r,"image/png"));
    const name="ERNTE-povinnost-"+d[0]+"-"+String(d[2]).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Za-z0-9]+/g,"-").slice(0,40).replace(/-$/,"")+(window.inviteCardPdf?".pdf":".png");
    const file=new File([blob],name,{type:blob.type});
    if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:d[2]});return}catch(x){if(x&&x.name==="AbortError")return}}
    const a=document.createElement("a"),u=URL.createObjectURL(file);a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),6e4);say("PDF uložené – pošlite ho cez WhatsApp ako dokument.",5000)}
  catch(x){say("PDF sa nepodarilo pripraviť.")}finally{if(btn){btn.disabled=false;btn.textContent=lab}}}
// ---------- komu: pamätá si príjemcov a históriu odoslaní (v tomto zariadení) ----------
const HK="ernte-due-sent",RK="ernte-due-people";
const ld=k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch(x){return null}},sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(x){}};
const hist=()=>ld(HK)||{},people=()=>ld(RK)||[];
const idOf=d=>d[0]+"|"+String(d[2]).slice(0,40);
const telOf=v=>{let t=String(v||"").replace(/[^\d+]/g,"");if(!t)return "";if(t.startsWith("+"))return t.slice(1);if(t.startsWith("00"))return t.slice(2);if(t.startsWith("0"))return "421"+t.slice(1);return t};
const isMail=v=>/@/.test(String(v||""))&&!/@tel\.ernte\.sk$/.test(v);
function team(){const L=(typeof STATE!=="undefined"&&STATE.staff)||[];return L.filter(p=>p.role!=="owner").map(p=>{const em=String(p.email||""),tel=p.phone||(em.endsWith("@tel.ernte.sk")?"+"+em.split("@")[0]:"");return {n:p.name,c:tel||(isMail(em)?em:""),t:"tím"}}).filter(p=>p.c)}
function log(d,r,how,kind){const H=hist(),k=idOf(d);(H[k]=H[k]||[]).unshift({n:r.n,c:r.c,how,kind,at:new Date().toISOString()});H[k]=H[k].slice(0,30);sv(HK,H);
  const P=people().filter(p=>!(p.n===r.n&&p.c===r.c));P.unshift({n:r.n,c:r.c});sv(RK,P.slice(0,30));if(typeof renderStaff==="function")renderStaff()}
const dt=x=>new Date(x).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"});
const HOW={wa:"WhatsApp",sms:"SMS",mail:"e-mail",share:"menu telefónu"};
window.dueBtns=i=>{const d=(window.ERNTE_DUE||[])[i];const H=d?(hist()[idOf(d)]||[]):[];
  return `<div class="btns duebtns"><button type="button" class="lime" data-duemsg="${i}">💬 Poslať správu</button><button type="button" data-duepdf="${i}">📄 Poslať PDF</button></div>${H.length?`<details class="duehist"><summary>✓ Odoslané ${H.length}× · naposledy ${e(H[0].n)} (${e(dt(H[0].at))})</summary>${H.map(h=>`<div>${h.kind==="pdf"?"📄":"💬"} <b>${e(h.n)}</b> · ${e(HOW[h.how]||h.how)} · ${e(dt(h.at))}</div>`).join("")}</details>`:""}`};
let PK=null;
function picker(i,kind){const d=(window.ERNTE_DUE||[])[i];if(!d)return;if(typeof loadTeam==="function"&&typeof STATE!=="undefined"&&!STATE.staff)loadTeam().then(()=>{if(PK)paint()});
  PK={i,kind,d,sel:null,q:""};paint()}
function cands(){const H=hist()[idOf(PK.d)]||[],seen=new Set(),out=[];const add=(r,tag)=>{const k=r.n+"|"+r.c;if(seen.has(k)||!r.c)return;seen.add(k);out.push({...r,tag})};
  H.forEach(h=>add({n:h.n,c:h.c},"✓ už dostal"));people().forEach(p=>add(p,"naposledy"));team().forEach(p=>add(p,"tím"));return out}
function paint(){let o=document.getElementById("duePk");if(!PK){if(o)o.remove();return}if(!o){o=document.createElement("div");o.id="duePk";o.className="duepk";document.body.appendChild(o);o.addEventListener("click",ev=>{if(ev.target===o){PK=null;paint()}})}
  const C=cands(),q=PK.q.toLowerCase(),L=C.filter(r=>!q||(r.n+" "+r.c).toLowerCase().includes(q)),H=hist()[idOf(PK.d)]||[];
  o.innerHTML=`<div class="duepb" role="dialog" aria-modal="true" aria-label="Komu poslať"><div class="duehd"><b>${PK.kind==="pdf"?"📄 Poslať PDF":"💬 Poslať správu"} – komu?</b><button type="button" class="duex" data-duex aria-label="Zavrieť">✕</button></div>
   <div class="s">${PK.d[1]} ${e(PK.d[2])}</div>
   ${H.length?`<div class="duesent">✓ Už odoslané: ${[...new Set(H.map(h=>h.n))].map(e).join(", ")}</div>`:""}
   <input class="dueq" id="dueQ" type="search" placeholder="🔎 Hľadať meno alebo číslo…" value="${e(PK.q)}">
   <div class="duel">${L.length?L.map((r,k)=>`<button type="button" class="duer" data-duepick="${C.indexOf(r)}"><span><b>${e(r.n)}</b><small>${e(r.c)}</small></span><em>${e(r.tag)}</em></button>`).join(""):`<div class="s">Zatiaľ nikto uložený – pridaj príjemcu nižšie. Aplikácia si ho zapamätá.</div>`}</div>
   <form class="duenew" id="dueNew"><b>➕ Nový príjemca</b><input name="n" placeholder="Meno (napr. Janka – účtovníčka)" required><input name="c" placeholder="Mobil alebo e-mail" required inputmode="email" autocapitalize="off"><button type="submit" class="lime">Pokračovať</button></form>
   <button type="button" class="dueany" data-dueany>Bez výberu – otvoriť menu telefónu</button></div>`;
  const qi=o.querySelector("#dueQ");qi.addEventListener("input",()=>{PK.q=qi.value;const p=qi.selectionStart;paint();const n=document.getElementById("dueQ");n.focus();n.setSelectionRange(p,p)})}
function how(r){const o=document.getElementById("duePk");const tel=telOf(r.c),mail=isMail(r.c);
  o.querySelector(".duepb").innerHTML=`<div class="duehd"><b>Poslať: ${e(r.n)}</b><button type="button" class="duex" data-duex aria-label="Zavrieť">✕</button></div><div class="s">${e(r.c)}</div>
   ${PK.kind==="pdf"?`<div class="s">PDF sa otvorí v menu telefónu – vyber WhatsApp alebo e-mail a ${e(r.n)}. Zapíše sa, že si ho poslal.</div><button type="button" class="lime duego" data-duehow="share">📄 Pripraviť a odoslať PDF</button>`
   :`${tel&&!mail?`<button type="button" class="lime duego" data-duehow="wa">🟢 WhatsApp priamo ${e(r.n)}</button><button type="button" class="duego" data-duehow="sms">✉️ SMS</button>`:""}${mail?`<button type="button" class="lime duego" data-duehow="mail">📧 E-mail</button>`:""}<button type="button" class="duego" data-duehow="share">📤 Iné (menu telefónu)</button>`}
   <button type="button" class="dueany" data-dueback>← späť na výber</button>`;PK.sel=r}
async function go(h,btn){const r=PK.sel,d=PK.d,t=text(d),tel=telOf(r.c);
  if(PK.kind==="pdf"){const k=PK;PK=null;paint();await sendPdf(d,btn);log(d,r,"share","pdf");return}
  if(h==="wa"){window.open("https://wa.me/"+tel+"?text="+encodeURIComponent(t),"_blank")}
  else if(h==="sms"){location.href="sms:+"+tel+"?&body="+encodeURIComponent(t)}
  else if(h==="mail"){location.href="mailto:"+encodeURIComponent(r.c)+"?subject="+encodeURIComponent("Termín: "+d[2])+"&body="+encodeURIComponent(t.replace(/\*/g,""))}
  else{try{await navigator.share({text:t})}catch(x){if(x&&x.name==="AbortError")return}}
  log(d,r,h,"msg");PK=null;paint();say("✓ Zapísané: "+r.n)}
{const s=document.createElement("style");s.textContent=`.duehist{margin-top:6px;font-size:.8rem;opacity:.85}.duehist summary{cursor:pointer;color:var(--ok,#7ee787);list-style:none}.duehist summary::-webkit-details-marker{display:none}.duehist div{padding:3px 0}
.duepk{position:fixed;inset:0;z-index:10060;background:rgba(0,0,0,.66);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center}@media(min-width:700px){.duepk{align-items:center}}
.duepb{width:min(560px,100%);max-height:90vh;overflow:auto;display:grid;gap:10px;padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px));border-radius:24px 24px 0 0;background:linear-gradient(160deg,rgba(28,34,46,.98),rgba(12,16,24,.99));border:1px solid rgba(255,255,255,.16);color:#eef2f7}@media(min-width:700px){.duepb{border-radius:24px}}
html[data-theme=light] .duepb{background:#fff;color:#0f172a}.duehd{display:flex;justify-content:space-between;align-items:center;gap:10px}.duex{min-height:40px;min-width:40px;padding:0;border-radius:50%}
.duesent{font-size:.85rem;color:#7ee787}.dueq,.duenew input{width:100%;min-height:48px;font-size:16px;border-radius:14px;padding:0 14px}
.duel{display:grid;gap:6px}.duer{display:flex;justify-content:space-between;align-items:center;gap:10px;text-align:left;min-height:56px;padding:8px 14px;border-radius:14px;width:100%}.duer b{display:block}.duer small{opacity:.7}.duer em{font-style:normal;font-size:.72rem;opacity:.75;white-space:nowrap}
.duenew{display:grid;gap:8px;padding:12px;border-radius:16px;border:1px dashed rgba(255,255,255,.2)}.duego{min-height:52px;width:100%;font-weight:700}.dueany{min-height:44px;background:none;border:0;opacity:.8;text-decoration:underline}`;document.head.appendChild(s)}
{const s=document.createElement("style");s.textContent=`.duebtns{margin-top:6px;gap:8px}.duebtns button{min-height:40px;padding:0 14px;font-size:.85rem}`;document.head.appendChild(s)}
document.addEventListener("click",ev=>{const g=s=>ev.target.closest&&ev.target.closest(s);let b;
  if(b=g("[data-duemsg],[data-duepdf]")){ev.preventDefault();ev.stopPropagation();picker(+(b.dataset.duemsg??b.dataset.duepdf),b.dataset.duemsg!=null?"msg":"pdf");return}
  if(!PK)return;
  if(g("[data-duex]")){PK=null;paint();return}
  if(g("[data-dueback]")){paint();return}
  if(b=g("[data-duepick]")){how(cands()[+b.dataset.duepick]);return}
  if(b=g("[data-duehow]")){go(b.dataset.duehow,b);return}
  if(g("[data-dueany]")){const d=PK.d,k=PK.kind;PK=null;paint();if(k==="pdf")sendPdf(d,null);else shareText(d);return}},true);
document.addEventListener("submit",ev=>{if(ev.target.id!=="dueNew")return;ev.preventDefault();const f=new FormData(ev.target),r={n:String(f.get("n")||"").trim(),c:String(f.get("c")||"").trim()};if(!r.n||!r.c)return;
  const P=people().filter(p=>!(p.n===r.n&&p.c===r.c));P.unshift(r);sv(RK,P.slice(0,30));how(r)},true);
window.dueText=text;
})();
