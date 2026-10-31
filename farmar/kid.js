// ===== 🧒 ERNTE JUNIOR – škola biznisu pre syna majiteľa (príkaz majiteľa 31. 10. 2026) =====
// Prihlásenie Junior (tabuľka kids) NIE JE tím ani farmár → nevidí žiadne obchodné údaje (ceny, marže, farmárov, odberateľov).
//  • Lekcie: rodinný podnik (firma, B2B, burza s ozajstným grafom, doprava, zmluva, peniaze, riziko, kurací trus, vedenie ľudí,
//    rozhodovanie, rodinný podnik, investovanie a ETF) – po slovensky aj po anglicky (🇬🇧 English mode, výslovnosť).
//  • Škola 4. ročník: matematika (nekonečné príklady), vybrané slová, vlastiveda Slovenska, angličtina.
//  • Hry: Obchodný deň, ETF sporenie (vymyslené čísla).
//  • 💶 Skutočná odmena od otca: za správnu odpoveď (predvolene 0,10 €), za lekciu (+1 €), max 10 € denne a 100 € mesačne –
//    sadzby a stropy drží databáza (kid_earn_add), otec ich mení a označuje Vyplatené v Tíme.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const IMG=(k,n)=>`<img src="img/ico/${k}.png" alt="" width="${n||56}" height="${n||56}" draggable="false">`;
const EUR=v=>(+v||0).toLocaleString("sk-SK",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";
let K=null,V="home",S=0,Q=null,G=null,ETF=null,PR=null,PAY=null;
const P=()=>(K&&K.p)||{};
const EN=()=>!!(P().en&&P().en.on);
const coins=()=>+(P().stav&&P().stav.c)||0;
const done=id=>!!(P()["l_"+id]&&P()["l_"+id].ok);
async function save(k,v){(K.p||(K.p={}))[k]=v;try{await sb.rpc("kid_save",{p_key:k,p_val:v})}catch(x){}}
function addCoins(n,why){const st=Object.assign({c:0,log:[]},P().stav||{});st.c=Math.max(0,(+st.c||0)+n);st.log=[{t:Date.now(),n,why}].concat(st.log||[]).slice(0,20);save("stav",st)}
const LEVEL=c=>c>=600?["👑","Obchodný majster"]:c>=300?["🚛","Šéf dopravy"]:c>=150?["📈","Burzový žralok"]:c>=60?["🌾","Výkupca"]:["🌱","Učeň"];
function say(t,lang){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(t).replace(/<[^>]+>/g,"").replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu,""));u.lang=lang||"sk-SK";u.rate=lang==="en-GB"?.9:.95;speechSynthesis.speak(u)}catch(x){}}
// 💶 skutočná odmena – databáza rozhodne, koľko pripíše (sadzba, denný a mesačný strop)
async function earn(kind,what){try{const r=await sb.rpc("kid_earn_add",{p_kind:kind,p_what:what});if(r.error||!r.data)return;PAY=Object.assign(PAY||{},{month:r.data.month,max:r.data.max,today:r.data.today,day:r.data.day});
  if(+r.data.eur>0)pop("+"+EUR(r.data.eur));else if(+r.data.month>=+r.data.max)pop("Tento mesiac už máš maximum 🎉");else if(+r.data.today>=+r.data.day)pop("Dnes už máš denné maximum – pokračuj zajtra 😉");
  const b=document.querySelector(".kjpay");if(b)b.outerHTML=payCard()}catch(x){}}
function pop(t){const d=document.createElement("div");d.className="kjpop";d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),1800);try{navigator.vibrate&&navigator.vibrate(30)}catch(x){}}
async function loadPay(){try{const r=await sb.rpc("kid_earn_view");if(!r.error&&r.data){const d=r.data,cur=(d.months||[]).find(m=>m.m===d.now);PAY=Object.assign({},PAY||{},{v:d,month:cur?+cur.eur:0,max:+(d.cfg&&d.cfg.max)||100,day:+(d.cfg&&d.cfg.day)||10,rate:+(d.cfg&&d.cfg.rate)||0.1,lesson:+(d.cfg&&d.cfg.lesson)||1});
  if(PAY.today==null){const t=new Date().toLocaleDateString("sv-SE");PAY.today=(d.last||[]).filter(x=>new Date(x.at).toLocaleDateString("sv-SE")===t).reduce((a,x)=>a+(+x.eur),0)}}}catch(x){}}
function payCard(){const p=PAY||{month:0,max:100},pct=Math.min(100,(+p.month||0)/(+p.max||100)*100);
  return `<button type="button" class="kjpay" data-kpay><div class="kjpt">${IMG("money",44)}<div><small>💶 Moje zarobené od tatina · tento mesiac</small><b>${EUR(p.month)} <i>z ${EUR(p.max)}</i></b></div></div>
   <div class="kjpb"><i style="width:${pct.toFixed(1)}%"></i></div><small>${p.rate?`za správnu odpoveď ${EUR(p.rate)} · lekcia ${EUR(p.lesson)} · `:""}dnes ${EUR(p.today||0)} z ${EUR(p.day||10)} · ťukni pre prehľad</small></button>`}

