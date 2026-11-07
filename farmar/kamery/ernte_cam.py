#!/usr/bin/env python3
"""ERNTE / VALKO – kamery na dvore (Tapo) -> aplikácia ERNTE Trade & Logistic.

Beží na zariadení na dvore (Raspberry Pi alebo PC). Pripája sa IBA VON cez HTTPS,
takže funguje aj za SIM routerom bez verejnej IP. Heslá kamier zostávajú len tu
v súbore config.json (práva 600), do aplikácie idú iba zábery.

  * každých 30 s uloží záber z každej kamery do miestneho archívu (48 h)
  * keď niekto v aplikácii otvorí Kamery dvor -> živý náhľad každých ~5 s
  * príjazd/odjazd auta na dvor, udalosti nafty, výdaj z nádrže -> pošle záber
    z presného času udalosti (z archívu)
  * nastavenie v mobile: http://<IP zariadenia>:8080
"""
import base64, glob, html, json, os, shutil, socket, subprocess, sys, threading, time, urllib.parse, urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

VER = "2026-10-25"
SB_URL = "https://cflliscddsgleyeykzje.supabase.co"
SB_KEY = "sb_publishable_AOel6p4QZFP_-t4sSoziAA_ESUooutQ"  # verejný kľúč aplikácie (ako v config.js), dáta strážia pravidlá v databáze
HOME = os.environ.get("ERNTE_CAM_HOME") or ("/var/lib/ernte-cam" if os.geteuid() == 0 else os.path.expanduser("~/.ernte-cam"))
CFG_PATH = os.path.join(HOME, "config.json")
BUF = os.path.join(HOME, "buf")
KEEP_H = 48
EVERY = 30
PORT = int(os.environ.get("ERNTE_CAM_PORT", "8080"))
LOCK = threading.Lock()
STATE = {"cams": {}, "last_poll": None, "poll_err": None, "watch": False}


def log(*a):
    print(datetime.now().strftime("%d.%m %H:%M:%S"), *a, flush=True)


def load_cfg():
    try:
        with open(CFG_PATH) as f:
            c = json.load(f)
    except Exception:
        c = {}
    c.setdefault("token", "")
    c.setdefault("cams", [])
    c["sb_key"] = c.get("sb_key") or SB_KEY
    return c


def save_cfg(c):
    os.makedirs(HOME, exist_ok=True)
    tmp = CFG_PATH + ".tmp"
    with open(tmp, "w") as f:
        json.dump(c, f, ensure_ascii=False, indent=1)
    os.chmod(tmp, 0o600)
    os.replace(tmp, CFG_PATH)


def rtsp(cam, hd):
    u = urllib.parse.quote(cam.get("user", ""), safe="")
    p = urllib.parse.quote(cam.get("pass", ""), safe="")
    return f"rtsp://{u}:{p}@{cam['ip']}:554/{'stream1' if hd else 'stream2'}"


def grab(cam, hd=True, width=1280, q=6):
    """Jeden JPEG z kamery cez ffmpeg. Vráti bytes alebo vyhodí chybu."""
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-rtsp_transport", "tcp", "-timeout", "8000000",
           "-i", rtsp(cam, hd), "-frames:v", "1", "-vf", f"scale='min({width},iw)':-2", "-q:v", str(q), "-f", "image2", "-"]
    try:
        r = subprocess.run(cmd, capture_output=True, timeout=20)
    except subprocess.TimeoutExpired:
        raise RuntimeError("kamera neodpovedá (timeout)")
    if r.returncode != 0 or not r.stdout.startswith(b"\xff\xd8"):
        e = (r.stderr.decode("utf-8", "replace").strip().splitlines() or ["neznáma chyba"])[-1]
        e = e.replace(cam.get("pass") or "\0", "***")
        if "401" in e or "Unauthorized" in e:
            e = "zlé meno/heslo účtu kamery"
        elif "No route" in e or "timed out" in e.lower() or "Connection refused" in e:
            e = "kamera nie je na IP " + cam["ip"]
        raise RuntimeError(e[:160])
    return r.stdout


