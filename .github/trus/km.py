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
def route(a,b,ua=False):
  j=post(VH+"/route",{"locations":[{"lat":a[0],"lon":a[1]},{"lat":b[0],"lon":b[1]}],"costing":"truck",**({} if ua else {"exclude_polygons":[UAPOLY]}),
    "costing_options":{"truck":{"weight":40,"axle_load":9,"axle_count":5,"height":4,"width":2.55,"length":16.5}},"units":"kilometers","directions_type":"none"})
  t=j["trip"]; km=t["summary"]["length"]; sec=t["summary"]["time"]; shape=t["legs"][0]["shape"]
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
