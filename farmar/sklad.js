// ===== ERNTE · SKLAD – stav, príjem/výdaj/inventúra, nákupy z evidencie, fotka bločku alebo súčiastky (Claude) =====
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const f2=(x,d=2)=>typeof fmt==="function"?fmt(x,d):(+x).toFixed(d);
const num=v=>{if(v==null||v==="")return null;const x=parseFloat(String(v).replace(/\s/g,"").replace(",","."));return Number.isFinite(x)?x:null};
const iv=v=>v==null?"":String(v).replace(".",",");
const tst=(t,ms)=>(typeof toast==="function"?toast:alert)(t,ms);
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const dSK=d=>d?new Date(String(d).slice(0,10)+"T12:00:00").toLocaleDateString("sk-SK",{day:"numeric",month:"numeric",year:"numeric"}):"";
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner";
const KAT={diel:"🔩 Náhradné diely",spojovaci:"🪛 Spojovací materiál",elektro:"💡 Elektro",olej_chemia:"🛢️ Oleje, spreje, chémia",ochranne:"🧤 Ochranné pomôcky",material:"🪵 Materiál",naradie:"🧰 Náradie a zariadenia",kancelaria:"📎 Kancelária",potraviny:"🥖 Potraviny",ine:"📦 Iné"};
const DRUH={sklad:["📦 na sklad","b"],majetok:["🧰 náradie / majetok","b"],spotreba:["spotreba hneď","g"],phm:["PHM","g"],sluzba:["služba","g"],nie:["nepatrí na sklad","g"]};
const pill=(k)=>{const x=DRUH[k]||[k,"g"];return `<span class="pill ${x[1]}">${e(x[0])}</span>`};
let S={sv:"stav",it:null,q:"",kat:"",low:false,open:null,act:null,poh:{},nf:"navrh",scan:null,busy:false,pre:null};
const rr=()=>{if(typeof TAB!=="undefined"&&TAB==="evid"&&typeof renderStaff==="function")renderStaff()};
window.evSklad=S;

async function loadIt(){const r=await sb.from("ev_sklad_v").select("*").order("nazov");S.it=r.error?{err:/does not exist|could not find/i.test(r.error.message)?"Sklad sa zapne po aktualizácii databázy (pár minút).":r.error.message}:(r.data||[]);rr()}
async function loadPoh(id){const r=await sb.from("ev_sklad_poh").select("*").eq("item_id",id).order("d",{ascending:false}).limit(60);S.poh[id]=r.error?[]:(r.data||[]);rr()}
const ent=()=>window.evData?window.evData():null;

window.vSklad=function(){
  const tabs=[["stav","📦 Stav skladu"],["foto","📸 Odfotiť"],["nak","🧾 Z nákupov"]];
  let h=`<div class="btns seg2 sktabs">${tabs.map(t=>`<button type="button" data-sksv="${t[0]}" aria-pressed="${S.sv===t[0]}">${t[1]}${t[0]==="nak"?nakCnt():""}</button>`).join("")}</div>`;
  if(S.sv==="foto")return h+fotoHTML();if(S.sv==="nak")return h+nakHTML();return h+stavHTML()};
function nakCnt(){const E=ent();if(!E||!E.ent)return "";const n=E.ent.filter(r=>r.typ==="naklad"&&!r.sklad&&["sklad","majetok"].includes(r.sklad_navrh)).length;return n?` <span class="cnt">${n}</span>`:""}

