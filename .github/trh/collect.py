# 📚 ZNALOSTNÁ BÁZA TRHU – zber verejných údajov bez API kľúčov (workflow trh.yml → vetva trh-data / trh.json)
# Databáza (trh_tick, pg_cron každých 15 min) si trh.json stiahne a uloží do trh_data / trh_zdroje.
# Iba verejné / licencované zdroje, rešpektuje robots.txt; zdroj bez čistého súboru / API = „iba odkaz“ (nič sa nescrapuje).
# Použitie: python3 collect.py <predošlý trh.json alebo -> <farmar/market.json> <výstup trh.json>
#   FORCE=1 → stiahne všetko hneď (ručné spustenie)
import json, sys, os, re, io, csv, datetime as dt, urllib.request, urllib.parse, urllib.robotparser

UA = "ERNTE-trh-bot/1.0 (+https://github.com/ernte-trade/ernte-)"
NOW = dt.datetime.now(dt.timezone.utc)
TODAY = NOW.date()
FORCE = os.environ.get("FORCE") == "1"
FORCE_SRC = set(x.strip() for x in os.environ.get("FORCE_SRC", "").split(",") if x.strip())  # presný čas zverejnenia (cron v trh.yml)
PREV_P, MARKET_P, OUT_P = (sys.argv + ["-", "farmar/market.json", "trh.json"])[1:4]


def iso(t=None):
    return (t or NOW).strftime("%Y-%m-%dT%H:%M:%SZ")


def pt(s):
    try:
        return dt.datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=dt.timezone.utc)
    except Exception:
        return None


def num(x):
    if x is None:
        return None
    if isinstance(x, (int, float)):
        return float(x)
    s = str(x).replace(" ", "").replace(" ", "")
    m = re.search(r"-?\d[\d,]*\.?\d*", s)
    if not m:
        return None
    v = m.group(0)
    if "," in v and "." in v:
        v = v.replace(",", "")
    elif "," in v:
        v = v.replace(",", "") if re.search(r",\d{3}$", v) else v.replace(",", ".")
    try:
        return float(v)
    except Exception:
        return None


_robots = {}


def allowed(url):
    """robots.txt (User-agent *, náš UA). Chyba siete pri robots = povolené (štandard RFC 9309: nedostupné = bez obmedzení)."""
    p = urllib.parse.urlsplit(url)
    base = f"{p.scheme}://{p.netloc}"
    if base not in _robots:
        rp = urllib.robotparser.RobotFileParser()
        try:
            req = urllib.request.Request(base + "/robots.txt", headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=20) as r:
                rp.parse(r.read().decode("utf-8", "replace").splitlines())
        except urllib.error.HTTPError as e:
            rp.parse([] if e.code >= 404 or e.code < 400 else ["User-agent: *", "Disallow: /"])
        except Exception:
            rp.parse([])
        _robots[base] = rp
    return _robots[base].can_fetch(UA, url)


def get(url, timeout=60, binary=False):
    if not allowed(url):
        raise PermissionError("robots.txt zakazuje " + url)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        b = r.read()
    return b if binary else b.decode("utf-8", "replace")


# ---------- predošlý stav ----------
prev = {}
try:
    if PREV_P != "-" and os.path.exists(PREV_P):
        prev = json.load(open(PREV_P))
except Exception:
    prev = {}
SRC = dict(prev.get("src") or {})
ROWS = {}  # (s,c,i,d) -> row
for r in prev.get("d") or []:
    try:
        ROWS[(r["s"], r["c"], r["i"], r["d"])] = r
    except Exception:
        pass
EXTRA = {k: prev.get(k) for k in ("wasde",) if prev.get(k)}


def add(s, c, i, v, u, d):
    v = num(v)
    if v is None or not d:
        return 0
    d = str(d)[:10]
    if not re.match(r"^\d{4}-\d\d-\d\d$", d):
        return 0
    ROWS[(s, c, i, d)] = {"s": s, "c": c, "i": i, "v": round(v, 4), "u": u, "d": d}
    return 1


