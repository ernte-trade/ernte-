// ===== ERNTE · NÁVRH CENY OD FARMÁRA + FOTO ZO SKLADU (ISCC) =====
// Farmár navrhne cenu za komoditu a celkové množstvo, pridá fotky zo skladu. Z fotky sa vyberie GPS (EXIF) a dátum,
// k tomu poloha telefónu v čase odoslania – zemepisné body skladu pre ISCC (pôvod komodity).
// Ukladá do tabuľky farmer_offers (fotky + GPS v JSON). Kým tabuľka v databáze nie je, uloží návrh ako požiadavku
// „Chcem predať“ s navrhnutou cenou a GPS bodmi v poznámke (fotky sa vtedy neukladajú – farmár je upozornený).
// Vidí: farmár (svoje), majiteľ a ľudia s prístupom „Požiadavky farmárov“ (Požiadavky → Návrhy cien).
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const say=(t,ms)=>{if(typeof toast==="function")toast(t,ms||4000)};
const f2=x=>typeof fmt==="function"?fmt(x):String(x);
const N=v=>{if(v==null||v==="")return null;const x=parseFloat(String(v).replace(/\s/g,"").replace(",","."));return Number.isFinite(x)?x:null};
const F=k=>!window.fcan||fcan(k);
const isFarmer=()=>typeof FARMER!=="undefined"&&!!FARMER;
const staffSees=()=>typeof ROLE!=="undefined"&&ROLE&&!isFarmer()&&(ROLE==="owner"||!window.can||can("req")||can("deals"));
let O={open:false,ph:[],busy:false,tbl:null,list:null,mine:null};
// ---------- EXIF: GPS a dátum z JPEG ----------
function exif(buf){try{const v=new DataView(buf);if(v.getUint16(0)!==0xFFD8)return null;let o=2;
  while(o<v.byteLength-4){const m=v.getUint16(o),len=v.getUint16(o+2);if(m===0xFFE1&&v.getUint32(o+4)===0x45786966){return tiff(v,o+10)}if((m&0xFF00)!==0xFF00)break;o+=2+len}}catch(x){}return null}
function tiff(v,t){const le=v.getUint16(t)===0x4949,u16=p=>v.getUint16(p,le),u32=p=>v.getUint32(p,le);
  const ifd=(p)=>{const n=u16(p),E={};for(let i=0;i<n;i++){const q=p+2+i*12;E[u16(q)]={type:u16(q+2),cnt:u32(q+4),val:q+8}}return E};
  const rat=(p,c)=>{const a=[];for(let i=0;i<c;i++)a.push(u32(p+i*8)/(u32(p+i*8+4)||1));return a};
  const str=(en)=>{const p=en.cnt>4?t+u32(en.val):en.val;let s="";for(let i=0;i<en.cnt-1;i++)s+=String.fromCharCode(v.getUint8(p+i));return s};
  const I0=ifd(t+u32(t+4)),out={};
  if(I0[0x0132])out.dt=str(I0[0x0132]);
  if(I0[0x8769]){const X=ifd(t+u32(I0[0x8769].val));if(X[0x9003])out.dt=str(X[0x9003])}
  if(I0[0x8825]){const G=ifd(t+u32(I0[0x8825].val));
    if(G[2]&&G[4]){const la=rat(t+u32(G[2].val),3),lo=rat(t+u32(G[4].val),3);let lat=la[0]+la[1]/60+la[2]/3600,lon=lo[0]+lo[1]/60+lo[2]/3600;
      const lr=G[1]?String.fromCharCode(v.getUint8(G[1].val)):"N",or=G[3]?String.fromCharCode(v.getUint8(G[3].val)):"E";if(lr==="S")lat=-lat;if(or==="W")lon=-lon;
      if(Math.abs(lat)>0.01||Math.abs(lon)>0.01){out.lat=+lat.toFixed(6);out.lon=+lon.toFixed(6)}}}
  return out}