// ---------- LEKCIE (SK + EN) ----------  karta: [emoji, nadpis SK, text SK, title EN, text EN] · kvíz: [otázka SK, [možnosti SK], správna, question EN, [options EN]]
const L=[
 {id:"firma",ico:"sheaf",t:"Čo robí naša firma",te:"What our company does",s:"ERNTE, VALKO a Danube",c:[
  ["🌾","Kto sme?","Tatinova firma <b>ERNTE</b> kupuje od farmárov obilie a semienka – pšenicu, kukuricu, repku, slnečnicu, jačmeň a sóju. Farmár ich celý rok pestuje na poli a po žatve ich potrebuje predať.","Who are we?","Dad's company <b>ERNTE</b> buys grain and seeds from farmers – wheat, corn, rapeseed, sunflower, barley and soybeans. After the harvest the farmer needs to sell them."],
  ["🏭","Komu to predávame?","Obilie <b>predáme ďalej</b> firmám, ktoré z neho niečo vyrobia: <b>mlyn</b> urobí múku na chlieb, <b>olejáreň</b> vylisuje olej, <b>krmiváreň</b> urobí krmivo pre zvieratá.","Who do we sell to?","We <b>sell</b> the grain to companies that make things from it: a <b>mill</b> makes flour for bread, an <b>oil mill</b> presses oil, a <b>feed mill</b> makes food for animals."],
  ["🚛","A ako sa tam dostane?","Obilie treba odviezť. Na to máme firmu <b>VALKO</b> – má kamióny a vodičov. Jeden kamión odvezie asi <b>25 ton</b> – ako 25 osobných áut naraz!","How does it get there?","The grain must be transported. Our company <b>VALKO</b> has trucks and drivers. One truck carries about <b>25 tonnes</b> – like 25 cars at once!"],
  ["🌊","Aj v Maďarsku","Firma <b>Danube</b> robí to isté v Maďarsku. Obchod nemá hranice – kupujeme a predávame aj v iných krajinách.","Also in Hungary","The company <b>Danube</b> does the same in Hungary. Trade has no borders – we buy and sell in other countries too."],
  ["📱","Táto aplikácia","V tejto aplikácii farmári vidia naše ceny a predávajú jedným ťuknutím. Tím v nej uzatvára obchody, plánuje dopravu a počíta peniaze. Je to <b>riadiaca veža</b> firmy.","This app","In this app farmers see our prices and sell with one tap. The team makes deals, plans transport and counts money. It is the <b>control tower</b> of the company."]],
  q:[["Čo kupuje ERNTE od farmárov?",["Obilie a semienka","Autá","Hračky"],0,"What does ERNTE buy from farmers?",["Grain and seeds","Cars","Toys"]],["Ktorá firma vozí obilie kamiónmi?",["VALKO","Danube","Mlyn"],0,"Which company transports grain by truck?",["VALKO","Danube","The mill"]],["Čo urobí mlyn z pšenice?",["Múku","Olej","Benzín"],0,"What does a mill make from wheat?",["Flour","Oil","Petrol"]]]},
 {id:"b2b",ico:"deals",t:"Nákup a predaj · B2B",te:"Buying and selling · B2B",s:"firma ↔ firma",c:[
  ["🤝","Čo je B2B?","<b>B2B</b> = „business to business“ – <b>firma predáva firme</b>. Nepredávame vrecko múky v obchode, ale celé kamióny obilia iným firmám.","What is B2B?","<b>B2B</b> means business to business – <b>a company sells to a company</b>. We don't sell a bag of flour in a shop, we sell whole trucks of grain to other companies."],
  ["🛒","A čo je B2C?","<b>B2C</b> = „business to customer“ – firma predáva obyčajnému človeku, napríklad rožok v potravinách. Ten rožok je ale z múky, ktorá bola kedysi naše obilie!","And B2C?","<b>B2C</b> means business to customer – a company sells to a person, like a bread roll in a shop. That roll is made from flour that was once our grain!"],
  ["🔁","Kúp lacnejšie, predaj drahšie","Obchodník kúpi za nejakú cenu a predá za vyššiu. Rozdiel – až <b>po zaplatení všetkých nákladov</b> (doprava, nafta, ľudia, sklad) – je <b>zisk</b>.","Buy low, sell high","A trader buys at one price and sells at a higher price. What is left <b>after paying all costs</b> (transport, fuel, people, storage) is the <b>profit</b>."],
  ["🤗","Dôvera","Farmári predávajú tomu, komu veria. Keď sľúbime cenu a kamión v utorok, musí to platiť. Dobré meno sa buduje roky a pokazí sa za jeden deň.","Trust","Farmers sell to people they trust. When we promise a price and a truck on Tuesday, it must happen. A good name takes years to build and one day to lose."]],
  q:[["Čo znamená B2B?",["Firma predáva firme","Bábätko predáva bábätku","Banka predáva banke"],0,"What does B2B mean?",["A company sells to a company","A baby sells to a baby","A bank sells to a bank"]],["Kedy má firma zisk?",["Keď predá drahšie, ako ju všetko stálo","Keď veľa míňa","Keď nič nepredá"],0,"When does a company make a profit?",["When it sells for more than everything cost","When it spends a lot","When it sells nothing"]],["Čo je v obchode najdôležitejšie?",["Dôvera a dodržané slovo","Najväčšie auto","Hlasno kričať"],0,"What is most important in business?",["Trust and keeping your word","The biggest car","Shouting loudly"]]]},
 {id:"burza",ico:"chart",t:"Burza",te:"The commodity exchange",s:"kde sa rodí cena",chart:1,c:[
  ["🏛️","Čo je burza?","<b>Burza</b> je veľký trh, kde sa celý svet dohaduje, koľko stojí tona pšenice či kukurice. Pre Európu je to <b>MATIF v Paríži</b>, pre Ameriku <b>CBOT v Chicagu</b>.","What is an exchange?","An <b>exchange</b> is a big market where the whole world agrees on the price of a tonne of wheat or corn. For Europe it is <b>MATIF in Paris</b>, for America <b>CBOT in Chicago</b>."],
  ["📈","Cena sa stále hýbe","Keď je obilia málo (sucho), cena <b>stúpa</b>. Keď je ho veľa, cena <b>klesá</b>. Ako zmrzlina v lete – keď ju chce každý, je drahšia.","Prices always move","When there is little grain (drought), the price <b>goes up</b>. When there is a lot, the price <b>goes down</b>. Like ice cream in summer – when everyone wants it, it costs more."],
  ["👀","Ozajstný graf","Pod textom je <b>naozajstný graf burzy</b> za posledné mesiace. Pozri, ako cena chodí hore a dole ako horská dráha.","A real chart","Below is a <b>real exchange chart</b> for the last months. Look how the price goes up and down like a roller coaster."],
  ["🧠","Prečo to sledujeme?","Tatino a jeho tím sledujú burzu každý deň. Podľa nej vedia, za koľko kúpiť od farmára a za koľko predať.","Why do we watch it?","Dad and his team watch the exchange every day. It tells them how much to pay the farmer and how much to sell for."]],
  q:[["Ako sa volá burza v Paríži?",["MATIF","Eiffel","Louvre"],0,"What is the exchange in Paris called?",["MATIF","Eiffel","Louvre"]],["Čo sa stane s cenou, keď je obilia málo?",["Stúpa","Klesá","Nič"],0,"What happens to the price when there is little grain?",["It goes up","It goes down","Nothing"]],["Kde je burza CBOT?",["V Chicagu","V Košiciach","V Prahe"],0,"Where is the CBOT exchange?",["In Chicago","In Košice","In Prague"]]]},
 {id:"doprava",ico:"fleet",t:"Doprava VALKO",te:"VALKO transport",s:"kamióny, nafta, kilometre",c:[
  ["🚛","Kamión","Kamión unesie asi <b>25 ton</b>. Vodič ho naloží na farme, odvezie na <b>váhu</b>, kde sa odváži, a vyloží u odberateľa.","The truck","A truck carries about <b>25 tonnes</b>. The driver loads it at the farm, drives to the <b>scale</b> to weigh it and unloads it at the customer."],
  ["⛽","Čo stojí jazda?","Kamión spotrebuje asi 30 litrov <b>nafty</b> na 100 km. Platí sa aj <b>mýto</b>, výplata vodiča a opravy. Dlhá cesta stojí veľa peňazí.","What does a trip cost?","A truck uses about 30 litres of <b>diesel</b> per 100 km. We also pay <b>tolls</b>, the driver's salary and repairs. A long trip costs a lot of money."],
  ["🗺️","Plánovanie","Dispečer plánuje, aby auto nejazdilo prázdne. Najlepšie je zaviezť tovar tam a cestou späť zobrať iný náklad.","Planning","The dispatcher plans so trucks don't drive empty. The best is to deliver goods there and bring another load back."],
  ["🛡️","Bezpečnosť","Vodič musí oddychovať, dodržiavať rýchlosť a mať papiere – <b>CMR</b> je taký „pas“ pre náklad.","Safety","The driver must rest, keep the speed limit and have documents – the <b>CMR</b> is like a passport for the load."]],
  q:[["Koľko ton odvezie veľký kamión?",["Asi 25 ton","1 tonu","500 ton"],0,"How many tonnes does a big truck carry?",["About 25 tonnes","1 tonne","500 tonnes"]],["Čo platí kamión na diaľnici?",["Mýto","Lístok do kina","Nič"],0,"What does a truck pay on the motorway?",["A toll","A cinema ticket","Nothing"]],["Kedy je jazda najvýhodnejšia?",["Keď vezie náklad tam aj späť","Keď ide prázdny","Keď stojí"],0,"When is a trip most profitable?",["With a load both ways","When it is empty","When it stands still"]]]},
 {id:"zmluva",ico:"scroll",t:"Zmluva a slovo",te:"Contracts and promises",s:"dohoda na papieri",c:[
  ["📜","Čo je zmluva?","<b>Zmluva</b> je dohoda napísaná na papieri alebo v aplikácii: <b>čo</b> predávame, <b>koľko</b>, za <b>akú cenu</b> a <b>kedy</b>.","What is a contract?","A <b>contract</b> is an agreement written on paper or in the app: <b>what</b> we sell, <b>how much</b>, for <b>what price</b> and <b>when</b>."],
  ["✍️","Podpis","Podpis znamená: „Súhlasím a dodržím to.“ Dnes sa dá podpísať aj prstom v mobile.","Signature","A signature means: I agree and I will keep it. Today you can even sign with your finger on a phone."],
  ["⚖️","Keď niekto nedodrží","Ak farmár sľúbi 100 ton a dovezie 50, zmluva hovorí, čo sa stane. Preto ju treba čítať pozorne – aj drobné písmená.","When someone breaks it","If a farmer promises 100 tonnes and brings 50, the contract says what happens. That is why you read it carefully – even the small print."]],
  q:[["Čo musí byť v zmluve?",["Čo, koľko, za koľko a kedy","Obľúbená farba","Počasie"],0,"What must be in a contract?",["What, how much, what price and when","A favourite colour","The weather"]],["Čo znamená podpis?",["Súhlasím a dodržím to","Nič","Že sa mi to páči"],0,"What does a signature mean?",["I agree and I will keep it","Nothing","That I like it"]]]},
 {id:"peniaze",ico:"money",t:"Peniaze vo firme",te:"Money in a company",s:"tržba, náklady, zisk",c:[
  ["💶","Tržba","<b>Tržba</b> sú všetky peniaze, ktoré firma dostane za predaný tovar.","Revenue","<b>Revenue</b> is all the money a company gets for the goods it sells."],
  ["🧾","Náklady","<b>Náklady</b> musí firma zaplatiť: farmárovi za obilie, nafta, výplaty, kancelária, poistenie, dane.","Costs","<b>Costs</b> are what the company must pay: the farmer for grain, diesel, salaries, the office, insurance, taxes."],
  ["🟢","Zisk = tržba − náklady","Vymyslený príklad: predáme za <b>1 000 €</b>, všetko nás stálo <b>950 €</b>, zisk je <b>50 €</b>. Z veľkej tržby je často malý zisk – preto treba dobre počítať.","Profit = revenue − costs","Example: we sell for <b>€1,000</b>, everything cost <b>€950</b>, profit is <b>€50</b>. Big revenue often means small profit – so you must count carefully."],
  ["⏳","Faktúra","Po predaji pošleme <b>faktúru</b> – papier, koľko nám majú zaplatiť. Často platia až o 30 dní, preto firma potrebuje mať peniaze odložené.","Invoice","After a sale we send an <b>invoice</b> – a paper saying how much they must pay us. Often they pay after 30 days, so a company needs savings."]],
  q:[["Ako vypočítaš zisk?",["Tržba mínus náklady","Tržba plus náklady","Náklady krát dva"],0,"How do you calculate profit?",["Revenue minus costs","Revenue plus costs","Costs times two"]],["Predám za 500 €, náklady 450 €. Zisk?",["50 €","950 €","500 €"],0,"I sell for €500, costs are €450. Profit?",["€50","€950","€500"]],["Čo je faktúra?",["Papier, koľko nám majú zaplatiť","Druh obilia","Kamión"],0,"What is an invoice?",["A paper saying how much they must pay","A kind of grain","A truck"]]]},
 {id:"riziko",ico:"wx",t:"Riziko a počasie",te:"Risk and weather",s:"príroda rozhoduje",c:[
  ["🌦️","Počasie je šéf","Keď neprší, úroda je slabá. Keď prší počas žatvy, kombajny nemôžu ísť na pole. Preto tatino sleduje počasie každý deň.","Weather is the boss","Without rain the harvest is poor. When it rains at harvest time, combines can't work. That's why dad checks the weather every day."],
  ["🎲","Riziko","<b>Riziko</b> znamená, že sa niečo môže pokaziť: cena spadne, kamión sa pokazí, farmár nedodá. Dobrý podnikateľ má záložný plán.","Risk","<b>Risk</b> means something can go wrong: the price falls, a truck breaks, a farmer doesn't deliver. A good businessman has a backup plan."],
  ["🧺","Vajíčka v košíkoch","Keď firma robí viac vecí (obchod, doprava, služby) a jedna sa nedarí, ostatné ju podržia.","Eggs and baskets","Don't put all your eggs in one basket. When a company does several things and one goes badly, the others keep it going."]],
  q:[["Čo znamená riziko?",["Že sa niečo môže pokaziť","Že je všetko isté","Druh kamiónu"],0,"What does risk mean?",["Something can go wrong","Everything is certain","A kind of truck"]],["Prečo má firma viac činností?",["Aby ju ostatné podržali","Lebo sa nudí","Nemá to význam"],0,"Why does a company do several things?",["So the others can keep it going","Because it is bored","It doesn't matter"]]]},
 {id:"trus",ico:"trus",t:"Kurací trus = hnojivo",te:"Chicken manure = fertiliser",s:"nič sa nevyhadzuje",c:[
  ["🐔","Z odpadu poklad","Na hydinových farmách vzniká veľa <b>kuracieho trusu</b>. Pre pole je to výborné <b>prírodné hnojivo</b>.","Treasure from waste","Poultry farms make a lot of <b>chicken manure</b>. For fields it is a great <b>natural fertiliser</b>."],
  ["🔄","Kolobeh","Trus odvezieme na polia, rastliny z neho rastú, z obilia je krmivo pre sliepky… kruh sa uzavrie. Volá sa to <b>obehové hospodárstvo</b>.","The circle","We bring manure to fields, plants grow, grain becomes chicken feed… and the circle closes. This is the <b>circular economy</b>."]],
  q:[["Na čo sa hodí kurací trus?",["Ako hnojivo na pole","Do polievky","Na stavbu domu"],0,"What is chicken manure good for?",["Fertiliser for fields","Soup","Building a house"]],["Ako sa volá, keď sa všetko znova použije?",["Obehové hospodárstvo","Burza","Mýto"],0,"What is it called when everything is used again?",["Circular economy","Exchange","Toll"]]]},
 {id:"tim",ico:"team",t:"Šéf a tím",te:"The boss and the team",s:"ako viesť ľudí",c:[
  ["👥","Firma sú ľudia","Najväčší poklad firmy nie sú kamióny ani peniaze, ale <b>ľudia</b>: vodiči, obchodníci, účtovníčky, dispečeri. Bez nich nič nejde.","A company is people","The biggest treasure of a company is not trucks or money but <b>people</b>: drivers, traders, accountants, dispatchers."],
  ["🙌","Dobrý šéf","Dobrý šéf <b>počúva</b>, je <b>spravodlivý</b>, pochváli za dobrú prácu a pomôže, keď sa niečo nedarí. Ide príkladom – nerobí to, čo zakazuje iným.","A good boss","A good boss <b>listens</b>, is <b>fair</b>, praises good work and helps when things go wrong. He leads by example."],
  ["🧹","Začni odspodu","Kto chce raz viesť firmu, má vyskúšať každú prácu: sadnúť do kamióna, postáť na váhe, zavolať farmárovi. Potom ľuďom rozumie.","Start at the bottom","If you want to lead a company one day, try every job: ride in a truck, stand at the scale, call a farmer. Then you understand people."]],
  q:[["Čo je najväčší poklad firmy?",["Ľudia","Najdrahšie auto","Kancelária"],0,"What is the biggest treasure of a company?",["People","The most expensive car","The office"]],["Čo robí dobrý šéf?",["Počúva a je spravodlivý","Iba kričí","Nič nerobí"],0,"What does a good boss do?",["Listens and is fair","Only shouts","Does nothing"]]]},
 {id:"rozhod",ico:"bulb",t:"Rozhodovanie a zodpovednosť",te:"Decisions and responsibility",s:"ako sa dobre rozhodnúť",c:[
  ["🔎","1. Zisti fakty","Pred rozhodnutím zisti, ako to naozaj je: čísla, ceny, počasie. Nehádaj.","1. Find the facts","Before deciding, find out the truth: numbers, prices, weather. Don't guess."],
  ["🗣️","2. Opýtaj sa","Opýtaj sa ľudí, ktorí tomu rozumejú. Aj šéf sa pýta – múdry človek vie, čo nevie.","2. Ask","Ask people who know. Even the boss asks – a wise person knows what he doesn't know."],
  ["✅","3. Rozhodni a stoj si za tým","Potom sa rozhodni a dotiahni to. Keď sa pomýliš, <b>priznaj chybu</b> a oprav ju. To je <b>zodpovednosť</b>.","3. Decide and own it","Then decide and finish it. When you make a mistake, <b>admit it</b> and fix it. That is <b>responsibility</b>."]],
  q:[["Čo urobíš ako prvé pred rozhodnutím?",["Zistím fakty","Hodím mincou","Nič"],0,"What do you do first before a decision?",["Find the facts","Flip a coin","Nothing"]],["Čo robí zodpovedný človek, keď sa pomýli?",["Prizná chybu a opraví ju","Schová sa","Obviní iných"],0,"What does a responsible person do after a mistake?",["Admits it and fixes it","Hides","Blames others"]]]},
 {id:"rodina",ico:"home",t:"Rodinný podnik",te:"The family business",s:"generácie a hodnoty",c:[
  ["🏡","Čo je rodinný podnik?","Firmu založil a vedie rodič – a raz ju môžu prevziať deti. Tatinova firma je <b>rodinný podnik</b>.","What is a family business?","A parent starts and runs the company – and one day the children can take over. Dad's company is a <b>family business</b>."],
  ["🌳","Ako strom","Rodinný podnik je ako strom: korene sú <b>hodnoty</b> (poctivosť, pracovitosť, slovo platí), kmeň je práca rokov a nové konáre pridávajú ďalšie generácie.","Like a tree","A family business is like a tree: the roots are <b>values</b> (honesty, hard work, keeping your word), the trunk is years of work and new branches come from new generations."],
  ["🎒","Ako sa pripraviť","Uč sa v škole (matematika, jazyky!), šetri, pýtaj sa tatina, chodievaj s ním do práce. Zodpovednosť prichádza postupne – najprv malé úlohy, potom väčšie.","How to get ready","Learn at school (maths, languages!), save money, ask dad questions, go to work with him. Responsibility comes step by step – small tasks first, then bigger ones."]],
  q:[["Čo sú korene rodinného podniku?",["Hodnoty – poctivosť a slovo","Kamióny","Počítače"],0,"What are the roots of a family business?",["Values – honesty and your word","Trucks","Computers"]],["Ako prichádza zodpovednosť?",["Postupne – od malých úloh","Naraz celá","Nikdy"],0,"How does responsibility come?",["Step by step – small tasks first","All at once","Never"]]]},
 {id:"etf",ico:"globe",t:"Investovanie a ETF",te:"Investing and ETFs",s:"ako peniaze pracujú",c:[
  ["🏢","Akcia = kúsok firmy","Keď kúpiš <b>akciu</b>, vlastníš malý kúsok firmy. Keď firme ide dobre, akcia zvyčajne zdražie. Akcie sa kupujú na <b>burze akcií</b>.","A share = a piece of a company","When you buy a <b>share</b>, you own a small piece of a company. When the company does well, the share usually gets more valuable."],
  ["🧺","ETF = košík firiem","<b>ETF</b> je košík, v ktorom sú stovky či tisíce firiem naraz. Keď sa jednej nedarí, ostatné to vyrovnajú. Volá sa to <b>rozloženie rizika</b>.","ETF = a basket of companies","An <b>ETF</b> is a basket with hundreds or thousands of companies. When one does badly, the others balance it. This is <b>diversification</b>."],
  ["⛄","Snehová guľa","Keď pravidelne odkladáš a nevyberáš, peniaze rastú aj z toho, čo už zarobili – ako snehová guľa, ktorá sa kotúľa. Volá sa to <b>zložené úročenie</b>. Najviac pomáha <b>čas</b>.","The snowball","If you save regularly and don't take money out, it grows from what it already earned – like a rolling snowball. This is <b>compound interest</b>. <b>Time</b> helps most."],
  ["⚠️","Hore aj dole","Hodnota ETF ide <b>hore aj dole</b> – niekedy aj veľa. Investuj iba peniaze, ktoré dlho nebudeš potrebovať, a pri poklese nepredávaj v panike. Dospelý ti pomôže vybrať; toto nie je rada, iba učenie.","Up and down","An ETF's value goes <b>up and down</b> – sometimes a lot. Invest only money you won't need for a long time and don't sell in panic. An adult will help you choose; this is learning, not advice."]],
  q:[["Čo je akcia?",["Kúsok firmy","Druh obilia","Zľava v obchode"],0,"What is a share?",["A piece of a company","A kind of grain","A shop discount"]],["Čo je ETF?",["Košík veľa firiem naraz","Jedna firma","Kamión"],0,"What is an ETF?",["A basket of many companies","One company","A truck"]],["Čo najviac pomáha pri zloženom úročení?",["Čas a trpezlivosť","Rýchly predaj","Panika"],0,"What helps compound interest most?",["Time and patience","Selling fast","Panic"]],["Čo robiť, keď ETF klesne?",["Nepredávať v panike","Hneď všetko predať","Plakať"],0,"What should you do when an ETF falls?",["Don't sell in panic","Sell everything now","Cry"]]]}
];
// ---------- ŠKOLA 4. ROČNÍK – nekonečné cvičenia ----------
const R=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const shuf=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const VS=[["r_ba","y"],["s_n","y"],["m_dlo","y"],["b_strý","y"],["v_soký","y"],["jaz_k","y"],["kob_la","y"],["m_š","y"],["s_r","y"],["hm_z","y"],["r_s","y"],["kop_to","y"],["v_dra","y"],["náb_tok","y"],["ob_čaj","y"],["s_pať","y"],["kor_tnačka","y"],["b_k (zviera)","ý"],["p_tať sa","ý"],["r_chly","ý"],["s_ty","ý"],["v_r (sova)","ý"],["m_liť sa","ý"],["p_cha","ý"],
  ["z_ma","i"],["p_esok","i"],["b_cykel","i"],["s_la","i"],["r_adok","i"],["m_nca","i"],["v_dlička","i"],["p_la","i"],["p_sať","í"],["s_dlo","í"],["z_vať","í"],["v_no","í"]];