# zdroje: kód → (každých h hodín skúsiť znova, funkcia | stav bez sťahovania)
def due(k, every_h):
    if FORCE or k in FORCE_SRC:
        return True
    t = pt((SRC.get(k) or {}).get("try_at") or "")
    return t is None or (NOW - t).total_seconds() >= every_h * 3600 - 300


def run(k, every_h, fn):
    if not due(k, every_h):
        return
    e = dict(SRC.get(k) or {})
    e["try_at"] = iso()
    try:
        n, msg = fn()
        if n > 0:
            e.update(st="ok", ok_at=iso(), msg=msg or "", n=n)
        else:
            e.update(st="nedostupné", msg=msg or "zdroj nevrátil údaje")
    except PermissionError as x:
        e.update(st="nedostupné", msg=str(x)[:200])
    except Exception as x:
        e.update(st="chyba", msg=(type(x).__name__ + ": " + str(x))[:240])
    SRC[k] = e


def link_only(k, why="iba odkaz – bez verejného súboru / API, stránky sa nesťahujú"):
    e = dict(SRC.get(k) or {})
    e.update(st="iba odkaz", msg=why, try_at=iso())
    SRC[k] = e


# ---------- MATIF / CBOT / gasoil z bota „Trhové ceny“ (market.json v repozitári, už verejný) ----------
MON = {"jan": 1, "feb": 2, "mar": 3, "már": 3, "mär": 3, "apr": 4, "máj": 5, "maj": 5, "may": 5, "jún": 6, "jun": 6, "júl": 7, "jul": 7,
       "aug": 8, "sep": 9, "okt": 10, "oct": 10, "nov": 11, "dec": 12}


def term_ym(t):
    t = (t or "").lower().strip()
    m = re.match(r"^([a-zäáéíóúý]+)\D*(20\d\d)", t)
    if not m:
        return None
    mo = next((v for k, v in MON.items() if m.group(1).startswith(k)), None)
    return f"{m.group(2)}-{mo:02d}" if mo else None


def from_market():
    j = json.load(open(MARKET_P))
    n = 0
    HK = {"matif_repka": ("matif", "repka"), "matif_psenica": ("matif", "psenica"), "matif_kukurica": ("matif", "kukurica"),
          "cbot_soja": ("cbot", "soja"), "cbot_kukurica": ("cbot", "kukurica"), "cbot_psenica": ("cbot", "psenica")}
    for h in j.get("hist") or []:
        for k, (s, c) in HK.items():
            if h.get(k):
                n += add(s, c, "close_nearby", h[k], "€/t", h.get("d"))  # „close“ (kontrakt ako odberatelia) zapisuje databáza z market_px
        if h.get("gasoil"):
            n += add("gasoil", "gasoil", "close", h["gasoil"], "€/t", h.get("d"))
    CM = {"repka": "repka", "psenica_p": "psenica", "kukurica": "kukurica", "soja": "soja"}
    for r in j.get("rows") or []:
        if r.get("kind") != "burza" or r.get("c") not in CM:
            continue
        mk = str(r.get("market") or "")
        if re.search(r"náhrada", mk, re.I):
            continue
        s = "cbot" if re.search(r"cbo?t", mk, re.I) else ("matif" if re.search(r"euronext|matif", mk, re.I) else None)
        ym = term_ym(r.get("term"))
        if s and ym:
            n += add(s, CM[r["c"]], "kontrakt " + ym, r.get("price"), "€/t", r.get("date"))
    g = (j.get("fuel") or {}).get("gasoil") or {}
    if g.get("eur"):
        n += add("gasoil", "gasoil", "close", g["eur"], "€/t", g.get("date"))
    fx = j.get("fx") or {}
    if fx.get("usd") and fx.get("date"):
        add("ecb", "fx", "eurusd", fx["usd"], "USD", fx["date"])
        if fx.get("huf"):
            add("ecb", "fx", "eurhuf", fx["huf"], "HUF", fx["date"])
    return n, "bot Trhové ceny (market.json): závery najbližšieho kontraktu + krivka kontraktov"


