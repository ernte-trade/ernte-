// ===== 🧒 ERNTE JUNIOR – učenie biznisu pre syna majiteľa (príkaz majiteľa 31. 10. 2026) =====
// Prihlásenie Junior (tabuľka kids) NIE JE tím ani farmár → nevidí žiadne obchodné údaje (ceny, marže, farmárov, odberateľov).
// Lekcie o našej firme, B2B, burze (verejný graf z market.json), doprave, zmluvách, peniazoch, riziku a kuracom truse;
// kvízy, mince 🪙, odznaky, hra „Obchodný deň“ (vymyslené čísla). Pokrok sa ukladá (kid_save) – otec ho vidí v Tíme.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const IMG=k=>`<img src="img/ico/${k}.png" alt="" width="56" height="56" draggable="false">`;
let K=null,V="home",S=0,Q=null,G=null;
const P=()=>(K&&K.p)||{};
const coins=()=>+(P().stav&&P().stav.c)||0;
const done=id=>!!(P()["l_"+id]&&P()["l_"+id].ok);
async function save(k,v){(K.p||(K.p={}))[k]=v;try{await sb.rpc("kid_save",{p_key:k,p_val:v})}catch(x){}}
function addCoins(n,why){const st=Object.assign({c:0,log:[]},P().stav||{});st.c=Math.max(0,(+st.c||0)+n);st.log=[{t:Date.now(),n,why}].concat(st.log||[]).slice(0,20);save("stav",st)}
const LEVEL=c=>c>=600?["👑","Obchodný majster"]:c>=300?["🚛","Šéf dopravy"]:c>=150?["📈","Burzový žralok"]:c>=60?["🌾","Výkupca"]:["🌱","Učeň"];
function say(t){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(t).replace(/<[^>]+>/g,"").replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu,""));u.lang="sk-SK";u.rate=.95;speechSynthesis.speak(u)}catch(x){}}

