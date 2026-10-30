// ===== 📄 PRIEHĽADNÍK DOKUMENTOV / PDF (všetky moduly) =====
// Každý dokument, ktorý aplikácia otvára cez window.open("") + document.write (zmluvy, zúčtovanie, Danube, trus, evidencia, reporty…),
// sa namiesto nového okna (v nainštalovanej appke sa nedalo zavrieť a „Tlačiť“ nefungovalo) zobrazí v okne cez celú obrazovku:
//   ✕ Zavrieť (aj tlačidlo Späť) · 🖨️ Tlačiť · ⬇️ Uložiť PDF (skutočný súbor .pdf, názov s medzerami) · 📤 Poslať (mobil).
// Automatická tlač pri otvorení sa nespúšťa – tlačí sa až ťuknutím. Tlačidlá vo vnútri dokumentu sa skryjú (sú v lište).
(function(){
const MOB=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const origOpen=window.open.bind(window);
let V=null; // {ov,fr,iw,orig,t0,timer,pushed}
const esc=t=>String(t==null?"":t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const tmsg=(m,ms)=>{try{(typeof toast==="function"?toast:alert)(m,ms)}catch(x){}};
const fname=()=>{let t="";try{t=(V.iw.document.title||"").trim()}catch(x){}t=(t||"Dokument ERNTE").replace(/[_]+/g," ").replace(/[\\/:*?"<>|]+/g," ").replace(/\s+/g," ").trim().slice(0,90);return t+".pdf"};
function arm(){if(!V)return;let d;try{d=V.iw.document}catch(x){return}
  if(V.iw.print!==V.pp){if(!V.orig)V.orig=V.iw.print;V.pp=function(){if(V&&Date.now()-V.t0>3000)doPrint()};try{V.iw.print=V.pp}catch(x){}}
  try{V.iw.close=close}catch(x){}
  if(d&&d.head&&!d.getElementById("pvfix")){const s=d.createElement("style");s.id="pvfix";
    s.textContent=`.pb,body>button.btn,button[onclick^="print"]{display:none!important}html{-webkit-text-size-adjust:100%}@media screen{html{background:#e5e7eb}body{background:#fff;max-width:var(--pvw,210mm);margin:0 auto!important;padding:12mm 10mm!important;box-sizing:border-box;min-height:100vh;box-shadow:0 0 18px rgba(0,0,0,.15)}}@media screen and (max-width:600px){body{padding:6mm 4mm!important}}`;d.head.appendChild(s)}
  try{if(d.documentElement&&[...d.querySelectorAll("style")].some(x=>/size\s*:\s*A4\s+landscape/i.test(x.textContent)))d.documentElement.style.setProperty("--pvw","297mm")}catch(x){}
  const tt=V.ov.querySelector(".pvt");try{const t=(d.title||"Dokument").replace(/_+/g," ");if(tt&&tt.textContent!==t)tt.textContent=t}catch(x){}}
function open(){if(V)close(true);const M=window.__pvMail||null;window.__pvMail=null;
  const ov=document.createElement("div");ov.id="pdfv";ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");
  ov.innerHTML=`<div class="pvbar"><button type="button" class="pvx" data-pv="x" aria-label="Zavrieť">✕</button><b class="pvt">Dokument</b>
    <div class="pvb"><button type="button" data-pv="print">🖨️ Tlačiť</button>${M?`<button type="button" data-pv="mail" class="pvpri">📧 Odoslať</button>`:""}<button type="button" data-pv="pdf"${M?"":' class="pvpri"'}>⬇️ Uložiť PDF</button>${MOB&&navigator.canShare?`<button type="button" data-pv="share">📤 Poslať</button>`:""}</div></div>
    <iframe class="pvf" title="Dokument"></iframe><div class="pvbusy" hidden>Pripravujem PDF…</div>`;
  document.body.appendChild(ov);document.documentElement.classList.add("pvon");
  const fr=ov.querySelector("iframe");const iw=fr.contentWindow;
  V={ov,fr,iw,orig:null,pp:null,t0:Date.now(),timer:0,pushed:false,M};
  try{iw.document.open();iw.document.write("<!doctype html><meta charset='utf-8'><title>Dokument</title><p style='font:16px system-ui;padding:20px'>Pripravujem dokument…</p>");iw.document.close()}catch(x){}
  arm();V.timer=setInterval(arm,300);
  try{history.pushState({pdfv:1},"",location.href);V.pushed=true}catch(x){}
  return iw}
function close(silent){if(!V)return;const v=V;V=null;clearInterval(v.timer);v.ov.remove();document.documentElement.classList.remove("pvon");
  if(v.pushed&&!silent&&history.state&&history.state.pdfv){try{history.back()}catch(x){}}}
window.addEventListener("popstate",()=>{if(V){V.pushed=false;close(true)}});
document.addEventListener("keydown",e=>{if(V&&e.key==="Escape")close()});
// skutočný PDF súbor – html2pdf sa načíta priamo do dokumentu (jeho štýly ostanú)
function pdfBlob(){return new Promise((ok,no)=>{const iw=V.iw,d=iw.document;
  const run=()=>{try{const land=[...d.querySelectorAll("style")].some(x=>/size\s*:\s*A4\s+landscape/i.test(x.textContent));
      const O=iw.JSON.parse(JSON.stringify({margin:[8,8,10,8],image:{type:"jpeg",quality:.95},
      html2canvas:{scale:2,useCORS:true,backgroundColor:"#ffffff",scrollX:0,scrollY:0,windowWidth:land?1180:840},
      jsPDF:{unit:"mm",format:"a4",orientation:land?"landscape":"portrait"},pagebreak:{mode:["css","legacy"],avoid:["tr","img",".avoid",".sig"]}}));const w=iw.html2pdf().set(O).from(d.body);
      w.outputPdf("blob").then(ok,no)}catch(x){no(x)}};
  if(iw.html2pdf)return run();
  const s=d.createElement("script");s.src=new URL("vendor/html2pdf-0.10.1.js",location.href).href;s.onload=run;s.onerror=()=>no(new Error("knižnica PDF sa nenačítala"));d.head.appendChild(s)})}
async function makeFile(){const b=V.ov.querySelector(".pvbusy");b.hidden=false;
  const st=V.iw.document.createElement("style");st.textContent="body{max-width:none!important;padding:0!important;margin:0!important;box-shadow:none!important;min-height:0!important}";V.iw.document.head.appendChild(st);
  // rám sa na chvíľu roztiahne na šírku strany A4 – inak by html2pdf orezal pravú časť (prekrytie má šírku okna)
  const d=V.iw.document,land=[...d.querySelectorAll("style")].some(x=>/size\s*:\s*A4\s+landscape/i.test(x.textContent)),fr=V.fr,os=fr.getAttribute("style")||"";
  fr.style.cssText=os+";width:"+(land?1180:840)+"px!important;min-width:"+(land?1180:840)+"px;flex:none";await new Promise(r=>setTimeout(r,120));
  try{const blob=await pdfBlob();return new File([blob],fname(),{type:"application/pdf"})}finally{fr.setAttribute("style",os);st.remove();if(V)V.ov.querySelector(".pvbusy").hidden=true}}
function dl(f){const u=URL.createObjectURL(f),a=document.createElement("a");a.href=u;a.download=f.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000)}
async function share(f){if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:f.name.replace(/\.pdf$/,"")});return true}catch(e){if(e&&e.name==="AbortError")return true}}return false}
async function savePdf(){try{const f=await makeFile();dl(f);tmsg("✓ PDF uložené: "+f.name,5000)}catch(e){tmsg("PDF sa nepodarilo vytvoriť – skús 🖨️ Tlačiť → Uložiť ako PDF. ("+(e&&e.message||e)+")",8000)}}
async function sendPdf(){try{const f=await makeFile();if(!(await share(f))){dl(f);tmsg("✓ PDF uložené: "+f.name,5000)}}catch(e){tmsg("PDF sa nepodarilo vytvoriť: "+(e&&e.message||e),8000)}}
function doPrint(){if(!V)return;
  if(!MOB){try{V.iw.focus();(V.orig||V.iw.print).call(V.iw);return}catch(x){}}
  // mobil: tlač z rámu v telefóne nefunguje spoľahlivo → hotové PDF (Zdieľať → Tlačiť, alebo otvoriť a vytlačiť)
  (async()=>{try{const f=await makeFile();if(!(await share(f))){dl(f);tmsg("✓ PDF uložené – otvor ho a daj Tlačiť.",6000)}}catch(e){try{(V.orig||V.iw.print).call(V.iw)}catch(x){tmsg("Tlač sa nepodarila: "+(e&&e.message||e),7000)}}})()}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("#pdfv [data-pv]");if(!b||!V)return;e.preventDefault();const k=b.dataset.pv;
  if(k==="x")close();else if(k==="print")doPrint();else if(k==="pdf")savePdf();else if(k==="share")sendPdf();else if(k==="mail")mailBox();else if(k==="msend")mailDirect();else if(k==="mcfg")mailCfgSave();else if(k==="mx"){const b=document.getElementById("pvMail");if(b)b.remove()}else if(k==="mold"){const b=document.getElementById("pvMail");if(b)b.remove();mailPdf()}});
