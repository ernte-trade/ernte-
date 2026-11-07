// ===== Astronomické polohy pre Predikciu (bez externých knižníc) =====
// Nízkopresné vzorce P. Schlytera („How to compute planetary positions“) – presnosť rádovo do 1–2 oblúkových minút
// pre Slnko a planéty, pár minút pre Mesiac. Ekliptika a jarný bod dátumu (tropický zverokruh).
(function(root){
const R=Math.PI/180,rev=x=>((x%360)+360)%360,sin=x=>Math.sin(x*R),cos=x=>Math.cos(x*R),atan2=(y,x)=>rev(Math.atan2(y,x)/R);
const jd=t=>t.getTime()/864e5+2440587.5,dd=t=>jd(t)-2451543.5;
const EL={
 sun:d=>({N:0,i:0,w:282.9404+4.70935e-5*d,a:1,e:0.016709-1.151e-9*d,M:356.0470+0.9856002585*d}),
 moon:d=>({N:125.1228-0.0529538083*d,i:5.1454,w:318.0634+0.1643573223*d,a:60.2666,e:0.054900,M:115.3654+13.0649929509*d}),
 mercury:d=>({N:48.3313+3.24587e-5*d,i:7.0047+5e-8*d,w:29.1241+1.01444e-5*d,a:0.387098,e:0.205635+5.59e-10*d,M:168.6562+4.0923344368*d}),
 venus:d=>({N:76.6799+2.4659e-5*d,i:3.3946+2.75e-8*d,w:54.8910+1.38374e-5*d,a:0.72333,e:0.006773-1.302e-9*d,M:48.0052+1.6021302244*d}),
 mars:d=>({N:49.5574+2.11081e-5*d,i:1.8497-1.78e-8*d,w:286.5016+2.92961e-5*d,a:1.523688,e:0.093405+2.516e-9*d,M:18.6021+0.5240207766*d}),
 jupiter:d=>({N:100.4542+2.76854e-5*d,i:1.3030-1.557e-7*d,w:273.8777+1.64505e-5*d,a:5.20256,e:0.048498+4.469e-9*d,M:19.8950+0.0830853001*d}),
 saturn:d=>({N:113.6634+2.3898e-5*d,i:2.4886-1.081e-7*d,w:339.3939+2.97661e-5*d,a:9.55475,e:0.055546-9.499e-9*d,M:316.9670+0.0334442282*d})};
function orb(o){const M=rev(o.M);let E=M+(o.e/R)*sin(M)*(1+o.e*cos(M));for(let k=0;k<8;k++)E=E-(E-(o.e/R)*sin(E)-M)/(1-o.e*cos(E));
  const xv=o.a*(cos(E)-o.e),yv=o.a*Math.sqrt(1-o.e*o.e)*sin(E),v=atan2(yv,xv),r=Math.hypot(xv,yv),u=v+o.w;
  return{x:r*(cos(o.N)*cos(u)-sin(o.N)*sin(u)*cos(o.i)),y:r*(sin(o.N)*cos(u)+cos(o.N)*sin(u)*cos(o.i)),z:r*sin(u)*sin(o.i),r}}
function sun(d){const o=EL.sun(d),M=rev(o.M),E=M+(o.e/R)*sin(M)*(1+o.e*cos(M)),xv=cos(E)-o.e,yv=Math.sqrt(1-o.e*o.e)*sin(E),v=atan2(yv,xv),r=Math.hypot(xv,yv),lon=rev(v+o.w);
  return{lon,r,x:r*cos(lon),y:r*sin(lon)}}
function lonOf(p,d){const S=sun(d);if(p==="sun")return S.lon;
  if(p==="moon"){const o=EL.moon(d),h=orb(o);let lon=atan2(h.y,h.x);const s=EL.sun(d),Ms=rev(s.M),Mm=rev(o.M),Ls=rev(s.M+s.w),Lm=rev(o.M+o.w+o.N),D=Lm-Ls,F=Lm-o.N;
    lon+=-1.274*sin(Mm-2*D)+0.658*sin(2*D)-0.186*sin(Ms)-0.059*sin(2*Mm-2*D)-0.057*sin(Mm-2*D+Ms)+0.053*sin(Mm+2*D)+0.046*sin(2*D-Ms)+0.041*sin(Mm-Ms)-0.035*sin(D)-0.031*sin(Mm+Ms)-0.015*sin(2*F-2*D)+0.011*sin(Mm-4*D);return rev(lon)}
  const h=orb(EL[p](d));let lon=atan2(h.y+S.y,h.x+S.x);
  if(p==="jupiter"||p==="saturn"){const Mj=rev(EL.jupiter(d).M),Ms=rev(EL.saturn(d).M);
    if(p==="jupiter"){const hl=-0.332*sin(2*Mj-5*Ms-67.6)-0.056*sin(2*Mj-2*Ms+21)+0.042*sin(3*Mj-5*Ms+21)-0.036*sin(Mj-2*Ms)+0.022*cos(Mj-Ms)+0.023*sin(2*Mj-3*Ms+52)-0.016*sin(Mj-5*Ms-69);
      const h2=orb(Object.assign(EL.jupiter(d)));const hl0=atan2(h2.y,h2.x),L=hl0+hl;lon=atan2(h2.r*sin(L)+S.y,h2.r*cos(L)+S.x)}
    else{const hl=0.812*sin(2*Mj-5*Ms-67.6)-0.229*cos(2*Mj-4*Ms-2)+0.119*sin(Mj-2*Ms-3)+0.046*sin(2*Mj-6*Ms-69)+0.014*sin(Mj-3*Ms+32);
      const h2=orb(EL.saturn(d));const hl0=atan2(h2.y,h2.x),L=hl0+hl;lon=atan2(h2.r*sin(L)+S.y,h2.r*cos(L)+S.x)}}
  return lon}
const PL=["sun","moon","mercury","venus","mars","jupiter","saturn"];
function positions(t){const d=dd(t),o={};for(const p of PL)o[p]=lonOf(p,d);return o}
function retro(p,t){if(p==="sun"||p==="moon")return false;const a=lonOf(p,dd(t)-0.5),b=lonOf(p,dd(t)+0.5);return rev(b-a+180)-180<0}
function ascmc(t,lat,lonE){const d=dd(t),eps=23.4393-3.563e-7*d,ramc=rev(280.46061837+360.98564736629*(jd(t)-2451545)+lonE);
  return{asc:atan2(cos(ramc),-(sin(ramc)*cos(eps)+Math.tan(lat*R)*sin(eps))),mc:atan2(sin(ramc),cos(ramc)*cos(eps))}}
function moonPhase(t){const d=dd(t),el=rev(lonOf("moon",d)-lonOf("sun",d));return{el,waxing:el<180,illum:(1-cos(el))/2,
  name:el<22.5?"nov":el<67.5?"dorastajúci kosák":el<112.5?"prvá štvrť":el<157.5?"dorastajúci":el<202.5?"spln":el<247.5?"ubúdajúci":el<292.5?"posledná štvrť":el<337.5?"ubúdajúci kosák":"nov"}}
// najbližšia zmena dorast/ubúdanie (nov alebo spln) – po hodinách
function nextTurn(t){const w0=moonPhase(t).waxing;for(let h=1;h<24*20;h++){const u=new Date(t.getTime()+h*36e5);if(moonPhase(u).waxing!==w0)return u}return null}
const SIGNS=["Baran","Býk","Blíženci","Rak","Lev","Panna","Váhy","Škorpión","Strelec","Kozorožec","Vodnár","Ryby"];
const sign=l=>SIGNS[Math.floor(rev(l)/30)]+" "+Math.floor(rev(l)%30)+"°";
const sep=(a,b)=>{const x=Math.abs(rev(a-b));return x>180?360-x:x};
root.ASTRO={positions,retro,ascmc,moonPhase,nextTurn,sign,sep,rev,SIGNS};
})(typeof window!=="undefined"?window:globalThis);