// ---------- LEKCIE ----------
const L=[
 {id:"firma",ico:"sheaf",t:"Čo robí naša firma",s:"ERNTE, VALKO a Danube",c:[
  ["🌾","Kto sme?","Tatinova firma <b>ERNTE</b> kupuje od farmárov obilie a semienka – pšenicu, kukuricu, repku, slnečnicu, jačmeň a sóju. Farmár ich celý rok pestuje na poli a po žatve ich potrebuje predať."],
  ["🏭","Komu to predávame?","Potom to obilie <b>predáme ďalej</b> firmám, ktoré z neho niečo vyrobia: <b>mlyn</b> urobí múku na chlieb, <b>olejáreň</b> vylisuje z repky a slnečnice olej, <b>krmiváreň</b> urobí krmivo pre kravy, sliepky a prasiatka."],
  ["🚛","A ako sa tam dostane?","Obilie treba odviezť. Na to máme druhú firmu <b>VALKO</b> – má kamióny a vodičov. Jeden veľký kamión odvezie asi <b>25 ton</b> – to je ako 25 osobných áut naraz!"],
  ["🌊","Aj v Maďarsku","Firma <b>Danube</b> robí to isté v Maďarsku. Preto sa v aplikácii dá prepnúť aj na maďarčinu. Obchod nemá hranice – kupujeme a predávame aj v iných krajinách."],
  ["📱","A čo táto aplikácia?","V tejto aplikácii farmári vidia naše ceny, predávajú jedným ťuknutím a vidia, kedy príde kamión. Tím v nej uzatvára obchody, plánuje dopravu a počíta peniaze. Je to taká <b>riadiaca veža</b> celej firmy."]],
  q:[["Čo kupuje ERNTE od farmárov?",["Obilie a semienka","Autá","Hračky"],0],["Ktorá firma vozí obilie kamiónmi?",["VALKO","Danube","Mlyn"],0],["Čo urobí mlyn z pšenice?",["Múku","Olej","Benzín"],0]]},
 {id:"b2b",ico:"deals",t:"Nákup a predaj · B2B",s:"firma ↔ firma",c:[
  ["🤝","Čo je B2B?","<b>B2B</b> je z angličtiny „business to business“ – <b>firma predáva firme</b>. My nepredávame v obchode jednému človeku vrecko múky. Predávame celé kamióny obilia iným firmám."],
  ["🛒","A čo je B2C?","<b>B2C</b> je „business to customer“ – firma predáva obyčajnému človeku. Napríklad potraviny, kde kúpiš rožok. Ten rožok je ale z múky, ktorá bola kedysi naše obilie!"],
  ["🔁","Kúp lacnejšie, predaj drahšie","Obchodník kúpi tovar za nejakú cenu a predá ho za vyššiu. Rozdiel – ale až <b>po zaplatení všetkých nákladov</b> (doprava, nafta, ľudia, sklad) – je <b>zisk</b>. Z neho žije firma a jej ľudia."],
  ["🤗","Dôvera je najdôležitejšia","Farmári predávajú tomu, komu veria. Keď sľúbime cenu a kamión v utorok, musí to platiť. Dobré meno sa buduje roky a pokazí sa za jeden deň."]],
  q:[["Čo znamená B2B?",["Firma predáva firme","Bábätko predáva bábätku","Banka predáva banke"],0],["Kedy má firma zisk?",["Keď predá drahšie, ako ju to všetko stálo","Keď veľa míňa","Keď nič nepredá"],0],["Čo je v obchode najdôležitejšie?",["Dôvera a dodržané slovo","Najväčšie auto","Hlasno kričať"],0]]},
 {id:"burza",ico:"chart",t:"Burza",s:"kde sa rodí cena",c:[
  ["🏛️","Čo je burza?","<b>Burza</b> je veľký trh, kde sa celý svet dohaduje, koľko stojí tona pšenice či kukurice. Pre Európu je to <b>MATIF v Paríži</b>, pre Ameriku <b>CBOT v Chicagu</b>."],
  ["📈","Cena sa stále hýbe","Keď je obilia málo (napríklad bolo sucho), cena <b>stúpa</b>. Keď je ho veľa, cena <b>klesá</b>. Je to ako so zmrzlinou v lete – keď ju chce každý, je drahšia."],
  ["👀","Ozajstný graf","Pod týmto textom je <b>naozajstný graf burzy</b> za posledné mesiace. Pozri, ako cena chodí hore a dole ako horská dráha."],
  ["🧠","Prečo to sledujeme?","Tatino a jeho tím sledujú burzu každý deň. Podľa nej vedia, za koľko môžu kúpiť od farmára a za koľko predať. Kto lepšie odhadne budúcnosť, ten zarobí viac."]],chart:1,
  q:[["Ako sa volá burza v Paríži?",["MATIF","Eiffel","Louvre"],0],["Čo sa stane s cenou, keď je obilia málo?",["Stúpa","Klesá","Nič"],0],["Kde je burza CBOT?",["V Chicagu","V Košiciach","V Prahe"],0]]},
 {id:"doprava",ico:"fleet",t:"Doprava VALKO",s:"kamióny, nafta, kilometre",c:[
  ["🚛","Kamión ako robot","Kamión s návesom unesie asi <b>25 ton</b> obilia. Vodič ho naloží na farme, odvezie na <b>váhu</b>, kde sa odváži, a vyloží u odberateľa."],
  ["⛽","Čo stojí jazda?","Kamión pije veľa <b>nafty</b> – asi 30 litrov na 100 km. Platí sa aj <b>mýto</b> za diaľnice, výplata vodiča a opravy. Preto dlhá cesta stojí veľa peňazí."],
  ["🗺️","Plánovanie","Dispečer plánuje, ktoré auto pôjde kam, aby nejazdilo prázdne. Najlepšie je zaviezť tovar tam a cestou späť zobrať iný náklad – tak zarobí jazda oba smery."],
  ["🛡️","Bezpečnosť","Vodič musí oddychovať, dodržiavať rýchlosť a mať v poriadku papiere – <b>CMR</b> je taký „pas“ pre náklad. Bezpečnosť je viac ako rýchlosť."]],
  q:[["Koľko ton obilia odvezie veľký kamión?",["Asi 25 ton","1 tonu","500 ton"],0],["Čo musí kamión platiť na diaľnici?",["Mýto","Lístok do kina","Nič"],0],["Kedy je jazda najvýhodnejšia?",["Keď vezie náklad tam aj späť","Keď ide prázdny","Keď stojí"],0]]},
 {id:"zmluva",ico:"scroll",t:"Zmluva a slovo",s:"dohoda na papieri",c:[
  ["📜","Čo je zmluva?","<b>Zmluva</b> je dohoda napísaná na papieri (alebo v aplikácii). Píše sa v nej, <b>čo</b> predávame, <b>koľko</b>, za <b>akú cenu</b> a <b>kedy</b>. Obe strany ju podpíšu."],
  ["✍️","Podpis","Podpis znamená: „Súhlasím a dodržím to.“ Dnes sa dá podpísať aj prstom v mobile – aj v tejto aplikácii."],
  ["⚖️","Keď niekto nedodrží","Ak farmár sľúbi 100 ton a dovezie iba 50, zmluva hovorí, čo sa stane. Preto ju treba čítať pozorne – aj drobné písmená."]],
  q:[["Čo musí byť v zmluve?",["Čo, koľko, za koľko a kedy","Obľúbená farba","Počasie"],0],["Čo znamená podpis?",["Súhlasím a dodržím to","Nič","Že sa mi to páči"],0]]},
 {id:"peniaze",ico:"money",t:"Peniaze vo firme",s:"tržba, náklady, zisk",c:[
  ["💶","Tržba","<b>Tržba</b> sú všetky peniaze, ktoré firma dostane za predaný tovar."],
  ["🧾","Náklady","<b>Náklady</b> sú peniaze, ktoré firma musí zaplatiť: farmárovi za obilie, nafta, výplaty, kancelária, poistenie, dane."],
  ["🟢","Zisk = tržba − náklady","Príklad (vymyslený): predáme za <b>1 000 €</b>, všetko nás stálo <b>950 €</b>. Zisk je <b>50 €</b>. Vidíš? Z veľkej tržby je často malý zisk – preto treba šetriť a dobre počítať."],
  ["⏳","Faktúra a čakanie","Keď predáme, pošleme <b>faktúru</b> – papier, koľko nám majú zaplatiť. Často platia až o 30 dní. Firma preto potrebuje mať peniaze odložené, aby mohla medzitým platiť farmárom a vodičom."]],
  q:[["Ako vypočítaš zisk?",["Tržba mínus náklady","Tržba plus náklady","Náklady krát dva"],0],["Predám za 500 €, náklady 450 €. Aký je zisk?",["50 €","950 €","500 €"],0],["Čo je faktúra?",["Papier, koľko nám majú zaplatiť","Druh obilia","Kamión"],0]]},
 {id:"riziko",ico:"wx",t:"Riziko a počasie",s:"príroda rozhoduje",c:[
  ["🌦️","Počasie je šéf","Keď neprší, obilie zle rastie a úroda je slabá. Keď prší počas žatvy, kombajny nemôžu ísť na pole. Preto tatino sleduje počasie každý deň."],
  ["🎲","Riziko","<b>Riziko</b> znamená, že sa niečo môže pokaziť: cena na burze spadne, kamión sa pokazí, farmár nedodá. Dobrý podnikateľ myslí dopredu a má záložný plán."],
  ["🧺","Nedávaj všetky vajíčka do jedného košíka","Keď firma robí viac vecí (obchod, doprava, služby), a jedna sa nedarí, ostatné ju podržia. Preto máme ERNTE aj VALKO aj agro služby."]],
  q:[["Čo znamená riziko?",["Že sa niečo môže pokaziť","Že je všetko isté","Druh kamiónu"],0],["Prečo má firma viac činností?",["Aby ju ostatné podržali, keď sa jednej nedarí","Lebo sa nudí","Nemá to význam"],0]]},
 {id:"trus",ico:"trus",t:"Kurací trus = hnojivo",s:"nič sa nevyhadzuje",c:[
  ["🐔","Z odpadu poklad","Na hydinových farmách vzniká veľa <b>kuracieho trusu</b>. Pre niekoho odpad – ale pre pole je to výborné <b>prírodné hnojivo</b>."],
  ["🔄","Kolobeh","My trus odvezieme z farmy na polia. Rastliny z neho dostanú živiny, narastie obilie, z obilia je krmivo pre sliepky… a kruh sa uzavrie. Volá sa to <b>obehové hospodárstvo</b>."],
  ["🌍","Dobré pre prírodu","Menej umelých hnojív = menej znečistenia. Dobrý biznis môže pomáhať aj prírode."]],
  q:[["Na čo sa hodí kurací trus?",["Ako hnojivo na pole","Do polievky","Na stavbu domu"],0],["Ako sa volá, keď sa nič nevyhadzuje a všetko sa znova použije?",["Obehové hospodárstvo","Burza","Mýto"],0]]}
];
// ---------- HRA: OBCHODNÝ DEŇ (vymyslené čísla) ----------
function gNew(){G={r:1,cash:20000,stock:0,buyP:0,log:[],m:200+Math.round(Math.random()*20)};gTurn()}
function gTurn(){const ev=[["☀️ Krásne počasie, úroda bude veľká – ceny môžu klesnúť.",-1],["🌧️ V Amerike sucho – burza rastie!",1],["🚢 Veľká loď s obilím odplávala do Afriky – dopyt rastie.",1],["😴 Pokojný deň na burze.",0],["📉 Veľa farmárov predáva naraz – ceny padajú.",-1]];
  const e=ev[Math.floor(Math.random()*ev.length)];G.ev=e[0];G.trend=e[1];G.farm=Math.round(G.m-18-Math.random()*8);G.trans=10}