# ---------- ECB referenčné kurzy (data-api.ecb.europa.eu, bezplatné, uvádzať zdroj ECB) ----------
def ecb():
    n = 0
    for cur, ind in (("USD", "eurusd"), ("HUF", "eurhuf")):
        t = get(f"https://data-api.ecb.europa.eu/service/data/EXR/D.{cur}.EUR.SP00.A?lastNObservations=60&format=csvdata")
        for r in csv.DictReader(io.StringIO(t)):
            n += add("ecb", "fx", ind, r.get("OBS_VALUE"), cur, r.get("TIME_PERIOD"))
    return n, "ECB referenčné kurzy EUR/USD, EUR/HUF"


# ---------- CFTC Commitments of Traders (verejná doména) – disagregovaný, iba futures ----------
COT = {"005602": "soja", "002602": "kukurica", "001602": "psenica"}


def cot():
    n = 0
    try:
        w = urllib.parse.quote("cftc_contract_market_code in('005602','002602','001602')")
        t = get(f"https://publicreporting.cftc.gov/resource/72hh-3qpy.json?$where={w}&$order=report_date_as_yyyy_mm_dd%20DESC&$limit=60")
        for r in json.loads(t):
            c = COT.get(str(r.get("cftc_contract_market_code", "")).strip())
            d = str(r.get("report_date_as_yyyy_mm_dd", ""))[:10]
            L, S, OI = num(r.get("m_money_positions_long_all")), num(r.get("m_money_positions_short_all")), num(r.get("open_interest_all"))
            if c and L is not None and S is not None:
                n += add("cot", c, "mm_net", L - S, "kontrakty", d)
                if OI:
                    n += add("cot", c, "mm_net_pct_oi", 100 * (L - S) / OI, "%", d)
        if n:
            return n, "CFTC COT (Socrata), managed money netto"
    except PermissionError:
        raise
    except Exception:
        pass
    # záloha: textový súbor aktuálneho týždňa (f_disagg.txt, bez hlavičky)
    t = get("https://www.cftc.gov/dea/newcot/f_disagg.txt")
    for row in csv.reader(io.StringIO(t)):
        if len(row) < 15:
            continue
        c = COT.get(row[3].strip())
        if not c:
            continue
        d, OI, L, S = row[2].strip(), num(row[7]), num(row[13]), num(row[14])
        if L is not None and S is not None:
            n += add("cot", c, "mm_net", L - S, "kontrakty", d)
            if OI:
                n += add("cot", c, "mm_net_pct_oi", 100 * (L - S) / OI, "%", d)
    return n, "CFTC COT (f_disagg.txt), managed money netto"


# ---------- USDA WASDE (verejná doména) – CSV „report data“ ----------
WC = {"wheat": "psenica", "corn": "kukurica", "soybeans": "soja"}
WA = {"ending stocks": "konecne_zasoby", "production": "produkcia"}


def wasde_file(y, m):
    t = get(f"https://www.usda.gov/sites/default/files/documents/oce-wasde-report-data-{y}-{m:02d}.csv", timeout=90)
    rows = list(csv.DictReader(io.StringIO(t.lstrip("﻿"))))
    if not rows or "Value" not in rows[0]:
        raise ValueError("neznámy formát CSV")
    out = {}
    rd = None
    for r in rows:
        com = WC.get(str(r.get("Commodity", "")).strip().lower())
        att = WA.get(str(r.get("Attribute", "")).strip().lower())
        reg = str(r.get("Region", "")).strip().lower()
        if not com or not att or reg not in ("world", "united states"):
            continue
        if not str(r.get("ProjEstFlag", "")).lower().startswith("proj"):
            continue
        u = str(r.get("Unit", ""))
        v = num(r.get("Value"))
        if v is None:
            continue
        if "bushel" in u.lower():  # USA v mil. bušľov → mil. t (kukurica 25,4012 kg, pšenica a sója 27,2155 kg)
            v = v * (25.4012 if com == "kukurica" else 27.2155) / 1000
        my = str(r.get("MarketYear", ""))
        key = (com, ("svet_" if reg == "world" else "usa_") + att)
        if key not in out or my > out[key][0]:
            out[key] = (my, round(v, 2))
        rd = rd or r.get("ReleaseDate") or r.get("ReportDate")
    if not out:
        raise ValueError("CSV bez riadkov pšenica/kukurica/sója")
    d = None
    for f in ("%Y-%m-%d", "%m/%d/%Y", "%B %Y", "%b %Y"):
        try:
            d = dt.datetime.strptime(str(rd).strip(), f).date()
            break
        except Exception:
            pass
    return out, (d or dt.date(y, m, 1))