// ---------- stav ----------
function stavHTML(){if(!S.it){loadIt();return `<div class="card"><div class="s">Načítavam sklad…</div></div>`}if(S.it.err)return `<div class="card"><div class="s">${e(S.it.err)}</div></div>`;
  const q=S.q.trim().toLowerCase(),L=S.it.filter(i=>i.aktivny&&(!S.kat||i.kat===S.kat)&&(!S.low||(i.min_mn!=null&&+i.stav<=+i.min_mn))&&(!q||[i.nazov,i.kod,i.miesto,i.stroj,i.vyrobca].some(v=>String(v||"").toLowerCase().includes(q))));
  const val=S.it.filter(i=>i.aktivny&&i.druh==="sklad").reduce((s,i)=>s+Math.max(0,+i.stav)*(+i.cena_j||0),0),low=S.it.filter(i=>i.aktivny&&i.min_mn!=null&&+i.stav<=+i.min_mn).length;
  let h=`<div class="hrk"><div><small>Položiek</small><b>${S.it.filter(i=>i.aktivny).length}</b></div><div><small>Hodnota zásob (bez DPH)</small><b>${f2(val)} €</b></div><div class="${low?"wn":""}"><small>Dochádza (pod minimom)</small><b>${low}</b></div></div>
   <form class="card f skflt" id="skFlt"><label>Hľadať<input name="q" value="${e(S.q)}" placeholder="názov, kód, stroj, regál…"></label>
   <label>Druh<select name="kat"><option value="">všetko</option>${Object.entries(KAT).filter(k=>!["potraviny","kancelaria"].includes(k[0])).map(k=>`<option value="${k[0]}"${S.kat===k[0]?" selected":""}>${k[1]}</option>`).join("")}</select></label>
   <label class="evck"><input type="checkbox" name="low"${S.low?" checked":""}> iba čo dochádza</label></form>
   <div class="btns"><button type="button" class="lime" data-sksv="foto">📸 Odfotiť bloček / súčiastku</button><button type="button" data-sknew>➕ Pridať ručne</button></div>`;
  if(S.act==="new")h+=itemForm(S.pre||{});
  if(!L.length)return h+`<div class="card"><div class="s">${S.it.length?"Nič nezodpovedá výberu.":"Sklad je zatiaľ prázdny. Odfoť bloček alebo súčiastku, alebo prijmi tovar zo starších nákupov v záložke „Z nákupov“."}</div></div>`;
  const G=new Map;for(const i of L){const k=i.druh==="majetok"?"naradie":i.kat;if(!G.has(k))G.set(k,[]);G.get(k).push(i)}
  for(const [k,A] of G)h+=`<h3 class="skh">${e(KAT[k]||k)} <small>${A.length}</small></h3><div class="agl">${A.map(itemCard).join("")}</div>`;
  return h}