def shrink(jpg, width, q):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", "-", "-vf", f"scale='min({width},iw)':-2",
                        "-q:v", str(q), "-f", "image2", "-"], input=jpg, capture_output=True, timeout=20)
    return r.stdout if r.returncode == 0 and r.stdout.startswith(b"\xff\xd8") else jpg


def rpc(cfg, fn, args):
    req = urllib.request.Request(f"{SB_URL}/rest/v1/rpc/{fn}", data=json.dumps(args).encode(), method="POST",
                                 headers={"apikey": cfg["sb_key"], "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read() or b"null")


def iso(t):
    return datetime.fromtimestamp(t, timezone.utc).isoformat()


# ---------- miestny archív (48 h) ----------
def buf_save(cid, t, jpg):
    d = os.path.join(BUF, str(cid))
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, f"{int(t)}.jpg"), "wb") as f:
        f.write(jpg)


def buf_near(cid, t, maxdiff=300):
    best = None
    for p in glob.glob(os.path.join(BUF, str(cid), "*.jpg")):
        try:
            ts = int(os.path.basename(p)[:-4])
        except ValueError:
            continue
        if abs(ts - t) <= maxdiff and (best is None or abs(ts - t) < abs(best[0] - t)):
            best = (ts, p)
    return best


def buf_clean():
    lim = time.time() - KEEP_H * 3600
    for p in glob.glob(os.path.join(BUF, "*", "*.jpg")):
        try:
            if int(os.path.basename(p)[:-4]) < lim:
                os.remove(p)
        except Exception:
            pass
    try:  # ochrana disku: pod 1 GB voľného miesta zmaž najstaršie
        while shutil.disk_usage(HOME).free < 1e9:
            ps = sorted(glob.glob(os.path.join(BUF, "*", "*.jpg")), key=lambda p: os.path.basename(p))
            if not ps:
                break
            for p in ps[:200]:
                os.remove(p)
    except Exception:
        pass


def set_state(cid, ok, err=None):
    with LOCK:
        STATE["cams"][cid] = {"ok": ok, "err": err, "at": time.time()}


# ---------- slučky ----------
def archive_loop():
    while True:
        t0 = time.time()
        cfg = load_cfg()
        ths = []
        for cam in cfg["cams"]:
            if not cam.get("ip"):
                continue

            def one(cam=cam):
                try:
                    jpg = grab(cam, hd=True, width=1280, q=6)
                    buf_save(cam["id"], time.time(), jpg)
                    set_state(cam["id"], True)
                except Exception as e:
                    set_state(cam["id"], False, str(e))
            th = threading.Thread(target=one, daemon=True)
            th.start()
            ths.append(th)
        for th in ths:
            th.join(25)
        buf_clean()
        time.sleep(max(3, EVERY - (time.time() - t0)))


def live_once(cfg):
    def one(cam):
        try:
            jpg = grab(cam, hd=False, width=640, q=7)
            set_state(cam["id"], True)
            rpc(cfg, "cam_put", {"tok": cfg["token"], "cam": cam["id"], "at": iso(time.time()),
                                 "img": base64.b64encode(jpg).decode(), "req_id": None})
        except Exception as e:
            set_state(cam["id"], False, str(e))
    ths = [threading.Thread(target=one, args=(c,), daemon=True) for c in cfg["cams"] if c.get("ip")]
    for th in ths:
        th.start()
    for th in ths:
        th.join(25)


def do_req(cfg, rq):
    t = datetime.fromisoformat(rq["at"].replace("Z", "+00:00")).timestamp()
    gate_only = rq.get("kind") in ("yard_in", "yard_out", "in", "out")
    sent = 0
    for cam in cfg["cams"]:
        if not cam.get("ip") or (gate_only and cam.get("gate") is False):
            continue
        try:
            nb = buf_near(cam["id"], t)
            if nb:
                ts, p = nb
                with open(p, "rb") as f:
                    jpg = f.read()
            elif time.time() - t < 180:
                ts, jpg = time.time(), grab(cam, hd=True, width=1280, q=6)
            else:
                continue
            jpg = shrink(jpg, 960, 8)
            rpc(cfg, "cam_put", {"tok": cfg["token"], "cam": cam["id"], "at": iso(ts),
                                 "img": base64.b64encode(jpg).decode(), "req_id": rq["id"]})
            sent += 1
        except Exception as e:
            log("záber k udalosti", rq["id"], "kamera", cam["id"], ":", e)
    note = None if sent else "bez záberu (archív zariadenia má iba 48 h alebo kamery nedostupné)"
    rpc(cfg, "cam_done", {"tok": cfg["token"], "req_id": rq["id"], "note": note})
    log("udalosť", rq["id"], rq.get("kind"), "->", sent, "záberov")