def wasde():
    y, m = TODAY.year, TODAY.month
    cur = prv = None
    for _ in range(3):
        try:
            res = wasde_file(y, m)
            if cur is None:
                cur = res
            else:
                prv = res
                break
        except PermissionError:
            raise
        except Exception:
            pass
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    if not cur:
        return 0, "CSV WASDE sa nepodarilo stiahnuť ani rozpoznať (adresa sa mohla zmeniť) – žiadne údaje sa nevymýšľajú"
    vals, d = cur
    n = 0
    lines = []
    NM = {"psenica": "pšenica", "kukurica": "kukurica", "soja": "sója"}
    for (com, ind), (my, v) in sorted(vals.items()):
        n += add("wasde", com, ind, v, "mil. t", d.isoformat())
        if ind == "svet_konecne_zasoby":
            pv = (prv[0].get((com, ind)) if prv else None)
            sk = lambda x: f"{x:.1f}".replace(".", ",")
            ch = f" ({'+' if v - pv[1] >= 0 else '−'}{sk(abs(v - pv[1]))} oproti min. mesiacu)" if pv and pv[0] == my else ""
            lines.append(f"{NM[com]} {my}: svetové konečné zásoby {sk(v)} mil. t{ch}")
    EXTRA["wasde"] = {"d": d.isoformat(), "txt": "WASDE " + d.strftime("%d. %m. %Y") + ": " + "; ".join(lines)}
    return n, "USDA WASDE (CSV report data)"


# ---------- USDA FAS Export Sales – týždenný prehľad (verejná doména) ----------
def fas():
    t = get("https://apps.fas.usda.gov/export-sales/highlite.htm")
    tx = re.sub(r"<[^>]+>", " ", t)
    tx = re.sub(r"\s+", " ", tx)
    m = re.search(r"week ended ([A-Z][a-z]+ \d{1,2})(?:, (\d{4}))?", tx)
    if not m:
        return 0, "v prehľade sa nenašiel týždeň"
    y = int(m.group(2)) if m.group(2) else TODAY.year
    d = dt.datetime.strptime(f"{m.group(1)} {y}", "%B %d %Y").date()
    if d > TODAY:
        d = d.replace(year=y - 1)
    n = 0
    for name, c in (("Wheat", "psenica"), ("Corn", "kukurica"), ("Soybeans", "soja")):
        mm = re.search(name + r":\s*Net sales( reductions)? of ([\d,]+) MT", tx)
        if mm:
            v = num(mm.group(2)) * (-1 if mm.group(1) else 1)
            n += add("fas_es", c, "netto_predaje_t", v, "t", d.isoformat())
        me = re.search(name + r":.{0,600}?Exports of ([\d,]+) MT", tx)
        if me:
            n += add("fas_es", c, "vyvoz_t", me.group(1), "t", d.isoformat())
    return n, "USDA FAS Export Sales (týždenný prehľad)"


# ---------- EK Agri-food data portal (CC BY 4.0) – týždenné ceny obilnín a olejnín ----------
EP = [(r"milling wheat|bread wheat|soft wheat.*mill", "psenica_p"), (r"feed wheat", "psenica_k"), (r"maize|corn", "kukurica"),
      (r"feed barley", "jacmen_k"), (r"malting barley", "jacmen_s"), (r"rape", "repka"), (r"sunflower", "slnecnica"), (r"soya|soybean", "soja")]


