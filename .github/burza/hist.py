# 📈 História burzy (90 dní) pre graf na úvode farmára – CBOT (Yahoo Finance) a MATIF / Euronext (live.euronext.com).
# Výstup hist.json: {"at":…, "d":[{"d":"2026-08-01","cbot_soja":…,"matif_repka":…}, …], "src":{…}, "log":[…]}
# Prepočet CBOT na €/t: cent/bušel ÷ 100 × bušlov/t ÷ EURUSD (sója a pšenica 36,7437 bu/t, kukurica 39,3679 bu/t).
import json, datetime, urllib.request, re, sys
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36", "Accept": "application/json,text/plain,*/*"}
LOG = []
def get(url, data=None, hdr=None):
    h = dict(UA); h.update(hdr or {})
    rq = urllib.request.Request(url, data=data, headers=h)
    with urllib.request.urlopen(rq, timeout=30) as r:
        return r.read().decode("utf-8", "replace")
def yahoo(sym):
    for host in ("query1", "query2"):
        try:
            j = json.loads(get(f"https://{host}.finance.yahoo.com/v8/finance/chart/{sym}?range=6mo&interval=1d"))
            r = j["chart"]["result"][0]; ts = r["timestamp"]; cl = r["indicators"]["quote"][0]["close"]
            out = {datetime.datetime.utcfromtimestamp(t).strftime("%Y-%m-%d"): c for t, c in zip(ts, cl) if c}
            LOG.append(f"yahoo {sym}: {len(out)} dní"); return out
        except Exception as e:
            LOG.append(f"yahoo {sym} {host}: {e}")
    return {}
def euronext(code):
    # denné ceny najbližšieho kontraktu z grafu Euronext
    for url in (f"https://live.euronext.com/en/intraday_chart/getChartData/{code}/max", f"https://live.euronext.com/intraday_chart/getChartData/{code}/max"):
        try:
            t = get(url, hdr={"X-Requested-With": "XMLHttpRequest", "Referer": "https://live.euronext.com/"})
            j = json.loads(t)
            out = {}
            for p in j if isinstance(j, list) else j.get("data", []):
                d = p.get("time") or p.get("date"); v = p.get("price") or p.get("close")
                if d and v: out[str(d)[:10]] = float(v)
            LOG.append(f"euronext {code}: {len(out)} bodov ({url})")
            if out: return out
        except Exception as e:
            LOG.append(f"euronext {code}: {str(e)[:120]} ({url})")
    return {}
fx = yahoo("EURUSD=X")
BU = {"cbot_soja": ("ZS=F", 36.7437), "cbot_kukurica": ("ZC=F", 39.3679), "cbot_psenica": ("ZW=F", 36.7437)}
S = {}
for k, (sym, bu) in BU.items():
    raw = yahoo(sym); S[k] = {}
    for d, c in raw.items():
        f = fx.get(d) or (fx[max([x for x in fx if x <= d], default=None)] if any(x <= d for x in fx) else None)
        if f: S[k][d] = round(c / 100 * bu / f, 2)
MT = {"matif_repka": ["ECO-DPAR", "ECO"], "matif_psenica": ["EBM-DPAR", "EBM"], "matif_kukurica": ["EMA-DPAR", "EMA"]}
for k, codes in MT.items():
    S[k] = {}
    for c in codes:
        S[k] = euronext(c)
        if S[k]: break
since = (datetime.date.today() - datetime.timedelta(days=95)).isoformat()
days = sorted({d for v in S.values() for d in v if d >= since})
rows = []
for d in days:
    r = {"d": d}
    for k, v in S.items():
        if d in v: r[k] = v[d]
    if len(r) > 1: rows.append(r)
out = {"at": datetime.datetime.utcnow().isoformat() + "Z", "d": rows, "n": {k: len([1 for d in v if d >= since]) for k, v in S.items()},
       "src": {"cbot": "Yahoo Finance (CME futures, najbližší kontrakt) prepočet ECB/Yahoo EURUSD", "matif": "Euronext live (najbližší kontrakt)"}, "log": LOG}
json.dump(out, open("hist.json", "w"), ensure_ascii=False)
print(json.dumps({"n": out["n"], "log": LOG, "last": rows[-3:] if rows else []}, ensure_ascii=False, indent=1))
