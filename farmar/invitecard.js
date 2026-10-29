/* Pozvánka ako obrázok / PDF – reprezentatívna karta k prihláseniu (farmár aj tím).
   Kreslí sa v prehliadači (canvas), nič sa neukladá ani neposiela na server.
   PDF: ťuknutím na logo hore sa otvorí aplikácia (skrytý odkaz). Obrázok: odkaz ide do textu správy. */
(()=>{
const W=1080,PAD=72,BG="#0B1510",LIME="#B6FF3B",CREAM="#F3F1EA",MUTED="#B6C6BB";
const img=src=>new Promise(ok=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>ok(null);i.src=src});
const appUrl=()=>typeof APP_URL!=="undefined"?APP_URL:location.href.split("#")[0];
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function wrap(g,t,maxW){const out=[];for(const para of String(t).split("\n")){let line="";for(const w of para.split(/\s+/).filter(Boolean)){const tt=line?line+" "+w:w;if(g.measureText(tt).width>maxW&&line){out.push(line);line=w}else line=tt}out.push(line)}return out}
function diamond(g,cx,cy,s,fill,stroke){g.save();g.translate(cx,cy);g.rotate(Math.PI/4);rr(g,-s/2,-s/2,s,s,s*.14);if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=4;g.stroke()}g.restore()}
// údaje z textu pozvánky
function parse(I){const t=String(I.txt||"");const m=t.match(/Prihlasovacie meno:\s*(.+)/);return {who:m?m[1].trim():"",code:I.pw||"",lead:(t.split(/\n\s*\n/)[0]||"").replace(/^Dobrý deň,\s*/i,"").trim(),farmer:/výkupn/i.test(t),team:!!I.team,name:I.name||""}}