const KR=[["Bratislavský","Bratislava"],["Trnavský","Trnava"],["Nitriansky","Nitra"],["Trenčiansky","Trenčín"],["Žilinský","Žilina"],["Banskobystrický","Banská Bystrica"],["Prešovský","Prešov"],["Košický","Košice"]];
const VL=[["Hlavné mesto Slovenska je…","Bratislava",["Košice","Žilina"]],["Najdlhšia rieka na Slovensku je…","Váh",["Hron","Hornád"]],["Cez Bratislavu tečie rieka…","Dunaj",["Váh","Bodrog"]],["Najvyšší štít Slovenska je…","Gerlachovský štít",["Kriváň","Lomnický štít"]],
  ["V ktorom kraji sú Michalovce (aj tatinova firma pri Zbudzi)?","Košický",["Prešovský","Žilinský"]],["Koľko krajov má Slovensko?","8",["5","12"]],["Ktorý štát NIE JE náš sused?","Nemecko",["Maďarsko","Poľsko"]],["Najvyššie pohorie Slovenska sú…","Vysoké Tatry",["Malé Karpaty","Vihorlat"]],
  ["Ktorá rieka tečie cez Košice?","Hornád",["Dunaj","Morava"]],["S ktorým štátom hraničí Slovensko na východe?","Ukrajina",["Rakúsko","Česko"]]];