function itemCard(i){const op=S.open===i.id,low=i.min_mn!=null&&+i.stav<=+i.min_mn;
  let h=`<div class="card skit${low?" sklow":""}"><div class="row">${i.foto?`<img class="skimg" src="${e(i.foto)}" alt="">`:""}<div class="skn"><b>${e(i.nazov)}</b><small>${[i.kod,i.vyrobca,i.stroj&&"🚜 "+i.stroj,i.miesto&&"📍 "+i.miesto].filter(Boolean).map(e).join(" · ")}</small></div>
    <div class="skst"><b>${f2(i.stav,+i.stav%1?2:0)}</b><small>${e(i.jed)}${low?" · dochádza":""}</small></div></div>
    <div class="btns skb"><button type="button" data-skact="vydaj" data-id="${i.id}">➖ Vydať</button><button type="button" data-skact="prijem" data-id="${i.id}">➕ Prijať</button><button type="button" data-skact="inv" data-id="${i.id}">📝 Inventúra</button><button type="button" class="evmini" data-skop="${i.id}">${op?"Zavrieť":"Viac"}</button></div>`;
  if(S.act&&S.act.id===i.id){const a=S.act.k;h+=`<form class="f skmv" data-skmv="${a}" data-id="${i.id}"><label>${a==="inv"?"Skutočný stav ("+e(i.jed)+")":"Množstvo ("+e(i.jed)+")"}<input name="mn" inputmode="decimal" required autofocus></label>
    <label>Dátum<input type="date" name="d" value="${today()}"></label>${a==="vydaj"?`<label>Na čo / stroj<input name="stroj" list="skStr" value="${e(i.stroj||"")}" placeholder="Xerion, Ranger…"></label>`:""}${a==="prijem"?`<label>Cena €/j bez DPH<input name="cena" inputmode="decimal" value="${iv(i.cena_j)}"></label>`:""}
    <label class="w">Poznámka<input name="pozn"></label><div class="w btns"><button class="lime" type="submit">✓ Zapísať</button><button type="button" data-skx>Zrušiť</button></div></form>`}
  if(op){if(!S.poh[i.id])loadPoh(i.id);const P=S.poh[i.id]||[];
    h+=`<div class="trlw"><span>cena ${i.cena_j!=null?f2(i.cena_j)+" €/"+e(i.jed):"–"}</span><span>hodnota ${f2(Math.max(0,+i.stav)*(+i.cena_j||0))} €</span>${i.min_mn!=null?`<span>minimum ${f2(i.min_mn,0)}</span>`:""}</div>
    ${P.length?`<div class="trtab skpoh"><table><tbody>${P.map(p=>`<tr><td>${e(dSK(p.d))}</td><td>${p.druh==="prijem"?"➕ príjem":p.druh==="vydaj"?"➖ výdaj":"📝 inventúra"}</td><td class="r"><b>${p.druh==="vydaj"?"−":p.mn>0&&p.druh==="inventura"?"+":""}${f2(p.mn,+p.mn%1?2:0)}</b></td><td>${e([p.stroj,p.pozn].filter(Boolean).join(" · "))}</td><td><small>${e(String(p.created_by||"").split("@")[0])}</small></td></tr>`).join("")}</tbody></table></div>`:`<div class="s">Zatiaľ bez pohybov.</div>`}
    ${S.act&&S.act.k==="edit"&&S.act.id===i.id?itemForm(i):`<div class="btns"><button type="button" data-skact="edit" data-id="${i.id}">✏️ Upraviť položku</button></div>`}`}
  return h+`</div>`}
function itemForm(i){return `<form class="card f skif" data-skitem="${i.id||""}"><div class="w t">${i.id?"✏️ Upraviť":"➕ Nová položka"}</div>${i.foto?`<img class="skimg w" src="${e(i.foto)}" alt="">`:""}
  <label>Názov<input name="nazov" required value="${e(i.nazov||"")}"></label><label>Druh<select name="kat">${Object.entries(KAT).filter(k=>!["potraviny","kancelaria"].includes(k[0])).map(k=>`<option value="${k[0]}"${(i.kat||"diel")===k[0]?" selected":""}>${k[1]}</option>`).join("")}</select></label>
  <label>Kód / označenie<input name="kod" value="${e(i.kod||"")}"></label><label>Výrobca<input name="vyrobca" value="${e(i.vyrobca||"")}"></label>
  <label>Jednotka<input name="jed" list="skJ" value="${e(i.jed||"ks")}"></label>${i.id?"":`<label>Počet teraz na sklade<input name="mn" inputmode="decimal" value="${iv(i.mn)}"></label>`}
  <label>Cena €/j bez DPH<input name="cena_j" inputmode="decimal" value="${iv(i.cena_j)}"></label><label>Pre stroj<input name="stroj" list="skStr" value="${e(i.stroj||"")}"></label>
  <label>Miesto (regál, dielňa)<input name="miesto" value="${e(i.miesto||"")}"></label><label>Upozorniť pod (min. stav)<input name="min_mn" inputmode="decimal" value="${iv(i.min_mn)}"></label>
  <label class="w">Poznámka<input name="pozn" value="${e(i.pozn||i.popis||"")}"></label>${i.id?`<label class="evck"><input type="checkbox" name="aktivny"${i.aktivny!==false?" checked":""}> aktívna položka</label>`:""}
  <input type="hidden" name="foto" value="${e(i.foto||"")}"><datalist id="skJ"><option value="ks"><option value="l"><option value="kg"><option value="m"><option value="bal"></datalist>
  <div class="w btns"><button class="lime" type="submit">💾 Uložiť</button><button type="button" data-skx>Zrušiť</button></div></form>`}