def poll_loop():
    last_live = 0
    while True:
        cfg = load_cfg()
        if not cfg["token"] or not cfg["sb_key"]:
            time.sleep(5)
            continue
        try:
            with LOCK:
                cs = [{"id": c["id"], "name": c.get("name", ""), "ok": STATE["cams"].get(c["id"], {}).get("ok"),
                       "err": STATE["cams"].get(c["id"], {}).get("err")} for c in cfg["cams"] if c.get("ip")]
            info = {"ver": VER, "host": socket.gethostname(), "ip": local_ip(), "cams": cs,
                    "disk_gb": round(shutil.disk_usage(HOME).free / 1e9, 1)}
            r = rpc(cfg, "cam_poll", {"tok": cfg["token"], "info": info})
            STATE["last_poll"], STATE["poll_err"], STATE["watch"] = time.time(), None, bool(r.get("watch"))
            for rq in r.get("req") or []:
                do_req(cfg, rq)
            if r.get("watch") and time.time() - last_live >= 4:
                last_live = time.time()
                live_once(cfg)
        except Exception as e:
            msg = str(e)
            if hasattr(e, "read"):
                try:
                    msg = e.read().decode()[:200]
                except Exception:
                    pass
            if STATE["poll_err"] != msg:
                log("spojenie s aplikáciou:", msg)
            STATE["poll_err"] = msg
            time.sleep(15)
        time.sleep(2 if STATE["watch"] else 6)


def local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "?"