async function draw(I,forPdf){
  try{await Promise.all(['600 80px "Sora"','500 40px "Inter"','700 40px "Inter"','600 60px "IBM Plex Mono"'].map(f=>document.fonts.load(f)))}catch(e){}
  const [logo,photo]=await Promise.all([img("logo.png"),img("valko-flotila.jpg")]);const D=parse(I);
  const cv=document.createElement("canvas");cv.width=W;cv.height=3400;const g=cv.getContext("2d");
  // pozadie + žiara
  g.fillStyle=BG;g.fillRect(0,0,W,cv.height);
  const glow=(x,y,r,c)=>{const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,c);gr.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=gr;g.fillRect(0,0,W,cv.height)};
  glow(W*1.05,40,820,"rgba(94,234,212,.20)");glow(-120,1100,900,"rgba(182,255,59,.13)");
  // fotka hore
  const PH=860;if(photo){const s=Math.max(W/photo.width,PH/photo.height),pw=photo.width*s,ph=photo.height*s;g.save();g.globalAlpha=.85;g.drawImage(photo,(W-pw)/2,(PH-ph)*.4,pw,ph);g.restore()}
  let gr=g.createLinearGradient(0,0,0,PH);gr.addColorStop(0,"rgba(11,21,16,.30)");gr.addColorStop(.45,"rgba(11,21,16,.55)");gr.addColorStop(1,BG);g.fillStyle=gr;g.fillRect(0,0,W,PH+2);
  // diamanty
  const dg=g.createLinearGradient(W-200,330,W,560);dg.addColorStop(0,"rgba(182,255,59,.38)");dg.addColorStop(.6,"rgba(94,234,212,.15)");dg.addColorStop(1,"rgba(94,234,212,0)");diamond(g,W-60,470,380,dg);
  diamond(g,W-180,600,118,"rgba(255,255,255,.12)","rgba(243,241,234,.6)");
  // logo (v PDF je pod ním odkaz)
  const LX=PAD,LY=PAD;let lw=300,lh=150;if(logo){const ih=118,iw=logo.width*ih/logo.height;lw=iw+60;lh=ih+40;g.save();g.shadowColor="rgba(0,0,0,.5)";g.shadowBlur=40;g.shadowOffsetY=14;rr(g,LX,LY,lw,lh,40);g.fillStyle=CREAM;g.fill();g.restore();
    rr(g,LX,LY,lw,lh,40);g.strokeStyle="rgba(182,255,59,.45)";g.lineWidth=3;g.stroke();g.drawImage(logo,LX+30,LY+20,iw,ih)}
  g.textBaseline="alphabetic";g.fillStyle=CREAM;g.font='600 36px "Inter",sans-serif';g.shadowColor="rgba(0,0,0,.6)";g.shadowBlur=18;
  g.fillText("ERNTE Trade & Logistic",LX+lw+32,LY+lh/2-6);g.font='500 29px "Inter",sans-serif';g.fillStyle="#D5E2D9";
  g.fillText(forPdf?"ťuknite na logo a otvorte aplikáciu":"Od poľa až po odberateľa",LX+lw+32,LY+lh/2+36);g.shadowBlur=0;
  const link={x:LX,y:LY,w:lw,h:lh};
  // nadpis
  let y=720;g.fillStyle=LIME;g.font='700 28px "Inter",sans-serif';g.letterSpacing="8px";g.fillText(D.team?"PRÍSTUP DO APLIKÁCIE":"POZVÁNKA DO APLIKÁCIE",PAD,y);g.letterSpacing="0px";
  y+=26;g.fillStyle=CREAM;g.font='600 88px "Sora",sans-serif';
  const title=D.team?`Dobrý deň${D.name?", "+D.name.split(" ")[0]:""},\nváš prístup do ERNTE je pripravený.`:"Dobrý deň,\nvaša aplikácia ERNTE je pripravená.";
  for(const l of wrap(g,title,W-PAD*2-40)){y+=100;g.fillText(l,PAD,y)}
  // úvod
  if(D.lead){y+=40;g.font='400 38px "Inter",sans-serif';g.fillStyle="#C9D6CC";for(const l of wrap(g,D.lead,W-PAD*2)){y+=56;g.fillText(l,PAD,y)}}
  // štítky
  if(D.farmer){y+=44;let x=PAD;g.font='600 31px "Inter",sans-serif';for(const t of ["Výkupné ceny","Moje obchody","Počasie"]){const w=g.measureText(t).width+92;rr(g,x,y,w,74,37);g.fillStyle="rgba(182,255,59,.10)";g.fill();g.strokeStyle="rgba(182,255,59,.32)";g.lineWidth=2.5;g.stroke();
      diamond(g,x+36,y+37,17,LIME);g.fillStyle="#DFFFAA";g.fillText(t,x+62,y+48);x+=w+18}y+=74}
  // karta s prihlásením
  y+=50;const cy=y,cw=W-PAD*2;let ch=170+(D.code?230:0);
  g.save();g.shadowColor="rgba(0,0,0,.45)";g.shadowBlur=60;g.shadowOffsetY=24;rr(g,PAD,cy,cw,ch,56);g.fillStyle="rgba(20,37,28,.95)";g.fill();g.restore();
  gr=g.createLinearGradient(PAD,cy,PAD+cw*.6,cy+ch);gr.addColorStop(0,"rgba(255,255,255,.08)");gr.addColorStop(1,"rgba(255,255,255,0)");rr(g,PAD,cy,cw,ch,56);g.fillStyle=gr;g.fill();g.strokeStyle="rgba(255,255,255,.13)";g.lineWidth=2.5;g.stroke();
  g.fillStyle="#9FB3A6";g.font='700 26px "Inter",sans-serif';g.letterSpacing="5px";g.fillText("PRIHLASOVACIE MENO",PAD+48,cy+74);g.letterSpacing="0px";
  g.fillStyle=CREAM;let fs=44;g.font=`600 ${fs}px "IBM Plex Mono",monospace`;while(g.measureText(D.who).width>cw-96&&fs>26){fs-=2;g.font=`600 ${fs}px "IBM Plex Mono",monospace`}g.fillText(D.who,PAD+48,cy+132);const tx={who:{x:PAD+48,y:cy+132,w:g.measureText(D.who).width,fs,t:D.who}};
  if(D.code){const bx=PAD+40,by=cy+170,bw=cw-80,bh=190;gr=g.createLinearGradient(bx,by,bx+bw,by+bh);gr.addColorStop(0,"#D2FF6E");gr.addColorStop(.5,LIME);gr.addColorStop(1,"#8EDC2E");
    g.save();g.shadowColor="rgba(182,255,59,.3)";g.shadowBlur=50;g.shadowOffsetY=16;rr(g,bx,by,bw,bh,42);g.fillStyle=gr;g.fill();g.restore();
    g.fillStyle="#2E4A10";g.font='700 25px "Inter",sans-serif';g.letterSpacing="5px";g.fillText(D.team?"HESLO":"JEDNORAZOVÝ KÓD",bx+48,by+62);g.letterSpacing="0px";
    const pill=D.team?"zmeňte si ho":"platí 1×";g.font='700 25px "Inter",sans-serif';const pw2=g.measureText(pill).width+44;
    let cs=72;g.font=`600 ${cs}px "IBM Plex Mono",monospace`;while(g.measureText(D.code).width>bw-pw2-130&&cs>34){cs-=2;g.font=`600 ${cs}px "IBM Plex Mono",monospace`}g.fillStyle=BG;g.fillText(D.code,bx+46,by+140);tx.code={x:bx+46,y:by+140,w:g.measureText(D.code).width,fs:cs,t:D.code,box:{x:bx,y:by,w:bw,h:bh}};
    g.font='700 25px "Inter",sans-serif';rr(g,bx+bw-pw2-36,by+bh/2-26,pw2,52,26);g.fillStyle="rgba(11,21,16,.13)";g.fill();g.fillStyle="#14231B";g.fillText(pill,bx+bw-pw2-14,by+bh/2+9)}
  y=cy+ch+80;
  // kroky
  const steps=D.team?[["Prihláste sa",forPdf?"Ťuknite na zelené heslo – aplikácia sa otvorí s vyplneným menom aj heslom (alebo heslo podržte → Kopírovať).":"Otvorte odkaz zo správy a zadajte meno a heslo."],["Zmeňte si heslo","Po prvom prihlásení si nastavte vlastné heslo."],["Dajte si aplikáciu na plochu","Zdieľať → Pridať na plochu"]]
    :[["Prihláste sa",forPdf?"Ťuknite na zelený kód – aplikácia sa otvorí s vyplneným menom aj kódom (alebo kód podržte → Kopírovať).":"Otvorte odkaz zo správy a zadajte meno a kód."],["Nastavte si vlastný PIN","Po prvom prihlásení. Jednorazový kód potom prestane platiť."],["Dajte si aplikáciu na plochu","Zdieľať → Pridať na plochu"]];
  steps.forEach((s,i)=>{rr(g,PAD,y,90,90,28);g.fillStyle="rgba(182,255,59,.10)";g.fill();g.strokeStyle="rgba(182,255,59,.3)";g.lineWidth=2.5;g.stroke();
    g.fillStyle=LIME;g.font='600 44px "Sora",sans-serif';g.textAlign="center";g.fillText(String(i+1),PAD+45,y+61);g.textAlign="left";
    g.fillStyle=CREAM;g.font='600 38px "Inter",sans-serif';g.fillText(s[0],PAD+124,y+40);g.fillStyle=MUTED;g.font='400 32px "Inter",sans-serif';let yy=y+40;for(const l of wrap(g,s[1],W-PAD*2-124)){yy+=46;g.fillText(l,PAD+124,yy)}y=Math.max(y+90,yy+10)+38});
  // upozornenie
  y+=12;const wh=150;rr(g,PAD,y,W-PAD*2,wh,44);g.fillStyle="rgba(255,184,77,.10)";g.fill();g.strokeStyle="rgba(255,196,87,.5)";g.lineWidth=2.5;g.stroke();
  g.strokeStyle="#FFC457";g.lineWidth=6;g.lineCap="round";rr(g,PAD+46,y+68,56,44,10);g.stroke();g.beginPath();g.arc(PAD+74,y+68,16,Math.PI,0);g.stroke();
  g.fillStyle="#FFE3B0";g.font='700 33px "Inter",sans-serif';g.fillText(D.team?"Heslo nikomu neposielajte.":"PIN nikomu neposielajte.",PAD+140,y+64);g.font='400 31px "Inter",sans-serif';g.fillText("ERNTE si ho od vás nikdy nevypýta.",PAD+140,y+110);
  y+=wh+90;
  // päta
  g.fillStyle=CREAM;g.font='600 30px "Inter",sans-serif';g.fillText("ERNTE spol. s r.o.",PAD,y);g.fillStyle="#8FA596";g.font='400 29px "Inter",sans-serif';g.fillText("Zbudza 141 · +421 918 449 991",PAD,y+44);
  g.fillStyle=LIME;g.font='600 29px "Inter",sans-serif';g.textAlign="right";g.fillText("Od poľa až po odberateľa.",W-PAD,y+44);g.textAlign="left";
  const H=Math.round(y+100);const out=document.createElement("canvas");out.width=W;out.height=H;out.getContext("2d").drawImage(cv,0,0);
  return {cv:out,link,tx}}