function gStep(buy,sell){const msg=[];
  if(buy>0){const t=buy*25,cost=t*G.farm;if(cost>G.cash){msg.push("❗ Na toľko nemáš peniaze.");return msg}G.cash-=cost;G.stock+=t;msg.push(`🛒 Kúpil si ${t} t za ${G.farm} €/t = ${cost.toLocaleString("sk-SK")} €.`)}
  if(sell&&G.stock>0){const t=G.stock,earn=t*G.m,tr=t*G.trans;G.cash+=earn-tr;msg.push(`💰 Predal si ${t} t mlynu za ${G.m} €/t, doprava ${tr.toLocaleString("sk-SK")} € → dostal si ${(earn-tr).toLocaleString("sk-SK")} €.`);G.stock=0}
  const mv=Math.round((G.trend*6+(Math.random()*16-8)));G.m=Math.max(150,G.m+mv);G.r++;msg.push(`📊 Burza sa pohla o ${mv>0?"+":""}${mv} €/t.`);if(G.r<=5)gTurn();return msg}

// ---------- OBRAZOVKY ----------
function hero(){const c=coins(),lv=LEVEL(c),n=L.filter(l=>done(l.id)).length;
  return `<div class="hero kjh"><small>ERNTE Junior · škola biznisu</small><b>Ahoj, ${E(String(K.name||"").split(" ")[0])}! 👋</b><div class="kjst"><span>${lv[0]} ${E(lv[1])}</span><span>🪙 ${c}</span><span>✅ ${n} / ${L.length}</span></div></div>`}
