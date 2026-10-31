# 📈 História burzy (≈ 100 dní) pre graf na úvode farmára – AHDB „Futures prices“ (zdroj ECB, ICE, CME, Euronext, Barchart),
# v € / t, najbližší kontrakt (Nearby) – rovnako ako bot „Trhové ceny“. Dni, ktoré má bot v market.json, sa berú z bota.
# Výstup hist.json (vetva burza-hist): {"at", "d":[{"d":"2026-08-03","matif_repka":523.5,…}], "src", "n"}
import json, datetime, io, sys, subprocess, site, importlib, urllib.request, http.cookiejar
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "--user", "--break-system-packages", "openpyxl"], check=False)
sys.path.append(site.getusersitepackages()); importlib.invalidate_caches()
import openpyxl
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36", "Accept-Language": "en-GB,en;q=0.9"}
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
P = "https://ahdb.org.uk/cereals-oilseeds/futures-prices"
op.open(urllib.request.Request(P, headers=UA), timeout=40).read()
K = {"matif_repka": 94, "matif_psenica": 98, "matif_kukurica": 90, "cbot_soja": 71, "cbot_kukurica": 65, "cbot_psenica": 72}
end = datetime.date.today(); start = end - datetime.timedelta(days=100)
S, LOG = {}, []
for k, ck in K.items():
    S[k] = {}
    try:
        u = f"https://ahdb.org.uk/FuturesCustomReportExport/API?id=84399&currency=17&timescale=Daily&startDate={start}&endDate={end}&commodityKey={ck}&convertToTonnes=true"
        b = op.open(urllib.request.Request(u, headers=dict(UA, Referer=P)), timeout=90).read()
        ws = openpyxl.load_workbook(io.BytesIO(b), read_only=True, data_only=True).worksheets[0]
        hdr = None
        for row in ws.iter_rows(values_only=True):
            if row and "Date" in row and "Nearby" in row: hdr = list(row); continue
            if not hdr or not row: continue
            d = row[hdr.index("Date")]
            if not isinstance(d, datetime.datetime): continue
            v = row[hdr.index("Nearby")]
            if v in (None, ""):
                v = next((x for x in row[hdr.index("Nearby") + 1:] if isinstance(x, (int, float))), None)
            if isinstance(v, (int, float)) and v > 0: S[k][d.strftime("%Y-%m-%d")] = round(float(v), 2)
        LOG.append(f"{k}: {len(S[k])} dní")
    except Exception as e:
        LOG.append(f"{k}: chyba {str(e)[:160]}")
# bot má prednosť pre dni, ktoré má
try:
    for h in json.load(open("farmar/market.json")).get("hist", []):
        for k in K:
            if h.get(k): S[k][h["d"]] = h[k]
except Exception as e:
    LOG.append(f"market.json: {e}")
days = sorted({d for v in S.values() for d in v})
rows = [dict({"d": d}, **{k: S[k][d] for k in K if d in S[k]}) for d in days]
out = {"at": datetime.datetime.utcnow().isoformat() + "Z", "d": rows, "n": {k: len(v) for k, v in S.items()}, "log": LOG,
       "src": "AHDB Futures prices (ECB, ICE, CME, Euronext, Barchart) – najbližší kontrakt, € / t; posledné dni bot Trhové ceny"}
if sum(out["n"].values()) < 30: sys.exit("málo údajov: " + json.dumps(LOG, ensure_ascii=False))
json.dump(out, open("hist.json", "w"), ensure_ascii=False)
print(json.dumps({"n": out["n"], "log": LOG, "last": rows[-2:]}, ensure_ascii=False))