const EV=[["farmár","farmer"],["pšenica","wheat"],["kukurica","corn"],["kamión","truck"],["cena","price"],["peniaze","money"],["predať","to sell"],["kúpiť","to buy"],["pole","field"],["žatva","harvest"],["zmluva","contract"],["zisk","profit"],["náklady","costs"],["krava","cow"],["sliepka","chicken"],["traktor","tractor"],["počasie","weather"],["dážď","rain"],["slnko","sun"],["firma","company"],["šéf","boss"],["vodič","driver"],["sklad","warehouse"],["burza","exchange"],["obchod","trade / shop"],["otec","father / dad"],["syn","son"],["rodina","family"],["škola","school"],["dvadsaťpäť","twenty-five"],["sto","one hundred"],["tisíc","one thousand"],["pondelok","Monday"],["piatok","Friday"],["zelená","green"],["žltá","yellow"],["mesiac","month"],["týždeň","week"],["ďakujem","thank you"],["prosím","please"]];
function genQ(kind){
  if(kind==="mat"){const t=R(0,6);
    if(t===0){const a=R(2,10),b=R(2,10);return {q:`${a} × ${b} = ?`,a:a*b,num:1}}
    if(t===1){const b=R(2,10),c=R(2,10);return {q:`${b*c} : ${b} = ?`,a:c,num:1}}
    if(t===2){const a=R(1000,6000),b=R(100,3999);return {q:`${a.toLocaleString("sk-SK")} + ${b.toLocaleString("sk-SK")} = ?`,a:a+b,num:1}}
    if(t===3){const a=R(3000,9999),b=R(100,2999);return {q:`${a.toLocaleString("sk-SK")} − ${b.toLocaleString("sk-SK")} = ?`,a:a-b,num:1}}
    if(t===4){const n=R(2,8);return {q:`Kamión vezie 25 t obilia. Koľko ton odvezie ${n} kamiónov?`,a:25*n,num:1,u:"t"}}
    if(t===5){const t2=R(2,9);return {q:`Koľko kilogramov je ${t2} ton? (1 t = 1 000 kg)`,a:t2*1000,num:1,u:"kg"}}
    const p=R(15,25)*10,k=R(2,4);return {q:`Tona pšenice stojí ${p} €. Koľko stoja ${k} tony?`,a:p*k,num:1,u:"€"}}
  if(kind==="vs"){const w=VS[R(0,VS.length-1)];return {q:`Doplň písmeno: <b class="kjvs">${E(w[0]).replace("_","<u>_</u>")}</b>`,a:w[1],opts:["i","í","y","ý"]}}
  if(kind==="vl"){if(Math.random()<.45){const k=KR[R(0,7)],o=shuf(KR.filter(x=>x!==k)).slice(0,2).map(x=>x[1]);return {q:`Krajské mesto kraja <b>${E(k[0])}</b> je…`,a:k[1],opts:shuf([k[1]].concat(o))}}
    const v=VL[R(0,VL.length-1)];return {q:E(v[0]),a:v[1],opts:shuf([v[1]].concat(v[2]))}}
  if(kind==="en"){const w=EV[R(0,EV.length-1)],o=shuf(EV.filter(x=>x!==w)).slice(0,2),dir=Math.random()<.5;
    return dir?{q:`Ako sa povie po anglicky: <b>${E(w[0])}</b>?`,a:w[1],opts:shuf([w[1]].concat(o.map(x=>x[1]))),say:null}:{q:`What does <b>${E(w[1])}</b> mean?`,a:w[0],opts:shuf([w[0]].concat(o.map(x=>x[0]))),say:w[1]}}}
const PRK={mat:["calc","Matematika","násobilka, delenie, do 10 000, slovné úlohy"],vs:["scroll","Vybrané slová","i, í, y, ý – slovenčina"],vl:["globe","Vlastiveda","Slovensko: kraje, mestá, rieky, hory"],en:["grad","Angličtina","slovíčka – aj z našej firmy"]};

// ---------- HRA: OBCHODNÝ DEŇ (vymyslené čísla) ----------
function gNew(){G={r:1,cash:20000,stock:0,log:[],m:200+Math.round(Math.random()*20)};gTurn()}
function gTurn(){const ev=[["☀️ Krásne počasie, úroda bude veľká – ceny môžu klesnúť.",-1],["🌧️ V Amerike sucho – burza rastie!",1],["🚢 Veľká loď s obilím odplávala do Afriky – dopyt rastie.",1],["😴 Pokojný deň na burze.",0],["📉 Veľa farmárov predáva naraz – ceny padajú.",-1]];
  const e=ev[Math.floor(Math.random()*ev.length)];G.ev=e[0];G.trend=e[1];G.farm=Math.round(G.m-18-Math.random()*8);G.trans=10}
function gStep(buy,sell){const msg=[];
  if(buy>0){const t=buy*25,cost=t*G.farm;if(cost>G.cash){msg.push("❗ Na toľko nemáš peniaze.");return msg}G.cash-=cost;G.stock+=t;msg.push(`🛒 Kúpil si ${t} t za ${G.farm} €/t = ${cost.toLocaleString("sk-SK")} €.`)}
  if(sell&&G.stock>0){const t=G.stock,earn2=t*G.m,tr=t*G.trans;G.cash+=earn2-tr;msg.push(`💰 Predal si ${t} t mlynu za ${G.m} €/t, doprava ${tr.toLocaleString("sk-SK")} € → dostal si ${(earn2-tr).toLocaleString("sk-SK")} €.`);G.stock=0}
  const mv=Math.round((G.trend*6+(Math.random()*16-8)));G.m=Math.max(150,G.m+mv);G.r++;msg.push(`📊 Burza sa pohla o ${mv>0?"+":""}${mv} €/t.`);if(G.r<=5)gTurn();return msg}
// ---------- HRA: ETF SPORENIE (vymyslené čísla, 10 rokov) ----------
function etfRun(dep){const pts=[],pig=[];let v=0,p=0,crash=R(3,7);const ev=[];
  for(let m=1;m<=120;m++){v+=dep;p+=dep;let r=(0.07/12)+(Math.random()-.5)*0.07;if(Math.ceil(m/12)===crash&&m%12===3){r=-0.25;ev.push(`📉 Rok ${crash}: veľký pád burzy o 25 %! Kto predal v panike, stratil. Kto počkal, dobehol to.`)}v=Math.max(0,v*(1+r));if(m%3===0){pts.push(v);pig.push(p)}}
  return {dep,v:Math.round(v),p:Math.round(p),pts,pig,ev}}