// PDF s jednou stranou (obrázok) a odkazom pod logom
function pdf(cv,link,url,tx){const S=2.5,PW=+(cv.width/S).toFixed(2),PH=+(cv.height/S).toFixed(2);
  const jpg=atob(cv.toDataURL("image/jpeg",.92).split(",")[1]),u=new Uint8Array(jpg.length);for(let i=0;i<jpg.length;i++)u[i]=jpg.charCodeAt(i);
  const E=new TextEncoder(),parts=[],offs=[];let len=0;const push=b=>{b=typeof b==="string"?E.encode(b):b;parts.push(b);len+=b.length};
  const obj=(n,s,bin)=>{offs[n]=len;push(`${n} 0 obj\n${s}\n`);if(bin){push("stream\n");push(bin);push("\nendstream\n")}push("endobj\n")};
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const esc=s=>String(s).replace(/[\\()]/g,m=>"\\"+m);
  const r=[link.x/S,PH-(link.y+link.h)/S,(link.x+link.w)/S,PH-link.y/S].map(v=>v.toFixed(2)).join(" ");
  const asc=v=>String(v||"").replace(/[^\x20-\x7e]/g,"?");
  const txt=t=>{if(!t||!t.t)return "";const n=asc(t.t),sz=Math.max(4,(t.w/S)/(0.6*n.length));return `BT 3 Tr /F1 ${sz.toFixed(2)} Tf ${(t.x/S).toFixed(2)} ${(PH-t.y/S).toFixed(2)} Td (${esc(n)}) Tj ET\n`};
  const cs=`q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q\n`+(tx?txt(tx.who)+txt(tx.code):"");
  const pre=tx&&tx.code&&tx.code.t?url.split("#")[0]+"#prihlas="+btoa(unescape(encodeURIComponent(JSON.stringify({u:tx.who&&tx.who.t||"",k:tx.code.t})))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""):"";
  const b=pre?tx.code.box:null,r2=b?[b.x/S,PH-(b.y+b.h)/S,(b.x+b.w)/S,PH-b.y/S].map(v=>v.toFixed(2)).join(" "):"";
  obj(1,"<< /Type /Catalog /Pages 2 0 R >>");
  obj(2,"<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 4 0 R >> /Font << /F1 7 0 R >> >> /Contents 5 0 R /Annots [6 0 R${pre?" 8 0 R":""}] >>`);
  obj(4,`<< /Type /XObject /Subtype /Image /Width ${cv.width} /Height ${cv.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${u.length} >>`,u);
  obj(5,`<< /Length ${cs.length} >>`,E.encode(cs));
  obj(6,`<< /Type /Annot /Subtype /Link /Rect [${r}] /Border [0 0 0] /A << /S /URI /URI (${esc(url)}) >> >>`);
  obj(7,"<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>");
  const N=pre?9:8;if(pre)obj(8,`<< /Type /Annot /Subtype /Link /Rect [${r2}] /Border [0 0 0] /A << /S /URI /URI (${esc(pre)}) >> >>`);
  const x=len;let t=`xref\n0 ${N}\n0000000000 65535 f \n`;for(let k=1;k<N;k++)t+=String(offs[k]).padStart(10,"0")+" 00000 n \n";
  push(t+`trailer\n<< /Size ${N} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`);return new Blob(parts,{type:"application/pdf"})}

const fname=(I,ext)=>"ERNTE-pozvanka-"+String(I.name||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Za-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)+"."+ext;
function save(file){const a=document.createElement("a"),u=URL.createObjectURL(file);a.href=u;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000)}
const say=(t,ms)=>{if(typeof toast==="function")toast(t,ms)};
// zdieľanie vyžaduje čerstvé ťuknutie – keď príprava trvá dlhšie, ukáže sa tlačidlo „Odoslať teraz“
function ready(file,text){const o=document.createElement("div");o.className="hsheet";o.style.cssText="position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:rgba(5,10,8,.7);padding:20px";
  o.innerHTML=`<div style="max-width:380px;width:100%;background:#0E1A14;color:#F3F1EA;border:1px solid rgba(182,255,59,.3);border-radius:24px;padding:22px;text-align:center;display:grid;gap:10px;font-family:Inter,system-ui,sans-serif"><b style="font-size:1.1rem">Pozvánka je pripravená</b><small style="color:#A9BCAF">${file.name}</small><button type="button" data-g style="min-height:50px;border:0;border-radius:99px;background:linear-gradient(135deg,#D2FF6E,#9BE83A);color:#0B1510;font-weight:700;font-size:1rem">📤 Odoslať teraz (WhatsApp…)</button><button type="button" data-d style="min-height:46px;border-radius:99px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#F3F1EA;font-weight:600">⬇️ Uložiť do telefónu</button><button type="button" data-x style="min-height:40px;border:0;background:none;color:#A9BCAF">Zavrieť</button></div>`;
  document.body.appendChild(o);const close=()=>o.remove();
  o.querySelector("[data-g]").onclick=async()=>{try{await navigator.share(text?{files:[file],text}:{files:[file]});close()}catch(e){if(e&&e.name!=="AbortError"){save(file);close()}}};
  o.querySelector("[data-d]").onclick=()=>{save(file);close()};o.querySelector("[data-x]").onclick=close;o.addEventListener("click",e=>{if(e.target===o)close()})}