// ---------- foto (Claude) ----------
function fotoHTML(){const X=S.scan;
  let h=`<div class="card skfoto"><div class="t">📸 Odfoť a appka to zapíše sama</div>
   <div class="skbig"><label class="zbtn skcam"><span>🧾</span><b>Bloček / faktúra</b><small>položky → náklady a sklad</small><input type="file" accept="image/*" capture="environment" data-skfile="blocek" hidden></label>
   <label class="zbtn skcam"><span>🔩</span><b>Súčiastka / tovar</b><small>rozpozná diel → pridá na sklad</small><input type="file" accept="image/*" capture="environment" data-skfile="diel" hidden></label></div>
   <div class="btns"><label class="skgal">🖼️ Bloček z galérie<input type="file" accept="image/*" data-skfile="blocek" hidden></label><label class="skgal">🖼️ Súčiastka z galérie<input type="file" accept="image/*" data-skfile="diel" hidden></label></div>
   <div class="s">Fotku prečíta Claude (AI). Pred uložením všetko skontroluješ a opravíš. Odfoť celý doklad, rovno a pri dobrom svetle.</div></div>`;
  if(!X)return h;
  if(X.status==="wait")return h+`<div class="card skwait">${X.thumb?`<img class="skimg" src="${e(X.thumb)}" alt="">`:""}<div><b>⏳ Čítam ${X.mode==="blocek"?"bloček":"súčiastku"}…</b><small>zvyčajne 10–30 sekúnd</small></div></div>`;
  if(X.status==="err")return h+`<div class="card evwarn">⚠️ ${e(X.err||"Nepodarilo sa.")}</div>`;
  const R=X.result||{};
  if(X.mode==="diel"){const sim=(S.it||[]).filter(i=>R.nazov&&simil(i.nazov,R.nazov,i.kod,R.kod)).slice(0,5);
    return h+`${sim.length?`<div class="card"><div class="t">Podobné už na sklade</div>${sim.map(i=>`<div class="row skrow"><b>${e(i.nazov)}</b><small>${f2(i.stav,0)} ${e(i.jed)}</small><button type="button" data-skact="prijem" data-id="${i.id}" data-go="stav">➕ Prijať k tejto</button></div>`).join("")}</div>`:""}
      ${R.istota!=null&&R.istota<60?`<div class="card evwarn">⚠️ Claude si nie je istý (${e(R.istota)} %). Skontroluj názov a kód.</div>`:""}
      ${itemForm({nazov:R.nazov,kat:R.kat||"diel",kod:R.kod,vyrobca:R.vyrobca,jed:R.jed||"ks",mn:R.mn,stroj:R.pre_stroj,popis:R.popis,foto:X.thumb})}`}
  const P=(R.polozky||[]);const E=ent(),dup=E&&E.ent?E.ent.filter(r=>r.d===R.datum&&R.dodavatel&&String(r.partner||"").toLowerCase().slice(0,4)===String(R.dodavatel).toLowerCase().slice(0,4)).length:0;
  const dl=Object.keys(DRUH).filter(k=>k!=="nie");
  return h+`<form class="card f sknak" id="skNak"><div class="w row">${X.thumb?`<img class="skimg" src="${e(X.thumb)}" alt="">`:""}<b>🧾 ${e(R.dodavatel||"Doklad")}</b>${R.citatelnost!=null&&R.citatelnost<70?`<span class="pill r">čitateľnosť ${e(R.citatelnost)} %</span>`:""}</div>
   ${dup?`<div class="w evwarn">⚠️ V evidencii už sú zápisy od tohto dodávateľa s rovnakým dátumom (${dup}) – nezapíš ich dvakrát.</div>`:""}
   <label>Dátum<input type="date" name="d" required value="${e(R.datum||today())}"></label><label>Dodávateľ<input name="partner" value="${e(R.dodavatel||"")}"></label><label>Číslo dokladu<input name="doklad" value="${e(R.doklad||"")}"></label>
   <label>Firma<select name="firma"><option>ERNTE</option><option>VALKO</option></select></label>
   <div class="w skitems">${P.map((p,i)=>`<div class="skli" data-i="${i}"><label class="evck"><input type="checkbox" name="on${i}" checked> <b>${i+1}.</b></label>
     <label class="w2">Názov<input name="nazov${i}" value="${e(p.nazov||"")}"></label><label>Množstvo<input name="mn${i}" inputmode="decimal" value="${iv(p.mn)}"></label><label>Jedn.<input name="jed${i}" value="${e(p.jed||"ks")}"></label>
     <label>€/j bez DPH<input name="cena${i}" inputmode="decimal" value="${iv(p.cena_bez_dph)}"></label><label>Spolu bez DPH<input name="suma${i}" inputmode="decimal" value="${iv(p.suma_bez_dph)}" placeholder="${p.mn!=null&&p.cena_bez_dph!=null?f2(p.mn*p.cena_bez_dph):""}"></label>
     <label>Kam<select name="druh${i}">${dl.map(k=>`<option value="${k}"${(p.druh||"spotreba")===k?" selected":""}>${DRUH[k][0]}</option>`).join("")}</select></label>
     <label>Druh<select name="kat${i}">${Object.entries(KAT).map(k=>`<option value="${k[0]}"${(p.kat||"ine")===k[0]?" selected":""}>${k[1]}</option>`).join("")}</select></label>
     <label>Stroj<input name="stroj${i}" list="skStr" value="${e(p.stroj||"")}"></label><input type="hidden" name="kod${i}" value="${e(p.kod||"")}"></div>`).join("")||`<div class="s">Na doklade sa nenašli položky.</div>`}</div>
   <div class="w s">Spolu na doklade: ${R.spolu_bez_dph!=null?`<b>${f2(R.spolu_bez_dph)} € bez DPH</b>`:""}${R.spolu_s_dph!=null?` · ${f2(R.spolu_s_dph)} € s DPH`:""}${R.poznamka?` · ${e(R.poznamka)}`:""}</div>
   <div class="w btns"><button class="lime" type="submit">💾 Zapísať do nákladov${P.some(p=>["sklad","majetok"].includes(p.druh))?" a na sklad":""}</button><button type="button" data-skscanx>Zahodiť</button></div></form>`}