function home(){const n=L.filter(l=>done(l.id)).length;
  return hero()+`<div class="kjtiles">${L.map((l,i)=>`<button type="button" class="kjt${done(l.id)?" ok":""}" data-kl="${l.id}" style="--i:${i}">${IMG(l.ico)}<b>${E(l.t)}</b><small>${E(l.s)}</small>${done(l.id)?'<em>✅ hotovo</em>':""}</button>`).join("")}
   <button type="button" class="kjt big" data-kg style="--i:9">${IMG("game")}<b>Hra: Obchodný deň</b><small>kúp lacno, predaj draho – 5 dní na burze</small></button>
   <button type="button" class="kjt" data-kb style="--i:10">${IMG("trophy")}<b>Moje odznaky</b><small>${n} z ${L.length} lekcií</small></button></div>
   <p class="kjnote">💡 V hre sú vymyslené čísla – na skúšanie. Burzový graf v lekcii Burza je ozajstný.</p>`}
function lesson(){const l=L.find(x=>x.id===V.slice(2));if(!l)return home();const c=l.c[S];
  if(S<l.c.length)return `<div class="kjbar"><button type="button" data-kh>← Späť</button><b>${E(l.t)}</b><span>${S+1} / ${l.c.length}</span></div>
   <div class="kjcard"><div class="kjem">${c[0]}</div><h2>${E(c[1])}</h2><p>${c[2]}</p>${l.chart&&S===2?`<div class="kjchart"><div class="kjcv">Načítavam burzu…</div></div>`:""}
   <div class="kjnav"><button type="button" data-ksay>🔊 Prečítaj mi</button>${S>0?`<button type="button" data-kprev>←</button>`:""}<button type="button" class="lime" data-knext>${S===l.c.length-1?"Kvíz! 🎯":"Ďalej →"}</button></div></div>`;
  const qi=S-l.c.length,q=l.q[qi];if(!q)return result(l);
  const ord=Q&&Q.ord&&Q.qi===qi?Q.ord:(()=>{const o=q[1].map((_,i)=>i);for(let i=o.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[o[i],o[j]]=[o[j],o[i]]}return o})();
  Q=Object.assign(Q||{ok:0},{qi,ord});
  return `<div class="kjbar"><button type="button" data-kh>← Späť</button><b>🎯 Kvíz · ${E(l.t)}</b><span>${qi+1} / ${l.q.length}</span></div>
   <div class="kjcard"><h2>${E(q[0])}</h2><div class="kjans">${ord.map(i=>`<button type="button" data-ka="${i}"${Q.pick!=null?" disabled":""} class="${Q.pick!=null?(i===q[2]?"ok":i===Q.pick?"bad":""):""}">${E(q[1][i])}</button>`).join("")}</div>
   ${Q.pick!=null?`<p class="kjfb">${Q.pick===q[2]?"🎉 Správne! +5 🪙":"🙂 Skoro! Správne je: <b>"+E(q[1][q[2]])+"</b>"}</p><div class="kjnav"><button type="button" class="lime" data-knq>Ďalej →</button></div>`:""}</div>`}
function result(l){const tot=l.q.length,ok=Q?Q.ok:0,pass=ok>=Math.ceil(tot*0.6);
  return `<div class="kjbar"><button type="button" data-kh>← Späť</button><b>${E(l.t)}</b></div><div class="kjcard kjres">${IMG(pass?"trophy":"bulb")}<h2>${pass?"Super, lekcia hotová!":"Skús to ešte raz"}</h2><p>Správne: <b>${ok} z ${tot}</b>${pass?` · odmena <b>+20 🪙</b> a odznak ${E(l.t)}`:""}</p>
   <div class="kjnav"><button type="button" data-kre>🔁 Znova</button><button type="button" class="lime" data-kh>Domov</button></div></div>`}