// 📧 odoslanie priamo z aplikácie (schránka ERNTE cez databázu → GitHub Actions); bez nastavenia → zdieľanie / pošta
let MR=null;
async function mailReady(){try{const r=await sb.rpc("mail_ready");MR=r.error?{ok:false}:r.data||{ok:false}}catch(x){MR={ok:false}}return MR}
async function mailBox(){const M=V&&V.M;if(!M)return;const old=document.getElementById("pvMail");if(old)old.remove();await mailReady();
  const d=document.createElement("div");d.id="pvMail";d.className="pvmail";
  if(!MR.ok&&MR.main){d.innerHTML=`<div class="pvmb"><b>📧 Nastav odosielanie e-mailov (raz)</b><div class="pvs">Zadaj prístup k schránke, z ktorej sa budú posielať zmluvy. Heslo sa uloží iba do trezoru databázy. Pri schránke @ernte.sk (Microsoft 365) zadaj heslo k schránke; ak má zapnuté dvojstupňové overenie, použi <b>heslo aplikácie</b>.</div>
    <label>Schránka<select id="pvmPre"><option value="smtp.office365.com|587">Microsoft 365 (@ernte.sk)</option><option value="smtp.gmail.com|465">Gmail</option><option value="smtp.websupport.sk|465">Websupport</option><option value="smtp.seznam.cz|465">Seznam</option><option value="|465">Iný server…</option></select></label>
    <label>SMTP server<input id="pvmHost" value="smtp.office365.com" autocapitalize="off"></label><label>Port<input id="pvmPort" value="587" inputmode="numeric"></label>
    <label>E-mail (prihlasovacie meno)<input id="pvmUser" type="email" autocapitalize="off" placeholder="jana.valkova@ernte.sk" value="jana.valkova@ernte.sk"></label><label>Heslo / heslo aplikácie<input id="pvmPass" type="password" autocomplete="new-password"></label>
    <label>Meno odosielateľa<input id="pvmName" value="ERNTE spol. s r.o."></label>
    <div class="pvbt"><button type="button" class="pvpri" data-pv="mcfg">💾 Uložiť a odoslať</button><button type="button" data-pv="mold">Poslať cez telefón</button><button type="button" data-pv="mx">Zrušiť</button></div></div>`;
    V.ov.appendChild(d);const pre=d.querySelector("#pvmPre");pre.onchange=()=>{const [h,p]=pre.value.split("|");d.querySelector("#pvmHost").value=h;d.querySelector("#pvmPort").value=p};return}
  if(!MR.ok){mailPdf();return}
  d.innerHTML=`<div class="pvmb"><b>📧 Odoslať e-mailom</b><label>Komu<input id="pvmTo" type="email" autocapitalize="off" value="${esc(M.to||"")}" placeholder="e-mail farmára"></label>
   <label>Predmet<input id="pvmSubj" value="${esc(M.subj||"")}"></label><label>Text<textarea id="pvmBody" rows="5">${esc(M.body||"")}</textarea></label>
   <div class="pvs">Odošle sa zo schránky ${esc(MR.from||"ERNTE")} s PDF v prílohe.</div>
   <div class="pvbt"><button type="button" class="pvpri" data-pv="msend">📤 Odoslať</button><button type="button" data-pv="mx">Zrušiť</button></div></div>`;
  V.ov.appendChild(d)}
