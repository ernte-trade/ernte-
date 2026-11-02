// ===== ERNTE · ZÚČTOVANIE (pravidlá z Excelu ZÚČTOVANIE 2026) =====
// Majiteľ: vkladanie z Excelu, zúčtovanie farmára, prehľady, pravidlá. Farmár: svoj prehľad, zmluvy, lístky, zúčtovanie.
(function(){
const COMK={JACMEN:"jacmen_k","JACMEN KRMNY":"jacmen_k","JACMEN SLADOVNICKY":"jacmen_s",REPKA:"repka",PSENICA:"psenica_p","PSENICA KRMNA":"psenica_k",SOJA:"soja",KUKURICA:"kukurica",SLNECNICA:"lo"};
const nz=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase().trim().replace(/\s+/g," ");
const comOf=s=>COMK[nz(s)]||COMK[nz(s).split(" ")[0]]||null;
const nn=v=>{if(v==null)return null;const t=String(v).replace(/[\s €]/g,"");if(!t)return null;const x=num(t);return isFinite(x)?x:null};
function pDate(v){v=String(v||"").trim();let m=v.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);if(m)return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;m=v.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[0];
  m=v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(m)return `${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;const x=+v;if(x>40000&&x<60000){const d=new Date(Date.UTC(1899,11,30)+x*864e5);return d.toISOString().slice(0,10)}return null}
const rowsOf=t=>String(t||"").replace(/\r/g,"").split("\n").filter(l=>l.trim()).map(l=>l.split("\t"));
// --- parsery vloženého textu z Excelu ---
function parseTickets(txt){const out=[],bad=[];for(const r of rowsOf(txt)){const tk=String(r[2]||"").trim();if(!tk||/lístok|listok/i.test(tk))continue;
  const d=pDate(r[0]),k=comOf(r[3]);if(!d||!k){bad.push(tk+(d?"":" (dátum)")+(k?"":" (tovar)"));continue}
  out.push({d,f:String(r[1]||"").trim(),t:tk,k,p:String(r[4]||"").replace(/\s/g,"")||null,g:nn(r[5]),i:nn(r[6]),n:nn(r[8]),s:nn(r[9]),o:String(r[11]||"").trim()||null,b:nn(r[12])})}
  return {out,bad}}
function parseContracts(txt,com){const out=[],bad=[];for(const r of rowsOf(txt)){const c=r.map(x=>String(x||"").trim());
  let i=c.findIndex(x=>/^[A-ZŽ]\d{4}\/\d+|^[A-Z]{1,2}\d*\/\d{4}/i.test(x));if(i<0){if(c.some(Boolean))bad.push(c.join(" ").slice(0,40));continue}
  const code=i>0&&/^C\d+/i.test(c[i-1])?c[i-1]:null;out.push({code,no:c[i],firm:c[i+1]||"",tons:nn(c[i+2]),price:nn(c[i+3]),com})}return {out,bad}}
function parseWheat(txt){const out=[];let hdr=null;for(const r of rowsOf(txt)){const c=r.map(x=>String(x||"").trim());
  if(/^kvalita|^zml/i.test(c[0])){hdr=c.slice(2,11);continue}
  if(/^P\d{4}\/\d+/i.test(c[0])){const H=hdr||["pod10%","min.10%-10,49%","10,5%-10,99%","11%-11,49%","11,5%-11,99%","12%-12,49%","12,5%-12,99%","nad 13%"];
    const bands=H.map((h,j)=>{const p=nn(c[2+j]);if(!(p>0))return null;const t=String(h).toLowerCase();const m=t.match(/(\d+(?:[.,]\d+)?)/);return {min:/^(pod|do)/.test(t)?0:m?+m[1].replace(",","."):0,price:p}}).filter(Boolean).sort((a,b)=>a.min-b.min);
    if(bands.length)out.push({contract_no:c[0],farmer_name:c[1],bands})}}return out}

// ===== MAJITEĽ =====
let Z={sec:"",com:"",deal:"",farm:"",fq:"",C:null,L:{},open:null,d0:"",d1:"",rep:null,rules:null,paste:{kind:"tk",txt:"",prev:null,com:"jacmen_k"}};
const SECS=[["odb","📥","Zúčtovanie odberateľa","nahrať Excel odberateľa · rozdeliť lístky farmárom"],["paste","⬇️","Vložiť z Excelu","lístky · zmluvy · ceny pšenice"],["farm","👨‍🌾","Zúčtovanie farmára","zmluvy · lístky · PDF"],["rep","📊","Prehľady","týždeň · odberateľ · ŠPZ"],["rules","⚙️","Pravidlá","normy · sadzby · výnimky"]];
window.zuctSec=k=>{Z.sec=k};window.vZuct=function(){if(ROLE!=="owner")return `<div class="card"><div class="s">Zúčtovanie vidí iba majiteľ.</div></div>`;
  let h=`<div class="zt"><h2>🧾 Zúčtovanie ${Z.sec?`<button type="button" class="ztb" data-zsec="">← späť</button>`:""}</h2>`;
  if(!Z.sec)return h+`<div class="zgrid">${SECS.map(s=>`<button type="button" class="zbtn" data-zsec="${s[0]}"><span>${s[1]}</span><b>${s[2]}</b><small>${s[3]}</small></button>`).join("")}</div>`+(window.zdashHTML?zdashHTML():"")+`<div class="s">🔒 Zúčtovanie, predaj, marže a prehľady vidíš iba ty. Farmár vidí len svoje lístky, svoju zmluvu, cenu a zúčtovanie.</div></div>`;
  if(Z.sec==="odb")h+=(window.odbHTML?odbHTML():"");else if(Z.sec==="paste")h+=pasteHTML();else if(Z.sec==="farm")h+=farmHTML();else if(Z.sec==="rep")h+=repHTML();else if(Z.sec==="rules")h+=rulesHTML();
  return h+`</div>`};
// --- vkladanie ---
function pasteHTML(){const P=Z.paste;
  let h=`<div class="card f"><div class="w btns seg2">${[["tk","⚖️ Vážne lístky"],["ct","📝 Nákupné zmluvy"],["wp","🌾 Ceny pšenice"]].map(k=>`<button type="button" data-zpk="${k[0]}" aria-pressed="${P.kind===k[0]}">${k[1]}</button>`).join("")}</div>
   <div class="w s">${P.kind==="tk"?"V Exceli v hárku <b>Odberateľ zúčtovanie</b> označ riadky (stĺpce <b>A až M</b>: dátum, zákazník, lístok, tovar, ŠPZ, hrubá váha, nečistoty, čistota, čistá váha, cena, hodnota, poznámka, nákupná cena), skopíruj a vlož sem. Lístky, ktoré už existujú, sa len aktualizujú.":P.kind==="ct"?"V hárku <b>ID Klient +info</b> označ blok zmlúv jednej komodity (ID KLIENT, ZML., PODNIK, T, €), skopíruj a vlož. Vyber komoditu.":"V hárku <b>Ceny pšenice</b> označ riadky aj s hlavičkou <b>KVALITA (N)%</b>, skopíruj a vlož."}</div>
   ${P.kind==="ct"?`<label>Komodita<select id="zpCom">${MK.map(m=>`<option value="${m[0]}"${P.com===m[0]?" selected":""}>${esc(m[1])}</option>`).join("")}</select></label>`:""}
   <label class="w">Vlož riadky z Excelu<textarea id="zpTxt" class="zta" placeholder="Ctrl+V / podrž prst → Vložiť">${esc(P.txt)}</textarea></label>
   <div class="w btns"><button type="button" data-zprev="1">👁️ Skontrolovať</button>${P.prev&&P.prev.n?`<button type="button" class="pri" data-zsave="1">💾 Uložiť ${P.prev.n} ${P.kind==="tk"?"lístkov":P.kind==="ct"?"zmlúv":"cenníkov"}</button>`:""}</div></div>`;
  if(P.prev)h+=`<div class="card">${P.prev.html}</div>`;return h}
function preview(){const P=Z.paste;P.txt=(document.getElementById("zpTxt")||{}).value||P.txt;const c=document.getElementById("zpCom");if(c)P.com=c.value;
  if(P.kind==="tk"){const {out,bad}=parseTickets(P.txt);P.data=out;const t=out.reduce((s,x)=>s+(x.g||0),0)/1000;
    P.prev={n:out.length,html:`<b>${out.length} lístkov · ${fmt(t,3)} t</b>${bad.length?`<div class="s wn">⚠️ ${bad.length} riadkov sa nedá prečítať: ${esc(bad.slice(0,5).join(", "))}</div>`:""}<div class="hrt"><table><thead><tr><th>Dátum</th><th>Farmár</th><th>Lístok</th><th>Tovar</th><th>Váha kg</th><th>Neč. %</th><th>Predaj</th><th>Nákup</th></tr></thead><tbody>${out.slice(0,12).map(x=>`<tr><td>${esc(dSK(x.d))}</td><td>${esc(x.f)}</td><td>${esc(x.t)}</td><td>${esc(comName(x.k))}</td><td>${fmt(x.g||0,0)}</td><td>${x.i!=null?fmt(x.i,2):"–"}</td><td>${x.s!=null?fmt(x.s):"–"}</td><td>${x.b!=null?fmt(x.b):"<span class=wn>chýba</span>"}</td></tr>`).join("")}</tbody></table></div>${out.length>12?`<div class="s">…a ďalších ${out.length-12}.</div>`:""}`}}
  else if(P.kind==="ct"){const {out,bad}=parseContracts(P.txt,P.com);P.data=out.filter(x=>x.tons>0);
    P.prev={n:P.data.length,html:`<b>${P.data.length} zmlúv · ${fmt(P.data.reduce((s,x)=>s+x.tons,0),0)} t · ${esc(comName(P.com))}</b>${bad.length?`<div class="s">Preskočené riadky: ${bad.length}</div>`:""}<div class="hrt"><table><thead><tr><th>ID</th><th>Zmluva</th><th>Podnik</th><th>t</th><th>€/t</th></tr></thead><tbody>${P.data.slice(0,15).map(x=>`<tr><td>${esc(x.code||"–")}</td><td>${esc(x.no)}</td><td>${esc(x.firm)}</td><td>${fmt(x.tons,0)}</td><td>${x.price?fmt(x.price):"podľa kvality"}</td></tr>`).join("")}</tbody></table></div>`}}
  else{const out=parseWheat(P.txt);P.data=out;P.prev={n:out.length,html:`<b>${out.length} zmlúv pšenice s cenami podľa dusíka</b><div class="hrt"><table><thead><tr><th>Zmluva</th><th>Podnik</th><th>Pásma (od % → €/t)</th></tr></thead><tbody>${out.slice(0,12).map(x=>`<tr><td>${esc(x.contract_no)}</td><td>${esc(x.farmer_name||"")}</td><td>${x.bands.map(b=>fmt(b.min,1)+"% → "+fmt(b.price,0)).join(" · ")}</td></tr>`).join("")}</tbody></table></div>`}}
  renderStaff()}
async function savePaste(b){const P=Z.paste;if(!P.data||!P.data.length)return;busy(b,true);let r;
  if(P.kind==="tk"){let tot={nove:0,aktualizovane:0,novi_farmari:[]};for(let i=0;i<P.data.length;i+=300){r=await sb.rpc("deliveries_paste",{rows:P.data.slice(i,i+300)});if(r.error)break;tot.nove+=r.data.nove;tot.aktualizovane+=r.data.aktualizovane;tot.novi_farmari.push(...(r.data.novi_farmari||[]))}
    busy(b,false);if(r.error){toast("Chyba: "+r.error.message,7000);return}toast(`✓ ${tot.nove} nových, ${tot.aktualizovane} aktualizovaných lístkov${tot.novi_farmari.length?" · noví farmári: "+tot.novi_farmari.join(", "):""}. Zúčtovanie sa prepočítalo.`,8000)}
  else if(P.kind==="ct"){r=await sb.rpc("contracts_paste",{rows:P.data});busy(b,false);if(r.error){toast("Chyba: "+r.error.message,7000);return}toast(`✓ ${r.data.zmluvy} zmlúv uložených.`)}
  else{r=await sb.from("wheat_prices").upsert(P.data.map(x=>({...x,updated_at:new Date().toISOString()})));busy(b,false);if(r.error){toast("Chyba: "+r.error.message,7000);return}toast(`✓ Ceny pšenice pre ${P.data.length} zmlúv uložené.`)}
  P.txt="";P.prev=null;P.data=null;Z.C=null;Z.rep=null;renderStaff()}
// --- zúčtovanie farmára ---
// zoznam farmárov pri písaní – prekreslí sa iba zoznam (obrazovka neskáče, klávesnica ostane otvorená)
function zflList(){const q=nz(Z.fq);const F=(STATE.farmers||[]).filter(f=>String(f.name||"").trim()).sort((a,b)=>String(a.name).localeCompare(String(b.name),"sk"));
  const L=q?F.filter(f=>nz(f.name+" "+(f.code||"")+" "+(f.ico||"")).includes(q)).slice(0,40):[];
  return L.length?`<div class="zfl">${L.map(f=>`<button type="button" data-zfarm="${esc(f.id)}"><b>${esc(f.name)}</b><small>${esc([f.code,f.ico&&"IČO "+f.ico].filter(Boolean).join(" · "))}</small></button>`).join("")}</div>`:`<div class="s">${q?"Nikto taký – skús časť mena, ID alebo IČO.":"Napíš meno farmára, jeho ID alebo IČO."}</div>`}
// lístky farmára bez zmluvy → vytvoriť zmluvu na dodané množstvo
async function loadNoc(fid){const r=await sb.from("deliveries").select("ticket,com,day,gross_kg,net_kg").eq("farmer_id",fid).is("deal_id",null).order("day");Z.noc=Z.noc||{};Z.noc[fid]=r.error?{err:r.error.message}:r.data||[];renderStaff()}
function nocHTML(F){Z.noc=Z.noc||{};const N=Z.noc[F.id];if(N===undefined){Z.noc[F.id]=null;loadNoc(F.id);return ""}if(!N||N.err||!N.length)return "";
  const G={};N.forEach(x=>{const k=x.com||"?";(G[k]=G[k]||[]).push(x)});
  return `<div class="card zno"><b class="sth">⚠️ Lístky bez zmluvy</b><div class="s">Tieto dodávky nemajú kúpnu zmluvu, preto nie sú v zúčtovaní. Vytvor zmluvu presne na dodané množstvo – lístky sa k nej hneď priradia.</div>
   ${Object.entries(G).map(([k,L])=>{const t=Math.round(L.reduce((a,x)=>a+(+(x.gross_kg??x.net_kg)||0),0)/10)/100,d0=L[0].day,d1=L[L.length-1].day;
     return `<form class="znoc" data-znoc="${esc(k)}"><div class="w"><b>${esc(comName(k))}</b> · ${L.length} ${L.length===1?"lístok":L.length<5?"lístky":"lístkov"} · <b>${fmt(t,2)} t</b> · ${esc(dSK(d0))}${d1!==d0?" – "+esc(dSK(d1)):""}<small>${L.slice(0,8).map(x=>esc(x.ticket)).join(", ")}${L.length>8?" …":""}</small></div>
      <label>Množstvo t<input name="tons" inputmode="decimal" value="${String(t).replace(".",",")}" required></label><label>Cena €/t<input name="price" inputmode="decimal" required placeholder="napr. 480"></label>
      <div class="w btns"><button type="submit" class="pri">📄 Vytvoriť zmluvu na ${fmt(t,2)} t</button></div></form>`}).join("")}</div>`}
document.addEventListener("submit",async e=>{const fm=e.target;if(!fm.dataset||fm.dataset.znoc==null)return;e.preventDefault();e.stopPropagation();if(fm._b)return;
  const F=Z.C&&Z.C.farmer;if(!F)return;const com=fm.dataset.znoc,d=new FormData(fm),tons=num(d.get("tons")),price=num(d.get("price"));
  if(!(tons>0)){toast("Zadaj množstvo v t.");return}if(!(price>0)){toast("Zadaj cenu €/t.");return}
  const L=((Z.noc||{})[F.id]||[]).filter(x=>(x.com||"?")===com);if(!L.length)return;fm._b=1;const b=fm.querySelector("button[type=submit]");if(typeof busy==="function")busy(b,true);
  try{const r=await sb.rpc("qd_save",{p:{farmer_id:F.id,farmar:{nazov:F.name},com,tons,price,od:L[0].day,do:L[L.length-1].day,miesto:"",note:"zmluva na dodané lístky bez zmluvy"}});if(r.error)throw r.error;
    const a=await sb.rpc("deliveries_assign",{p_tickets:L.map(x=>x.ticket),p_farmer:F.id});if(a.error)throw a.error;
    toast(`✓ Zmluva ${r.data&&r.data.no?r.data.no+" ":""}na ${fmt(tons,2)} t vytvorená, ${L.length} lístkov priradených. Farmárovi odišla na podpis.`,7000);
    Z.noc[F.id]=undefined;Z.C=null;Z.L={};Z.com=com;Z.deal=r.data&&r.data.deal_id||"";renderStaff()}
  catch(x){toast("Chyba: "+(x.message||x),7000)}finally{fm._b=0;if(typeof busy==="function")busy(b,false)}},true);

function farmHTML(){const F=(STATE.farmers||[]).filter(f=>String(f.name||"").trim()).sort((a,b)=>String(a.name).localeCompare(String(b.name),"sk")),q=nz(Z.fq);
  const C=Z.C&&!Z.C.err?Z.C:null,K=C?(C.contracts||[]).filter(k=>!window.rokOk||rokOk(k)):[],coms=[...new Set(K.map(k=>k.com))];
  if(C&&K.length){if(Z.com!=="*"&&!coms.includes(Z.com))Z.com=coms[0];const KC=K.filter(k=>Z.com==="*"||k.com===Z.com);if(Z.deal!=="*"&&!KC.some(k=>k.id===Z.deal))Z.deal=Z.com==="*"?"*":(KC.find(k=>k.remain_t>0.01)||KC[0]).id}
  let h=`<div class="card f zform"><div class="w t">Zúčtovanie dodávateľa</div>
   <label class="w">Zákazník (farmár)<input id="zfq" list="zfl" value="${esc(Z.fq)}" placeholder="meno alebo ID, napr. C0102" autocomplete="off"></label><datalist id="zfl">${F.map(f=>`<option value="${esc(f.name)}">${esc(f.code||"")}</option>`).join("")}</datalist>
   ${C&&K.length?`<label>Komodita<select id="zcom">${coms.length>1?`<option value="*"${Z.com==="*"?" selected":""}>📚 Všetky komodity</option>`:""}${coms.map(c=>`<option value="${c}"${c===Z.com?" selected":""}>${esc(comName(c))}</option>`).join("")}</select></label>
   <label>Číslo zmluvy<select id="zdeal"><option value="*"${Z.deal==="*"?" selected":""}>📚 Všetky zmluvy (${K.filter(k=>Z.com==="*"||k.com===Z.com).length})</option>${K.filter(k=>Z.com==="*"||k.com===Z.com).map(k=>`<option value="${esc(k.id)}"${k.id===Z.deal?" selected":""}>${esc(k.no)} · ${fmt(k.tons,0)} t${k.remain_t<=0.01?" ✓":""}</option>`).join("")}</select></label>`:""}
   <label>Dátum od<input type="date" id="zd0" value="${esc(Z.d0)}"></label><label>Dátum do<input type="date" id="zd1" value="${esc(Z.d1)}"></label>
   ${Z.d0||Z.d1?`<div class="w btns"><button type="button" data-zclr="1">✕ Celá zmluva (bez dátumu)</button></div>`:`<div class="w s">Bez dátumu = celá zmluva. Zadaj od–do, ak zúčtovávaš len časť dodávok (napr. za týždeň).</div>`}</div>`;
  if(!Z.farm)return h+`<div id="zflBox">${zflList()}</div>`;
  if(!Z.C){loadC();return h+`<div class="card"><div class="s">Počítam zúčtovanie…</div></div>`}if(Z.C.err)return h+`<div class="card"><div class="s">${/settle_contracts/.test(Z.C.err)?"Zúčtovanie sa zapne po aktualizácii databázy (pár minút).":esc(Z.C.err)}</div></div>`;
  const f=C.farmer||{};h+=`<div class="card zfh"><div><b>${esc(f.name||"")}</b><small>${esc([f.code,f.addr,f.phone].filter(Boolean).join(" · "))}</small></div><div class="zfhb"><button type="button" class="zrekb" data-zrektop="1">⚠️ Reklamácia</button><button type="button" data-zfarm="">Iný farmár</button></div></div>`;
  h+=nocHTML(f);
  if(!K.length)return h+`<div class="card"><div class="s">Farmár nemá žiadnu zmluvu.${(Z.noc||{})[f.id]&&(Z.noc[f.id]||[]).length?" Vytvor ju vyššie z jeho lístkov.":""}</div></div>`;
  if(Z.deal==="*")return h+allHTML(K.filter(x=>Z.com==="*"||x.com===Z.com));
  const k=K.find(x=>x.id===Z.deal);if(!k)return h;const LA=Z.L[k.id];if(!LA){loadL(k.id).then(renderStaff);return h+`<div class="card"><div class="s">Načítavam lístky…</div></div>`}
  const P=periodOf(LA),S=sumL(P),A=sumL(LA),per=Z.d0||Z.d1,over=k.remain_t<0,kg=LA[0]&&LA[0].kg_mode;
  const st=k.last&&over&&-k.remain_t>tolOf(k)?`Fakturuje sa celé dodané množstvo (${fmt(k.delivered_t,2)} t) – posledná zmluva prekročená o ${fmt(-k.remain_t,0)} t`:`Fakturuje sa podľa zmluvy (${fmt(k.delivered_t,2)} t)`;
  h+=`<div class="card zc"><div class="row"><span class="t">${esc(k.no)} · ${esc(comName(k.com))}</span>${pill(DST[k.status]||[k.status])}</div>
   <b class="sth">Súhrn zúčtovania${per?` · ${Z.d0?dSK(Z.d0):"…"} – ${Z.d1?dSK(Z.d1):"…"}`:" · celá zmluva"}</b>
   <div class="zsg">${[["Netto váha",fmt(S.g,0)+" kg"],["Fakturačná váha",fmt(S.w,0)+" kg"],["Cena €/t",k.com==="psenica_p"&&k.wheat_bands?"podľa kvality":fmt(k.price)],["Po čistení",fmt(S.c,0)+" kg"],["Po sušení",fmt(S.d,0)+" kg"],["Technologická zrážka (váha)",fmt(S.g-S.d,0)+" kg"+(S.g>0?" · "+fmt((S.g-S.d)/S.g*100,1)+" %":""),"wn"],
     [kg?"Čistenie (odrátané vo váhe)":"Čistenie – odrátané vo váhe",fmt(S.cc,2)+(kg?" kg":" €")],[kg?"Sušenie (odrátané vo váhe)":"Sušenie – odrátané vo váhe",fmt(S.dc,2)+(kg?" kg":" €")],["Na úhradu po zrážkach",fmt(S.pay,2)+" €","hl"],["Reálna cena po zrážkach",realTxt(S)]].map(x=>`<div class="${x[2]||""}"><small>${x[0]}</small><b>${x[1]}</b></div>`).join("")}</div>
   <b class="sth">Zmluva</b>
   <div class="zsg">${[["Zmluva",fmt(k.tons,0)+" t"],["Dodané (fakt.)",fmt(k.delivered_t,2)+" t"],[over?"Prebytok":"Dodať",fmt(Math.abs(k.remain_t),2)+" t",over?"wn":""],["% naplnenia",fmt(k.fill||0,1)+" %"],["Tolerancia ±"+fmt(k.tol_pct??5,0)+" %",fmt(tolOf(k),2)+" t"],["Min. na splnenie",fmt((+k.tons||0)-tolOf(k),2)+" t"],["Stav zmluvy",tolSt(k)[1],tolSt(k)[0]==="ok"?"hl":"wn"],["Lístkov zmluvy",String(LA.length)]].map(x=>`<div class="${x[2]||""}"><small>${x[0]}</small><b>${x[1]}</b></div>`).join("")}</div>
   <div class="opbar"><i style="width:${Math.min(100,k.fill||0)}%"></i></div><div class="s"><b>Stav fakturácie:</b> ${esc(st)}${per?` · obdobie tvorí ${A.w?fmt(S.w/A.w*100,1):"0"} % dodaného`:""}${k.wheat_bands?`<br>Pásma pšenice: ${k.wheat_bands.map(b=>(b.min?"od "+fmt(b.min,1)+" %":"do")+" → "+fmt(b.price,0)+" €/t").join(" · ")}`:""}</div>
   <div class="btns"><button type="button" class="pri" data-zpdf="${esc(k.id)}">🖨️ Zúčtovanie PDF${per?" za obdobie":""}</button><button type="button" data-cpdf="${esc(k.id)}">📄 Kúpna zmluva PDF</button><button type="button" class="zrekb" data-zrek="${esc(k.id)}">⚠️ Reklamácia u odberateľa</button>${f.phone?`<button type="button" class="lime" data-zwa="${esc(k.id)}">WhatsApp farmárovi</button>`:""}</div>
   <b class="sth">Vážne lístky${per?" za obdobie":""} (${P.length})</b>${linesTable(P)}</div>`;
  return h}
// 📚 všetky zmluvy farmára naraz (príkaz majiteľa 1. 11. 22:37): súhrn za všetky + karta každej zmluvy + jedno PDF so všetkými
function allHTML(KS){const miss=KS.filter(k=>!Z.L[k.id]);if(miss.length){Promise.all(miss.map(k=>loadL(k.id))).then(renderStaff);return `<div class="card"><div class="s">Načítavam lístky (${miss.length} ${miss.length===1?"zmluva":miss.length<5?"zmluvy":"zmlúv"})…</div></div>`}
  const per=Z.d0||Z.d1,P=KS.flatMap(k=>periodOf(Z.L[k.id]||[])),S=sumL(P),T=KS.reduce((a,k)=>(a.t+=+k.tons||0,a.d+=+k.delivered_t||0,a),{t:0,d:0});
  return `<div class="card zc"><div class="row"><span class="t">📚 Všetky zmluvy · ${KS.length} · ${esc(Z.com==="*"?"všetky komodity":comName(Z.com))}</span></div>
   <b class="sth">Súhrn zúčtovania${per?` · ${Z.d0?dSK(Z.d0):"…"} – ${Z.d1?dSK(Z.d1):"…"}`:" · celé zmluvy"}</b>
   <div class="zsg">${[["Zmluvy spolu",fmt(T.t,0)+" t"],["Dodané (fakt.)",fmt(T.d,2)+" t"],["Netto váha",fmt(S.g,0)+" kg"],["Fakturačná váha",fmt(S.w,0)+" kg"],["Čistenie a sušenie – odrátané vo váhe",fmt(S.cc+S.dc,2)+(P[0]&&P[0].kg_mode?" kg":" €")],["Reálna cena po zrážkach",realTxt(S)],["Na úhradu po zrážkach",fmt(S.pay,2)+" €","hl"],["Počet lístkov",String(P.length)]].map(x=>`<div class="${x[2]||""}"><small>${x[0]}</small><b>${x[1]}</b></div>`).join("")}</div>
   <div class="btns"><button type="button" class="pri" data-zpdfall="1">🖨️ Zúčtovanie PDF – všetky zmluvy${per?" za obdobie":""}</button><button type="button" class="zrekb" data-zrekall="1">⚠️ Reklamácia u odberateľa – všetky zmluvy</button></div></div>`+KS.map(k=>contractCard(k,1)).join("")}
function allPdf(){const C=Z.C;if(!C)return;const KS=(C.contracts||[]).filter(x=>Z.com==="*"||x.com===Z.com).filter(k=>periodOf(Z.L[k.id]||[]).length);if(!KS.length){toast("V období nie sú žiadne lístky.",4000);return}
  const docs=KS.map(k=>pdfHTML(C.farmer||{},k,periodOf(Z.L[k.id]||[]))),head=docs[0].split("<body>")[0],body=d=>d.split("<body>")[1].split("</body>")[0].replace(/<div class="pb">[\s\S]*?<\/div>/,"");
  const P=KS.flatMap(k=>periodOf(Z.L[k.id]||[])),S=sumL(P);
  const html=head.replace(/<title>[^<]*<\/title>/,`<title>Zúčtovanie všetky zmluvy – ${esc((C.farmer||{}).name||"")}</title>`)+"<body>"+docs.map((d,i)=>`<div${i?' style="page-break-before:always;break-before:page"':""}>${body(d)}</div>`).join("")+
    `<div class="ft" style="page-break-before:avoid;margin-top:18px;font-size:13px"><b>Spolu za ${KS.length} ${KS.length===1?"zmluvu":KS.length<5?"zmluvy":"zmlúv"}: ${P.length} ${P.length===1?"lístok":P.length<5?"lístky":"lístkov"} · fakturačná váha ${fmt(S.w/1000,3)} t · ${S.k>0.005?`čistenie a sušenie ${fmt(S.k)} € nefakturujeme – odrátané vo váhe · `:""} <span style="color:#2f5d0a">na úhradu po zrážkach ${fmt(S.pay)} € bez DPH</span>${S.real!=null?` · reálna cena ${fmt(S.real)} €/t z netto ${fmt(S.g/1000,3)} t`:""}</b></div></body></html>`;
  openPdf(html)}
const tolOf=k=>k.tol_t!=null?+k.tol_t:(+k.tons||0)*0.05;
const tolSt=k=>{const t=tolOf(k),r=+k.remain_t;return r<=0?(-r<=t?["ok","Splnená (prebytok v tolerancii)"]:["over","Prekročená o "+fmt(-r-t,2)+" t nad toleranciu"]):r<=t?["ok","Splnená v tolerancii"]:["short","Chýba "+fmt(r-t,2)+" t mimo tolerancie"]};
const periodOf=L=>L.filter(x=>(!Z.d0||x.day>=Z.d0)&&(!Z.d1||x.day<=Z.d1));
// 2. 11. príkaz majiteľa (nahrádza 1. 11.): M_fyz = M × (1 − N/100) × (100 − V)/(100 − Vc); M_fakt = M_fyz − (C + S)/P × 1000;
// Z = M_fyz/1000 × P − C − S – počíta databáza (settle_lines.invoice_eur už je po odpočte nákladov, odpočítajú sa iba raz).
const dedX=x=>0,costX=x=>{const c=(+x.clean_cost||0)+(+x.dry_cost||0);return x.kg_mode?c*(+x.price||0)/1000:c};
const sumL=L=>{const a=L.reduce((a,x)=>(a.g+=+x.gross_kg||0,a.c+=+x.clean_kg||0,a.d+=+(x.dry_kg??x.clean_kg)||0,a.w+=+x.invoice_kg||0,a.e+=+x.invoice_eur||0,a.cc+=+x.clean_cost||0,a.dc+=+x.dry_cost||0,a.dd+=dedX(x),a.k+=costX(x),a),{g:0,c:0,d:0,w:0,e:0,cc:0,dc:0,dd:0,k:0});a.pay=a.e-a.dd;a.real=a.g>0?a.pay/(a.g/1000):null;return a};
const RT=()=>{const r=(Z.C&&Z.C.rules)||Z.rules||{};return {c:+r.clean||2.5,d:+r.dry||3.5}};
const realTxt=S=>S.real!=null?fmt(S.real)+" €/t":"–";
function contractCard(k,own){const L=Z.L[k.id],op=Z.open===k.id,over=k.remain_t<0;
  return `<div class="card zc"><div class="row"><span class="t">${esc(k.no)} · ${esc(comName(k.com))}</span>${pill(DST[k.status]||[k.status])}</div>
   <div class="opk"><div><small>Zmluva</small><b>${fmt(k.tons,0)} t</b></div><div><small>Dodané (fakt.)</small><b>${fmt(k.delivered_t,2)} t</b></div><div class="${over?"wn":"hl"}"><small>${over?"Prebytok":"Dodať"}</small><b>${fmt(Math.abs(k.remain_t),2)} t</b></div></div><div class="s">${tolSt(k)[0]==="ok"?"✅":"⚠️"} ${esc(tolSt(k)[1])} (±${fmt(k.tol_pct??5,0)} % = ${fmt(tolOf(k),2)} t)</div>
   <div class="opbar"><i style="width:${Math.min(100,k.fill||0)}%"></i></div>
   <div class="zsum"><span>Cena <b>${k.com==="psenica_p"&&k.wheat_bands?"podľa kvality":fmt(k.price)+" €/t"}</b></span><span>Lístkov <b>${k.tickets}</b></span><span>Po čistení <b>${fmt((k.clean_kg||0)/1000,3)} t</b></span><span>Čistenie <b>${fmt(k.clean_cost||0)} ${k.kg_mode?"kg":"€"}</b></span><span>Sušenie <b>${fmt(k.dry_cost||0)} ${k.kg_mode?"kg":"€"}</b></span><span>Na úhradu po zrážkach <b class="num">${fmt(k.invoice_eur||0)} €</b></span></div>
   <div class="s">${k.last&&over&&-k.remain_t>tolOf(k)?`Fakturuje sa celé dodané množstvo (${fmt(k.delivered_t,2)} t) – posledná zmluva prekročená o ${fmt(-k.remain_t,0)} t`:`Fakturuje sa podľa zmluvy (${fmt(k.delivered_t,2)} t)`}${k.wheat_bands?` · pásma pšenice: ${k.wheat_bands.map(b=>fmt(b.min,1)+"%→"+fmt(b.price,0)).join(", ")}`:""}</div>
   <div class="btns"><button type="button" data-zopen="${esc(k.id)}">${op?"✕ Skryť lístky":"⚖️ Lístky ("+k.tickets+")"}</button><button type="button" class="pri" data-zpdf="${esc(k.id)}">🖨️ Zúčtovanie PDF</button><button type="button" class="zrekb" data-zrek="${esc(k.id)}">⚠️ Reklamácia u odberateľa</button>${own&&Z.C&&Z.C.farmer&&Z.C.farmer.phone?`<button type="button" class="lime" data-zwa="${esc(k.id)}">WhatsApp farmárovi</button>`:""}</div>
   ${op?(L?linesTable(L):`<div class="s">Načítavam…</div>`):""}</div>`}
function linesTable(L){if(!L.length)return `<div class="s">Žiadne lístky.</div>`;const T=L.reduce((a,x)=>(a.g+=+x.gross_kg||0,a.w+=+x.invoice_kg||0,a.e+=+x.invoice_eur||0,a),{g:0,w:0,e:0});
  return `<div class="hrt"><table><thead><tr><th>Dátum</th><th>Lístok</th><th>ŠPZ</th><th>Netto kg</th><th>Neč.%</th><th>Po čist. kg</th><th>Vlh.%</th><th>Po suš. kg</th><th>Čist.</th><th>Suš.</th><th>Cena</th><th>Fakt. kg</th><th>€</th></tr></thead><tbody>${L.map(x=>`<tr><td>${esc(dSK(x.day))}</td><td>${esc(x.ticket)}</td><td>${esc(x.plate||"")}</td><td>${fmt(x.gross_kg,0)}</td><td>${x.impurity_pct!=null?fmt(x.impurity_pct,2):"–"}</td><td>${fmt(x.clean_kg,0)}</td><td class="${x.moisture_pct>x.norm?"wn":""}">${x.moisture_pct!=null?fmt(x.moisture_pct,1):"–"}</td><td>${fmt(x.dry_kg,0)}</td><td>${fmt(x.clean_cost,2)}</td><td>${fmt(x.dry_cost,2)}</td><td>${x.price!=null?fmt(x.price):"<span class=wn>–</span>"}${x.protein_pct!=null?`<small>N ${fmt(x.protein_pct,1)}%</small>`:""}</td><td>${fmt(x.invoice_kg,0)}</td><td>${x.invoice_eur!=null?fmt(x.invoice_eur):"–"}</td></tr>`).join("")}
   <tr class="ztot"><td colspan="3"><b>Spolu</b></td><td><b>${fmt(T.g,0)}</b></td><td colspan="7"></td><td><b>${fmt(T.w,0)}</b></td><td><b>${fmt(T.e)}</b></td></tr></tbody></table></div>`+linesCards(L,T)}
/* lístky ako karty – na telefóne a Folde (tabuľka by sa nezmestila a údaje by nebolo vidno) */
function linesCards(L,T){const kv=(l,v,c)=>`<div${c?` class="${c}"`:""}><small>${l}</small><b>${v}</b></div>`;
  return `<div class="zlc">${L.map(x=>`<div class="zlci"><div class="zlch"><b>${esc(x.ticket)}</b><span>${esc(dSK(x.day))}${x.plate?" · "+esc(x.plate):""}</span></div><div class="zlcg">
    ${kv("Netto",fmt(x.gross_kg,0)+" kg")}${kv("Nečistoty",x.impurity_pct!=null?fmt(x.impurity_pct,2)+" %":"–")}${kv("Po čistení",fmt(x.clean_kg,0)+" kg")}
    ${kv("Vlhkosť",x.moisture_pct!=null?fmt(x.moisture_pct,1)+" %":"–",x.moisture_pct>x.norm?"wn":"")}${kv("Po sušení",fmt(x.dry_kg,0)+" kg")}${kv("Cena",x.price!=null?fmt(x.price)+" €/t":"–")}
    ${kv("Čistenie",fmt(x.clean_cost,2)+(x.kg_mode?" kg":" €"))}${kv("Sušenie",fmt(x.dry_cost,2)+(x.kg_mode?" kg":" €"))}${kv("Fakt. váha",fmt(x.invoice_kg,0)+" kg")}
    ${kv("Suma",x.invoice_eur!=null?fmt(x.invoice_eur)+" €":"–","zlcs")}</div></div>`).join("")}
   <div class="zlci zlct"><div class="zlch"><b>Spolu · ${L.length} ${L.length===1?"lístok":L.length<5?"lístky":"lístkov"}</b></div><div class="zlcg">${kv("Netto",fmt(T.g,0)+" kg")}${kv("Fakt. váha",fmt(T.w,0)+" kg")}${kv("Suma",fmt(T.e)+" €","zlcs")}</div></div></div>`}
async function loadC(){const r=await sb.rpc("settle_contracts",{p_farmer:Z.farm});Z.C=r.error?{err:r.error.message}:(r.data??{});renderStaff()}
async function loadL(id){const k=(Z.C.contracts||[]).find(x=>x.id===id);const r=await sb.rpc("settle_lines",{p_farmer:Z.C.farmer.id,p_deal:id,d0:null,d1:null});Z.L[id]=r.error?[]:r.data||[];return Z.L[id]}
// 2. 11. 14:24 príkaz majiteľa: v zúčtovaní spolu váha po sušení, technologická zrážka vo váhe a podrobný prepočet s vysvetlením
// 2. 11. príkaz majiteľa: podrobný prepočet pre dodávateľa úplne jednoducho („pre IQ 0 hojdací koník“) – krok za krokom, slovami, bez vzorcov
function calcHTML(L,T,k,ff){if(!L.length)return "";const MX=40,f0=v=>Math.abs(v-Math.round(v))<0.05?fmt(v,0):fmt(v,1),eu=v=>fmt(v);let S={g:0,s:0,v:0,d:0,t:0,c:0,u:0,z:0,np:0,k:0};const R=RT();
  const row=x=>{let g=+x.gross_kg||0,c=+x.clean_kg||0,d=+(x.dry_kg??x.clean_kg)||0;const V=x.moisture_pct!=null?+x.moisture_pct:null,N=x.norm!=null?+x.norm:null,p=x.price!=null&&+x.price>0?+x.price:null,
      cm=x.kg_mode?(+x.clean_cost||0)*(p||0)/1000:(+x.clean_cost||0),dm=x.kg_mode?(+x.dry_cost||0)*(p||0)/1000:(+x.dry_cost||0),z=x.invoice_eur!=null?+x.invoice_eur:null,I=x.impurity_pct!=null?+x.impurity_pct:null;
    // presné (nezaokrúhlené) kg ako v databáze, aby kroky sedeli na cent
    c=I!=null?g*(1-I/100):c;d=V!=null&&N!=null&&V>N?c*(100-V)/(100-N):c;const smet=Math.max(0,g-c),voda=Math.max(0,c-d),kk=p?(cm+dm)/p*1000:0;
    S.g+=g;S.s+=smet;S.v+=voda;S.d+=d;S.k+=kk;S.c+=cm;S.u+=dm;if(z!=null){S.z+=z;S.t+=z+cm+dm}else S.np++;
    return `<div class="tk"><b>🚛 Lístok ${esc(x.ticket)} · ${esc(dSK(x.day))}${x.plate?" · "+esc(x.plate):""}</b>
     <div>1️⃣ Priviezli ste: <b>${f0(g)} kg</b></div>
     <div>2️⃣ Smeti (nečistoty ${I!=null?fmt(I,2)+" %":"podľa váhy"}) nie sú zrno, tie neplatíme: ${smet>0.5?`${f0(g)} − ${f0(smet)} = <b>${f0(c)} kg čistého zrna</b>`:`žiadne – <b>${f0(c)} kg čistého zrna</b>`}</div>
     <div>3️⃣ Voda: zrno malo vlhkosť ${V!=null?fmt(V,1)+" %":"–"}, má mať najviac ${N!=null?fmt(N,1)+" %":"–"}. ${voda>0.5?`Pri sušení sa vyparí ${f0(voda)} kg vody: ${f0(c)} − ${f0(voda)} = <b>${f0(d)} kg suchého zrna</b>`:`Zrno je dosť suché, nič sa neodráta – <b>${f0(d)} kg suchého zrna</b>`}</div>
     ${p!=null&&z!=null?`${cm+dm<=0.005?`<div>4️⃣ Čistenie ani sušenie netreba – z váhy sa nič neodráta.</div>`:`<div>4️⃣ Čistenie a sušenie <b>vám nefakturujeme</b>. Ich cenu (čistenie ${eu(R.c)} €/t${cm>0.005?` = ${eu(cm)} €`:" – tu 0 €"}, sušenie ${eu(R.d)} €/t za každé % vlhkosti nad normu${dm>0.005?` = ${eu(dm)} €`:" – tu 0 €"}) premeníme na kilá: ${cm+dm>0.005?`${eu(cm+dm)} € ÷ ${eu(p)} €/t × 1 000 = <b>${f0(kk)} kg</b> – tie odrátame z váhy`:"<b>0 kg</b>"}</div>`}
     <div>5️⃣ Fakturačná váha: ${kk>0.05?`${f0(d)} − ${f0(kk)} = `:""}<b>${f0(d-kk)} kg</b></div>
     <div class="ok">✅ Dostanete: ${f0(d-kk)} kg × ${eu(p)} € za tonu (1 000 kg) = <b>${eu(z)} €</b> bez DPH</div>`:`<div>4️⃣ Cena zatiaľ nie je zadaná – suma sa doplní.</div>`}</div>`};
  const rows=L.slice(0,MX).map(row).join("");L.slice(MX).forEach(row);
  return `<div class="pc"><h3>Ako sme to vypočítali – jednoducho</h3>
   <div class="ez"><div>🌾 <b>Platíme iba za čisté a suché zrno.</b></div>
   <div>🗑️ <b>Smeti</b> (prach, plevy, kamienky) nie sú zrno → ich váhu odrátame.</div>
   <div>💧 <b>Voda</b> v mokrom zrne nie je zrno → čo sa pri sušení vyparí, odrátame.</div>
   <div>🔧 <b>Čistenie a sušenie vám nefakturujeme.</b> Ich cenu (čistenie ${eu(R.c)} €/t, sušenie ${eu(R.d)} €/t za každé % vlhkosti nad normu) premeníme na kilá a odrátame <b>z váhy</b> – iba raz.</div>
   <div>⚖️ Čo ostane, je <b>fakturačná váha</b>.</div>
   <div>✅ <b>Fakturačná váha × cena</b> = koľko dostanete.</div></div>
   ${rows}${L.length>MX?`<div class="s">… ďalších ${L.length-MX} lístkov – rovnaký postup, čísla sú v tabuľke vyššie a v súčte nižšie.</div>`:""}
   <div class="sm">📋 <b>Spolu za ${L.length} ${L.length===1?"lístok":L.length<5?"lístky":"lístkov"}:</b><br>
    priviezli ste ${f0(S.g)} kg − smeti ${f0(S.s)} kg − voda ${f0(S.v)} kg = <b>${f0(S.d)} kg suchého zrna</b><br>
    ${S.t>0?`čistenie a sušenie (${eu(S.c+S.u)} €, nefakturujeme) = ${f0(S.k)} kg z váhy → fakturačná váha <b>${f0(S.d-S.k)} kg</b> → <b>dostanete ${eu(S.z)} € bez DPH</b>`:""}${S.np?` (${S.np} ${S.np===1?"lístok":"lístky"} bez ceny)`:""}
    <div class="s">Kilá ukazujeme najviac na 1 desatinné miesto, peniaze rátame presne a sumu každého lístka zaokrúhlime na centy.</div></div></div>`}
// --- PDF zúčtovania (ERNTE) ---
function pdfHTML(F,k,L,forFarmer){const T=L.reduce((a,x)=>(a.g+=+x.gross_kg||0,a.c+=+x.clean_kg||0,a.d+=+(x.dry_kg??x.clean_kg)||0,a.w+=+x.invoice_kg||0,a.e+=+x.invoice_eur||0,a.cc+=+x.clean_cost||0,a.dc+=+x.dry_cost||0,a),{g:0,c:0,d:0,w:0,e:0,cc:0,dc:0});
  const per=(Z.d0||Z.d1)?`Obdobie ${Z.d0?dSK(Z.d0):"…"} – ${Z.d1?dSK(Z.d1):"…"}`:"Celá zmluva";
  // 1. 11. príkaz majiteľa: náklady čistenia a sušenia sa odpočítajú zo sumy na úhradu + reálna cena po zrážkach (€/t z netto váhy)
  const kgm=!!(L[0]&&L[0].kg_mode),ded=L.reduce((a,x)=>a+dedX(x),0),kk=L.reduce((a,x)=>a+costX(x),0),pay=T.e-ded,real=T.g>0?pay/(T.g/1000):null,fixP=!(k.com==="psenica_p"&&k.wheat_bands)&&+k.price>0,dif=real!=null&&fixP?real-(+k.price):null,lossT=(T.g-T.w)/1000;
  return `<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>Zúčtovanie ${esc(k.no)} – ${esc(F.name)}</title><style>
  @page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}html{color-scheme:light}body{background:#fff;font:11px/1.4 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;margin:0 auto;padding:10px;max-width:281mm}.bhd{flex-wrap:wrap}.bhd>div:last-child{margin-left:auto}.tw{overflow-x:auto;max-width:100%}h1{font-size:18px;margin:0 0 4px}.hd{display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #5a8f1c;padding-bottom:10px;margin-bottom:12px}
  .hd small{color:#555;display:block}.k{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}.k div{border:1px solid #ddd;border-radius:8px;padding:8px}.k small{color:#666;display:block}.k b{font-size:14px}
  table{border-collapse:collapse;width:100%;font-size:9.6px}th,td{border:1px solid #ddd;padding:3px 4px;text-align:right}td{white-space:nowrap}th{white-space:normal;vertical-align:bottom;line-height:1.2}tr{page-break-inside:avoid}th:nth-child(-n+3),td:nth-child(-n+3){text-align:left}th{background:#f2f6ec}tfoot td{font-weight:700;background:#f7f7f7}
  .ft{margin-top:14px;color:#555;font-size:10.5px}.k .pay{border-color:#5a8f1c;background:#f3f9ea}.k .pay b{color:#2f5d0a}.k .tz{border-color:#b42318;background:#fdf1ef}.k .tz b{color:#b42318}
  .pc{margin-top:14px;border:1px solid #cfe0b8;border-radius:10px;padding:10px 14px;background:#fafdf5;page-break-inside:auto}.pc h3{margin:0 0 6px;font-size:13px;color:#2f5d0a}.pc ol{margin:4px 0 8px 18px;padding:0}.pc li{margin:2px 0}.pc .tk{margin:6px 0;padding:6px 8px;border-left:3px solid #8bc34a;background:#fff;page-break-inside:avoid}.pc .tk b{color:#111}.pc .tk div{margin:1px 0}.pc .sm{margin-top:8px;padding-top:6px;border-top:1px dashed #b9cf9a;font-weight:600;line-height:1.6}.pc .sm .s{font-weight:400;color:#666;font-size:10px}.pc .ez{display:grid;gap:3px;margin:4px 0 10px;font-size:11.5px}.pc .tk .ok{color:#2f5d0a;font-size:12px;margin-top:3px}
  .real{display:flex;flex-wrap:wrap;align-items:center;gap:6px 22px;margin:-2px 0 12px;padding:10px 14px;border-radius:10px;border:2px solid #5a8f1c;background:linear-gradient(90deg,#eef7e2,#fff)}.real small{display:block;color:#555}.real>div>b{font-size:20px;color:#2f5d0a}
  .real .rx{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px}.real .rx b{font-size:15px}.real .rx small{display:inline}.real .rx span{flex-basis:100%;color:#444;font-size:10.5px}.real .neg{color:#b42318}.real .ok{color:#2f5d0a}
  tfoot tr.zr td{font-weight:600;background:#fff;color:#b42318}tfoot tr.np td{background:#eef7e2;color:#2f5d0a;font-size:11px}.pb{margin-top:16px}@media print{.pb{display:none}body{margin:0;padding:0;max-width:none}.tw{overflow:visible}}${window.brandCss?brandCss("ernte"):""}</style></head><body>
  ${window.brandHead?brandHead("ernte",`Zúčtovanie ${esc(comName(k.com))} 2026`,`Zmluva ${esc(k.no)} · ${esc(per)} · vystavené ${new Date().toLocaleDateString("sk-SK")}`):`<div class="hd"><div><h1>ERNTE spol. s r.o.</h1></div></div>`}
  <div><b>Dodávateľ:</b> ${esc(F.name)}${F.code?" ("+esc(F.code)+")":""}${F.addr?" · "+esc(F.addr):""}</div>
  <div class="k"><div><small>Zmluva</small><b>${fmt(k.tons,0)} t</b></div><div><small>Cena</small><b>${k.com==="psenica_p"&&k.wheat_bands?"podľa kvality":fmt(k.price)+" €/t"}</b></div><div><small>Fakturačná váha</small><b>${fmt(T.w/1000,3)} t</b></div><div class="pay"><small>Na úhradu po zrážkach</small><b>${fmt(pay)} €</b></div>
   <div><small>Netto váha</small><b>${fmt(T.g/1000,3)} t</b></div><div><small>Po čistení</small><b>${fmt(T.c/1000,3)} t</b></div><div><small>Čistenie / sušenie</small><b>${fmt(T.cc)} / ${fmt(T.dc)} ${L[0]&&L[0].kg_mode?"kg":"€"}</b></div><div><small>${k.remain_t<0?"Prebytok":"Zostáva dodať"}</small><b>${fmt(Math.abs(k.remain_t),2)} t</b></div>
   <div><small>Po sušení</small><b>${fmt(T.d/1000,3)} t</b></div><div><small>Zrážka – nečistoty (čistenie)</small><b>${fmt((T.g-T.c)/1000,3)} t</b></div><div><small>Zrážka – vlhkosť (sušenie)</small><b>${fmt((T.c-T.d)/1000,3)} t</b></div><div class="tz"><small>Technologická zrážka spolu (vo váhe)</small><b>${fmt((T.g-T.d)/1000,3)} t${T.g>0?` · ${fmt((T.g-T.d)/T.g*100,1)} %`:""}</b></div></div>
  ${real!=null?`<div class="real"><div><small>Reálna cena po zrážkach</small><b>${fmt(real)} €/t</b><small>z netto váhy ${fmt(T.g/1000,3)} t</small></div><div class="rx">${dif!=null?`<b class="${dif<-0.005?"neg":"ok"}">${dif<-0.005?"−":dif>0.005?"+":""}${fmt(Math.abs(dif))} €/t</b><small>oproti zmluvnej cene ${fmt(k.price)} €/t</small>`:""}<span>${lossT>0.0005?`zrážka hmotnosti ${fmt(lossT,3)} t (nečistoty${T.w<T.c-0.5?" a vlhkosť":""})`:"bez zrážky hmotnosti"}${T.cc+T.dc>0.005?` · ${kgm?"kvalitatívna zrážka":"čistenie a sušenie"} ${fmt(T.cc+T.dc)} ${kgm?"kg":"€"} (nefakturuje sa – odrátané vo váhe)`:""}</span></div></div>`:""}
  <div class="tw"><table><thead><tr><th>Dátum</th><th>Lístok</th><th>ŠPZ</th><th>Netto kg</th><th>Nečist. %</th><th>Po čistení kg</th><th>Zrážka čist. kg</th><th>Vlhkosť %</th><th>Po sušení kg</th><th>Zrážka suš. kg</th><th>Čistenie</th><th>Sušenie</th><th>Cena €/t</th><th>Fakt. kg</th><th>Suma €</th></tr></thead>
  <tbody>${L.map(x=>`<tr><td>${esc(dSK(x.day))}</td><td>${esc(x.ticket)}</td><td>${esc(x.plate||"")}</td><td>${fmt(x.gross_kg,0)}</td><td>${x.impurity_pct!=null?fmt(x.impurity_pct,2):"–"}</td><td>${fmt(x.clean_kg,0)}</td><td>${fmt((+x.gross_kg||0)-(+x.clean_kg||0),0)}</td><td>${x.moisture_pct!=null?fmt(x.moisture_pct,1):"–"}</td><td>${fmt(x.dry_kg,0)}</td><td>${fmt((+x.clean_kg||0)-(+(x.dry_kg??x.clean_kg)||0),0)}</td><td>${fmt(x.clean_cost,2)}</td><td>${fmt(x.dry_cost,2)}</td><td>${x.price!=null?fmt(x.price):"–"}</td><td>${fmt(x.invoice_kg,0)}</td><td>${x.invoice_eur!=null?fmt(x.invoice_eur):"–"}</td></tr>`).join("")}</tbody>
  <tfoot><tr><td colspan="3">Spolu (${L.length} lístkov)</td><td>${fmt(T.g,0)}</td><td></td><td>${fmt(T.c,0)}</td><td>${fmt(T.g-T.c,0)}</td><td></td><td>${fmt(T.d,0)}</td><td>${fmt(T.c-T.d,0)}</td><td>${fmt(T.cc,2)}</td><td>${fmt(T.dc,2)}</td><td></td><td>${fmt(T.w,0)}</td><td>${fmt(T.e)}</td></tr>${kk>0.005?`<tr class="zr"><td colspan="14">Čistenie a sušenie (${fmt(kk)} €) nefakturujeme – odrátané vo fakturačnej váhe (${fmt(T.d-T.w,0)} kg)</td><td></td></tr><tr class="np"><td colspan="14">Na úhradu po zrážkach</td><td>${fmt(pay)}</td></tr>`:""}</tfoot></table></div>
  ${calcHTML(L,T,k,forFarmer)}
  <div class="ft">Norma vlhkosti ${fmt(L[0]?L[0].norm:14,1)} %. Čistenie sa účtuje pri nečistotách, sušenie za každé % nad normu. Tolerancia zmluvy ±${fmt(k.tol_pct??5,0)} % (${fmt(tolOf(k),2)} t) – ${esc(tolSt(k)[1])}. Čistenie a sušenie sa nefakturuje – jeho cena sa premení na kg a odráta z váhy (iba raz). Na úhradu = fakturačná váha × cena. Reálna cena = suma na úhradu ÷ netto váha. Ceny bez DPH. Konečná suma podľa faktúry.</div>
  <div class="pb"><button onclick="print()" style="font-size:15px;padding:10px 18px">🖨️ Tlačiť / uložiť ako PDF</button></div></body></html>`}
// ⚠️ REKLAMÁCIA U ODBERATEĽA (2. 11. príkaz majiteľa): všetky lístky so zrážkou za nečistoty a/alebo vlhkosť, zoskupené podľa odberateľa (iba majiteľ – odberateľ farmárovi nikdy)
async function rekPdf(KS,btn){if(!KS.length||!Z.C)return;const sp=btn&&btn.innerHTML;if(btn){btn.disabled=true;btn.innerHTML="⏳ Pripravujem…"}
  try{for(const k of KS)if(!Z.L[k.id])await loadL(k.id);
    const ids=KS.map(k=>k.id),q=async f=>{try{const r=await f();return r&&!r.error?r.data||[]:[]}catch(e){return []}};
    // 2. 11. príkaz majiteľa: dodávateľ = NAŠA firma (ERNTE / DANUBE), zmluvy = NAŠE zmluvy s odberateľom (nie nákupné s farmárom)
    const [DV,AL,BC,FM]=await Promise.all([q(()=>sb.from("deliveries").select("ticket,deal_id,buyer,sell_price").in("deal_id",ids)),
      q(()=>sb.from("deal_sale_alloc").select("deal_id,sale_contracts(no,buyer,com,archived,status)").in("deal_id",ids)),q(()=>sb.from("buy_contracts").select("buyer,com,no,d0,d1")),q(()=>sb.from("farmers").select("firma").eq("id",(Z.C.farmer||{}).id))]);
    const B={};DV.forEach(d=>{B[d.deal_id+"|"+d.ticket]=d});
    const nb=t=>String(t||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/\b(s\.?\s?r\.?\s?o\.?|spol\.?|a\.?\s?s\.?|kft\.?|zrt\.?|gmbh)\b/g,"").replace(/[^a-z0-9]+/g," ").trim();
    const same=(a,b)=>{a=nb(a);b=nb(b);return !!a&&!!b&&(a===b||a.startsWith(b)||b.startsWith(a))};
    const ourNo=(x,buyer)=>{const al=AL.filter(r=>r.deal_id===x.kid&&r.sale_contracts&&r.sale_contracts.status!=="zrusena"&&same(r.sale_contracts.buyer,buyer)).map(r=>r.sale_contracts.no).filter(Boolean);if(al.length)return [...new Set(al)].join(", ");
      const bc=BC.filter(c=>same(c.buyer,buyer)&&(!c.com||c.com===x.com)&&(!c.d0||x.day>=c.d0)&&(!c.d1||x.day<=c.d1)).map(c=>c.no).filter(Boolean);return bc.length?[...new Set(bc)].join(", "):""};
    const L=KS.flatMap(k=>periodOf(Z.L[k.id]||[]).map(x=>Object.assign({},x,{kid:k.id,com:x.com||k.com}))).filter(x=>(+x.clean_loss_kg||0)>0.5||(+x.dry_loss_kg||0)>0.5);
    if(!L.length){toast("✅ Žiadny lístok nemá zrážku za nečistoty ani vlhkosť"+((Z.d0||Z.d1)?" v zvolenom období":"")+".",4500);return}
    const G={};L.forEach(x=>{const d=B[x.kid+"|"+x.ticket]||{},b=String(d.buyer||"").trim()||"Odberateľ neuvedený";x.sp=+d.sell_price||null;x.ono=ourNo(x,b);(G[b]=G[b]||[]).push(x)});
    const F=Z.C.farmer||{},fr=((FM[0]||{}).firma||F.firma||((typeof STATE!=="undefined"&&(STATE.farmers||[]).find(y=>y.id===F.id))||{}).firma||"").toUpperCase(),dn=fr==="DANUBE",BR=dn?"danube":"ernte";
    const OUR=dn?{n:"DANUBE Commodities Kft.",a:"3980 Sátoraljaújhely, Rákóczi utca 18.",ids:"Adószám 33148577-2-05 · Cg. 05-09-040314",sig:"",city:"Sátoraljaújhely"}:{n:"ERNTE spol. s r.o.",a:"Zbudza 141, 072 23",ids:"IČO 52 341 356",sig:"Martin Vaľko, konateľ",city:"Zbudza"};
    /* 2. 11. 11:28 PRÍKAZ MAJITEĽA: pečiatka a podpis za ERNTE spol. (DANUBE – keď pošle majiteľ: ai_state stamp_danube) */
    const okI=v=>typeof v==="string"&&/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v)?v:null;let STP=null;
    try{const r=await sb.from("ai_state").select("value").eq("key","stamp_"+BR).maybeSingle();STP=okI(r.data&&r.data.value&&(r.data.value.img||r.data.value))}catch(x){}
    if(!STP&&!dn){try{for(const k of KS){const q=await sb.rpc("contract_stamp",{p_deal:k.id});if(!q.error&&okI(q.data)){STP=okI(q.data);break}}}catch(x){}}
    const per=(Z.d0||Z.d1)?`obdobie ${Z.d0?dSK(Z.d0):"…"} – ${Z.d1?dSK(Z.d1):"…"}`:"všetky dodávky",today=new Date().toLocaleDateString("sk-SK");
    const sec=(b,R,i)=>{const T=R.reduce((a,x)=>(a.g+=+x.gross_kg||0,a.c+=+x.clean_loss_kg||0,a.d+=+x.dry_loss_kg||0,a.v+=x.sp?((+x.clean_loss_kg||0)+(+x.dry_loss_kg||0))*x.sp/1000:0,a.nv+=x.sp?0:1,a),{g:0,c:0,d:0,v:0,nv:0});
      const nC=R.filter(x=>(+x.clean_loss_kg||0)>0.5).length,nD=R.filter(x=>(+x.dry_loss_kg||0)>0.5).length,coms=[...new Set(R.map(x=>comName(x.com)))].join(", "),nos=[...new Set(R.map(x=>x.ono).join(", ").split(", ").filter(Boolean))],miss=R.some(x=>!x.ono);
      const lst=n=>n+" "+(n===1?"lístok":n>1&&n<5?"lístky":"lístkov");
      return `<div${i?' style="page-break-before:always;break-before:page"':""}>${window.brandHead?brandHead(BR,"Reklamácia zrážok za nečistoty a vlhkosť",`${esc(b)} · ${esc(per)} · ${today}`):`<h1>${esc(OUR.n)} – Reklamácia</h1>`}
       <div class="rh"><div><small>Odberateľ</small><b>${esc(b)}</b></div><div><small>Dodávateľ</small><b>${esc(OUR.n)}</b><span>${esc(OUR.a)} · ${esc(OUR.ids)}</span></div><div><small>Komodita · naše zmluvy s odberateľom</small><b>${esc(coms)}</b> <span>${nos.length?esc(nos.join(", ")):"zmluva nezadaná"}</span></div></div>
       <p>Vážení, na základe vážnych lístkov uvedených nižšie reklamujeme zrážky hmotnosti${nC?` za <b>nečistoty</b> (${lst(nC)})`:""}${nC&&nD?" a":""}${nD?` za <b>vlhkosť nad normu</b> (${lst(nD)})`:""}${nos.length?` k ${nos.length===1?"zmluve":"zmluvám"} <b>${esc(nos.join(", "))}</b>`:""}. Žiadame o preverenie vykonaných rozborov a zrážok, predloženie protokolov z rozboru vzoriek a o písomné vyjadrenie do 14 dní od doručenia. V prípade nezhody žiadame rozbor uschovanej (rozhodcovskej) vzorky.</p>
       <div class="k"><div><small>Reklamované lístky</small><b>${R.length}</b></div><div><small>Netto váha spolu</small><b>${fmt(T.g/1000,3)} t</b></div>${T.c>0.5?`<div><small>Zrážka za nečistoty</small><b>${fmt(T.c,0)} kg</b></div>`:""}${T.d>0.5?`<div><small>Zrážka za vlhkosť</small><b>${fmt(T.d,0)} kg</b></div>`:""}<div class="pay"><small>Zrážka spolu</small><b>${fmt((T.c+T.d)/1000,3)} t</b></div>${T.v>0?`<div class="pay"><small>Hodnota zrážky${T.nv?" (lístky s cenou)":""}</small><b>${fmt(T.v)} €</b></div>`:""}</div>
       <div class="tw"><table><thead><tr><th>Dátum</th><th>Lístok</th><th>ŠPZ</th><th>Zmluva</th><th>Netto kg</th><th>Nečistoty %</th><th>Zrážka nečist. kg</th><th>Vlhkosť %</th><th>Norma %</th><th>Zrážka vlhk. kg</th><th>Zrážka spolu kg</th>${T.v>0?"<th>Cena €/t</th><th>Hodnota €</th>":""}</tr></thead>
       <tbody>${R.map(x=>{const c=+x.clean_loss_kg||0,d=+x.dry_loss_kg||0;return `<tr><td>${esc(dSK(x.day))}</td><td>${esc(x.ticket)}</td><td>${esc(x.plate||"")}</td><td>${x.ono?esc(x.ono):"–"}</td><td>${fmt(x.gross_kg,0)}</td><td>${x.impurity_pct!=null?fmt(x.impurity_pct,2):"–"}</td><td class="${c>0.5?"w":""}">${c>0.5?fmt(c,0):"–"}</td><td>${x.moisture_pct!=null?fmt(x.moisture_pct,1):"–"}</td><td>${x.norm!=null?fmt(x.norm,0):"–"}</td><td class="${d>0.5?"w":""}">${d>0.5?fmt(d,0):"–"}</td><td><b>${fmt(c+d,0)}</b></td>${T.v>0?`<td>${x.sp?fmt(x.sp):"–"}</td><td>${x.sp?fmt((c+d)*x.sp/1000):"–"}</td>`:""}</tr>`}).join("")}</tbody>
       <tfoot><tr><td colspan="4">Spolu (${lst(R.length)})</td><td>${fmt(T.g,0)}</td><td></td><td>${fmt(T.c,0)}</td><td></td><td></td><td>${fmt(T.d,0)}</td><td>${fmt(T.c+T.d,0)}</td>${T.v>0?`<td></td><td>${fmt(T.v)}</td>`:""}</tr></tfoot></table></div>
       <div class="ft">Zrážka za vlhkosť Ú = H × (V1 − V2) / (100 − V1), H = hmotnosť po čistení, V1 = zistená vlhkosť, V2 = norma. Zrážka za nečistoty = netto váha − váha po čistení podľa vážneho lístka odberateľa. ${T.v>0?"Hodnota zrážky = zrážka × predajná cena podľa lístka. ":""}Ceny bez DPH.</div>
       <div class="sg"><div>${esc(OUR.city)}, ${today}</div><div>za ${esc(OUR.n)}<br>${STP?`<img class="stp" src="${STP}" alt="Pečiatka a podpis ${esc(OUR.n)}"><br>`:"<br>"}.................................................${OUR.sig?"<br>"+esc(OUR.sig):""}</div></div></div>`};
    const names=Object.keys(G).sort();
    if(names.some(n=>G[n].some(x=>!x.ono)))toast("⚠️ Pri niektorých lístkoch chýba naša zmluva s odberateľom – zadaj ju v Obchody → Predaj alebo v Odberateľských zmluvách.",6000);
    const html=`<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>Reklamácia ${esc(names.length===1?names[0]:"odberatelia")} ${esc(dn?"DANUBE":"ERNTE")}</title><style>
     @page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}html{color-scheme:light}body{background:#fff;font:11px/1.45 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;margin:0 auto;padding:10px;max-width:281mm}
     .bhd{flex-wrap:wrap}.bhd>div:last-child{margin-left:auto}.tw{overflow-x:auto;max-width:100%}p{margin:10px 0}
     .rh{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin:10px 0}.rh div{border:1px solid #ddd;border-radius:8px;padding:7px 9px}.rh small,.k small{display:block;color:#666}.rh b{font-size:13px}.rh span{color:#555;display:block}
     .k{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:12px 0}.k div{border:1px solid #ddd;border-radius:8px;padding:8px}.k b{font-size:14px}.k .pay{border-color:#b42318;background:#fff4f2}.k .pay b{color:#b42318}
     table{border-collapse:collapse;width:100%;font-size:9.8px}th,td{border:1px solid #ddd;padding:3px 4px;text-align:right}td{white-space:nowrap}th{white-space:normal;vertical-align:bottom;line-height:1.2;background:#fbeeea}tr{page-break-inside:avoid}th:nth-child(-n+4),td:nth-child(-n+4){text-align:left}td.w{color:#b42318;font-weight:700}tfoot td{font-weight:700;background:#f7f7f7}
     .ft{margin-top:12px;color:#555;font-size:10.5px}.sg{display:flex;justify-content:space-between;gap:20px;margin-top:26px;page-break-inside:avoid}.sg div:last-child{text-align:center}.sg .stp{display:block;margin:6px auto -10px;max-width:190px;max-height:120px;object-fit:contain}
     @media print{body{margin:0;padding:0;max-width:none}.tw{overflow:visible}}${window.brandCss?brandCss(BR):""}</style></head><body>${names.map((b,i)=>sec(b,G[b],i)).join("")}</body></html>`;
    openPdf(html)}catch(e){toast("Reklamáciu sa nepodarilo pripraviť: "+(e&&e.message||e),5000)}finally{if(btn){btn.disabled=false;btn.innerHTML=sp}}}
window.zuctPdfHTML=(F,k,L)=>pdfHTML(F,k,L);
function openPdf(html){const w=window.open("","_blank");if(!w){toast("Povoľ vyskakovacie okná pre tlač.");return}w.document.write(html);w.document.close();setTimeout(()=>{try{w.focus();w.print()}catch(e){}},500)}
// --- prehľady ---
const BST={ok:"Splnená v tolerancii",short:"Chýba",over:"Nad toleranciu"};
function bcHTML(){const B=Z.bc;if(!B){sb.rpc("buy_contracts_status").then(r=>{Z.bc=r.error?{err:r.error.message}:r.data||[];renderStaff()});return `<div class="card"><div class="s">Načítavam odberateľské zmluvy…</div></div>`}
  if(B.err)return `<div class="card"><div class="s">${/buy_contracts/.test(B.err)?"Odberateľské zmluvy sa zapnú po aktualizácii databázy (pár minút).":esc(B.err)}</div></div>`;
  const buyers=[...new Set((Z.rep&&Z.rep.buyer||[]).map(x=>x.buyer).filter(Boolean))];
  return `<details class="card hsec" open><summary><span>📑</span><b>Odberateľské zmluvy · tolerancia</b><small>dodané automaticky z lístkov · splnená v rozsahu ±${fmt(B[0]?B[0].tol_pct:(Z.rules&&Z.rules.tol_buy_pct)||5,0)} %</small></summary>
   ${B.length?`<div class="zbl">${B.map(c=>{const f=c.tons?c.delivered_t/c.tons*100:0,d=c.state==="short"?c.min_t-c.delivered_t:c.state==="over"?c.delivered_t-c.max_t:0;return `<div class="zbc ${c.state}"><div class="row"><b>${esc(c.buyer)} · ${esc(comName(c.com))}${c.no?" · "+esc(c.no):""}</b><button type="button" class="mini" data-zbcdel="${esc(c.id)}" title="Zmazať">✕</button></div>
     <div class="zsg"><div><small>Zmluva</small><b>${fmt(c.tons,0)} t</b></div><div><small>Dodané</small><b>${fmt(c.delivered_t,2)} t</b></div><div><small>Rozsah ±${fmt(c.tol_pct,0)} %</small><b>${fmt(c.min_t,1)} – ${fmt(c.max_t,1)} t</b></div><div class="${c.state==="ok"?"hl":"wn"}"><small>Stav</small><b>${BST[c.state]}${d?" "+fmt(d,2)+" t":""}</b></div></div>
     <div class="opbar"><i style="width:${Math.min(100,f)}%"></i></div><div class="s">${fmt(f,1)} % · lístkov ${c.tickets}${c.price?" · "+fmt(c.price)+" €/t":""}${c.d0||c.d1?" · obdobie "+(c.d0?dSK(c.d0):"…")+" – "+(c.d1?dSK(c.d1):"…"):""}${c.last_day?" · posledný "+dSK(c.last_day):""}</div></div>`}).join("")}</div>`:`<div class="s">Zatiaľ žiadna odberateľská zmluva. Pridaj ju nižšie – dodané množstvo sa spočíta samo z lístkov.</div>`}
   <form class="f" id="fZbc"><label>Odberateľ<input name="buyer" list="zbl" required placeholder="napr. Agro-Somotor s.r.o."></label><datalist id="zbl">${buyers.map(b=>`<option value="${esc(b)}">`).join("")}</datalist>
    <label>Komodita<select name="com">${MK.map(m=>`<option value="${m[0]}">${esc(m[1])}</option>`).join("")}</select></label>
    <label>Číslo zmluvy<input name="no" placeholder="nepovinné"></label><label>Množstvo t<input name="tons" inputmode="decimal" required></label><label>Cena €/t<input name="price" inputmode="decimal" placeholder="nepovinné"></label>
    <label>Od<input type="date" name="d0"></label><label>Do<input type="date" name="d1"></label><div class="w btns"><button class="pri">➕ Pridať zmluvu</button></div></form></details>`}
function repHTML(){const R=Z.rep;if(!R){sb.rpc("settle_reports",{d0:Z.d0||null,d1:Z.d1||null}).then(r=>{Z.rep=r.error?{err:r.error.message}:(r.data??{err:"Žiadne údaje."});renderStaff()});return `<div class="card"><div class="s">Počítam prehľady…</div></div>`}
  if(R.err)return `<div class="card"><div class="s">${/settle_reports/.test(R.err)?"Prehľady sa zapnú po aktualizácii databázy (pár minút).":esc(R.err)}</div></div>`;
  const W=R.week||[],wk=[...new Set(W.map(x=>x.wk))],cm=[...new Set(W.map(x=>x.com))],B=R.buyer||[],P=R.plate||[];
  const tw=W.reduce((s,x)=>s+(+x.zisk||0),0),best=wk.map(k=>[k,W.filter(x=>x.wk===k).reduce((s,x)=>s+(+x.zisk||0),0)]).sort((a,b)=>b[1]-a[1])[0];
  let h=`<div class="card f"><label>Od<input type="date" id="zd0" value="${esc(Z.d0)}"></label><label>Do<input type="date" id="zd1" value="${esc(Z.d1)}"></label><div class="w btns"><button type="button" data-zrep="1">Prepočítať</button></div></div>
   <div class="hrk"><div class="ps"><small>Zisk za obdobie</small><b>${fmt(tw,0)} €</b></div><div><small>Najziskovejší týždeň</small><b>${best?esc(dSK(best[0])):"–"}</b></div><div class="ps"><small>Zisk najlepšieho týždňa</small><b>${best?fmt(best[1],0)+" €":"–"}</b></div><div class="${R.nocontract?"wn":""}"><small>Lístky bez zmluvy / bez ceny</small><b>${R.nocontract} / ${R.noprice}</b></div></div>`;
  h+=`<details class="card hsec" open><summary><span>📅</span><b>Týždenný súhrn</b><small>pondelok–nedeľa · ceny vážené čistou tonážou · zisk pred logistikou a réžiou</small></summary><div class="hrt"><table><thead><tr><th>Týždeň od</th>${cm.map(c=>`<th>${esc(comName(c))} t</th><th>predaj / nákup</th><th>zisk €</th>`).join("")}<th>Spolu €</th></tr></thead><tbody>${wk.map(k=>{const r=cm.map(c=>W.find(x=>x.wk===k&&x.com===c));return `<tr><td>${esc(dSK(k))}</td>${r.map(x=>x?`<td>${fmt(x.t,1)}</td><td>${fmt(x.ps||0)} / ${fmt(x.pb||0)}</td><td class="${x.zisk>=0?"ps":"ng"}">${fmt(x.zisk||0,0)}</td>`:"<td>–</td><td></td><td></td>").join("")}<td><b>${fmt(r.reduce((s,x)=>s+(x?+x.zisk||0:0),0),0)}</b></td></tr>`}).join("")}</tbody></table></div></details>`;
  h+=bcHTML();
  h+=`<details class="card hsec"><summary><span>🏭</span><b>Odberateľ · marža podľa komodity</b><small>tržby, náklady, zisk, marža, zisk na tonu</small></summary><div class="hrt"><table><thead><tr><th>Odberateľ</th><th>Komodita</th><th>Množstvo t</th><th>Tržby €</th><th>Náklady €</th><th>Zisk €</th><th>Marža</th><th>€/t</th></tr></thead><tbody>${B.map(x=>`<tr><td>${esc(x.buyer||"")}</td><td>${esc(comName(x.com))}</td><td>${fmt(x.t,1)}</td><td>${fmt(x.trzby,0)}</td><td>${fmt(x.naklady,0)}</td><td class="${x.zisk>=0?"ps":"ng"}">${fmt(x.zisk,0)}</td><td>${x.trzby?fmt(x.zisk/x.trzby*100,2)+" %":"–"}</td><td>${x.t?fmt(x.zisk/x.t,2):"–"}</td></tr>`).join("")}</tbody></table></div></details>`;
  const tot=P.reduce((s,x)=>s+(+x.t||0),0),jz=P.reduce((s,x)=>s+(+x.jazdy||0),0);
  h+=`<details class="card hsec"><summary><span>🚛</span><b>Odvezená tonáž podľa ŠPZ</b><small>${fmt(tot,0)} t · ${jz} jázd · ${P.length} áut · Ø ${jz?fmt(tot/jz,2):"–"} t/jazda</small></summary><div class="hrt"><table><thead><tr><th>ŠPZ</th><th>Spolu t</th><th>Jazdy</th><th>Ø t/jazda</th><th>Dni</th><th>Ø nečist.</th><th>Od – do</th></tr></thead><tbody>${P.map(x=>`<tr><td><b class="klp">${esc(x.plate)}</b></td><td>${fmt(x.t,1)}</td><td>${x.jazdy}</td><td>${fmt(x.avg_t,2)}</td><td>${x.dni}</td><td>${x.necist!=null?fmt(x.necist,2)+" %":"–"}</td><td>${esc(dSK(x.od))} – ${esc(dSK(x.do_))}</td></tr>`).join("")}</tbody></table></div></details>`;
  return h}
// --- pravidlá ---
function rulesHTML(){const R=Z.rules;if(!R){sb.from("settle_rules").select("*").eq("key","main").maybeSingle().then(r=>{Z.rules=r.error||!r.data?{err:r.error?r.error.message:"chýba"}:r.data.value;renderStaff()});return `<div class="card"><div class="s">Načítavam…</div></div>`}
  if(R.err)return `<div class="card"><div class="s">Pravidlá sa zapnú po aktualizácii databázy (pár minút).</div></div>`;
  return `<form class="card f" id="fZr"><div class="w t">Pravidlá zúčtovania (ako v Exceli)</div>
   ${MK.filter(m=>R.norm&&R.norm[m[0]]!=null).map(m=>`<label>Norma vlhkosti ${esc(m[1])} %<input name="n_${m[0]}" inputmode="decimal" value="${String(R.norm[m[0]]).replace(".",",")}"></label>`).join("")}
   <label>Sadzba čistenie €/t<input name="clean" inputmode="decimal" value="${String(R.clean).replace(".",",")}"></label><label>Sadzba sušenie €/t za 1 %<input name="dry" inputmode="decimal" value="${String(R.dry).replace(".",",")}"></label>
   <label>Zlomky – limit %<input name="broken_limit" inputmode="decimal" value="${String(R.broken_limit??5).replace(".",",")}"></label><label>Tolerancia farmár (nedodané) %<input name="tol_pct" inputmode="decimal" value="${String(R.tol_pct??5).replace(".",",")}"></label><label>Tolerancia odberateľ %<input name="tol_buy_pct" inputmode="decimal" value="${String(R.tol_buy_pct??5).replace(".",",")}"></label>
   <label class="w">Dodávatelia so zrážkou v kg namiesto € (oddeľ čiarkou)<input name="kg_mode" value="${esc((R.kg_mode||[]).join(", "))}"></label>
   <label class="w">Dodávatelia bez tolerancie (oddeľ čiarkou)<input name="tol0" value="${esc((R.tol0||[]).join(", "))}"></label>
   <div class="w s">Vzorce: po čistení = čistá váha z váhy (inak netto × (1 − nečistoty − zlomky nad limit)); po čistení = netto × (1 − nečistoty/100); po sušení M<sub>fyz</sub> = po čistení × (100 − vlhkosť)/(100 − norma), pod normou faktor 1; čistenie = netto t × sadzba (ak sú nečistoty); sušenie = po čistení t × (vlhkosť − norma) × sadzba; čistenie a sušenie sa nefakturuje, premení sa na kg: fakturačná váha = M<sub>fyz</sub> − (čistenie + sušenie) ÷ cena × 1000; na úhradu = fakturačná váha × cena; fakturačná váha = M<sub>fyz</sub> − (čistenie + sušenie) ÷ cena × 1000; reálna cena = na úhradu ÷ netto váha. Pšenica: cena podľa dusíka z tabuľky zmluvy.</div>
   <div class="w btns"><button class="pri" type="submit">💾 Uložiť a prepočítať</button></div></form>`}
// --- udalosti ---
document.addEventListener("click",async e=>{if(typeof ROLE==="undefined"||ROLE!=="owner")return;const t=e.target;let x;
  if(x=t.closest("[data-zsec]")){Z.sec=x.dataset.zsec;renderStaff();scrollTo(0,0);return}
  if(x=t.closest("[data-zpk]")){Z.paste.kind=x.dataset.zpk;Z.paste.prev=null;renderStaff();return}
  if(t.closest("[data-zprev]")){preview();return}
  if(x=t.closest("[data-zsave]")){await savePaste(x);return}
  if(x=t.closest("[data-zfarm]")){if(x.dataset.zfarm){const ff=(STATE.farmers||[]).find(y=>y.id===x.dataset.zfarm);if(ff)Z.fq=ff.name}Z.farm=x.dataset.zfarm;Z.C=null;Z.L={};Z.open=null;Z.com="";Z.deal="";if(!Z.farm)Z.fq="";renderStaff();return}
  if(x=t.closest("[data-zopen]")){const id=x.dataset.zopen;Z.open=Z.open===id?null:id;renderStaff();if(Z.open&&!Z.L[id]){await loadL(id);renderStaff()}return}
  if(t.closest("[data-zpdfall]")){allPdf();return}
  /* 2. 11. 11:13 „kde je tlačidlo reklamácia“ – hneď hore pri farmárovi: vybraná zmluva, inak všetky zmluvy komodity */
  if(t.closest("[data-zrektop]")){const CS=(Z.C&&Z.C.contracts)||[],one=Z.deal&&Z.deal!=="*"&&CS.find(y=>y.id===Z.deal);rekPdf(one?[one]:CS.filter(x=>Z.com==="*"||x.com===Z.com),t.closest("[data-zrektop]"));return}
  if(t.closest("[data-zrekall]")){const KS=((Z.C&&Z.C.contracts)||[]).filter(x=>Z.com==="*"||x.com===Z.com);rekPdf(KS,t.closest("[data-zrekall]"));return}
  if(x=t.closest("[data-zrek]")){const k=Z.C&&(Z.C.contracts||[]).find(y=>y.id===x.dataset.zrek);if(k)rekPdf([k],x);return}
  if(x=t.closest("[data-zpdf]")){const id=x.dataset.zpdf,k=Z.C&&Z.C.contracts.find(y=>y.id===id);if(!k)return;const L=periodOf(Z.L[id]||await loadL(id));
    const F=Z.C.farmer||{},F2=(STATE.farmers||[]).find(y=>y.id===F.id)||{},em=F.email||F2.email||"",S=sumL(L);
    window.__pvMail={to:em,deal:id,subj:`Zúčtovanie ${k.no} – ERNTE spol. s r.o.`,body:`Dobrý deň,\n\nv prílohe Vám posielam zúčtovanie ${comName(k.com).toLowerCase()} k zmluve ${k.no}${Z.d0||Z.d1?` za obdobie ${Z.d0?dSK(Z.d0):"…"} – ${Z.d1?dSK(Z.d1):"…"}`:""}: ${L.length} lístkov, fakturačná váha ${fmt(S.w/1000,3)} t, ${S.k>0.005?`čistenie a sušenie ${fmt(S.k)} € nefakturujeme (odrátané vo váhe), `:""}na úhradu po zrážkach ${fmt(S.pay)} € bez DPH (reálna cena ${S.real!=null?fmt(S.real):"–"} €/t z netto váhy).\nProsím o kontrolu a vystavenie faktúry.\n\nĎakujem\nJana Valková · ERNTE spol. s r.o.\n\n👉 ERNTE Trade & Logistic: ${typeof APP_URL!=="undefined"?APP_URL:location.href.split("#")[0]}`};
    openPdf(pdfHTML(Z.C.farmer,k,L));return}
  if(x=t.closest("[data-zwa]")){const k=Z.C&&Z.C.contracts.find(y=>y.id===x.dataset.zwa),F=Z.C&&Z.C.farmer;if(!k||!F)return;const tel=String(F.phone||"").replace(/\D/g,"").replace(/^00/,"").replace(/^0/,"421");
    const PL=periodOf(Z.L[k.id]||[]),PS=sumL(PL);const txt=`Dobrý deň, zúčtovanie ERNTE – zmluva ${k.no} (${comName(k.com)})${Z.d0||Z.d1?` za obdobie ${Z.d0?dSK(Z.d0):"…"} – ${Z.d1?dSK(Z.d1):"…"}`:""}:\nLístkov: ${PL.length}\nFakturačná váha: ${fmt(PS.w/1000,3)} t\n${(PS.k>0.005?`Čistenie a sušenie ${fmt(PS.k)} € nefakturujeme – odrátané vo váhe\n`:"")+`Na úhradu po zrážkach: ${fmt(PS.pay)} € bez DPH`+(PS.real!=null?`\nReálna cena po zrážkach: ${fmt(PS.real)} €/t z netto váhy`:"")}\nZmluva: ${fmt(k.delivered_t,2)} t dodané z ${fmt(k.tons,0)} t\n\nPodrobnosti a všetky lístky vidíte v aplikácii ERNTE: ${APP_URL}`;
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(txt)}`,"_blank","noopener");return}
  if(t.closest("[data-zrep]")){Z.rep=null;Z.bc=null;renderStaff();return}
  if(t.closest("[data-zclr]")){Z.d0="";Z.d1="";renderStaff();return}
  if(x=t.closest("[data-zbcdel]")){if(!x.dataset.arm){x.dataset.arm=1;x.textContent="Zmazať?";setTimeout(()=>{x.dataset.arm="";x.textContent="✕"},3000);return}sb.from("buy_contracts").delete().eq("id",x.dataset.zbcdel).then(r=>{if(r.error)toast("Chyba: "+r.error.message);Z.bc=null;renderStaff()});return}});
document.addEventListener("change",e=>{if(e.target.id==="zcom"){Z.com=e.target.value;Z.deal="";renderStaff();return}if(e.target.id==="zdeal"){Z.deal=e.target.value;renderStaff();return}
  if(e.target.id==="zd0"||e.target.id==="zd1"){Z[e.target.id.slice(1)]=e.target.value;Z.rep=null;if(Z.sec==="farm"){renderStaff();return}Z.L={};if(Z.open&&Z.C)loadL(Z.open).then(renderStaff);else renderStaff()}
  if(e.target.id==="zfq"){const v=nz(e.target.value),f=(STATE.farmers||[]).find(x=>nz(x.name)===v||nz(x.code)===v);if(f){Z.farm=f.id;Z.fq=f.name;Z.C=null;Z.L={};Z.com="";Z.deal="";renderStaff()}}});
document.addEventListener("input",e=>{if(e.target.id==="zfq"){Z.fq=e.target.value;
    if(Z.farm&&Z.C&&Z.C.farmer&&nz(Z.fq)!==nz(Z.C.farmer.name)){Z.farm="";Z.C=null;Z.L={};Z.com="";Z.deal="";renderStaff();const i=document.getElementById("zfq");if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}return}
    clearTimeout(e.target._t);e.target._t=setTimeout(()=>{if(Z.farm)return;const bx=document.getElementById("zflBox");if(bx)bx.innerHTML=zflList()},150)}
  if(e.target.id==="zpTxt")Z.paste.txt=e.target.value});
document.addEventListener("submit",async e=>{if(e.target.id!=="fZbc")return;e.preventDefault();e.stopPropagation();const fm=e.target;if(fm._b)return;const d=new FormData(fm),t=num(d.get("tons"));if(!(t>0)){toast("Zadaj množstvo v t.");return}if(!String(d.get("buyer")||"").trim()){toast("Zadaj odberateľa.");return}fm._b=1;
  const r=await sb.from("buy_contracts").insert({buyer:String(d.get("buyer")).trim(),com:d.get("com"),no:d.get("no")||null,tons:t,price:isFinite(num(d.get("price")))?num(d.get("price")):null,d0:d.get("d0")||null,d1:d.get("d1")||null});
  fm._b=0;if(r.error){toast("Chyba: "+r.error.message);return}Z.bc=null;toast("✓ Zmluva pridaná – dodané sa spočítalo automaticky.");renderStaff()},true);
document.addEventListener("submit",async e=>{if(e.target.id!=="fZr")return;e.preventDefault();e.stopPropagation();const d=new FormData(e.target),R=Object.assign({},Z.rules);R.norm=Object.assign({},R.norm);
  for(const k of Object.keys(R.norm)){const v=num(d.get("n_"+k));if(isFinite(v))R.norm[k]=v}for(const k of ["clean","dry","broken_limit","tol_pct","tol_buy_pct"]){const v=num(d.get(k));if(isFinite(v)&&v>=0)R[k]=/^tol/.test(k)?Math.min(v,50):v}
  R.kg_mode=String(d.get("kg_mode")||"").split(",").map(s=>s.trim()).filter(Boolean);R.tol0=String(d.get("tol0")||"").split(",").map(s=>s.trim()).filter(Boolean);
  const r=await sb.from("settle_rules").upsert({key:"main",value:R,updated_at:new Date().toISOString()});if(r.error){toast("Chyba: "+r.error.message);return}Z.rules=R;Z.C=null;Z.L={};Z.rep=null;Z.bc=null;toast("✓ Uložené – všetky zmluvy farmárov aj odberateľov sa automaticky prepočítali.");renderStaff()},true);
// záložka iba pre majiteľa
const _tok=window.tabOK;window.tabOK=k=>k==="zuct"?ROLE==="owner":_tok(k);

// ===== FARMÁR: MÔJ PREHĽAD =====
let FZ,FL={},FO=null;
function fzLoad(){FZ=null;sb.rpc("settle_contracts").then(r=>{FZ=r.error?{err:1}:(r.data??{});renderFarmer()})}
window.farmDashHTML=function(){if(typeof FARMER==="undefined"||!FARMER)return "";if(FZ===undefined){fzLoad();return ""}if(!FZ||FZ.err)return "";const K=FZ.contracts||[];if(!K.length)return "";
  const T=K.reduce((a,k)=>(a.t+=+k.tons||0,a.d+=+k.delivered_t||0,a.e+=+k.invoice_eur||0,a.n+=+k.tickets||0,a),{t:0,d:0,e:0,n:0});
  return `<h2>📋 Môj prehľad</h2><div class="card fdash"><div class="fdk"><div><small>Zmluvy spolu</small><b>${fmt(T.t,0)} t</b></div><div><small>Dodané</small><b>${fmt(T.d,1)} t</b></div><div class="hl"><small>Zostáva dodať</small><b>${fmt(Math.max(0,T.t-T.d),1)} t</b></div><div><small>Na úhradu po zrážkach</small><b>${fmt(T.e,0)} €</b></div></div>
   ${K.map(k=>{const op=FO===k.id,L=FL[k.id];return `<div class="fzc"><button type="button" class="fzh" data-fzo="${esc(k.id)}"><span><b>${esc(comName(k.com))}</b><small>zmluva ${esc(k.no)} · ${fmt(k.tons,0)} t × ${k.com==="psenica_p"&&k.wheat_bands?"cena podľa kvality":fmt(k.price)+" €/t"}</small></span><span class="fzv"><b>${fmt(k.delivered_t,1)} t</b><small>${fmt(k.fill||0,0)} %</small></span></button>
     <div class="opbar"><i style="width:${Math.min(100,k.fill||0)}%"></i></div>
     ${op?`<div class="fzd"><div class="zsum"><span>Lístkov <b>${k.tickets}</b></span><span>${k.remain_t>=0?"Zostáva":"Navyše"} <b>${fmt(Math.abs(k.remain_t),2)} t</b></span><span>${tolSt(k)[0]==="ok"?"✅":"⚠️"} <b>${esc(tolSt(k)[1])}</b> (tolerancia ±${fmt(k.tol_pct??5,0)} %)</span><span>Fakturovať <b>${fmt(k.invoice_eur||0)} €</b></span></div>
       ${k.wheat_bands?`<div class="s">Cena pšenice podľa dusíka: ${k.wheat_bands.map(b=>(b.min?"od "+fmt(b.min,1)+" %":"do")+" → "+fmt(b.price,0)+" €/t").join(" · ")}</div>`:""}
       ${L&&L.length?(S=>`<div class="zsum"><span>Netto <b>${fmt(S.g,0)} kg</b></span><span>Po čistení <b>${fmt(S.c,0)} kg</b></span><span>Po sušení <b>${fmt(S.d,0)} kg</b></span><span>Technologická zrážka <b>${fmt(S.g-S.d,0)} kg${S.g>0?" · "+fmt((S.g-S.d)/S.g*100,1)+" %":""}</b></span></div><div class="s">Technologická zrážka = netto − váha po čistení a sušení. Čistenie a sušenie nefakturujeme – je odrátané vo váhe. Na úhradu = fakturačná váha × cena. Podrobný prepočet každého lístka je v PDF.</div>`)(sumL(L)):""}
       ${L?linesTable(L):`<div class="s">Načítavam lístky…</div>`}<div class="btns"><button type="button" class="pri" data-fzpdf="${esc(k.id)}">🖨️ Moje zúčtovanie (PDF)</button></div></div>`:""}</div>`}).join("")}
   <div class="s">Ceny bez DPH. Pri nejasnostiach volajte ERNTE.</div></div>`};
document.addEventListener("click",async e=>{if(typeof FARMER==="undefined"||!FARMER)return;let x=e.target.closest("[data-fzo]");
  if(x){const id=x.dataset.fzo;FO=FO===id?null:id;renderFarmer();if(FO&&!FL[id]){const r=await sb.rpc("settle_lines",{p_deal:id});FL[id]=r.error?[]:r.data||[];renderFarmer()}return}
  x=e.target.closest("[data-fzpdf]");if(x){const id=x.dataset.fzpdf,k=FZ.contracts.find(y=>y.id===id);const save=Z.d0,save1=Z.d1;Z.d0="";Z.d1="";openPdf(pdfHTML(FZ.farmer||{name:FARMER.name},k,FL[id]||[],true));Z.d0=save;Z.d1=save1}});
try{Object.assign(HELP,{zuct:{t:"Zúčtovanie",i:"🧾",r:"Zúčtovanie farmárov podľa pravidiel z Excelu – iba ty.",s:[
 ["Vložiť z Excelu","V Exceli označ riadky (lístky z hárku Odberateľ, zmluvy z ID Klient, ceny pšenice), skopíruj, vlož, ťukni Skontrolovať a Uložiť. Existujúce lístky sa len aktualizujú, nič sa nezdvojí."],
 ["Ako sa počíta","Rovnako ako v Exceli: čistenie pri nečistotách, sušenie nad normu vlhkosti, zrážka sa premení na kg, pšenica podľa dusíka, lístky sa rozdelia do zmlúv postupne s toleranciou 5 % zmluvy (nastaviteľné). Zmluva je splnená, ak chýba najviac 5 %. Odberateľské zmluvy majú vlastnú toleranciu ±5 %. Po zmene pravidiel sa všetko prepočíta automaticky."],
 ["Farmár","Ťukni Zúčtovanie farmára, vyber farmára, otvor zmluvu, vytlač PDF alebo pošli súhrn cez WhatsApp."],
 ["Čo vidí farmár","Len svoje zmluvy, lístky, cenu a zúčtovanie. Nikdy predajnú cenu, odberateľa ani zisk."]]}})}catch(e){}
})();
;(function(){const s=document.createElement("style");s.textContent=`.zno{border-color:rgba(250,204,21,.5)!important;background:linear-gradient(135deg,rgba(250,204,21,.1),rgba(250,204,21,.03))!important}
.znoc{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.1)}.znoc .w{grid-column:1/-1}.znoc label{display:grid;gap:4px;min-width:0}
.znoc small{display:block;opacity:.75;margin-top:2px;word-break:break-word}@media (max-width:420px){.znoc{grid-template-columns:1fr}}`;document.head.appendChild(s)})();