function etfSvg(e){const W=320,H=140,mx=Math.max(...e.pts,...e.pig)||1,X=i=>i/(e.pts.length-1)*W,Y=v=>H-6-v/mx*(H-16);const ln=a=>a.map((v,i)=>(i?"L":"M")+X(i).toFixed(1)+","+Y(v).toFixed(1)).join(" ");
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${ln(e.pig)}" fill="none" stroke="#f472b6" stroke-width="2.5" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/><path d="${ln(e.pts)}" fill="none" stroke="#86efac" stroke-width="3" vector-effect="non-scaling-stroke"/></svg>`}

// ---------- OBRAZOVKY ----------
function hero(){const c=coins(),lv=LEVEL(c),n=L.filter(l=>done(l.id)).length;
  return `<div class="hero kjh"><small>ERNTE Junior · škola biznisu</small><b>Ahoj, ${E(String(K.name||"").split(" ")[0])}! 👋</b><div class="kjst"><span>${lv[0]} ${E(lv[1])}</span><span>🪙 ${c}</span><span>✅ ${n} / ${L.length}</span></div>
   <button type="button" class="kjen${EN()?" on":""}" data-ken>${EN()?"🇬🇧 English mode ON":"🇬🇧 Zapnúť angličtinu"}</button></div>`}
function home(){const n=L.filter(l=>done(l.id)).length;
  return hero()+payCard()+`<h2 class="kjh2">🏢 Rodinný podnik</h2><div class="kjtiles">${L.map((l,i)=>`<button type="button" class="kjt${done(l.id)?" ok":""}" data-kl="${l.id}" style="--i:${i}">${IMG(l.ico)}<b>${E(EN()?l.te:l.t)}</b><small>${E(l.s)}</small>${done(l.id)?'<em>✅ hotovo</em>':""}</button>`).join("")}</div>
   <h2 class="kjh2">🎓 Škola · 4. ročník</h2><div class="kjtiles">${Object.keys(PRK).map((k,i)=>{const b=(P()["pr_"+k]||{});return `<button type="button" class="kjt" data-kpr="${k}" style="--i:${i}">${IMG(PRK[k][0])}<b>${E(PRK[k][1])}</b><small>${E(PRK[k][2])}</small>${b.n?`<em>✅ ${b.ok}/${b.n} správne</em>`:""}</button>`}).join("")}</div>
   <h2 class="kjh2">🎮 Hry</h2><div class="kjtiles"><button type="button" class="kjt big" data-kg style="--i:1">${IMG("game")}<b>Obchodný deň</b><small>kúp lacno, predaj draho – 5 dní na burze</small></button>
   <button type="button" class="kjt big kjetf" data-ketf style="--i:2">${IMG("chart")}<b>ETF sporenie · 10 rokov</b><small>uvidíš snehovú guľu aj pád burzy</small></button>
   <button type="button" class="kjt" data-kb style="--i:3">${IMG("trophy")}<b>Moje odznaky</b><small>${n} z ${L.length} lekcií</small></button></div>
   <p class="kjnote">💡 V hrách sú vymyslené čísla – na skúšanie. Burzový graf v lekcii Burza je ozajstný. Odmenu za správne odpovede ti posiela tatino naozaj. 💶</p>`}
function lesson(){const l=L.find(x=>x.id===V.slice(2));if(!l)return home();const c=l.c[S];
  if(S<l.c.length)return `<div class="kjbar"><button type="button" data-kh>← Späť</button><b>${E(EN()?l.te:l.t)}</b><span>${S+1} / ${l.c.length}</span></div>
   <div class="kjcard"><div class="kjem">${c[0]}</div><h2>${E(c[1])}</h2><p>${c[2]}</p>${EN()?`<div class="kjenb"><b>🇬🇧 ${E(c[3])}</b><p>${c[4]}</p><button type="button" data-ksayen>🔊 Read in English</button></div>`:""}
   ${l.chart&&S===2?`<div class="kjchart"><div class="kjcv">Načítavam burzu…</div></div>`:""}
   <div class="kjnav"><button type="button" data-ksay>🔊 Prečítaj mi</button>${S>0?`<button type="button" data-kprev>←</button>`:""}<button type="button" class="lime" data-knext>${S===l.c.length-1?"Kvíz! 🎯":"Ďalej →"}</button></div></div>`;
  const qi=S-l.c.length,q=l.q[qi];if(!q)return result(l);const en=EN()&&q[3];
  if(!Q||Q.qi!==qi||!Q.ord)Q=Object.assign(Q||{ok:0},{qi,ord:shuf(q[1].map((_,i)=>i)),pick:null});
  const opts=en?q[4]:q[1];
  return `<div class="kjbar"><button type="button" data-kh>← Späť</button><b>🎯 ${en?"Quiz":"Kvíz"} · ${E(en?l.te:l.t)}</b><span>${qi+1} / ${l.q.length}</span></div>
   <div class="kjcard"><h2>${E(en?q[3]:q[0])}</h2>${en?`<small class="kjsk">🇸🇰 ${E(q[0])}</small>`:""}<div class="kjans">${Q.ord.map(i=>`<button type="button" data-ka="${i}"${Q.pick!=null?" disabled":""} class="${Q.pick!=null?(i===q[2]?"ok":i===Q.pick?"bad":""):""}">${E(opts[i])}</button>`).join("")}</div>
   ${Q.pick!=null?`<p class="kjfb">${Q.pick===q[2]?(en?"🎉 Correct!":"🎉 Správne!"):(en?"🙂 Almost! Correct: <b>":"🙂 Skoro! Správne je: <b>")+(Q.pick===q[2]?"":E(opts[q[2]])+"</b>")}</p><div class="kjnav"><button type="button" class="lime" data-knq>${en?"Next →":"Ďalej →"}</button></div>`:""}</div>`}
function result(l){const tot=l.q.length,ok=Q?Q.ok:0,pass=ok>=Math.ceil(tot*0.6);
  return `<div class="kjbar"><button type="button" data-kh>← Späť</button><b>${E(l.t)}</b></div><div class="kjcard kjres">${IMG(pass?"trophy":"bulb",96)}<h2>${pass?"Super, lekcia hotová!":"Skús to ešte raz"}</h2><p>Správne: <b>${ok} z ${tot}</b>${pass?` · +20 🪙 a odznak`:""}</p>
   <div class="kjnav"><button type="button" data-kre>🔁 Znova</button><button type="button" class="lime" data-kh>Domov</button></div></div>`}
function practice(){const k=V.slice(3),info=PRK[k];if(!PR||PR.k!==k)PR={k,i:0,ok:0,cur:genQ(k),pick:null,inp:""};const c=PR.cur;
  if(PR.i>=10){const st=P()["pr_"+k]||{n:0,ok:0};return `<div class="kjbar"><button type="button" data-kh>← Späť</button><b>${E(info[1])}</b></div><div class="kjcard kjres">${IMG(PR.ok>=7?"trophy":"bulb",96)}<h2>${PR.ok} z 10 správne ${PR.ok>=9?"🏆":PR.ok>=7?"👏":"💪"}</h2><p>Spolu v tejto téme: ${st.ok} správne z ${st.n}.</p><div class="kjnav"><button type="button" class="lime" data-kprn>🔁 Ďalších 10</button><button type="button" data-kh>Domov</button></div></div>`}
  const ans=PR.pick!=null,ok=ans&&String(PR.pick).trim().replace(/\s/g,"")===String(c.a);
  return `<div class="kjbar"><button type="button" data-kh>← Späť</button><b>${E(info[1])}</b><span>${PR.i+1} / 10 · ✅ ${PR.ok}</span></div>
   <div class="kjcard"><h2>${c.q}</h2>${c.say?`<button type="button" class="kjsm" data-ksw="${E(c.say)}">🔊 ${E(c.say)}</button>`:""}
   ${c.num?`<div class="kjnum"><input data-kinp inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${E(PR.inp)}" ${ans?"disabled":""} aria-label="Odpoveď">${c.u?`<span>${E(c.u)}</span>`:""}</div>${ans?"":`<button type="button" class="lime" data-kchk>Skontrolovať ✓</button>`}`
     :`<div class="kjans">${c.opts.map(o=>`<button type="button" data-kpo="${E(o)}"${ans?" disabled":""} class="${ans?(o===c.a?"ok":o===PR.pick?"bad":""):""}">${E(o)}</button>`).join("")}</div>`}
   ${ans?`<p class="kjfb">${ok?"🎉 Správne!":"🙂 Správne je: <b>"+E(c.num?Number(c.a).toLocaleString("sk-SK"):c.a)+"</b>"}</p><div class="kjnav"><button type="button" class="lime" data-kprx>Ďalej →</button></div>`:""}</div>`}
function badges(){return `<div class="kjbar"><button type="button" data-kh>← Späť</button><b>🏆 Moje odznaky</b></div><div class="kjtiles">${L.map(l=>`<div class="kjt kjbd${done(l.id)?" ok":""}">${IMG(l.ico)}<b>${E(l.t)}</b><small>${done(l.id)?"✅ získaný":"🔒 ešte nie"}</small></div>`).join("")}</div>
  <div class="kjcard"><h2>${LEVEL(coins())[0]} ${E(LEVEL(coins())[1])} · 🪙 ${coins()}</h2><p>Úrovne: 🌱 Učeň → 🌾 Výkupca (60) → 📈 Burzový žralok (150) → 🚛 Šéf dopravy (300) → 👑 Obchodný majster (600)</p>
  ${(P().hra&&P().hra.best)?`<p>🎮 Najlepší Obchodný deň: <b>${(+P().hra.best).toLocaleString("sk-SK")} €</b></p>`:""}</div>`}
function payView(){const v=PAY&&PAY.v;const ms=(v&&v.months)||[];
  return `<div class="kjbar"><button type="button" data-kh>← Späť</button><b>💶 Moje zarobené</b></div>${payCard()}
   <div class="kjcard"><h2>Po mesiacoch</h2>${ms.length?ms.map(m=>`<div class="kjrow"><span>${E(m.m.split("-").reverse().join(". "))}</span><b>${EUR(m.eur)}</b><em>${m.paid!=null?"✅ vyplatené":"⏳ čaká na tatina"}</em></div>`).join(""):`<p>Zatiaľ nič – odpovedz správne v lekciách alebo v škole a začneš zarábať!</p>`}</div>
   <div class="kjcard"><h2>Posledné odmeny</h2>${((v&&v.last)||[]).slice(0,15).map(x=>`<div class="kjrow"><span>${E(new Date(x.at).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}))}</span><b>+${EUR(x.eur)}</b><em>${E(x.w||"")}</em></div>`).join("")||"<p>–</p>"}
   <p class="kjnote">Pravidlá od tatina: každá správna odpoveď ${EUR(PAY&&PAY.rate||0.1)}, hotová lekcia ${EUR(PAY&&PAY.lesson||1)}, najviac ${EUR(PAY&&PAY.day||10)} za deň a ${EUR(PAY&&PAY.max||100)} za mesiac. Tip: časť si odlož – ako v lekcii o ETF! 🐷</p></div>`}
function game(){if(!G)gNew();const end=G.r>5,val=G.cash+G.stock*G.m;
  if(end){const prof=val-20000;return `<div class="kjbar"><button type="button" data-kh>← Späť</button><b>🎮 Obchodný deň · koniec</b></div><div class="kjcard kjres">${IMG(prof>0?"trophy":"bulb",96)}<h2>${prof>0?"Zarobil si "+prof.toLocaleString("sk-SK")+" €! 🎉":prof<0?"Tentoraz strata "+(-prof).toLocaleString("sk-SK")+" €":"Vyšiel si na nulu"}</h2>
   <p>${prof>0?"Kúpil si lacnejšie, predal drahšie a doprava ťa nezjedla. Takto rozmýšľa obchodník!":"Aj veľkí obchodníci niekedy stratia. Dôležité je pochopiť prečo."}</p>
   <div class="kjlog">${G.log.slice(-6).map(x=>`<div>${x}</div>`).join("")}</div><div class="kjnav"><button type="button" class="lime" data-kgn>🔁 Hrať znova</button><button type="button" data-kh>Domov</button></div></div>`}
  return `<div class="kjbar"><button type="button" data-kh>← Späť</button><b>🎮 Obchodný deň</b><span>deň ${G.r} / 5</span></div>
   <div class="kjcard"><div class="kjgs"><div><small>Peniaze</small><b>${G.cash.toLocaleString("sk-SK")} €</b></div><div><small>Na sklade</small><b>${G.stock} t</b></div><div><small>Mlyn kúpi za</small><b>${G.m} €/t</b></div><div><small>Farmár predá za</small><b>${G.farm} €/t</b></div></div>
   <p class="kjev">📰 ${E(G.ev)}</p><p>Doprava do mlyna stojí <b>${G.trans} €</b> za každú tonu. Kamión = 25 t.</p>
   <div class="kjans">${[0,1,2,3].map(n=>`<button type="button" data-kbuy="${n}">${n?"🛒 Kúpiť "+n+" kamión"+(n>1?"y":"")+" ("+n*25+" t)":"⏸️ Dnes nekupujem"}</button>`).join("")}</div>
   <label class="kjsell"><input type="checkbox" data-ksell> 💰 Dnes predať všetko na sklade mlynu</label>
   <div class="kjlog">${G.log.slice(-4).map(x=>`<div>${x}</div>`).join("")}</div><p class="kjnote">Tip: kúp, keď je farmár lacnejší ako mlyn mínus doprava. Keď burza rastie, oplatí sa počkať – ale môže aj padnúť!</p></div>`}
function etfView(){const e=ETF;
  return `<div class="kjbar"><button type="button" data-kh>← Späť</button><b>📈 ETF sporenie · 10 rokov</b></div><div class="kjcard">
   <p>Koľko si budeš každý mesiac odkladať? <small>(hra – vymyslené čísla)</small></p><div class="kjans kjrow3">${[5,10,20].map(d=>`<button type="button" data-ketd="${d}" class="${e&&e.dep===d?"ok":""}">${d} € mesačne</button>`).join("")}</div>
   ${e?`<div class="kjchart">${etfSvg(e)}<div class="kjcl"><span style="color:#86efac">━ ETF: <b>${e.v.toLocaleString("sk-SK")} €</b></span><span style="color:#f472b6">┅ prasiatko: <b>${e.p.toLocaleString("sk-SK")} €</b></span></div></div>
     <p>Za 10 rokov si odložil <b>${e.p.toLocaleString("sk-SK")} €</b>. V ETF (priemerne +7 % ročne, ale hore-dole) by z toho bolo <b>${e.v.toLocaleString("sk-SK")} €</b> – to je ${e.v>=e.p?"o "+(e.v-e.p).toLocaleString("sk-SK")+" € viac":"o "+(e.p-e.v).toLocaleString("sk-SK")+" € menej – aj to sa stáva"}.</p>
     ${e.ev.map(x=>`<p class="kjev">${E(x)}</p>`).join("")}<div class="kjnav"><button type="button" class="lime" data-ketd="${e.dep}">🔁 Skúsiť znova (iné roky)</button></div>`:""}
   <p class="kjnote">Pamätaj: skutočné investovanie vždy s tatinom. Toto je iba učenie, nie rada, do čoho investovať.</p></div>`}
function render(){const a=document.getElementById("app");if(!a||!K)return;
  let h=V==="home"?home():V.startsWith("l:")?lesson():V.startsWith("pr:")?practice():V==="game"?game():V==="etf"?etfView():V==="badges"?badges():V==="pay"?payView():home();
  if(V!=="home")h=hero()+h;a.innerHTML=h;window.scrollTo({top:0});if(V.startsWith("l:"))chart();const i=a.querySelector("[data-kinp]");if(i&&!i.disabled)setTimeout(()=>i.focus(),60)}
async function chart(){const b=document.querySelector(".kjchart");if(!b)return;
  try{const r=await fetch("market.json",{cache:"no-store"});const m=r.ok?await r.json():null;let h=null;try{const x=await fetch("https://raw.githubusercontent.com/ernte-trade/ernte-/burza-hist/hist.json",{cache:"no-store"});h=x.ok?await x.json():null}catch(e){}
    const D={};for(const r2 of ((h&&h.d)||[]))D[r2.d]=r2;for(const r2 of ((m&&m.hist)||[]))D[r2.d]=Object.assign(D[r2.d]||{},r2);
    const pts=Object.keys(D).sort().map(d=>[d,+D[d].matif_psenica]).filter(p=>p[1]>0);if(pts.length<2){b.innerHTML=`<div class="kjcv">Graf sa ešte zbiera.</div>`;return}
    const W=320,H=120,vs=pts.map(p=>p[1]),mn=Math.min(...vs),mx=Math.max(...vs),X=i=>i/(pts.length-1)*W,Y=v=>H-8-(v-mn)/((mx-mn)||1)*(H-20);
    const d=pts.map((p,i)=>(i?"L":"M")+X(i).toFixed(1)+","+Y(p[1]).toFixed(1)).join(" ");
    b.innerHTML=`<div class="kjcv">🌾 Pšenica na burze MATIF (Paríž) · € za tonu</div><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${d} L${W},${H} L0,${H} Z" fill="rgba(250,204,21,.18)"/><path d="${d}" fill="none" stroke="#facc15" stroke-width="3" vector-effect="non-scaling-stroke"/></svg>
     <div class="kjcl"><span>${pts[0][0].split("-").reverse().slice(0,2).join(". ")}.: <b>${Math.round(pts[0][1])} €</b></span><span>dnes: <b>${Math.round(pts[pts.length-1][1])} €</b></span></div>
     <div class="kjcv">Najnižšie ${Math.round(mn)} €, najvyššie ${Math.round(mx)} € – rozdiel ${Math.round(mx-mn)} € na každej tone. Pri jednom kamióne (25 t) je to ${Math.round((mx-mn)*25).toLocaleString("sk-SK")} €!</div>`}catch(x){b.innerHTML=`<div class="kjcv">Burza sa teraz nenačítala.</div>`}}
function prAnswer(v){const c=PR.cur;if(PR.pick!=null)return;PR.pick=v;const ok=String(v).trim().replace(/\s/g,"")===String(c.a);const st=Object.assign({n:0,ok:0},P()["pr_"+PR.k]||{});st.n++;
  if(ok){PR.ok++;st.ok++;addCoins(2,"škola");earn("q",PRK[PR.k][1])}save("pr_"+PR.k,st);render()}
document.addEventListener("click",async e=>{if(!K)return;const t=e.target.closest&&e.target.closest("[data-kl],[data-kh],[data-knext],[data-kprev],[data-ksay],[data-ksayen],[data-ka],[data-knq],[data-kre],[data-kg],[data-kgn],[data-kb],[data-kbuy],[data-ken],[data-kpay],[data-kpr],[data-kpo],[data-kchk],[data-kprx],[data-kprn],[data-ksw],[data-ketf],[data-ketd]");if(!t)return;e.preventDefault();
  if(t.dataset.kl){V="l:"+t.dataset.kl;S=0;Q=null;render();return}
  if("kh" in t.dataset){V="home";render();return}
  if("kb" in t.dataset){V="badges";render();return}
  if("kpay" in t.dataset){V="pay";await loadPay();render();return}
  if("ken" in t.dataset){await save("en",{on:!EN()});render();return}
  if("kg" in t.dataset){V="game";if(!G||G.r>5)gNew();render();return}
  if("kgn" in t.dataset){gNew();render();return}
  if("ketf" in t.dataset){V="etf";render();return}
  if(t.dataset.ketd){ETF=etfRun(+t.dataset.ketd);const h=Object.assign({n:0},P().etf||{});h.n++;save("etf",h);if(h.n<=3)addCoins(5,"ETF hra");render();return}
  if(t.dataset.kpr){V="pr:"+t.dataset.kpr;PR=null;render();return}
  if(t.dataset.kpo!=null){prAnswer(t.dataset.kpo);return}
  if("kchk" in t.dataset){const i=document.querySelector("[data-kinp]");const v=(i&&i.value||"").replace(/\s/g,"");if(!v){toast("Napíš číslo.");return}PR.inp=v;prAnswer(v);return}
  if("kprx" in t.dataset){PR.i++;PR.cur=genQ(PR.k);PR.pick=null;PR.inp="";render();return}
  if("kprn" in t.dataset){PR=null;render();return}
  if(t.dataset.ksw){say(t.dataset.ksw,"en-GB");return}
  if("ksay" in t.dataset){const c=document.querySelector(".kjcard");if(c)say((c.querySelector("h2")||{}).textContent+". "+(c.querySelector(":scope>p")||{}).textContent);return}
  if("ksayen" in t.dataset){const b=document.querySelector(".kjenb");if(b)say(b.querySelector("b").textContent.replace("🇬🇧","")+". "+b.querySelector("p").textContent,"en-GB");return}
  if("knext" in t.dataset){S++;Q=null;render();return}
  if("kprev" in t.dataset){S=Math.max(0,S-1);render();return}
  if(t.dataset.ka!=null){const l=L.find(x=>x.id===V.slice(2)),q=l.q[Q.qi];if(Q.pick!=null)return;Q.pick=+t.dataset.ka;if(Q.pick===q[2]){Q.ok++;addCoins(5,"kvíz "+l.t);earn("q",l.t)}render();return}
  if("knq" in t.dataset){const l=L.find(x=>x.id===V.slice(2));Q.pick=null;Q.ord=null;S++;if(S-l.c.length>=l.q.length){const pass=Q.ok>=Math.ceil(l.q.length*0.6);const was=done(l.id);save("l_"+l.id,{ok:pass||was,best:Math.max(Q.ok,(P()["l_"+l.id]||{}).best||0),at:Date.now()});if(pass&&!was)addCoins(20,"lekcia "+l.t);if(pass)earn("l",l.id)}render();return}
  if("kre" in t.dataset){S=0;Q=null;render();return}
  if(t.dataset.kbuy!=null){const sell=!!(document.querySelector("[data-ksell]")||{}).checked;const m=gStep(+t.dataset.kbuy,sell);G.log.push(...m);
    if(G.r>5){const val=G.cash+G.stock*G.m,prof=val-20000;const h=Object.assign({n:0,best:0},P().hra||{});h.n++;h.best=Math.max(h.best,prof);h.last=prof;save("hra",h);if(prof>0)addCoins(Math.min(50,Math.round(prof/100)),"hra")}render();return}},true);
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target&&e.target.matches&&e.target.matches("[data-kinp]")){e.preventDefault();const b=document.querySelector("[data-kchk]");if(b)b.click()}});
window.startKid=async function(){document.documentElement.classList.add("kjon");try{$("hT").textContent="ERNTE Junior";$("hS").textContent=K.name+" · škola biznisu";$("refBtn").hidden=true}catch(x){}V="home";render();await loadPay();if(V==="home")render()};
window.kidEnter=async function(){try{const r=await sb.rpc("kid_me");if(!r.error&&r.data&&r.data.name){K=r.data;window.ERNTE_KIND="junior";startKid();return true}}catch(x){}return false};

// ---------- 👨 MAJITEĽ: Tím → ERNTE Junior (prihlásenie, pokrok, odmena, vyplatené) ----------
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER)&&!window.ERNTE_VIEWAS&&!window.ERNTE_TEST;
const O={L:null,at:0,res:null};
function oHtml(){const L2=O.L||[];
  return `<section class="card kjo" id="kjoCard"><h2>🧒 ERNTE Junior – škola biznisu</h2>
   ${L2.map(k=>{const p=k.p||{},n=L.filter(l=>p["l_"+l.id]&&p["l_"+l.id].ok).length,c=+(p.stav&&p.stav.c)||0,ev=k.earn||{},ms=ev.months||[],cur=ms.find(m=>m.m===ev.now),cf=k.cfg||{};
     const sch=Object.keys(PRK).map(x=>p["pr_"+x]?`${PRK[x][1]} ${p["pr_"+x].ok}/${p["pr_"+x].n}`:"").filter(Boolean).join(" · ");
     return `<div class="kjor"><b>${E(k.name)}</b><small>${E(k.email)} · ${k.last?"naposledy "+new Date(k.last).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}):"ešte sa neprihlásil"}</small>
     <div class="kjost"><span>✅ ${n} / ${L.length} lekcií</span><span>🪙 ${c}</span><span>${LEVEL(c)[0]} ${E(LEVEL(c)[1])}</span>${p.en&&p.en.on?"<span>🇬🇧 angličtina zapnutá</span>":""}${p.hra?`<span>🎮 ${p.hra.n}×</span>`:""}</div>
     ${sch?`<div class="kjost"><span>🎓 ${E(sch)}</span></div>`:""}
     <div class="kjol">${L.map(l=>`<i title="${E(l.t)}" class="${p["l_"+l.id]&&p["l_"+l.id].ok?"ok":""}">${IMG(l.ico,30)}</i>`).join("")}</div>
     <div class="kjopay"><b>💶 Tento mesiac zarobil: ${EUR(cur?cur.eur:0)} z ${EUR(cf.max||100)}</b>
      ${ms.map(m=>`<div class="kjrow"><span>${E(m.m)}</span><b>${EUR(m.eur)}</b>${m.paid!=null?`<em>✅ vyplatené ${EUR(m.paid)}</em>`:`<button type="button" data-kjpaid="${E(k.email)}" data-m="${E(m.m)}">💸 Vyplatené</button>`}</div>`).join("")}
      <div class="kjcfg" data-kjcfg="${E(k.email)}"><label>€ za správnu odpoveď<input data-c="rate" inputmode="decimal" value="${E(cf.rate??0.1)}"></label><label>€ za lekciu<input data-c="lesson" inputmode="decimal" value="${E(cf.lesson??1)}"></label><label>max € za deň<input data-c="day" inputmode="decimal" value="${E(cf.day??10)}"></label><label>max € za mesiac<input data-c="max" inputmode="decimal" value="${E(cf.max??100)}"></label><button type="button" data-kjcfgsave="${E(k.email)}">💾 Uložiť pravidlá</button></div></div></div>`}).join("")}
   <div class="kjof"><label>Meno syna<input data-kjo="name" placeholder="napr. Matej Vaľko" autocomplete="off"></label><label>Prihlasovacie meno<input data-kjo="login" placeholder="napr. matej" autocomplete="off" autocapitalize="off"></label>
   <button type="button" class="pri" data-kjocreate>${L2.length?"🔑 Nové prihlásenie / nové heslo":"🧒 Vytvoriť prihlásenie"}</button></div>
   ${O.res?`<div class="kjores"><p>⚠️ Heslo vidíš <b>iba teraz</b>. Prihlásenie: <b>${E(O.res.login.replace(/@junior\.ernte\.sk$/,""))}</b> · heslo: <b class="kjopw">${E(O.res.pw)}</b></p><div class="btns"><button type="button" data-kjocp>📋 Kopírovať odkaz s prihlásením</button><button type="button" data-kjowa>💬 WhatsApp</button></div><small>Ťuknutím na odkaz sa prihlási sám. Na prihlasovacej obrazovke stačí napísať iba meno (bez @).</small></div>`:""}
   <p class="kjnote">Junior nevidí žiadne naše ceny, marže, farmárov ani odberateľov. Odmenu za správne odpovede počíta a stráži databáza (sadzba, denný a mesačný strop); vyplácaš ty.</p></section>`}
function oPut(){const app=document.getElementById("app");if(!app)return;const old=document.getElementById("kjoCard");const show=OWN()&&typeof TAB!=="undefined"&&TAB==="team";
  if(!show){if(old)old.remove();return}if(old&&old.contains(document.activeElement)&&document.activeElement.tagName==="INPUT")return;
  const h=oHtml();let hs=0;for(let i=0;i<h.length;i++)hs=(hs*31+h.charCodeAt(i))|0;if(old&&old.dataset.h===String(hs))return;
  const d=document.createElement("div");d.innerHTML=h;const el=d.firstElementChild;el.dataset.h=String(hs);if(old){old.replaceWith(el);return}
  const a=document.getElementById("hinvCard")||document.getElementById("taCard")||app.querySelector("nav.tabs")||app.querySelector(".hero");if(a)a.after(el);else app.prepend(el)}
async function oLoad(){O.at=Date.now();try{const r=await sb.rpc("kid_list");if(!r.error)O.L=r.data||[]}catch(x){}oPut()}
const kLink=()=>typeof inviteLink==="function"?inviteLink(O.res.login,O.res.pw):"https://app.ernte.sk/farmar/";
const kMsg=()=>`Ahoj! Tu je tvoje prihlásenie do ERNTE Junior – škola biznisu od tatina. 🌾📈🚛\n\nMeno: ${O.res.login.replace(/@junior\.ernte\.sk$/,"")}\nHeslo: ${O.res.pw}\n\nŤukni na odkaz a prihlási ťa to samo.\n\n👉 ERNTE Trade & Logistic: ${kLink()}`;
document.addEventListener("click",async e=>{const t=e.target.closest&&e.target.closest("[data-kjocreate],[data-kjocp],[data-kjowa],[data-kjpaid],[data-kjcfgsave]");if(!t||!OWN())return;e.preventDefault();
  if("kjocreate" in t.dataset){const nm=(document.querySelector('[data-kjo="name"]')||{}).value||"",lg=(document.querySelector('[data-kjo="login"]')||{}).value||"";
    if(nm.trim().length<2||lg.trim().length<2){toast("Napíšte meno aj prihlasovacie meno.");return}t.disabled=true;
    try{const r=await sb.rpc("kid_create",{p_name:nm,p_login:lg});if(r.error)throw r.error;O.res=r.data;toast("✓ Prihlásenie pre Juniora je pripravené.",4000);oLoad()}catch(x){t.disabled=false;toast("Nepodarilo sa: "+(x&&x.message||x),6000)}return}
  if("kjocp" in t.dataset){try{await navigator.clipboard.writeText(kMsg());toast("✓ Skopírované.")}catch(x){prompt("Skopírujte:",kMsg())}return}
  if("kjowa" in t.dataset){window.open("https://wa.me/?text="+encodeURIComponent(kMsg()),"_blank","noopener");return}
  if(t.dataset.kjpaid){if(!confirm(`Označiť mesiac ${t.dataset.m} ako vyplatený?`))return;try{const r=await sb.rpc("kid_pay",{p_email:t.dataset.kjpaid,p_month:t.dataset.m});if(r.error)throw r.error;toast("✓ Vyplatené.");oLoad()}catch(x){toast("Nepodarilo sa: "+(x&&x.message||x),5000)}return}
  if(t.dataset.kjcfgsave){const box=t.closest("[data-kjcfg]"),c={};box.querySelectorAll("[data-c]").forEach(i=>c[i.dataset.c]=parseFloat(String(i.value).replace(",","."))||0);
    try{const r=await sb.rpc("kid_cfg_set",{p_email:t.dataset.kjcfgsave,p_cfg:c});if(r.error)throw r.error;toast("✓ Pravidlá odmeny uložené.");oLoad()}catch(x){toast("Nepodarilo sa: "+(x&&x.message||x),5000)}}},true);
let q=0;function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}
  new MutationObserver(()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;if(OWN()&&TAB==="team"&&Date.now()-O.at>120e3)oLoad();oPut()})}).observe(app,{childList:true})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
{const s=document.createElement("style");s.textContent=`
.kjh b{font-size:1.5rem}.kjst{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:8px}.kjst span{padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.12);font-weight:800}
.kjen{margin:10px auto 0;min-height:44px;border-radius:999px;padding:0 16px;font-weight:800;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25);color:#fff}.kjen.on{background:linear-gradient(135deg,#1d4ed8,#dc2626);border-color:transparent}
.kjh2{margin:18px 0 6px;text-align:center}
.kjtiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:10px 0}
.kjt{position:relative;display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:150px;padding:14px 10px!important;border-radius:26px!important;text-align:center;color:#fff!important;
 background:linear-gradient(150deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 55%,rgba(56,189,248,.14))!important;border:1px solid rgba(255,255,255,.22)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 14px 34px rgba(0,0,0,.35)!important}