async function mailCfgSave(){const g=i=>(document.getElementById(i)||{}).value||"";const r=await sb.rpc("mail_cfg_set",{p:{host:g("pvmHost"),port:g("pvmPort"),user:g("pvmUser"),pass:g("pvmPass"),from:g("pvmUser"),name:g("pvmName")}});
  if(r.error){tmsg("Nepodarilo sa: "+r.error.message,7000);return}tmsg("✓ Odosielanie e-mailov nastavené.",4000);mailBox()}
async function mailDirect(){const M=V&&V.M;const to=((document.getElementById("pvmTo")||{}).value||"").trim(),subj=(document.getElementById("pvmSubj")||{}).value||M.subj,body=(document.getElementById("pvmBody")||{}).value||M.body;
  if(!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(to)){tmsg("Zadaj e-mail farmára.",5000);return}
  const b=document.querySelector('#pvMail [data-pv=msend]');if(b){b.disabled=true;b.textContent="Pripravujem PDF…"}
  try{const f=await makeFile();const b64=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(",")[1]);r.onerror=no;r.readAsDataURL(f)});
    if(b)b.textContent="Odosielam…";const r=await sb.rpc("mail_send",{p_to:to,p_subject:subj,p_body:body,p_att_name:f.name,p_att_b64:b64,p_deal:M.deal||null});if(r.error)throw r.error;
    const id=r.data;const box=document.getElementById("pvMail");if(box)box.remove();tmsg("📤 Odosiela sa na "+to+"…",6000);
    for(let i=0;i<30;i++){await new Promise(z=>setTimeout(z,4000));const s=await sb.rpc("mail_status",{p_id:id});const st=s.data&&s.data.status;
      if(st==="odoslany"){tmsg("✅ Zmluva odoslaná na "+to,8000);return}if(st==="chyba"){tmsg("⚠️ E-mail sa neodoslal: "+((s.data&&s.data.err)||"chyba schránky")+" – skontroluj nastavenie (Martin).",10000);return}}
    tmsg("E-mail sa ešte odosiela – výsledok uvidíš o chvíľu.",6000)}
  catch(e){tmsg("Nepodarilo sa: "+(e&&e.message||e),8000);if(b){b.disabled=false;b.textContent="📤 Odoslať"}}}
