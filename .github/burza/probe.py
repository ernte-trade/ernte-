import urllib.request, re, http.cookiejar
cj=http.cookiejar.CookieJar();op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
UA={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36","Accept-Language":"en-GB,en;q=0.9"}
def g(u,h=None):
    r=urllib.request.Request(u,headers=dict(UA,**(h or {})))
    with op.open(r,timeout=30) as x: return x.status, x.read().decode("utf-8","replace")
s,t=g("https://ahdb.org.uk/cereals-oilseeds/futures-prices")
i=t.find("FuturesCustomReportPart_DatePickerFilterStart")
print("FORM",re.sub(r"\s+"," ",t[i:i+4000]))
for sc in re.findall(r'<script(?![^>]*src)[^>]*>(.*?)</script>',t,re.S):
    if re.search(r'Futures|Report|ajax|Download|\.post\(|\.get\(|fetch\(',sc): print("JS",re.sub(r"\s+"," ",sc)[:3000])
