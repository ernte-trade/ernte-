// ===== ZÚČTOVANIE ODBERATEĽA (iba majiteľ) =====
// Excel od odberateľa (Agro-Somotor…) má všetky lístky na ERNTE. Tu ho nahráš do aplikácie a lístky rozdelíš farmárom
// (aj novým zákazníkom). Pridelené lístky sa hneď zarátajú do zmlúv farmára a do Zúčtovania farmára.
(function(){
const O={imp:null,L:null,busy:false,d0:"",d1:"",only:"nerozd",com:"",plate:"",sel:new Set(),fq:"",nf:false,buyer:""};
try{O.buyer=localStorage.getItem("ernte-odb-buyer")||"Agro-Somotor s.r.o."}catch(x){O.buyer="Agro-Somotor s.r.o."}
const iso=d=>d.toISOString().slice(0,10);
if(!O.d0){const t=new Date();O.d1=iso(t);t.setDate(t.getDate()-21);O.d0=iso(t)}
const nz=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();
function comOf(n){n=nz(n);if(/soj|szoja/.test(n))return "soja";if(/psen|buza/.test(n))return /krm/.test(n)?"psenica_k":"psenica_p";if(/kukur|kukor/.test(n))return "kukurica";
  if(/rep|repce/.test(n))return "repka";if(/jacm|arpa/.test(n))return /slad/.test(n)?"jacmen_s":"jacmen_k";if(/slnec|napra/.test(n))return "lo";if(/cirok/.test(n))return "cirok";return null}
function xDate(v){if(v instanceof Date&&!isNaN(v))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,"0")}-${String(v.getDate()).padStart(2,"0")}`;
  if(typeof v==="number"&&v>40000&&v<60000)return new Date(Date.UTC(1899,11,30)+v*864e5).toISOString().slice(0,10);
  const m=String(v||"").match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);if(m)return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;const m2=String(v||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return m2?m2[0]:null}
const N=v=>{if(v==null||v==="")return null;const x=typeof v==="number"?v:num(String(v).replace(/\s/g,""));return isFinite(x)?x:null};
// čítanie Excelu odberateľa: hárky po komoditách, sekcia tovaru + sekcia Sušenie (body vlhkosti, kg)
function parseWB(X,wb){const rows=[],dry={},bad=[];
  for(const sn of wb.SheetNames){const A=X.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:true,defval:null});let mode=null,sec=sn,cu=null;
    for(const r0 of A){const r=(r0||[]).concat(Array(12).fill(null));const tk=typeof r[1]==="string"?r[1].trim():"";const d=xDate(r[0]);
      if(d&&/^[A-Z]{1,4}\d*\/?\d+/.test(tk)){
        if(mode==="dry"){dry[tk]={dp:N(r[5]),dk:N(r[7])};continue}
        const k=comOf(r[2]||sec)||comOf(sn);if(!k){bad.push(tk);continue}
        const pr=N(r[8]);rows.push({t:tk,d,k,p:String(r[3]||"").replace(/\s/g,"")||null,g:N(r[4]),i:N(r[5])!=null?Math.round(N(r[5])*100)/100:null,n:N(r[7]),
          s:pr==null?null:pr<5?Math.round(pr*100000)/100:pr,v:N(r[9]),o:String(r[10]||"").replace(/_x000D_|\r|\n/g," ").trim()||null,cu});continue}
      if(typeof r[0]==="string"&&typeof r[1]==="string"&&r.slice(2,11).every(v=>v==null||v==="")){
        if(/^[A-Z]{2}\d{3,}$/.test(r[0].trim())){cu=r[1].trim();continue}
        if(/su[sš]en|sz[aá]r[ií]t/i.test(r[1]))mode="dry";else{mode="goods";sec=r[1]}}}}
  for(const x of rows){const q=dry[x.t];if(q){x.dp=q.dp;x.dk=q.dk}}
  return {rows,bad}}
async function readFile(f){const X=await fcXlsxLib();const wb=X.read(await f.arrayBuffer(),{type:"array",cellDates:false});return parseWB(X,wb)}
const sumBy=(L,f)=>L.reduce((s,x)=>s+(+f(x)||0),0);
function impHTML(){const I=O.imp;
  let h=`<div class="card f"><h2 class="w odh">1️⃣ Nahrať Excel od odberateľa</h2>
   <label>Odberateľ<input id="odBuyer" value="${esc(O.buyer)}" list="odBuyers"></label><datalist id="odBuyers"><option value="Agro-Somotor s.r.o."></datalist>
   <label class="btn pri" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;min-height:44px">📂 Vybrať Excel (.xlsx)<input type="file" id="odFile" accept=".xlsx,.xls,.xlsm" hidden></label>
   <div class="w s">Zúčtovanie odberateľa (hárky Sója, Pšenica, Kukurica…): vážny lístok, ŠPZ, hrubá váha, nečistoty, čistá váha, cena, hodnota a sušenie. Lístky, ktoré už v aplikácii sú, sa len aktualizujú a <b>pridelenie farmárovi ostane</b>.</div></div>`;
  if(!I)return h;
  if(I.err)return h+`<div class="card"><div class="s">⚠️ ${esc(I.err)}</div></div>`;
  const by={};for(const x of I.rows)(by[x.k]=by[x.k]||[]).push(x);
  h+=`<div class="card"><b>${esc(I.name)} · ${I.rows.length} lístkov · ${fmt(sumBy(I.rows,x=>x.v),2)} €</b>${I.bad.length?`<div class="s">⚠️ Neznámy tovar pri lístkoch: ${esc(I.bad.join(", "))}</div>`:""}
   <div class="hrt"><table><thead><tr><th>Komodita</th><th>Lístky</th><th>Hrubá t</th><th>Čistá t</th><th>Sušenie kg</th><th>€/t</th><th>Hodnota €</th></tr></thead><tbody>${Object.entries(by).map(([k,L])=>`<tr><td><b>${esc(comName(k))}</b></td><td>${L.length}</td><td>${fmt(sumBy(L,x=>x.g)/1000,3)}</td><td>${fmt(sumBy(L,x=>x.n)/1000,3)}</td><td>${fmt(sumBy(L,x=>x.dk),0)}</td><td>${[...new Set(L.map(x=>x.s))].map(v=>fmt(v,2)).join(", ")}</td><td>${fmt(sumBy(L,x=>x.v),2)}</td></tr>`).join("")}</tbody></table></div>
   <div class="btns"><button type="button" class="pri" data-odsave="1">💾 Uložiť ${I.rows.length} lístkov do aplikácie</button><button type="button" data-odx="1">Zrušiť</button></div></div>`;
  return h}
function load(){if(O.busy)return;O.busy=true;sb.rpc("buyer_tickets",{d0:O.d0||null,d1:O.d1||null}).then(r=>{O.busy=false;O.L=r.error?{err:/does not exist|could not find/i.test(r.error.message)?"Zapne sa po aktualizácii databázy (pár minút).":r.error.message}:r.data||[];renderStaff()})}
function view(){const L=Array.isArray(O.L)?O.L:[];return L.filter(x=>(O.only==="all"||(O.only==="nerozd"?!x.f:!!x.f))&&(!O.com||x.k===O.com)&&(!O.plate||x.p===O.plate))}
function listHTML(){let h=`<div class="card f"><h2 class="w odh">2️⃣ Rozdeliť lístky farmárom</h2>
   <label>Od<input type="date" id="odD0" value="${esc(O.d0)}"></label><label>Do<input type="date" id="odD1" value="${esc(O.d1)}"></label>`;
  if(O.L===null){load();return h+`<div class="w s">Načítavam lístky…</div></div>`}
  if(O.L.err)return h+`<div class="w s">${esc(O.L.err)}</div></div>`;
  const A=O.L,nr=A.filter(x=>!x.f),V=view(),coms=[...new Set(A.map(x=>x.k))],plates=[...new Set(A.filter(x=>!O.com||x.k===O.com).map(x=>x.p).filter(Boolean))].sort();
  h+=`<div class="w btns seg2">${[["nerozd",`Nerozdelené (${nr.length})`],["rozd",`Pridelené (${A.length-nr.length})`],["all",`Všetky (${A.length})`]].map(k=>`<button type="button" data-odonly="${k[0]}" aria-pressed="${O.only===k[0]}">${k[1]}</button>`).join("")}</div>
   <div class="w s">Nerozdelené: <b>${nr.length} lístkov · ${fmt(sumBy(nr,x=>x.g)/1000,3)} t hrubá · ${fmt(sumBy(nr,x=>x.v),2)} €</b></div>
   <label>Komodita<select id="odCom"><option value="">všetky</option>${coms.map(k=>`<option value="${esc(k)}"${O.com===k?" selected":""}>${esc(comName(k))}</option>`).join("")}</select></label>
   <label>ŠPZ<select id="odPlate"><option value="">všetky</option>${plates.map(k=>`<option value="${esc(k)}"${O.plate===k?" selected":""}>${esc(k)}</option>`).join("")}</select></label></div>`;
  // výber farmára + pridelenie
  const sel=[...O.sel].filter(t=>A.some(x=>x.t===t)),SL=A.filter(x=>O.sel.has(x.t));
  h+=`<div class="card f odbar"><label class="w">Farmár / zákazník<input id="odFq" list="odFarms" value="${esc(O.fq)}" placeholder="začni písať meno…" autocomplete="off"></label>
   <datalist id="odFarms">${(STATE.farmers||[]).map(f=>`<option value="${esc(f.name)}">`).join("")}</datalist>
   <div class="w s">Označené: <b>${sel.length} lístkov · ${fmt(sumBy(SL,x=>x.g)/1000,3)} t · ${fmt(sumBy(SL,x=>x.v),2)} €</b></div>
   <div class="w btns"><button type="button" class="pri" data-odasg="1"${sel.length?"":" disabled"}>✓ Prideliť farmárovi</button><button type="button" data-odall="1">☑️ Označiť zobrazené (${V.length})</button>${sel.length?`<button type="button" data-odnone="1">Zrušiť označenie</button><button type="button" data-odun="1">↩️ Zrušiť pridelenie</button>`:""}<button type="button" data-odnf="1">➕ Nový zákazník</button></div>
   ${O.nf?`<form id="fOdNf" class="w odnf"><b>➕ Nový zákazník (farmár)</b><label>Meno / firma *<input name="name" required value="${esc(O.fq)}"></label><label>IČO<input name="ico" inputmode="numeric"></label><label>Telefón<input name="phone" type="tel"></label><label>Adresa<input name="addr"></label>
     <div class="s">Ostatné údaje (DIČ, IBAN, e-mail, prihlásenie) doplníš neskôr v záložke Farmári.</div><div class="btns"><button type="submit" class="pri">💾 Uložiť zákazníka</button><button type="button" data-odnf="0">Zrušiť</button></div></form>`:""}</div>`;
  if(!V.length)return h+`<div class="card"><div class="s">${O.only==="nerozd"&&A.length?"✅ Všetky lístky v tomto období sú rozdelené.":"Žiadne lístky v tomto období. Nahraj Excel hore alebo zmeň dátumy."}</div></div>`;
  h+=`<div class="card odl">${V.map(x=>`<label class="odr${O.sel.has(x.t)?" on":""}"><input type="checkbox" data-odt="${esc(x.t)}"${O.sel.has(x.t)?" checked":""}>
     <span class="odm"><b>${esc(x.t)}</b> · ${esc(dSK(x.d))} · ${esc(comName(x.k))} · <span class="klp">${esc(x.p||"–")}</span><small>${fmt(x.g/1000,3)} t hrubá · nečist. ${fmt(x.i,1)} % · čistá ${fmt(x.n/1000,3)} t${x.m!=null?` · vlhkosť ${fmt(x.m,1)} %`:""}${x.dk?` · sušenie ${fmt(x.dk,0)} kg`:""}${x.pr!=null?` · bielk. ${fmt(x.pr,1)} %`:""}</small></span>
     <span class="odv"><b>${fmt(x.v,2)} €</b>${x.f?`<em class="odf">👨‍🌾 ${esc(x.fn||"")}${x.dn?` · ${esc(x.dn)}`:" · bez zmluvy"}</em>`:`<em class="odf no">nerozdelené</em>`}</span></label>`).join("")}</div>`;
  return h}
window.odbHTML=function(){if(ROLE!=="owner")return "";return impHTML()+listHTML()+`<div class="s">🔒 Vidíš iba ty. Farmár po pridelení vidí len svoje lístky a svoje zúčtovanie – nikdy odberateľa ani predajnú cenu.</div>`};
const farmId=n=>{const v=nz(n);const f=(STATE.farmers||[]).find(x=>nz(x.name)===v);return f?f.id:null};
async function assign(b,fid){const T=[...O.sel];if(!T.length)return;busy(b,true);const r=await sb.rpc("deliveries_assign",{p_tickets:T,p_farmer:fid});busy(b,false);
  if(r.error){toast("Chyba: "+r.error.message,7000);return}const d=r.data||{};O.sel.clear();O.L=null;
  toast(fid?`✓ ${d.n} lístkov pridelených: ${d.farmer}.${d.bez_zmluvy?` ⚠️ ${d.bez_zmluvy} bez zmluvy – farmár nemá zmluvu na túto komoditu (pridaj ju v Obchodoch).`:" Zarátané do jeho zmlúv a zúčtovania."}`:`↩️ Pridelenie zrušené (${d.n} lístkov).`,8000);renderStaff()}
document.addEventListener("change",async e=>{const t=e.target;if(!t||ROLE!=="owner")return;
  if(t.id==="odFile"){const f=t.files&&t.files[0];if(!f)return;try{const r=await readFile(f);O.imp={name:f.name,rows:r.rows,bad:r.bad};if(!r.rows.length)O.imp.err="V súbore som nenašiel žiadne vážne lístky (stĺpce Dátum, Vážny lístok, Tovar, ŠPZ…)."}catch(x){O.imp={err:"Súbor sa nepodarilo prečítať: "+(x&&x.message||x)}}renderStaff();return}
  if(t.id==="odBuyer"){O.buyer=t.value.trim();try{localStorage.setItem("ernte-odb-buyer",O.buyer)}catch(x){}return}
  if(t.id==="odD0"||t.id==="odD1"){O[t.id==="odD0"?"d0":"d1"]=t.value;O.L=null;renderStaff();return}
  if(t.id==="odCom"){O.com=t.value;O.plate="";renderStaff();return}
  if(t.id==="odPlate"){O.plate=t.value;renderStaff();return}
  if(t.id==="odFq"){O.fq=t.value;return}
  if(t.dataset&&t.dataset.odt!=null){t.checked?O.sel.add(t.dataset.odt):O.sel.delete(t.dataset.odt);renderStaff()}});
document.addEventListener("input",e=>{if(e.target&&e.target.id==="odFq")O.fq=e.target.value});
document.addEventListener("click",async e=>{const t=e.target;if(!t.closest||ROLE!=="owner")return;let x;
  if(x=t.closest("[data-odsave]")){const I=O.imp;if(!I||!I.rows)return;busy(x,true);let tot={nove:0,aktualizovane:0,nerozdelene:0},r;
    for(let i=0;i<I.rows.length;i+=200){r=await sb.rpc("buyer_import",{rows:I.rows.slice(i,i+200),p_buyer:O.buyer||null});if(r.error)break;for(const k in tot)tot[k]+=+r.data[k]||0}
    busy(x,false);if(r.error){toast("Chyba: "+r.error.message,8000);return}
    const ds=I.rows.map(x=>x.d).sort();O.d0=ds[0];O.d1=ds[ds.length-1];O.imp=null;O.L=null;O.only="nerozd";
    toast(`✓ ${tot.nove} nových, ${tot.aktualizovane} aktualizovaných lístkov. Nerozdelených: ${tot.nerozdelene} – rozdeľ ich nižšie.`,8000);renderStaff();return}
  if(t.closest("[data-odx]")){O.imp=null;renderStaff();return}
  if(x=t.closest("[data-odonly]")){O.only=x.dataset.odonly;renderStaff();return}
  if(t.closest("[data-odall]")){view().forEach(v=>O.sel.add(v.t));renderStaff();return}
  if(t.closest("[data-odnone]")){O.sel.clear();renderStaff();return}
  if(x=t.closest("[data-odnf]")){O.nf=x.dataset.odnf!=="0";const i=document.getElementById("odFq");if(i)O.fq=i.value;renderStaff();return}
  if(x=t.closest("[data-odun]")){await assign(x,null);return}
  if(x=t.closest("[data-odasg]")){const i=document.getElementById("odFq");if(i)O.fq=i.value;const fid=farmId(O.fq);
    if(!fid){toast(O.fq?`„${O.fq}“ nie je medzi farmármi – vyber zo zoznamu alebo ťukni ➕ Nový zákazník.`:"Vyber farmára (začni písať meno).",6000);if(O.fq){O.nf=true;renderStaff()}return}
    await assign(x,fid);return}});
document.addEventListener("submit",async e=>{if(!e.target||e.target.id!=="fOdNf")return;e.preventDefault();e.stopPropagation();const f=e.target,fd=new FormData(f),b=f.querySelector("button[type=submit]");
  const row={name:String(fd.get("name")||"").trim(),active:true};for(const k of ["ico","phone","addr"]){const v=String(fd.get(k)||"").trim();if(v)row[k]=v}
  if(row.name.length<3){toast("Napíš meno alebo názov firmy.");return}
  if((STATE.farmers||[]).some(x=>nz(x.name)===nz(row.name))){O.fq=row.name;O.nf=false;toast("Tento zákazník už existuje – vybraný.");renderStaff();return}
  busy(b,true);const r=await sb.from("farmers").insert(row).select().single();busy(b,false);
  if(r.error){toast("Nepodarilo sa uložiť: "+r.error.message,7000);return}
  (STATE.farmers=STATE.farmers||[]).push(r.data);O.fq=r.data.name;O.nf=false;toast(`✓ Zákazník ${r.data.name} pridaný. Teraz označ lístky a ťukni Prideliť.`,6000);renderStaff()},true);
})();