async function send(I,kind,btn){if(!I)return;const lab=btn&&btn.textContent;if(btn){btn.disabled=true;btn.textContent="Pripravujem…"}
  try{const url=appUrl(),{cv,link,tx}=await draw(I,kind==="pdf");let file,text="";
    if(kind==="pdf")file=new File([pdf(cv,link,url,tx)],fname(I,"pdf"),{type:"application/pdf"});
    else{const b=await new Promise(r=>cv.toBlob(r,"image/png"));file=new File([b],fname(I,"png"),{type:"image/png"});text=`👉 ERNTE Trade & Logistic: ${url}`}
    if(tx&&tx.who&&tx.who.t)text=`Prihlasovacie meno: ${tx.who.t}`+(tx.code&&tx.code.t?`\nKód: ${tx.code.t}`:"")+(text?`\n\n${text}`:"");
    if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share(text?{files:[file],text}:{files:[file]});return}catch(e){if(e&&e.name==="AbortError")return;ready(file,text);return}}
    save(file);say(kind==="pdf"?"PDF uložené – pošlite ho cez WhatsApp ako dokument.":"Obrázok uložený – pošlite ho cez WhatsApp spolu s odkazom.",5000)}
  catch(e){say("Pozvánku sa nepodarilo pripraviť: "+(e&&e.message||e),6000)}
  finally{if(btn){btn.disabled=false;btn.textContent=lab}}}
