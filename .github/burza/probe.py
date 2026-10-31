import urllib.request, re, http.cookiejar, json
cj=http.cookiejar.CookieJar();op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
UA={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36","Accept-Language":"en-GB,en;q=0.9","Accept":"text/html,application/json,*/*"}
def g(u,h=None):
    r=urllib.request.Request(u,headers=dict(UA,**(h or {})))
    with op.open(r,timeout=30) as x: return x.status, x.read().decode("utf-8","replace")
for u in ["https://ahdb.org.uk/cereals-oilseeds/futures-prices","https://ahdb.org.uk/futuresPrices","https://ahdb.org.uk/cereals-oilseeds/market-data"]:
    try:
        s,t=g(u);L=sorted(set(re.findall(r'href="([^"]+)"',t)));L=[x for x in L if re.search(r'xls|csv|download|export|futures|Display/|price',x,re.I)]
        print("AHDB",u,s,len(t));print("  ",L[:60])
        print("  forms:",re.findall(r'<(?:form|select)[^>]*>',t)[:10])
    except Exception as e: print("AHDB",u,e)
try:
    g("https://fc.yahoo.com/")
except Exception as e: print("fc",e)
try:
    s,c=g("https://query1.finance.yahoo.com/v1/test/getcrumb");print("crumb",s,c[:20])
    s,t=g(f"https://query1.finance.yahoo.com/v8/finance/chart/ZS=F?range=6mo&interval=1d&crumb={c}");print("yahoo",s,t[:200])
except Exception as e: print("yahoo",e)
for u in ["https://www.cmegroup.com/CmeWS/mvc/Settlements/Futures/Settlements/320/FUT?tradeDate=10/29/2026&strategy=DEFAULT","https://www.investing.com/commodities/rapeseed-historical-data","https://stooq.com/q/d/l/?s=zs.f&i=d"]:
    try:
        s,t=g(u);print("X",u,s,len(t),t[:160].replace("\n"," "))
    except Exception as e: print("X",u,str(e)[:100])
