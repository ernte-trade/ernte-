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
window.dueBtns=i=>`<div class="btns duebtns"><button type="button" class="lime" data-duemsg="${i}">💬 Poslať správu</button><button type="button" data-duepdf="${i}">📄 Poslať PDF</button></div>`;
{const s=document.createElement("style");s.textContent=`.duebtns{margin-top:6px;gap:8px}.duebtns button{min-height:40px;padding:0 14px;font-size:.85rem}`;document.head.appendChild(s)}
document.addEventListener("click",ev=>{const b=ev.target.closest&&ev.target.closest("[data-duemsg],[data-duepdf]");if(!b)return;ev.preventDefault();ev.stopPropagation();
  const D=window.ERNTE_DUE||[],d=D[+(b.dataset.duemsg??b.dataset.duepdf)];if(!d)return;if(b.dataset.duemsg!=null)shareText(d);else sendPdf(d,b)},true);
window.dueText=text;
})();