function badges(){return `<div class="kjbar"><button type="button" data-kh>← Späť</button><b>🏆 Moje odznaky</b></div><div class="kjtiles">${L.map(l=>`<div class="kjt kjbd${done(l.id)?" ok":""}">${IMG(l.ico)}<b>${E(l.t)}</b><small>${done(l.id)?"✅ získaný":"🔒 ešte nie"}</small></div>`).join("")}</div>
  <div class="kjcard"><h2>${LEVEL(coins())[0]} ${E(LEVEL(coins())[1])} · 🪙 ${coins()}</h2><p>Úrovne: 🌱 Učeň → 🌾 Výkupca (60) → 📈 Burzový žralok (150) → 🚛 Šéf dopravy (300) → 👑 Obchodný majster (600)</p>
  ${(P().hra&&P().hra.best)?`<p>🎮 Najlepšia hra: <b>${(+P().hra.best).toLocaleString("sk-SK")} €</b></p>`:""}</div>`}
function game(){if(!G)gNew();const end=G.r>5,val=G.cash+G.stock*G.m;
  if(end){const prof=val-20000;return `<div class="kjbar"><button type="button" data-kh>← Späť</button><b>🎮 Obchodný deň · koniec</b></div><div class="kjcard kjres">${IMG(prof>0?"trophy":"bulb")}<h2>${prof>0?"Zarobil si "+prof.toLocaleString("sk-SK")+" €! 🎉":prof<0?"Tentoraz strata "+(-prof).toLocaleString("sk-SK")+" €":"Vyšiel si na nulu"}</h2>
   <p>${prof>0?"Kúpil si lacnejšie, predal drahšie a doprava ťa nezjedla. Takto rozmýšľa obchodník!":"Aj veľkí obchodníci niekedy stratia. Dôležité je pochopiť prečo – burza išla proti tebe alebo si predal neskoro?"}</p>
   <div class="kjlog">${G.log.slice(-6).map(x=>`<div>${x}</div>`).join("")}</div><div class="kjnav"><button type="button" class="lime" data-kgn>🔁 Hrať znova</button><button type="button" data-kh>Domov</button></div></div>`}
  return `<div class="kjbar"><button type="button" data-kh>← Späť</button><b>🎮 Obchodný deň</b><span>deň ${G.r} / 5</span></div>
   <div class="kjcard"><div class="kjgs"><div><small>Peniaze</small><b>${G.cash.toLocaleString("sk-SK")} €</b></div><div><small>Na sklade</small><b>${G.stock} t</b></div><div><small>Mlyn kúpi za</small><b>${G.m} €/t</b></div><div><small>Farmár predá za</small><b>${G.farm} €/t</b></div></div>
   <p class="kjev">📰 ${E(G.ev)}</p><p>Doprava do mlyna stojí <b>${G.trans} €</b> za každú tonu. Kamión = 25 t.</p>
   <div class="kjans">${[0,1,2,3].map(n=>`<button type="button" data-kbuy="${n}">${n?"🛒 Kúpiť "+n+" kamión"+(n>1?"y":"")+" ("+n*25+" t)":"⏸️ Dnes nekupujem"}</button>`).join("")}</div>
   <label class="kjsell"><input type="checkbox" data-ksell ${G.sell?"checked":""}> 💰 Dnes predať všetko na sklade mlynu</label>
   <div class="kjlog">${G.log.slice(-4).map(x=>`<div>${x}</div>`).join("")}</div>
   <p class="kjnote">Tip: kúp, keď je farmár lacnejší ako mlyn mínus doprava. Keď burza rastie, oplatí sa chvíľu počkať – ale pozor, môže aj padnúť!</p></div>`}
function render(){const a=document.getElementById("app");if(!a||!K)return;
  let h=V==="home"?home():V.startsWith("l:")?lesson():V==="game"?game():V==="badges"?badges():home();
  if(V!=="home")h=hero()+h;a.innerHTML=h;window.scrollTo({top:0});if(V.startsWith("l:"))chart()}
async function chart(){const b=document.querySelector(".kjchart");if(!b)return;
  try{const r=await fetch("market.json",{cache:"no-store"});const m=r.ok?await r.json():null;let h=null;try{const x=await fetch("https://raw.githubusercontent.com/ernte-trade/ernte-/burza-hist/hist.json",{cache:"no-store"});h=x.ok?await x.json():null}catch(e){}
    const D={};for(const r2 of ((h&&h.d)||[]))D[r2.d]=r2;for(const r2 of ((m&&m.hist)||[]))D[r2.d]=Object.assign(D[r2.d]||{},r2);
    const pts=Object.keys(D).sort().map(d=>[d,+D[d].matif_psenica]).filter(p=>p[1]>0);if(pts.length<2){b.innerHTML=`<div class="kjcv">Graf sa ešte zbiera.</div>`;return}
    const W=320,H=120,vs=pts.map(p=>p[1]),mn=Math.min(...vs),mx=Math.max(...vs),X=i=>i/(pts.length-1)*W,Y=v=>H-8-(v-mn)/((mx-mn)||1)*(H-20);
    const d=pts.map((p,i)=>(i?"L":"M")+X(i).toFixed(1)+","+Y(p[1]).toFixed(1)).join(" ");
    b.innerHTML=`<div class="kjcv">🌾 Pšenica na burze MATIF (Paríž) · € za tonu</div><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${d} L${W},${H} L0,${H} Z" fill="rgba(250,204,21,.18)"/><path d="${d}" fill="none" stroke="#facc15" stroke-width="3" vector-effect="non-scaling-stroke"/></svg>
     <div class="kjcl"><span>${pts[0][0].split("-").reverse().slice(0,2).join(". ")}.: <b>${Math.round(pts[0][1])} €</b></span><span>dnes: <b>${Math.round(pts[pts.length-1][1])} €</b></span></div>
     <div class="kjcv">Najnižšie ${Math.round(mn)} €, najvyššie ${Math.round(mx)} € – rozdiel ${Math.round(mx-mn)} € na každej tone. Pri jednom kamióne (25 t) je to ${Math.round((mx-mn)*25).toLocaleString("sk-SK")} €!</div>`}catch(x){b.innerHTML=`<div class="kjcv">Burza sa teraz nenačítala.</div>`}}
