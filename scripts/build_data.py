# Собирает site/data.js из выгрузки listvich.by (.art-director/products-raw.json + products-specs.txt)
import json, re, os
raw=open('.art-director/products-raw.json').read(); P=json.loads(raw[raw.find('['):raw.rfind(']')+1])
st=open('.art-director/products-specs.txt').read().strip(); st=json.loads(st) if st.startswith('"') else st
blocks=re.split(r'\n\n(?=## )', st)
specs=[]
for b in blocks:
    lines=b.split('\n'); body='\n'.join(lines[1:])
    body=body.split('В стоимость входит')[0]
    items=[re.sub(r'^[\s—\-📌❗]+','',l).strip() for l in body.split('\n')]
    items=[i for i in items if i and i!='Спецификация']
    specs.append(items)
def num(s): return int(float(s.replace(',','')))
def cat(t):
    t=t.lower()
    if 'бан' in t: return 'banya'
    if 'вольер' in t and 'хозблок' not in t: return 'volier'
    if 'беседк' in t or 'терраса 7' in t: return 'besedka'
    if 'пристройк' in t: return 'pristroyka'
    if 'домик' in t or t.startswith('дом '): return 'domik'
    return 'hozblok'
out=[]
for i,p in enumerate(P):
    pr=re.findall(r'([\d,]+\.\d\d)',p['price'])
    price=num(pr[-1]); old=num(pr[0]) if len(pr)>1 else None
    t=p['title'].strip(); t=t[0].upper()+t[1:]
    t=re.sub(r'(\d)\s*[хxХ×]\s*(\d)', r'\1×\2', t)
    t=re.sub(r'(\d)\.(\d)', r'\1,\2', t)
    t=re.sub(r'(\d)м\b', r'\1 м', t); t=re.sub(r'(\d) м\b', r'\1 м', t)
    t=re.sub(r'(\d+(?:,\d+)?×\d+(?:,\d+)?)(?! м)(?=[\s]|$)', r'\1 м', t)
    t=re.sub(r'\s+', ' ', t)
    m=re.search(r'(\d+(?:[.,]\d+)?)\s*[хx×]\s*(\d+(?:[.,]\d+)?)',t)
    L,W=(float(m.group(1).replace(',','.')),float(m.group(2).replace(',','.'))) if m else (None,None)
    imgs=[f'p{i:02d}-{j}' for j in range(len(p['big'])) if os.path.exists(f'site/img/p{i:02d}-{j}.webp')]
    out.append(dict(id=i,title=t,price=price,old=old,cat=cat(t),L=L,W=W,img=imgs,spec=specs[i] if i<len(specs) else [],src=p['u']))
js='/* Данные с listvich.by, собраны scripts/build_data.py */\nwindow.LISTVICH_PRODUCTS='+json.dumps(out,ensure_ascii=False,indent=0)+';\n'
open('site/data.js','w').write(js)
from collections import Counter
print(Counter(o['cat'] for o in out)); print([ (o['title'],o['L'],o['W'],len(o['img']),len(o['spec'])) for o in out][:40])