# ---------- nastavenie v mobile (http://IP:8080) ----------
CSS = """body{margin:0;background:#05070a;color:#f2f5ff;font:16px/1.45 -apple-system,system-ui,sans-serif;padding:16px}
.w{max-width:640px;margin:0 auto;display:grid;gap:12px}h1{margin:4px 0;font-size:1.35rem}.n{color:#9aa3b8;font-size:.9rem;margin:0}
.c{border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:12px;background:rgba(255,255,255,.04);display:grid;gap:8px}
.g{display:grid;grid-template-columns:1fr 1fr;gap:8px}label{display:grid;gap:4px;color:#9aa3b8;font-size:.8rem;min-width:0}
input{font:500 1rem system-ui;color:#fff;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:10px;min-height:44px;width:100%;box-sizing:border-box}
button{font:700 1.05rem system-ui;min-height:54px;border-radius:14px;border:0;background:linear-gradient(135deg,#7c5cff,#22d3ee);color:#fff}
.ok{color:#b6ff3b}.bad{color:#ff8a9b}.ck{display:flex;gap:8px;align-items:center;color:#cbd2e4}.ck input{width:auto;min-height:0}
img{width:100%;border-radius:12px;display:block}"""


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send(self, code, body, ctype="text/html; charset=utf-8"):
        b = body.encode() if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        cfg = load_cfg()
        if self.path.startswith("/foto/"):
            try:
                cid = int(self.path.split("/")[2].split("?")[0])
                cam = next(c for c in cfg["cams"] if c["id"] == cid)
                return self.send(200, grab(cam, hd=False, width=640, q=7), "image/jpeg")
            except Exception as e:
                return self.send(500, str(e), "text/plain; charset=utf-8")
        byid = {c["id"]: c for c in cfg["cams"]}
        rows = ""
        for i in range(1, 7):
            c = byid.get(i, {})
            st = STATE["cams"].get(i)
            s = "" if not c.get("ip") else (f"<span class=ok>✓ funguje</span>" if st and st["ok"] else
                                             f"<span class=bad>✕ {html.escape(st['err'] or '')}</span>" if st else "čaká na prvý záber…")
            rows += f"""<div class=c><b>Kamera {i}</b> {s}
<div class=g><label>Názov (napr. Brána, Nádrž)<input name=name{i} value="{html.escape(c.get('name',''))}"></label>
<label>IP adresa (Tapo app → Info o zariadení)<input name=ip{i} inputmode=decimal placeholder="192.168.1.50" value="{html.escape(c.get('ip',''))}"></label>
<label>Meno účtu kamery<input name=user{i} autocapitalize=off autocomplete=off value="{html.escape(c.get('user',''))}"></label>
<label>Heslo účtu kamery<input name=pass{i} type=password autocomplete=new-password placeholder="{'••• uložené – nechaj prázdne' if c.get('pass') else ''}"></label></div>
<label class=ck><input type=checkbox name=gate{i} {'checked' if c.get('gate', True) else ''}> zábery pri príjazde/odjazde áut</label>
{f'<a href="/foto/{i}" target=_blank style="color:#b6ff3b">📷 skúšobný záber</a>' if c.get('ip') else ''}</div>"""
        conn = ("<span class=ok>✓ pripojené k aplikácii</span>" if STATE["last_poll"] and time.time() - STATE["last_poll"] < 60
                else f"<span class=bad>✕ {html.escape(STATE['poll_err'] or 'nepripojené – vlož kód zariadenia')}</span>")
        self.send(200, f"""<!doctype html><html lang=sk><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>ERNTE kamery – nastavenie</title><style>{CSS}</style></head><body><form class=w method=post>
<h1>📹 Kamery dvor – nastavenie</h1><p class=n>Zariadenie {html.escape(socket.gethostname())} · {local_ip()} · {conn}</p>
<div class=c><label>Kód zariadenia (z aplikácie: Flotila → Kamery dvor → Pripojiť zariadenie)<input name=token autocomplete=off autocapitalize=off placeholder="{'••• uložený – nechaj prázdne' if cfg['token'] else 'cam-…'}"></label></div>
{rows}<button>Uložiť a spustiť</button>
<p class=n>Heslá kamier zostávajú iba v tomto zariadení. Do aplikácie sa posielajú len zábery.</p></form></body></html>""")

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        f = urllib.parse.parse_qs(self.rfile.read(min(n, 100000)).decode(), keep_blank_values=True)
        g = lambda k: (f.get(k) or [""])[0].strip()
        cfg = load_cfg()
        if g("token"):
            if not g("token").startswith("cam-"):
                return self.send(400, "<p>Kód zariadenia má začínať cam- . <a href=/>Späť</a></p>")
            cfg["token"] = g("token")
        old = {c["id"]: c for c in cfg["cams"]}
        cams = []
        for i in range(1, 7):
            ip = g(f"ip{i}")
            if not ip:
                continue
            o = old.get(i, {})
            cams.append({"id": i, "name": g(f"name{i}") or f"Kamera {i}", "ip": ip, "user": g(f"user{i}") or o.get("user", ""),
                         "pass": g(f"pass{i}") or o.get("pass", ""), "gate": bool(f.get(f"gate{i}"))})
        cfg["cams"] = cams
        save_cfg(cfg)
        STATE["cams"].clear()
        log("nastavenie uložené:", len(cams), "kamier")
        self.send_response(303)
        self.send_header("Location", "/")
        self.end_headers()


def main():
    os.makedirs(BUF, exist_ok=True)
    if not shutil.which("ffmpeg"):
        sys.exit("Chýba ffmpeg – nainštaluj: sudo apt install -y ffmpeg")
    cfg = load_cfg()
    if not cfg["sb_key"]:
        log("POZOR: chýba verejný kľúč aplikácie (sb_key) – spusti inštalátor znova")
    log(f"ERNTE kamery {VER} · {len(cfg['cams'])} kamier · nastavenie: http://{local_ip()}:{PORT}")
    threading.Thread(target=archive_loop, daemon=True).start()
    threading.Thread(target=poll_loop, daemon=True).start()
    ThreadingHTTPServer(("0.0.0.0", PORT), H).serve_forever()


if __name__ == "__main__":
    main()