document.addEventListener("click",async e=>{if(!K)return;const t=e.target.closest&&e.target.closest("[data-kl],[data-kh],[data-knext],[data-kprev],[data-ksay],[data-ka],[data-knq],[data-kre],[data-kg],[data-kgn],[data-kb],[data-kbuy]");if(!t)return;e.preventDefault();
  if(t.dataset.kl){V="l:"+t.dataset.kl;S=0;Q=null;render();return}
  if("kh" in t.dataset){V="home";render();return}
  if("kb" in t.dataset){V="badges";render();return}
  if("kg" in t.dataset){V="game";if(!G||G.r>5)gNew();render();return}
  if("kgn" in t.dataset){gNew();render();return}
  if("ksay" in t.dataset){const c=document.querySelector(".kjcard");if(c)say((c.querySelector("h2")||{}).textContent+". "+(c.querySelector("p")||{}).textContent);return}
  if("knext" in t.dataset){S++;Q=null;render();return}
  if("kprev" in t.dataset){S=Math.max(0,S-1);render();return}
  if(t.dataset.ka!=null){const l=L.find(x=>x.id===V.slice(2)),q=l.q[Q.qi];if(Q.pick!=null)return;Q.pick=+t.dataset.ka;if(Q.pick===q[2]){Q.ok++;addCoins(5,"kvíz "+l.t);try{navigator.vibrate&&navigator.vibrate(40)}catch(x){}}render();return}
  if("knq" in t.dataset){const l=L.find(x=>x.id===V.slice(2));Q.pick=null;Q.ord=null;S++;if(S-l.c.length>=l.q.length){const pass=Q.ok>=Math.ceil(l.q.length*0.6);const was=done(l.id);save("l_"+l.id,{ok:pass||was,best:Math.max(Q.ok,(P()["l_"+l.id]||{}).best||0),at:Date.now()});if(pass&&!was)addCoins(20,"lekcia "+l.t)}render();return}
  if("kre" in t.dataset){S=0;Q=null;render();return}
  if(t.dataset.kbuy!=null){const sell=!!(document.querySelector("[data-ksell]")||{}).checked;const m=gStep(+t.dataset.kbuy,sell);G.log.push(...m);
    if(G.r>5){const val=G.cash+G.stock*G.m,prof=val-20000;const h=Object.assign({n:0,best:0},P().hra||{});h.n++;h.best=Math.max(h.best,prof);h.last=prof;save("hra",h);if(prof>0)addCoins(Math.min(50,Math.round(prof/100)),"hra")}render();return}},true);
window.startKid=function(){document.documentElement.classList.add("kjon");try{$("hT").textContent="ERNTE Junior";$("hS").textContent=K.name+" · škola biznisu";$("refBtn").hidden=true}catch(x){}V="home";render()};
window.kidEnter=async function(){try{const r=await sb.rpc("kid_me");if(!r.error&&r.data&&r.data.name){K=r.data;window.ERNTE_KIND="junior";startKid();return true}}catch(x){}return false};