def pick(o, *keys):
    lk = {k.lower(): v for k, v in o.items()}
    for k in keys:
        if k.lower() in lk:
            return lk[k.lower()]
    return None


def ec_agri():
    b = (TODAY - dt.timedelta(days=42)).strftime("%d/%m/%Y")
    e = TODAY.strftime("%d/%m/%Y")
    n = 0
    acc = {}
    for ep in ("cereal", "oilseeds"):
        t = get(f"https://api.tech.ec.europa.eu/agrifood/api/{ep}/prices?memberStateCodes=SK,HU,FR,DE,AT,PL&beginDate={urllib.parse.quote(b)}&endDate={urllib.parse.quote(e)}", timeout=90)
        L = json.loads(t)
        if isinstance(L, dict):
            L = next((v for v in L.values() if isinstance(v, list)), [])
        for o in L:
            if not isinstance(o, dict):
                continue
            pn = str(pick(o, "productName", "product", "productCode") or "")
            com = next((c for rx, c in EP if re.search(rx, pn, re.I)), None)
            ms = str(pick(o, "memberStateCode", "memberState") or "").upper()[:2]
            v = num(pick(o, "price", "value"))
            ed = str(pick(o, "endDate", "referenceDate", "beginDate") or "")
            mm = re.match(r"(\d\d)/(\d\d)/(\d{4})", ed)
            d = f"{mm.group(3)}-{mm.group(2)}-{mm.group(1)}" if mm else ed[:10]
            if com and ms and v and 50 < v < 2000:
                acc.setdefault((com, ms, d), []).append(v)
    for (com, ms, d), vs in acc.items():
        n += add("ec_agri", com, "cena_" + ms, sum(vs) / len(vs), "€/t", d)
    return n, "EK Agri-food data portal (CC BY 4.0): SK, HU, FR, DE, AT, PL"


# ---------- Brent (EIA, verejná doména) ----------
def brent():
    b = get("https://www.eia.gov/dnav/pet/hist_xls/RBRTEd.xls", binary=True, timeout=90)
    try:
        import xlrd
    except Exception:
        return 0, "chýba xlrd"
    wb = xlrd.open_workbook(file_contents=b)
    sh = wb.sheet_by_name("Data 1") if "Data 1" in wb.sheet_names() else wb.sheet_by_index(1)
    n = 0
    for i in range(max(3, sh.nrows - 70), sh.nrows):
        c0, c1 = sh.cell(i, 0), sh.cell(i, 1)
        try:
            d = xlrd.xldate.xldate_as_datetime(c0.value, wb.datemode).date() if c0.ctype == 3 else None
        except Exception:
            d = None
        if d and num(c1.value):
            n += add("brent", "brent", "close", c1.value, "USD/bbl", d.isoformat())
    return n, "EIA Europe Brent Spot FOB (RBRTE, denne)"


# ---------- Open-Meteo (údaje CC BY 4.0; bezplatné API je iba na nekomerčné použitie) ----------
REG = {"SK": [(48.75, 21.92), (48.31, 18.09)], "HU": [(47.53, 21.63), (46.25, 20.15)], "UA": [(49.59, 34.55), (49.23, 28.47)],
       "FR": [(48.45, 1.49), (49.26, 4.03)], "US": [(41.59, -93.62), (40.12, -88.24)], "BR": [(-12.55, -55.71), (-24.96, -53.46)]}