const nrm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g," ").trim();
function simil(a,b,ka,kb){if(ka&&kb&&nrm(ka)===nrm(kb))return true;const A=new Set(nrm(a).split(" ").filter(w=>w.length>2)),B=nrm(b).split(" ").filter(w=>w.length>2);return B.filter(w=>A.has(w)).length>=Math.min(2,B.length)&&B.length>0}
function imgTo(file,max,q){return new Promise((ok,no)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);ok(c.toDataURL("image/jpeg",q))};im.onerror=()=>{URL.revokeObjectURL(u);no(new Error("Fotku sa nepodarilo načítať."))};im.src=u})}
async function doScan(file,mode){try{const big=await imgTo(file,1600,.85),th=await imgTo(file,mode==="diel"?480:360,.7);
    S.scan={mode,status:"wait",thumb:th};S.sv="foto";rr();
    const r=await sb.rpc("ev_scan",{p_img:big.split(",")[1],p_mode:mode,p_thumb:th});if(r.error){S.scan={mode,status:"err",err:r.error.message};rr();return}
    const id=r.data,t0=Date.now();S.scan.id=id;
    while(Date.now()-t0<200000){await new Promise(z=>setTimeout(z,2500));const g=await sb.rpc("ev_scan_get",{sid:id});if(g.error){S.scan={mode,status:"err",err:g.error.message};break}
      if(g.data&&g.data.status!=="wait"){S.scan={...S.scan,...g.data};if(mode==="diel"&&!S.it)await loadIt();break}}
    rr()}catch(x){S.scan={mode,status:"err",err:x.message};rr()}}