// e-mail s PDF: na mobile zdieľanie (Gmail / Mail – adresa a text sú pripravené, adresa sa skopíruje), inak stiahnutie + e-mailový program
async function mailPdf(){const M=V&&V.M;if(!M)return;try{const f=await makeFile();try{await navigator.clipboard.writeText(M.to)}catch(x){}
  if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:M.subj,text:"Pre: "+M.to+"\n\n"+M.body});tmsg("✓ Zmluva odoslaná na zdieľanie. Adresa "+M.to+" je skopírovaná – vlož ju do príjemcu.",8000);return}catch(e){if(e&&e.name==="AbortError")return}}
  dl(f);setTimeout(()=>{location.href="mailto:"+encodeURIComponent(M.to)+"?subject="+encodeURIComponent(M.subj)+"&body="+encodeURIComponent(M.body+"\n\n(Zmluva v PDF je stiahnutá: "+f.name+" – priložte ju.)")},400)}
  catch(e){tmsg("PDF sa nepodarilo vytvoriť: "+(e&&e.message||e),8000)}}
// prevzatie window.open("") – dokumenty písané cez document.write
window.open=function(url,target,feat){const u=url==null?"":String(url);
  if(u===""&&(!target||target==="_blank")){try{return open()}catch(x){}}
  return origOpen(url,target,feat)};