window.inviteCardButtons=()=>`<button type="button" class="lime" data-invcard="pdf">📄 Poslať PDF pozvánku</button><button type="button" data-invcard="png">🎨 Poslať ako obrázok</button>`;
// prihlásenie: „Vložiť skopírované meno a heslo“ – rozpozná meno aj kód zo skopírovaného textu pozvánky
document.addEventListener("click",async e=>{const b=e.target.closest&&e.target.closest("[data-lgpaste]");if(!b)return;e.preventDefault();const f=document.getElementById("fEmail");if(!f)return;
  let t="";try{t=await navigator.clipboard.readText()}catch(x){}
  if(!t){say("Najprv v PDF podržte prst na kóde → Kopírovať. Potom ťuknite sem. · Előbb másolja ki a kódot.",6000);f.pw.focus();return}
  const mm=t.match(/(?:meno|név|login)[^:\n]*:\s*(\S+)/i),mk=t.match(/(?:kód|kod|heslo|jelszó|kód:)[^:\n]*:\s*(\S+)/i);
  if(mm)f.email.value=mm[1].trim();const one=t.trim().split(/\s+/).length===1?t.trim():"",isLogin=/@|^\+?\d[\d ]{8,}$/.test(one);if(!mm&&!mk&&one&&isLogin){f.email.value=one;say("✓ Meno vložené – teraz skopírujte a vložte kód. · Név beillesztve.",5000);f.pw.focus();return}
  const k=mk?mk[1]:one;
  if(k){f.pw.value=k.trim();say("✓ Vložené – ťuknite Prihlásiť. · Beillesztve.",4000)}else say("V schránke nie je kód. · A vágólapon nincs kód.",5000)},true);
window.inviteCardDraw=draw;window.inviteCardPdf=pdf;
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-invcard]");if(!b)return;e.preventDefault();e.stopPropagation();
  const I=(typeof STATE!=="undefined"&&STATE.invite)||null;if(!I){say("Najprv vytvorte prihlásenie.");return}send(I,b.dataset.invcard,b)},true);
})();