// ---------- z nákupov ----------
function nakHTML(){const E=ent();if(!E||!E.ent){window.evLoadEnt&&window.evLoadEnt();return `<div class="card"><div class="s">Načítavam nákupy…</div></div>`}
  const all=E.ent.filter(r=>r.typ==="naklad"&&!r.sklad&&["sklad","majetok","spotreba"].includes(r.sklad_navrh));
  const L=all.filter(r=>S.nf==="all"||(S.nf==="navrh"?["sklad","majetok"].includes(r.sklad_navrh):r.sklad_navrh===S.nf));
  const old=all.filter(r=>(Date.now()-new Date(r.d+"T12:00:00"))>90*864e5).length;
  let h=`<div class="s">Nákupy z evidencie, o ktorých sa ešte nerozhodlo. Appka navrhla, čo patrí na sklad (diely, spojovací materiál, oleje, spreje, rukavice, materiál) a čo je náradie. Služby, PHM, poplatky a jedlo sem nepatria.</div>
   <div class="btns seg2">${[["navrh","📦 Navrhnuté na sklad"],["spotreba","Spotreba hneď"],["all","Všetky"]].map(x=>`<button type="button" data-sknf="${x[0]}" aria-pressed="${S.nf===x[0]}">${x[1]} <small>${x[0]==="all"?all.length:all.filter(r=>x[0]==="navrh"?["sklad","majetok"].includes(r.sklad_navrh):r.sklad_navrh===x[0]).length}</small></button>`).join("")}</div>
   ${old?`<div class="card"><div class="row"><span>${old} nákupov je starších ako 90 dní – tie sú väčšinou už spotrebované.</span><button type="button" data-skold>✔ Staršie ako 90 dní = spotrebované</button></div></div>`:""}`;
  if(!L.length)return h+`<div class="card"><div class="s">Všetko vybavené ✓</div></div>`;
  return h+`<div class="agl">${L.slice(0,120).map(r=>{const t=[r.podkat,r.pozn].filter(Boolean).join(" · ")||r.stroj||r.kat,stTitle=!r.podkat&&!r.pozn&&r.stroj;const op=S.open==="e"+r.id;
    return `<div class="card sknk"><div class="row"><b>${e(t)}</b>${pill(r.sklad_navrh)}${r.sklad_kat&&KAT[r.sklad_kat]?`<small>${e(KAT[r.sklad_kat])}</small>`:""}</div>
     <div class="trlw"><span>${e(dSK(r.d))}</span><span>${e(r.partner||"")}</span>${r.stroj&&!stTitle?`<span>🚜 ${e(r.stroj)}</span>`:""}<span>${r.mn!=null?f2(r.mn,r.mn%1?2:0)+" "+e(r.jed||""):""}</span>${OWN()?`<span><b>${f2(r.suma)} €</b></span>`:""}</div>
     ${op?`<form class="f skfe" data-ske="${r.id}"><label>Názov na sklade<input name="nazov" value="${e(r.podkat||r.pozn||r.stroj||"")}"></label><label>Koľko je ešte na sklade<input name="mn" inputmode="decimal" value="${iv(r.mn)}"></label>
       <label>Druh<select name="kat">${Object.entries(KAT).map(k=>`<option value="${k[0]}"${(r.sklad_kat||"ine")===k[0]?" selected":""}>${k[1]}</option>`).join("")}</select></label><div class="w btns"><button class="lime" type="submit">📦 Prijať na sklad</button><button type="button" data-skx>Zrušiť</button></div></form>`:
     `<div class="btns"><button type="button" class="lime" data-skeop="${r.id}">📦 Na sklad</button><button type="button" data-ske2="spotreba" data-id="${r.id}">✔ Spotrebované</button><button type="button" data-ske2="nie" data-id="${r.id}">✖ Nepatrí</button></div>`}</div>`}).join("")}</div>`}

// ---------- udalosti ----------
document.addEventListener("change",async ev=>{const x=ev.target;
  if(x.dataset&&x.dataset.skfile){const f=x.files&&x.files[0];x.value="";if(f)doScan(f,x.dataset.skfile);return}
  const f=x.form;if(f&&f.id==="skFlt"){const d=new FormData(f);S.kat=d.get("kat");S.low=d.get("low")==="on";rr()}});