// priamy odkaz na nastavenie odosielania: …/farmar/#nastav-email (iba Martin)
try{if(/^#nastav-?e?mail/i.test(location.hash))sessionStorage.setItem("ernte-mailsetup","1")}catch(x){}
async function setupLink(){let f=false;try{f=/^#nastav-?e?mail/i.test(location.hash)||sessionStorage.getItem("ernte-mailsetup")==="1";sessionStorage.removeItem("ernte-mailsetup")}catch(x){}if(!f)return;if(document.getElementById("pvSetup"))return;let n=0;
  while(n++<60&&!(typeof window.MAIN_OK==="function"&&window.MAIN_OK()))await new Promise(r=>setTimeout(r,500));
  if(!(typeof window.MAIN_OK==="function"&&window.MAIN_OK())){tmsg("Odosielanie e-mailov nastavuje iba Martin – prihlás sa ako Martin.",7000);return}
  await mailReady();const o=document.createElement("div");o.id="pvSetup";
  o.innerHTML=`<div class="pvmb"><b>📧 Odosielanie zmlúv a zúčtovaní e-mailom</b><div class="pvs">Odosielať sa bude zo schránky <b>jana.valkova@ernte.sk</b> (Microsoft 365). Zadaj heslo k tejto schránke – uloží sa iba do trezoru databázy, nikam inam.${MR&&MR.ok?`<br>✅ Teraz nastavené: ${esc(MR.user||MR.from||"")}`:""}</div>
    <label>SMTP server<input id="pvmHost" value="${esc(MR&&MR.host||"smtp.office365.com")}" autocapitalize="off"></label><label>Port<input id="pvmPort" value="587" inputmode="numeric"></label>
    <label>E-mail (prihlasovacie meno)<input id="pvmUser" type="email" autocapitalize="off" value="jana.valkova@ernte.sk"></label><label>Heslo k schránke<input id="pvmPass" type="password" autocomplete="new-password"></label>
    <label>Meno odosielateľa<input id="pvmName" value="ERNTE spol. s r.o."></label>
    <div class="pvbt"><button type="button" class="pvpri" id="pvsSave">💾 Uložiť</button><button type="button" id="pvsX">Zavrieť</button></div></div>`;
  document.body.appendChild(o);const close=()=>{o.remove();try{history.replaceState(null,"",location.pathname+location.search)}catch(x){}};
  o.querySelector("#pvsX").onclick=close;o.querySelector("#pvsSave").onclick=async()=>{const g=i=>o.querySelector(i).value;if(!g("#pvmPass")){tmsg("Zadaj heslo k schránke.",5000);return}
    const r=await sb.rpc("mail_cfg_set",{p:{host:g("#pvmHost"),port:g("#pvmPort"),user:g("#pvmUser"),pass:g("#pvmPass"),from:g("#pvmUser"),name:g("#pvmName")}});
    if(r.error){tmsg("Nepodarilo sa: "+r.error.message,8000);return}tmsg("✅ Uložené – zmluvy a zúčtovania sa budú posielať z "+g("#pvmUser"),8000);close()}}
window.addEventListener("hashchange",setupLink);setTimeout(setupLink,1500);
window.pdfViewOpen=open;window.pdfViewClose=close;
{const s=document.createElement("style");s.textContent=`#pdfv{position:fixed;inset:0;overflow:hidden;z-index:2147483000;display:flex;flex-direction:column;background:#0b1020}
#pdfv .pvbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:calc(8px + env(safe-area-inset-top)) 10px 8px;background:#0f172a;border-bottom:1px solid rgba(255,255,255,.12);color:#fff}
#pdfv .pvx{width:44px;height:44px;min-width:44px;aspect-ratio:1;border-radius:50%!important;padding:0!important;display:grid;place-items:center;font-size:1.2rem;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);color:#fff;flex:0 0 44px}
#pdfv .pvt{flex:1 1 120px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.95rem}
#pdfv .pvb{display:flex;gap:6px;flex:1 1 100%;flex-wrap:wrap}#pdfv .pvb button{flex:1 1 0;min-width:0;overflow:hidden;text-overflow:ellipsis;min-height:42px;padding:6px 8px;border-radius:12px;font-weight:700;font-size:.88rem;white-space:nowrap;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);color:#fff}
#pdfv .pvb .pvpri{background:linear-gradient(135deg,#22d3ee,#a3e635);color:#0b1020;border:0}
#pdfv .pvf{flex:1 1 auto;width:100%;border:0;background:#e5e7eb}
#pdfv .pvmail{position:absolute;inset:0;z-index:5;background:rgba(2,6,23,.6);display:flex;align-items:flex-end;justify-content:center;padding:10px}
#pvSetup{position:fixed;inset:0;z-index:2147483001;background:rgba(2,6,23,.7);display:flex;align-items:flex-end;justify-content:center;padding:10px}
:is(#pdfv,#pvSetup) .pvmb{width:100%;max-width:520px;max-height:90vh;overflow:auto;display:grid;gap:8px;background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:20px;padding:16px}
:is(#pdfv,#pvSetup) .pvmb label{display:grid;gap:4px;font-size:.85rem}:is(#pdfv,#pvSetup) .pvmb :is(input,select,textarea){width:100%;box-sizing:border-box;min-height:44px;font-size:16px;border-radius:12px;padding:8px 10px}
:is(#pdfv,#pvSetup) .pvs{font-size:.8rem;opacity:.8}:is(#pdfv,#pvSetup) .pvbt{display:flex;flex-wrap:wrap;gap:8px}:is(#pdfv,#pvSetup) .pvbt button{flex:1 1 140px;min-height:46px;border-radius:12px;font-weight:700}
:is(#pdfv,#pvSetup) .pvbt .pvpri{background:linear-gradient(135deg,#22d3ee,#a3e635);color:#0b1020;border:0}@media(min-width:700px){#pvSetup,#pdfv .pvmail{align-items:center}}
#pdfv .pvbusy{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:14px 20px;border-radius:14px;background:rgba(15,23,42,.92);color:#fff;font-weight:700}
@media(max-width:380px){#pdfv .pvb button{white-space:normal;line-height:1.15;font-size:.82rem;padding:4px 6px}}
@media(min-width:700px){#pdfv .pvb{flex:0 1 auto}#pdfv .pvb button{flex:0 0 auto;padding:6px 14px}}
html.pvon,html.pvon body{overflow:hidden!important}
@media print{html.pvon body>*:not(#pdfv){display:none!important}}`;document.head.appendChild(s)}
})();
