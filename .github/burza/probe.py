import urllib.request, re, http.cookiejar
cj=http.cookiejar.CookieJar();op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
UA={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36","Accept-Language":"en-GB,en;q=0.9"}
def g(u,h=None):
    r=urllib.request.Request(u,headers=dict(UA,**(h or {})))
    with op.open(r,timeout=30) as x: return x.status, x.read().decode("utf-8","replace")
s,t=g("https://ahdb.org.uk/cereals-oilseeds/futures-prices")
i=t.find("FuturesCustomReport")
for m in re.finditer(r"FuturesCustomReport",t):
    print("---",t[max(0,m.start()-300):m.start()+500].replace("\n"," ")[:800])
    break
for sel in re.findall(r'<select[^>]*>.*?</select>',t,re.S)[:4]: print("SEL",re.sub(r"\s+"," ",sel)[:1500])
print("SCRIPTS",[x for x in re.findall(r'<script[^>]+src="([^"]+)"',t)][:40])
print("URLS",sorted(set(re.findall(r'["\'](/[A-Za-z0-9_/\-]*(?:Report|report|Export|export|Download|download|Futures|futures)[A-Za-z0-9_/\-\.]*)["\']',t)))[:60])