document.addEventListener("input",ev=>{const f=ev.target.form;if(f&&f.id==="skFlt"&&ev.target.name==="q"){S.q=ev.target.value;clearTimeout(S._q);S._q=setTimeout(()=>{rr();const i=document.querySelector("#skFlt [name=q]");if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},350)}});
document.addEventListener("click",async ev=>{if(typeof TAB==="undefined"||TAB!=="evid")return;const g=s=>ev.target.closest&&ev.target.closest(s);let x;
  if(x=g("[data-sksv]")){S.sv=x.dataset.sksv;S.act=null;S.open=null;rr();return}
  if(g("[data-sknew]")){S.act="new";S.pre=null;rr();return}
  if(g("[data-skx]")){S.act=null;S.open=S.open&&String(S.open).startsWith("e")?null:S.open;rr();return}
  if(x=g("[data-skop]")){const id=+x.dataset.skop;S.open=S.open===id?null:id;rr();return}
  if(x=g("[data-skact]")){S.act={k:x.dataset.skact,id:+x.dataset.id};if(x.dataset.go){S.sv=x.dataset.go;S.open=null}if(S.act.k==="edit")S.open=+x.dataset.id;rr();return}
  if(x=g("[data-sknf]")){S.nf=x.dataset.sknf;rr();return}
  if(x=g("[data-skeop]")){S.open="e"+x.dataset.skeop;rr();return}
  if(g("[data-skscanx]")){S.scan=null;rr();return}
  if(x=g("[data-ske2]")){const r=await sb.rpc("ev_from_entry",{eid:+x.dataset.id,act:x.dataset.ske2});if(r.error){tst("⚠️ "+r.error.message);return}markEnt(+x.dataset.id,x.dataset.ske2);return}
  if(x=g("[data-skold]")){if(!window.confirm("Označiť všetky nevybavené nákupy staršie ako 90 dní ako spotrebované?"))return;busy(x,true);const r=await sb.rpc("ev_from_old",{days:90,act:"spotreba"});busy(x,false);if(r.error){tst("⚠️ "+r.error.message);return}
    const E=ent();if(E&&E.ent)E.ent.forEach(z=>{if(z.typ==="naklad"&&!z.sklad&&(Date.now()-new Date(z.d+"T12:00:00"))>90*864e5)z.sklad="spotreba"});tst(`✓ Vybavené: ${r.data}`);rr();return}
});
function markEnt(id,v){const E=ent();if(E&&E.ent){const z=E.ent.find(r=>r.id===id);if(z)z.sklad=v}S.open=null;rr()}
document.addEventListener("submit",async ev=>{const f=ev.target;if(typeof TAB==="undefined"||TAB!=="evid"||!f.closest)return;const b=f.querySelector("button[type=submit],button:not([type])");
  if(f.dataset.skmv){ev.preventDefault();const a=f.dataset.skmv,id=+f.dataset.id,d=new FormData(f),mn=num(d.get("mn"));if(mn==null||(a!=="inv"&&mn<=0)){tst("Zadaj množstvo.");return}
    const it=(S.it||[]).find(i=>i.id===id);let o={item_id:id,d:d.get("d")||today(),pozn:String(d.get("pozn")||"").trim()||null};
    if(a==="inv"){const diff=Math.round((mn-(+it.stav||0))*1000)/1000;if(!diff){tst("Stav sedí ✓");S.act=null;rr();return}Object.assign(o,{druh:"inventura",mn:diff,pozn:o.pozn||`inventúra: ${mn} ${it.jed}`})}
    else if(a==="vydaj"){if(mn>(+it.stav||0)&&!window.confirm(`Na sklade je iba ${it.stav} ${it.jed}. Vydať aj tak?`))return;Object.assign(o,{druh:"vydaj",mn,stroj:String(d.get("stroj")||"").trim()||null,cena_j:it.cena_j})}
    else{const c=num(d.get("cena"));Object.assign(o,{druh:"prijem",mn,cena_j:c});if(c!=null)await sb.from("ev_sklad").update({cena_j:c}).eq("id",id)}
    busy(b,true);const r=await sb.from("ev_sklad_poh").insert(o);busy(b,false);if(r.error){tst("⚠️ "+r.error.message);return}tst("✓ Zapísané.");S.act=null;delete S.poh[id];await loadIt();return}
  if(f.dataset.skitem!=null){ev.preventDefault();const d=new FormData(f),id=+f.dataset.skitem||0;const o={nazov:String(d.get("nazov")).trim(),kat:d.get("kat"),kod:String(d.get("kod")||"").trim()||null,vyrobca:String(d.get("vyrobca")||"").trim()||null,jed:String(d.get("jed")||"ks").trim()||"ks",
      cena_j:num(d.get("cena_j")),stroj:String(d.get("stroj")||"").trim()||null,miesto:String(d.get("miesto")||"").trim()||null,min_mn:num(d.get("min_mn")),pozn:String(d.get("pozn")||"").trim()||null};
    o.druh=o.kat==="naradie"?"majetok":"sklad";if(d.get("foto"))o.foto=d.get("foto");if(id)o.aktivny=d.get("aktivny")==="on";
    busy(b,true);const r=id?await sb.from("ev_sklad").update(o).eq("id",id).select().single():await sb.from("ev_sklad").insert(o).select().single();
    if(r.error){busy(b,false);tst("⚠️ "+r.error.message);return}
    const mn=num(d.get("mn"));if(!id&&mn){const p=await sb.from("ev_sklad_poh").insert({item_id:r.data.id,druh:"prijem",mn,cena_j:o.cena_j,d:today(),pozn:"počiatočný stav"});if(p.error)tst("⚠️ "+p.error.message)}
    busy(b,false);tst("✓ Uložené na sklad.");S.act=null;S.pre=null;if(S.sv==="foto"){S.scan=null;S.sv="stav"}await loadIt();return}
  if(f.id==="skNak"){ev.preventDefault();const d=new FormData(f),R=(S.scan&&S.scan.result)||{},items=[];
    (R.polozky||[]).forEach((p,i)=>{if(d.get("on"+i)!=="on")return;items.push({nazov:String(d.get("nazov"+i)||"").trim(),mn:num(d.get("mn"+i)),jed:String(d.get("jed"+i)||"").trim(),cena:num(d.get("cena"+i)),suma:num(d.get("suma"+i)),druh:d.get("druh"+i),kat:d.get("kat"+i),stroj:String(d.get("stroj"+i)||"").trim(),kod:d.get("kod"+i)||""})});
    if(!items.length){tst("Nevybral si žiadnu položku.");return}
    busy(b,true);const r=await sb.rpc("ev_nakup_save",{h:{d:d.get("d"),partner:String(d.get("partner")||"").trim(),doklad:String(d.get("doklad")||"").trim(),firma:d.get("firma"),scan:S.scan.id?String(S.scan.id):""},items});busy(b,false);
    if(r.error){tst("⚠️ "+r.error.message);return}tst(`✓ Zapísané: ${r.data.naklady} do nákladov, ${r.data.sklad} na sklad.`,5000);S.scan=null;S.sv=r.data.sklad?"stav":"foto";window.evLoadEnt&&window.evLoadEnt();await loadIt();return}
  if(f.dataset.ske){ev.preventDefault();const d=new FormData(f),id=+f.dataset.ske,k=d.get("kat");busy(b,true);
    const r=await sb.rpc("ev_from_entry",{eid:id,act:k==="naradie"?"majetok":"sklad",p_mn:num(d.get("mn")),p_nazov:String(d.get("nazov")||"").trim()||null,p_kat:k});busy(b,false);
    if(r.error){tst("⚠️ "+r.error.message);return}tst("✓ Prijaté na sklad.");markEnt(id,"sklad");S.it=null;return}
});
})();