const exDate=s=>{const m=String(s||"").match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00`:null};
function here(){return new Promise(ok=>{if(!navigator.geolocation)return ok(null);navigator.geolocation.getCurrentPosition(p=>ok({lat:+p.coords.latitude.toFixed(6),lon:+p.coords.longitude.toFixed(6),acc:Math.round(p.coords.accuracy||0)}),()=>ok(null),{enableHighAccuracy:true,timeout:15000,maximumAge:60000})})}
function thumb(file,max=1280,q=.72){return new Promise((ok,er)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{const s=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);ok(c.toDataURL("image/jpeg",q))};im.onerror=()=>{URL.revokeObjectURL(u);er(new Error("Obrázok sa nedá otvoriť"))};im.src=u})}
async function addPhotos(files){O.busy=true;rr();const pos=null;
  for(const f of [...files].slice(0,6-O.ph.length)){try{const buf=await f.arrayBuffer(),x=exif(buf)||{},t=await thumb(f);
      O.ph.push({img:t,lat:x.lat??null,lon:x.lon??null,src:x.lat!=null?"foto (EXIF)":null,taken:exDate(x.dt),dev:pos,name:f.name.slice(0,60),size:f.size})}
    catch(err){say("Fotku "+f.name+" sa nepodarilo načítať.")}}
  O.busy=false;rr()}
function rr(){if(typeof renderFarmer==="function"&&isFarmer())renderFarmer();else if(typeof renderStaff==="function")renderStaff()}
const mapL=(lat,lon)=>`https://www.google.com/maps?q=${lat},${lon}`;
const ptTxt=p=>p.lat!=null?`${p.lat}, ${p.lon} (z fotky)`:p.dev?`${p.dev.lat}, ${p.dev.lon} (poloha telefónu ±${p.dev.acc} m)`:"bez GPS";
// ---------- farmár: formulár ----------
function form(){const P=(STATE.prices||[]),MKL=typeof MK!=="undefined"?MK:[];
  if(!O.open)return `<div class="card ofc"><div class="s">Máte vlastnú predstavu o cene? Navrhnite cenu za komoditu a celé množstvo a pridajte fotky zo skladu. ERNTE sa vám ozve.</div><div class="btns"><button type="button" class="lime" data-ofopen>💰 Navrhnúť cenu</button></div>${mine()}</div>`;
  return `<form class="card f ofc" id="fOffer"><div class="w"><b>💰 Návrh ceny pre ERNTE</b><div class="s">Cena bez DPH, FCA vaša farma. Pridajte fotky tovaru v sklade – pomôžu nám posúdiť kvalitu.</div></div>
   <label>Komodita<select name="com" required>${MKL.map(m=>{const p=P.find(x=>x.com===m[0]);return `<option value="${e(m[0])}">${e(m[1])}${p&&p.price!=null?` (teraz ${f2(p.price)} €/t)`:""}</option>`}).join("")}</select></label>
   <label>Vaša cena €/t<input name="price" inputmode="decimal" required placeholder="napr. 495"></label>
   <label>Celkové množstvo (t)<input name="tons" inputmode="decimal" required placeholder="napr. 300"></label>
   <label>Odkedy môžeme odviezť<input name="date" type="date" min="${typeof today==="function"?today():""}"></label>
   <label class="w">Kde je tovar uskladnený (sklad, obec)<input name="place" placeholder="napr. sklad Zbudza, hala 2"></label>
   <label class="w">Kvalita / poznámka<input name="note" placeholder="vlhkosť, nečistoty, odroda…"></label>
   <div class="w ofph"><b>📷 Fotky zo skladu (max. 6)</b>
     <div class="ofgrid">${O.ph.map((p,i)=>`<div class="ofp"><img src="${e(p.img)}" alt="Fotka ${i+1}"><button type="button" class="ofx" data-ofrm="${i}" aria-label="Odstrániť fotku">✕</button></div>`).join("")}
     ${O.ph.length<6?`<label class="ofadd">${O.busy?"⏳ Spracúvam…":"➕ Odfotiť / pridať"}<input type="file" accept="image/*" capture="environment" multiple data-ofadd hidden></label>`:""}</div>
     <div class="s">Odfoťte tovar priamo v sklade, aby bolo vidieť jeho stav.</div></div>
   <div class="w btns"><button class="pri" type="submit"${O.busy?" disabled":""}>📤 Odoslať návrh ERNTE</button><button type="button" data-ofclose>Zrušiť</button></div></form>`}
function mine(){const L=O.mine;if(!Array.isArray(L)||!L.length)return "";
  return `<div class="ofmine"><b>Moje návrhy</b>${L.slice(0,5).map(o=>`<div class="row"><span>${e(typeof comName==="function"?comName(o.com):o.com)} · ${f2(o.tons)} t · <b>${f2(o.price)} €/t</b></span>${typeof pill==="function"?pill(({nova:["čaká na ERNTE","w"],prijata:["prijaté",""],protinavrh:["protinávrh","b"],zamietnuta:["zamietnuté","r"]})[o.status]||[o.status]):e(o.status)}</div>${o.reply?`<div class="s">ERNTE: ${e(o.reply)}</div>`:""}`).join("")}</div>`}
async function loadMine(){if(O.mine!==null)return;O.mine=[];const r=await sb.from("farmer_offers").select("id,com,price,tons,status,reply,created_at").order("created_at",{ascending:false}).limit(20);
  if(r.error){O.tbl=false;O.mine=[];return}O.tbl=true;O.mine=r.data||[];if(isFarmer())renderFarmer()}
async function submit(f){const fd=new FormData(f),price=N(fd.get("price")),tons=N(fd.get("tons"));if(!(price>0)||!(tons>0)){say("Napíšte cenu aj množstvo.");return}
  const b=f.querySelector("button[type=submit]");if(typeof busy==="function")busy(b,true);
  const dev=null;
  const pts=O.ph.map(p=>({lat:p.lat??(p.dev&&p.dev.lat),lon:p.lon??(p.dev&&p.dev.lon),src:p.lat!=null?"exif":p.dev?"device":null,acc:p.lat!=null?null:p.dev&&p.dev.acc,taken:p.taken})).filter(p=>p.lat!=null);
  const row={farmer_id:FARMER.id,com:fd.get("com"),price,tons,pickup_date:fd.get("date")||null,place:String(fd.get("place")||"").slice(0,200)||null,note:String(fd.get("note")||"").slice(0,500)||null,
    photos:O.ph.map(p=>({img:p.img,lat:p.lat,lon:p.lon,taken:p.taken,dev:p.dev,name:p.name})),geo:pts,dev_lat:dev?dev.lat:null,dev_lon:dev?dev.lon:null,dev_acc:dev?dev.acc:null};
  let r=await sb.from("farmer_offers").insert(row);
  if(r.error&&/farmer_offers|relation|schema cache|does not exist|could not find/i.test(r.error.message)){
    // náhradný spôsob: požiadavka „Chcem predať“ s navrhnutou cenou a GPS bodmi v poznámke
    const g=pts.map((p,i)=>`F${i+1} ${p.lat},${p.lon}${p.src==="device"?"~":""}`).join("; ")||(dev?`tel ${dev.lat},${dev.lon}`:"bez GPS");
    r=await sb.from("requests").insert({farmer_id:FARMER.id,kind:"sell",com:row.com,price,tons,pickup_date:row.pickup_date,place:row.place,note:(`💬 NÁVRH CENY FARMÁRA ${f2(price)} €/t · ${row.note||""}`).slice(0,440)+(pts.length?` ·#${g}`:"")});
    
  }
  if(typeof busy==="function")busy(b,false);
  if(r.error){say("Nepodarilo sa odoslať: "+r.error.message,7000);return}
  O={...O,open:false,ph:[],mine:null};if(!r.status||true)say("✓ Návrh ceny odoslaný ERNTE. Ozveme sa vám.",5000);if(typeof loadFarmer==="function")await loadFarmer();renderFarmer()}
// vloženie do obrazovky farmára: hneď za Výkupné ceny
function injectF(){if(!isFarmer()||!F("f_offer"))return;const app=document.getElementById("app");if(!app||app.querySelector(".ofc"))return;
  if(O.mine===null)loadMine();
  const H=[...app.querySelectorAll("h2")].find(h=>/Výkupné ceny/i.test(h.textContent));let at=H;if(H){let n=H.nextElementSibling;while(n&&n.tagName!=="H2"){at=n;n=n.nextElementSibling}}
  const box=document.createElement("div");box.innerHTML=`<h2 id="ofH">💰 Navrhnite svoju cenu</h2>`+form();css();
  if(at)at.after(...box.childNodes);else{const t=app.querySelector(".ftl");(t||app.firstElementChild)?.after(...box.childNodes)}}
// ---------- ERNTE: Požiadavky → Návrhy cien ----------
async function loadList(){O.list=[];const r=await sb.from("farmer_offers").select("*").order("created_at",{ascending:false}).limit(100);if(r.error){O.tbl=false;O.list=[];return}O.tbl=true;O.list=r.data||[];if(typeof TAB!=="undefined"&&TAB==="req")renderStaff()}
function staffHTML(){const L=O.list;if(L===null){loadList();return ""}if(!O.tbl||!L.length)return "";const OWN=ROLE==="owner";
  return `<h2 id="ofStaff">💬 Návrhy cien od farmárov (${L.filter(o=>o.status==="nova").length} nové)</h2>`+L.slice(0,30).map(o=>{const fr=(STATE.farmers||[]).find(x=>x.id===o.farmer_id)||{},cur=(STATE.prices||[]).find(x=>x.com===o.com),G=Array.isArray(o.geo)?o.geo:[],Ph=Array.isArray(o.photos)?o.photos:[];
   return `<div class="card ofs"><div class="row"><b>${e(fr.name||"?")}</b>${pill(({nova:["nový návrh","w"],prijata:["prijaté",""],protinavrh:["protinávrh","b"],zamietnuta:["zamietnuté","r"]})[o.status]||[o.status])}</div>
    <div class="ds-chips">${dsChip("Plodina",e(comName(o.com)))}${dsChip("Množstvo",f2(o.tons)+" t")}${dsChip("Návrh farmára",f2(o.price)+" €/t")}${cur&&cur.price!=null&&(!window.canAny||canAny("price_view","deals"))?dsChip("Náš cenník",f2(cur.price)+" €/t"):""}${dsChip("Spolu",f2(o.price*o.tons)+" €")}</div>
    <div class="s">${[o.place,o.pickup_date&&"od "+dSK(o.pickup_date),o.note&&"„"+o.note+"“",typeof dtSK==="function"?dtSK(o.created_at):""].filter(Boolean).map(e).join(" · ")}</div>
    ${Ph.length?`<div class="ofgrid">${Ph.map((p,i)=>`<a class="ofp" href="${e(p.img)}" target="_blank" rel="noopener"><img src="${e(p.img)}" alt="Fotka zo skladu ${i+1}"><small>${p.lat!=null?"📍 EXIF":p.dev?"📍 telefón":"⚠️ bez GPS"}</small></a>`).join("")}</div>`:""}
    ${G.length?`<div class="s">📍 ISCC body: ${G.map((p,i)=>`<a class="copy" href="${mapL(p.lat,p.lon)}" target="_blank" rel="noopener">F${i+1} ${p.lat}, ${p.lon}${p.src==="device"?" (tel.)":""}</a>`).join(" · ")}</div>`:`<div class="s">⚠️ Bez GPS bodov</div>`}
    ${o.reply?`<div class="s">Odpoveď: ${e(o.reply)}</div>`:""}
    ${o.status==="nova"?`<div class="btns">${fr.phone?`<a class="btn" href="tel:${e(String(fr.phone).replace(/\s/g,""))}">📞 Volať</a>`:""}<button type="button" class="lime" data-ofst="prijata|${e(o.id)}">✓ Prijať</button><button type="button" data-ofst="protinavrh|${e(o.id)}">↔️ Protinávrh</button><button type="button" class="dng" data-ofst="zamietnuta|${e(o.id)}">Zamietnuť</button></div>`:""}</div>`}).join("")}
async function setSt(st,id){const o=(O.list||[]).find(x=>String(x.id)===String(id));if(!o)return;let reply="";
  if(st==="protinavrh"){const p=prompt("Váš protinávrh €/t pre farmára:",(STATE.prices||[]).find(x=>x.com===o.com)?.price||"");if(p==null)return;reply=`Protinávrh ERNTE: ${p} €/t`}
  else if(st==="prijata")reply=`Návrh ${f2(o.price)} €/t za ${f2(o.tons)} t prijatý – pripravíme zmluvu.`;else{const p=prompt("Dôvod zamietnutia (farmár ho uvidí):","");if(p==null)return;reply=p||"Zamietnuté."}
  const r=await sb.from("farmer_offers").update({status:st,reply,handled_by:(ME&&ME.staffName)||"",handled_at:new Date().toISOString()}).eq("id",o.id);if(r.error){say("Chyba: "+r.error.message,6000);return}
  O.list=null;say("✓ Uložené – farmár to uvidí.");renderStaff()}
function injectS(){if(!staffSees()||typeof TAB==="undefined"||TAB!=="req")return;const app=document.getElementById("app");if(!app||app.querySelector("#ofStaff"))return;const h=staffHTML();if(!h)return;css();
  const first=app.querySelector(".card .ds-hd")?.closest(".card")||null,box=document.createElement("div");box.innerHTML=h+`<h2>📥 Ostatné požiadavky</h2>`;if(first)first.before(...box.childNodes);else app.append(...box.childNodes)}
function css(){if(document.getElementById("ofCss"))return;const s=document.createElement("style");s.id="ofCss";s.textContent=`.ofgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:6px 0}.ofp{position:relative;display:grid;gap:2px;text-decoration:none;color:inherit}.ofp img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px;border:1px solid rgba(255,255,255,.15)}.ofp small{font-size:.68rem;opacity:.8}
.ofx{position:absolute;top:4px;right:4px;min-height:28px;min-width:28px;padding:0;border-radius:50%;font-size:.8rem}.ofadd{display:grid;place-items:center;aspect-ratio:1;border:2px dashed rgba(182,255,59,.5);border-radius:12px;font-weight:700;font-size:.82rem;text-align:center;padding:6px;cursor:pointer;color:inherit}
.ofmine{margin-top:10px;display:grid;gap:6px;border-top:1px solid rgba(255,255,255,.1);padding-top:8px}`;document.head.appendChild(s)}
function wrap(n,fn){const o=window[n];if(typeof o!=="function"||o["__of"+n])return;const w=function(){const r=o.apply(this,arguments);try{fn()}catch(x){}return r};w["__of"+n]=1;window[n]=w}
const t=setInterval(()=>{wrap("renderFarmer",injectF);wrap("renderStaff",injectS)},400);setTimeout(()=>clearInterval(t),60000);
document.addEventListener("click",ev=>{const g=s=>ev.target.closest&&ev.target.closest(s);let x;
  if(g("[data-ofopen]")){O.open=true;renderFarmer();setTimeout(()=>document.getElementById("fOffer")?.scrollIntoView({behavior:"smooth",block:"start"}),60);return}
  if(g("[data-ofclose]")){O.open=false;O.ph=[];renderFarmer();return}
  if(x=g("[data-ofrm]")){O.ph.splice(+x.dataset.ofrm,1);renderFarmer();return}
  if(x=g("[data-ofst]")){const [st,id]=x.dataset.ofst.split("|");setSt(st,id);return}},true);
document.addEventListener("change",ev=>{if(ev.target.matches&&ev.target.matches("[data-ofadd]")&&ev.target.files&&ev.target.files.length)addPhotos(ev.target.files)});
document.addEventListener("submit",ev=>{if(ev.target.id!=="fOffer")return;ev.preventDefault();ev.stopPropagation();submit(ev.target)},true);
window.offerOpen=()=>{O.open=true;renderFarmer();setTimeout(()=>document.getElementById("fOffer")?.scrollIntoView({behavior:"smooth",block:"start"}),60)};
window.__offersExif=exif;
})();