// ---------- 👨 MAJITEĽ: Tím → ERNTE Junior (vytvoriť prihlásenie, pokrok syna) ----------
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER)&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST;
const O={L:null,at:0,res:null};
function oHtml(){const L2=O.L||[];
  return `<section class="card kjo" id="kjoCard"><h2>🧒 ERNTE Junior – škola biznisu</h2>
   ${L2.map(k=>{const p=k.p||{},n=L.filter(l=>p["l_"+l.id]&&p["l_"+l.id].ok).length,c=+(p.stav&&p.stav.c)||0;return `<div class="kjor"><b>${E(k.name)}</b><small>${E(k.email)}</small>
     <div class="kjost"><span>✅ ${n} / ${L.length} lekcií</span><span>🪙 ${c}</span><span>${LEVEL(c)[0]} ${E(LEVEL(c)[1])}</span>${p.hra?`<span>🎮 ${p.hra.n}× · najlepšie ${(+p.hra.best||0).toLocaleString("sk-SK")} €</span>`:""}<span>${k.last?"naposledy "+new Date(k.last).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}):"ešte sa neprihlásil"}</span></div>
     <div class="kjol">${L.map(l=>`<i title="${E(l.t)}" class="${p["l_"+l.id]&&p["l_"+l.id].ok?"ok":""}">${IMG(l.ico)}</i>`).join("")}</div></div>`}).join("")}
   <div class="kjof"><label>Meno syna<input data-kjo="name" placeholder="napr. Matej Vaľko" autocomplete="off"></label><label>Prihlasovacie meno<input data-kjo="login" placeholder="napr. matej" autocomplete="off" autocapitalize="off"></label>
   <button type="button" class="pri" data-kjocreate>${L2.length?"🔑 Nové prihlásenie / nové heslo":"🧒 Vytvoriť prihlásenie"}</button></div>
   ${O.res?`<div class="kjores"><p>⚠️ Heslo vidíš <b>iba teraz</b>. Prihlásenie: <b>${E(O.res.login.replace(/@junior\.ernte\.sk$/,""))}</b> · heslo: <b class="kjopw">${E(O.res.pw)}</b></p><div class="btns"><button type="button" data-kjocp>📋 Kopírovať odkaz s prihlásením</button><button type="button" data-kjowa>💬 WhatsApp</button></div><small>Ťuknutím na odkaz sa prihlási sám. Na prihlasovacej obrazovke stačí napísať iba meno (bez @).</small></div>`:""}
   <p class="kjnote">Junior nevidí žiadne naše ceny, marže, farmárov ani odberateľov – iba lekcie, hru s vymyslenými číslami a verejnú burzu.</p></section>`}
function oPut(){const app=document.getElementById("app");if(!app)return;const old=document.getElementById("kjoCard");const show=OWN()&&typeof TAB!=="undefined"&&TAB==="team";
  if(!show){if(old)old.remove();return}if(old&&old.contains(document.activeElement)&&document.activeElement.tagName==="INPUT")return;
  const h=oHtml();let hs=0;for(let i=0;i<h.length;i++)hs=(hs*31+h.charCodeAt(i))|0;if(old&&old.dataset.h===String(hs))return;
  const d=document.createElement("div");d.innerHTML=h;const el=d.firstElementChild;el.dataset.h=String(hs);if(old){old.replaceWith(el);return}
  const a=document.getElementById("hinvCard")||document.getElementById("taCard")||app.querySelector("nav.tabs")||app.querySelector(".hero");if(a)a.after(el);else app.prepend(el)}
async function oLoad(){O.at=Date.now();try{const r=await sb.rpc("kid_list");if(!r.error)O.L=r.data||[]}catch(x){}oPut()}
const kLink=()=>typeof inviteLink==="function"?inviteLink(O.res.login,O.res.pw):"https://app.ernte.sk/farmar/";
const kMsg=()=>`Ahoj! Tu je tvoje prihlásenie do ERNTE Junior – škola biznisu od tatina. 🌾📈🚛\n\nMeno: ${O.res.login.replace(/@junior\.ernte\.sk$/,"")}\nHeslo: ${O.res.pw}\n\nŤukni na odkaz a prihlási ťa to samo.\n\n👉 ERNTE Trade & Logistic: ${kLink()}`;
document.addEventListener("click",async e=>{const t=e.target.closest&&e.target.closest("[data-kjocreate],[data-kjocp],[data-kjowa]");if(!t||!OWN())return;e.preventDefault();
  if("kjocreate" in t.dataset){const nm=(document.querySelector('[data-kjo="name"]')||{}).value||"",lg=(document.querySelector('[data-kjo="login"]')||{}).value||"";
    if(nm.trim().length<2||lg.trim().length<2){toast("Napíšte meno aj prihlasovacie meno.");return}t.disabled=true;
    try{const r=await sb.rpc("kid_create",{p_name:nm,p_login:lg});if(r.error)throw r.error;O.res=r.data;toast("✓ Prihlásenie pre Juniora je pripravené.",4000);oLoad()}catch(x){t.disabled=false;toast("Nepodarilo sa: "+(x&&x.message||x),6000)}return}
  if("kjocp" in t.dataset){try{await navigator.clipboard.writeText(kMsg());toast("✓ Skopírované.")}catch(x){prompt("Skopírujte:",kMsg())}return}
  if("kjowa" in t.dataset){window.open("https://wa.me/?text="+encodeURIComponent(kMsg()),"_blank","noopener")}},true);
