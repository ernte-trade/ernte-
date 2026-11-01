# Kamiónové trasy kurací trus: farma (HU) ⇄ BPS (SK) – Valhalla truck 40 t, 5 náprav; km podľa krajiny a triedy cesty.
import json, os, sys, time, urllib.request, urllib.parse
UA={"User-Agent":"ERNTE-Trade-trus-km/1.0 (report.valko@gmail.com)"}
VH="https://valhalla1.openstreetmap.de"
def get(u):
  r=urllib.request.Request(u,headers=UA); return json.load(urllib.request.urlopen(r,timeout=60))
def post(u,b):
  r=urllib.request.Request(u,data=json.dumps(b).encode(),headers=dict(UA,**{"Content-Type":"application/json"})); return json.load(urllib.request.urlopen(r,timeout=120))
def geo(q,cc):
  for i in range(3):
    try:
      j=get("https://nominatim.openstreetmap.org/search?"+urllib.parse.urlencode({"q":q,"format":"json","limit":1,"countrycodes":cc}))
      time.sleep(1.2)
      if j: return float(j[0]["lat"]),float(j[0]["lon"]),j[0].get("display_name","")
    except Exception as e: time.sleep(3)
  return None
UAPOLY=[[22.27,48.45],[22.32,48.60],[22.40,48.80],[22.60,49.08],[23.6,49.0],[23.6,47.9],[22.9,47.95],[22.55,48.05],[22.35,48.30],[22.27,48.45]]  # Zakarpatská oblasť – tranzit cez Ukrajinu (colnica) sa nepočíta
VIA=[float(x) for x in os.environ.get("VIA","").split(",")] if os.environ.get("VIA") else None
IGN=os.environ.get("IGNORE")=="1"
def route(a,b,ua=False):
  L=[{"lat":a[0],"lon":a[1]}]+([{"lat":VIA[0],"lon":VIA[1],"type":"through"}] if VIA and not ua else [])+[{"lat":b[0],"lon":b[1]}]
  j=post(VH+"/route",{"locations":L,"costing":"truck",
    "costing_options":{"truck":dict({"weight":40,"axle_load":9,"axle_count":5,"height":4,"width":2.55,"length":16.5},**({} if ua else {"country_crossing_penalty":4000,"country_crossing_cost":1200}),**({"ignore_access":True,"ignore_restrictions":True} if IGN and not ua else {}))},"units":"kilometers","directions_type":"none"})
  t=j["trip"]; km=t["summary"]["length"]; sec=t["summary"]["time"]; shape=t["legs"][0]["shape"] if len(t["legs"])==1 else None
  if shape is None:
    import itertools
    shape=None; pts=[]
    for lg in t["legs"]: pts+=dec(lg["shape"])
    shape=enc(pts)
  ta=post(VH+"/trace_attributes",{"encoded_polyline":shape,"costing":"truck","shape_match":"edge_walk",
    "filters":{"attributes":["edge.length","edge.road_class","edge.toll","node.admin_index","admin.country_code"],"action":"include"}})
  ad=[x.get("country_code","?") for x in ta.get("admins",[])]; C={}
  for e in ta.get("edges",[]):
    cc=ad[(e.get("end_node") or {}).get("admin_index",0)] if ad else "?"
    x=C.setdefault(cc,{"km":0,"m":0,"p":0,"t":0}); l=e.get("length",0); x["km"]+=l
    rc=e.get("road_class","")
    if rc in("motorway","trunk"): x["m"]+=l
    elif rc=="primary": x["p"]+=l
    elif e.get("toll"): x["t"]+=l
  for v in C.values():
    for k in v: v[k]=round(v[k],2)
  return {"km":round(km,1),"h":round(sec/3600,2),"c":C}
def dec(e):
  i=0;la=0;lo=0;o=[]
  while i<len(e):
    for k in (0,1):
      r=0;sh=0
      while True:
        b=ord(e[i])-63;i+=1;r|=(b&31)<<sh;sh+=5
        if b<32:break
      d=~(r>>1) if r&1 else r>>1
      if k==0:la+=d
      else:lo+=d
    o.append((la,lo))
  return o
def enc(pts):
  out=[];pla=0;plo=0
  for la,lo in pts:
    for v in (la-pla,lo-plo):
      v=~(v<<1) if v<0 else v<<1
      while v>=32: out.append(chr((32|(v&31))+63)); v>>=5
      out.append(chr(v+63))
    pla,plo=la,lo
  return "".join(out)
sites=[s.strip() for s in os.environ["SITES"].split(",") if s.strip()]
dest=os.environ.get("DEST","Kamenica nad Cirochou")
D=geo(dest+", Slovensko","sk"); out={"dest":dest,"dest_geo":D,"at":time.strftime("%Y-%m-%dT%H:%M:%SZ"),"sites":{}}
for s in sites:
  g=geo(s+", Magyarország","hu"); r={"geo":g}
  if g and D:
    try:
      r["tam"]=route(g,D); time.sleep(1); r["spat"]=route(D,g); time.sleep(1)
      u=route(g,D,True); time.sleep(1)
      if "UA" in u["c"]: r["cez_ua"]=u
    except Exception as e: r["err"]=str(e)[:200]
  out["sites"][s]=r; print(s, r.get("tam",{}).get("km"), r.get("spat",{}).get("km"), r.get("err",""), flush=True)
json.dump(out,open("trus_km.json","w"),ensure_ascii=False)