.kjt img{width:56px;height:56px;filter:drop-shadow(0 8px 10px rgba(0,0,0,.45));animation:kjbob 3.2s ease-in-out infinite;animation-delay:calc(var(--i,0)*-.4s)}
.kjt b{font:800 1.05rem/1.2 var(--f-head,system-ui)}.kjt small{opacity:.85;font-size:.84rem}.kjt em{font-style:normal;font-size:.78rem;color:#86efac;font-weight:800}
.kjt.ok{border-color:rgba(134,239,172,.7)!important;background:linear-gradient(150deg,rgba(134,239,172,.2),rgba(255,255,255,.03))!important}
.kjt.big{grid-column:1/-1;min-height:150px;background:linear-gradient(140deg,rgba(250,204,21,.3),rgba(244,114,182,.2) 60%,rgba(124,92,255,.2))!important;border-color:rgba(250,204,21,.6)!important}
.kjt.kjetf{background:linear-gradient(140deg,rgba(134,239,172,.3),rgba(34,211,238,.2) 60%,rgba(124,92,255,.2))!important;border-color:rgba(134,239,172,.6)!important}
.kjbd:not(.ok){opacity:.55;filter:grayscale(.6)}
@keyframes kjbob{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-6px) rotate(-3deg)}}
.kjpay{display:grid!important;gap:8px;width:100%;text-align:left;margin:12px 0;padding:14px 16px!important;border-radius:22px!important;background:linear-gradient(135deg,rgba(34,197,94,.28),rgba(250,204,21,.18))!important;border:1px solid rgba(134,239,172,.6)!important;color:#fff!important}
.kjpt{display:flex;gap:12px;align-items:center}.kjpt img{width:44px;height:44px}.kjpt small{display:block;opacity:.85}.kjpt b{font-size:1.5rem}.kjpt i{font-style:normal;font-size:.95rem;opacity:.8}
.kjpb{height:12px;border-radius:6px;background:rgba(0,0,0,.3);overflow:hidden}.kjpb i{display:block;height:100%;background:linear-gradient(90deg,#86efac,#facc15);border-radius:6px;transition:width .6s}.kjpay>small{opacity:.85;font-size:.78rem}
.kjpop{position:fixed;left:50%;top:22%;transform:translateX(-50%);z-index:10070;padding:14px 22px;border-radius:999px;background:linear-gradient(135deg,#22c55e,#facc15);color:#06110a;font:900 1.4rem system-ui;box-shadow:0 12px 40px rgba(34,197,94,.6);animation:kjpop 1.8s ease-out forwards;pointer-events:none}
@keyframes kjpop{0%{opacity:0;transform:translate(-50%,20px) scale(.7)}15%{opacity:1;transform:translate(-50%,0) scale(1.08)}75%{opacity:1}100%{opacity:0;transform:translate(-50%,-40px) scale(1)}}
.kjbar{display:flex;align-items:center;gap:10px;margin:12px 0}.kjbar b{flex:1;font-size:1.05rem}.kjbar span{opacity:.75;font-weight:700;white-space:nowrap}.kjbar button{min-height:46px;border-radius:999px;padding:0 16px}
.kjcard{border-radius:26px;padding:20px 16px;margin-bottom:12px;background:linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.2);display:grid;gap:12px;text-align:center}
.kjcard h2{margin:0;font:800 1.3rem/1.3 var(--f-head,system-ui);text-transform:none;letter-spacing:0}.kjcard p{margin:0;font-size:1.08rem;line-height:1.6}.kjem{font-size:3.4rem;line-height:1;animation:kjbob 3s ease-in-out infinite}
.kjenb{border-radius:18px;padding:12px;background:rgba(29,78,216,.22);border:1px solid rgba(96,165,250,.5);display:grid;gap:6px}.kjenb p{font-size:1rem}.kjenb button{justify-self:center;min-height:42px;border-radius:999px;padding:0 14px}
.kjsk{opacity:.75}.kjvs{font-size:2rem;letter-spacing:.06em}.kjvs u{color:#facc15;text-decoration:none;border-bottom:3px solid #facc15}
.kjnav{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}.kjnav button{min-height:52px;border-radius:999px;padding:0 20px;font-size:1.02rem}
.kjans{display:grid;gap:8px}.kjans button{min-height:56px;border-radius:18px;font-size:1.08rem;background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.2);color:#fff}
.kjans.kjrow3{grid-template-columns:repeat(3,1fr)}.kjans.kjrow3 button{font-size:.92rem;padding:4px}
.kjans button.ok{background:rgba(34,197,94,.3)!important;border-color:#22c55e!important}.kjans button.bad{background:rgba(239,68,68,.25)!important;border-color:#ef4444!important}
.kjnum{display:flex;gap:8px;justify-content:center;align-items:center}.kjnum input{max-width:220px;min-height:64px;font:800 2rem system-ui;text-align:center;border-radius:18px}.kjnum span{font-size:1.4rem;font-weight:800}
.kjsm{justify-self:center;min-height:44px;border-radius:999px;padding:0 16px}
.kjfb{font-weight:700}.kjres img{margin:0 auto}
.kjchart{border-radius:18px;background:rgba(0,0,0,.25);padding:10px}.kjchart svg{width:100%;height:130px;display:block}.kjcv{font-size:.9rem;opacity:.9;line-height:1.45}.kjcl{display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;font-size:.85rem;margin-top:4px}
.kjgs{display:grid;grid-template-columns:1fr 1fr;gap:8px}.kjgs div{border-radius:14px;background:rgba(255,255,255,.07);padding:8px}.kjgs small{display:block;opacity:.75}.kjgs b{font-size:1.15rem}
.kjev{background:rgba(250,204,21,.14);border-radius:14px;padding:10px;font-weight:700}.kjsell{display:flex;gap:10px;align-items:center;justify-content:center;font-weight:700;min-height:48px}.kjsell input{width:24px;height:24px}
.kjlog{display:grid;gap:4px;font-size:.88rem;opacity:.9;text-align:left}.kjnote{text-align:center;opacity:.75;font-size:.85rem}
.kjrow{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:8px 0;border-top:1px solid rgba(255,255,255,.08);text-align:left}.kjrow em{font-style:normal;opacity:.8;font-size:.85rem}.kjrow button{min-height:40px;border-radius:12px;padding:0 12px}
.kjo .kjor{border-top:1px solid rgba(255,255,255,.1);padding:10px 0;display:grid;gap:6px}.kjost{display:flex;flex-wrap:wrap;gap:6px;font-size:.84rem}.kjost span{padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.08)}
.kjol{display:flex;flex-wrap:wrap;gap:4px}.kjol i img{width:30px;height:30px;opacity:.3;filter:grayscale(1)}.kjol i.ok img{opacity:1;filter:none}
.kjopay{display:grid;gap:4px;padding:10px;border-radius:14px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.35)}
.kjcfg{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:6px;align-items:end;margin-top:6px}.kjcfg label{display:grid;gap:3px;font-size:.78rem}.kjcfg input{min-height:44px}.kjcfg button{grid-column:1/-1;min-height:46px}
.kjof{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;align-items:end;margin-top:8px}.kjof label{display:grid;gap:4px;font-size:.85rem}.kjof input{min-height:48px}.kjof button{grid-column:1/-1;min-height:52px}
.kjores{margin-top:10px;padding:12px;border-radius:14px;background:rgba(245,158,11,.14);border:1px solid rgba(245,158,11,.5)}.kjopw{font-family:ui-monospace,monospace;color:#b6ff3b}
@media(max-width:360px){.kjt{min-height:130px}.kjt img{width:48px;height:48px}.kjans.kjrow3{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.kjt img,.kjem,.kjpop{animation:none}}`;document.head.appendChild(s)}
})();