def _meteo_om(pts, key):
    """Open-Meteo customer API (iba s predplatným OPENMETEO_APIKEY) → [(p_past, p_next, tmin, tmax, frost)] pre každý bod."""
    q = {"latitude": ",".join(str(p[1]) for p in pts), "longitude": ",".join(str(p[2]) for p in pts),
         "daily": "precipitation_sum,temperature_2m_min,temperature_2m_max", "past_days": "7", "forecast_days": "7", "timezone": "UTC", "apikey": key}
    L = json.loads(get("https://customer-api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode(q), timeout=60))
    if isinstance(L, dict):
        L = [L]
    out = []
    for o in L:
        dd = (o.get("daily") or {})
        days = dd.get("time") or []
        pp, tn, tx = dd.get("precipitation_sum") or [], dd.get("temperature_2m_min") or [], dd.get("temperature_2m_max") or []
        sp, sn, mn, mx, fr = 0.0, 0.0, 99.0, -99.0, 0
        for i, d in enumerate(days):
            p = pp[i] if i < len(pp) and pp[i] is not None else 0
            if d < TODAY.isoformat():
                sp += p
            else:
                sn += p
                if i < len(tn) and tn[i] is not None:
                    mn = min(mn, tn[i]); fr += 1 if tn[i] < 0 else 0
                if i < len(tx) and tx[i] is not None:
                    mx = max(mx, tx[i])
        out.append((sp, sn, mn, mx, fr))
    return out


def _met_no(la, lo):
    """MET Norway Locationforecast 2.0 (api.met.no, CC BY 4.0, aj komerčne; UA s kontaktom) → (zrážky 7 dní, tmin, tmax, mrazové dni)."""
    t = get(f"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={la:.4f}&lon={lo:.4f}", timeout=60)
    ts = (json.loads(t).get("properties") or {}).get("timeseries") or []
    end = NOW + dt.timedelta(days=7)
    rain, cov, tmin_d = 0.0, None, {}
    tmin, tmax = 99.0, -99.0
    for x in ts:
        tt = pt(x.get("time", ""))
        if not tt or tt < NOW - dt.timedelta(hours=1) or tt >= end:
            continue
        dat = x.get("data") or {}
        T = ((dat.get("instant") or {}).get("details") or {}).get("air_temperature")
        if T is not None:
            tmin, tmax = min(tmin, T), max(tmax, T)
            k = tt.date().isoformat(); tmin_d[k] = min(tmin_d.get(k, 99.0), T)
        if cov is not None and tt < cov:
            continue  # tento čas už pokrýva predošlý 6-hodinový úsek
        for h, key in ((1, "next_1_hours"), (6, "next_6_hours")):
            v = ((dat.get(key) or {}).get("details") or {}).get("precipitation_amount")
            if v is not None:
                rain += float(v); cov = tt + dt.timedelta(hours=h); break
    if tmax < -90:
        raise ValueError("MET Norway: prázdna predpoveď")
    return rain, tmin, tmax, sum(1 for v in tmin_d.values() if v < 0)


def _nasa_past(la, lo):
    """NASA POWER (verejná doména) – zrážky posledných 7 dní (údaje meškajú 1–3 dni, chýbajúce = −999 sa nerátajú)."""
    a, b = (TODAY - dt.timedelta(days=7)).strftime("%Y%m%d"), (TODAY - dt.timedelta(days=1)).strftime("%Y%m%d")
    q = {"parameters": "PRECTOTCORR", "community": "AG", "latitude": f"{la:.4f}", "longitude": f"{lo:.4f}", "start": a, "end": b, "format": "JSON"}
    t = get("https://power.larc.nasa.gov/api/temporal/daily/point?" + urllib.parse.urlencode(q), timeout=90)
    v = (((json.loads(t).get("properties") or {}).get("parameter") or {}).get("PRECTOTCORR") or {})
    return sum(x for x in v.values() if x is not None and x > -900)


def meteo():
    key = os.environ.get("OPENMETEO_APIKEY", "").strip()
    pts = [(r, la, lo) for r, L in REG.items() for la, lo in L]
    if key:
        vals, src = _meteo_om(pts, key), "Open-Meteo (customer API)"
    else:
        # 3. 11.: bezplatné Open-Meteo API zakázalo robotov (robots.txt) a je iba na nekomerčné použitie → MET Norway + NASA POWER
        vals, err = [], []
        for r, la, lo in pts:
            try:
                rn, mn, mx, fr = _met_no(la, lo)
            except Exception as e:
                err.append(f"MET {r}: {str(e)[:60]}"); vals.append(None); continue
            vals.append((None, rn, mn, mx, fr))  # NASA POWER má v robots.txt zákaz → minulé zrážky sa nezapisujú (žiadna falošná nula)
        if not any(vals):
            raise RuntimeError("počasie bez údajov – " + "; ".join(err[:3]))
        src = "MET Norway (api.met.no, CC BY 4.0) – predpoveď 7 dní; minulé zrážky a sucho bez zdroja" + (f" · chyby: {'; '.join(err[:2])}" if err else "")
    agg = {}
    for (r, _, _), v in zip(pts, vals):
        if not v:
            continue
        a = agg.setdefault(r, {"p_past": [], "p_next": [], "tmin": [], "tmax": [], "frost": []})
        for k, x in zip(("p_past", "p_next", "tmin", "tmax", "frost"), v):
            if x is not None:
                a[k].append(x)
    n = 0
    d = TODAY.isoformat()
    for r, a in agg.items():
        if not a["p_next"]:
            continue
        av = lambda x: sum(x) / len(x)
        pn, tmin, tmax, frost = av(a["p_next"]), min(a["tmin"]), max(a["tmax"]), max(a["frost"])
        ppast = av(a["p_past"]) if a["p_past"] else None
        n += add("meteo", r, "zrazky_7d_mm", pn, "mm", d)
        if ppast is not None:
            n += add("meteo", r, "zrazky_minul_7d_mm", ppast, "mm", d)
        n += add("meteo", r, "tmin_7d", tmin, "°C", d)
        n += add("meteo", r, "tmax_7d", tmax, "°C", d)
        n += add("meteo", r, "mraz_dni_7d", frost, "dni", d)
        if ppast is not None:
            n += add("meteo", r, "sucho", 1 if (pn + ppast) < 10 and tmax >= 28 else 0, "0/1", d)
    return n, src


# ---------- spustenie ----------
run("matif", 0, from_market)  # lokálny súbor – vždy
SRC["cbot"] = dict(SRC.get("matif") or {}, msg="bot Trhové ceny (market.json) + market_px v databáze")
SRC["gasoil"] = dict(SRC.get("matif") or {}, msg="bot Trhové ceny (market.json, ICE gasoil)")
run("ecb", 6, ecb)
run("cot", 12, cot)
run("wasde", 12, wasde)
run("fas_es", 12, fas)
run("ec_agri", 24, ec_agri)
run("brent", 12, brent)
run("meteo", 1, meteo)
link_only("jrc_mars", "iba odkaz – bulletin JRC MARS je PDF/HTML bez strojového API")
link_only("amis", "iba odkaz – AMIS Market Monitor je PDF")
link_only("igc", "iba odkaz – IGC GMR: podmienky použitia obmedzujú ďalšie šírenie (predplatné)")
link_only("vuepp", "iba odkaz – MPRV SR / VÚEPP týždenné ceny sú PDF")
link_only("aki", "iba odkaz – AKI PÁIR: stránky bez verejného API")

# ponechať 400 dní (história pre predpoveď), počasie 30 dní
cut = (TODAY - dt.timedelta(days=400)).isoformat()
cutm = (TODAY - dt.timedelta(days=30)).isoformat()
rows = [r for r in ROWS.values() if r["d"] >= (cutm if r["s"] == "meteo" else cut)]
rows.sort(key=lambda r: (r["s"], r["c"], r["i"], r["d"]))
out = {"at": iso(), "ver": 1, "src": SRC, "d": rows,
       "credit": "ECB; CFTC; USDA (verejná doména); EK Agri-food data portal (CC BY 4.0); EIA; MET Norway (CC BY 4.0); bot Trhové ceny"}
out.update(EXTRA)
json.dump(out, open(OUT_P, "w"), ensure_ascii=False, separators=(",", ":"))
print(json.dumps({k: {"st": v.get("st"), "n": v.get("n"), "msg": v.get("msg")} for k, v in SRC.items()}, ensure_ascii=False, indent=1))
print("riadkov:", len(rows))