let q=0;function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}
  new MutationObserver(()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;if(OWN()&&TAB==="team"&&Date.now()-O.at>120e3)oLoad();oPut()})}).observe(app,{childList:true})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
{const s=document.createElement("style");s.textContent=`
.kjh b{font-size:1.5rem}.kjst{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:8px}.kjst span{padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.12);font-weight:800}
.kjtiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0}
.kjt{position:relative;display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:150px;padding:14px 10px!important;border-radius:26px!important;text-align:center;color:#fff!important;
 background:linear-gradient(150deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 55%,rgba(56,189,248,.14))!important;border:1px solid rgba(255,255,255,.22)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 14px 34px rgba(0,0,0,.35)!important}
.kjt img{width:56px;height:56px;filter:drop-shadow(0 8px 10px rgba(0,0,0,.45));animation:kjbob 3.2s ease-in-out infinite;animation-delay:calc(var(--i,0)*-.4s)}
.kjt b{font:800 1.05rem/1.2 var(--f-head,system-ui)}.kjt small{opacity:.85;font-size:.84rem}.kjt em{font-style:normal;font-size:.78rem;color:#86efac;font-weight:800}
.kjt.ok{border-color:rgba(134,239,172,.7)!important;background:linear-gradient(150deg,rgba(134,239,172,.2),rgba(255,255,255,.03))!important}
.kjt.big{grid-column:1/-1;min-height:160px;background:linear-gradient(140deg,rgba(250,204,21,.3),rgba(244,114,182,.2) 60%,rgba(124,92,255,.2))!important;border-color:rgba(250,204,21,.6)!important}
.kjbd:not(.ok){opacity:.55;filter:grayscale(.6)}
@keyframes kjbob{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-6px) rotate(-3deg)}}
.kjbar{display:flex;align-items:center;gap:10px;margin:12px 0}.kjbar b{flex:1;font-size:1.05rem}.kjbar span{opacity:.75;font-weight:700}.kjbar button{min-height:46px;border-radius:999px;padding:0 16px}
.kjcard{border-radius:26px;padding:20px 16px;background:linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.2);display:grid;gap:12px;text-align:center}
.kjcard h2{margin:0;font:800 1.3rem/1.25 var(--f-head,system-ui);text-transform:none;letter-spacing:0}.kjcard p{margin:0;font-size:1.08rem;line-height:1.6}.kjem{font-size:3.4rem;line-height:1;animation:kjbob 3s ease-in-out infinite}
.kjnav{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}.kjnav button{min-height:52px;border-radius:999px;padding:0 20px;font-size:1.02rem}
.kjans{display:grid;gap:8px}.kjans button{min-height:56px;border-radius:18px;font-size:1.05rem;background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.2);color:#fff}
.kjans button.ok{background:rgba(34,197,94,.3)!important;border-color:#22c55e!important}.kjans button.bad{background:rgba(239,68,68,.25)!important;border-color:#ef4444!important}
.kjfb{font-weight:700}.kjres img{width:96px;height:96px;margin:0 auto}
.kjchart{border-radius:18px;background:rgba(0,0,0,.25);padding:10px}.kjchart svg{width:100%;height:120px;display:block}.kjcv{font-size:.9rem;opacity:.9;line-height:1.45}.kjcl{display:flex;justify-content:space-between;font-size:.85rem;margin-top:4px}
.kjgs{display:grid;grid-template-columns:1fr 1fr;gap:8px}.kjgs div{border-radius:14px;background:rgba(255,255,255,.07);padding:8px}.kjgs small{display:block;opacity:.75}.kjgs b{font-size:1.15rem}
.kjev{background:rgba(250,204,21,.14);border-radius:14px;padding:10px;font-weight:700}.kjsell{display:flex;gap:10px;align-items:center;justify-content:center;font-weight:700;min-height:48px}.kjsell input{width:24px;height:24px}
.kjlog{display:grid;gap:4px;font-size:.88rem;opacity:.9;text-align:left}.kjnote{text-align:center;opacity:.75;font-size:.85rem}
.kjo .kjor{border-top:1px solid rgba(255,255,255,.1);padding:10px 0;display:grid;gap:4px}.kjost{display:flex;flex-wrap:wrap;gap:6px;font-size:.84rem}.kjost span{padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.08)}
.kjol{display:flex;flex-wrap:wrap;gap:4px}.kjol i img{width:30px;height:30px;opacity:.3;filter:grayscale(1)}.kjol i.ok img{opacity:1;filter:none}
.kjof{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;align-items:end;margin-top:8px}.kjof label{display:grid;gap:4px;font-size:.85rem}.kjof input{min-height:48px}.kjof button{grid-column:1/-1;min-height:52px}
.kjores{margin-top:10px;padding:12px;border-radius:14px;background:rgba(245,158,11,.14);border:1px solid rgba(245,158,11,.5)}.kjopw{font-family:ui-monospace,monospace;color:#b6ff3b}
@media(max-width:360px){.kjt{min-height:130px}.kjt img{width:48px;height:48px}}
@media (prefers-reduced-motion:reduce){.kjt img,.kjem{animation:none}}`;document.head.appendChild(s)}
})();
