import pathlib,json,subprocess,unicodedata,re
root=pathlib.Path(__file__).resolve().parent
results=json.loads((root/'native-results.json').read_text())
dictionaries=json.loads((root/'translations.json').read_text())
def normalized(text):return ''.join(ch for ch in unicodedata.normalize('NFKC',text).casefold() if ch.isalnum())
reviews=[]
for result in results:
 if result['functional']!='pass':continue
 name=result['case'];lang='zh-Hant' if name.startswith('zh-Hant') else name.split('-')[0];dictionary=dictionaries[lang]
 for stage in ['expanded','party','home']:
  file=root/'evidence'/f'{name}-{stage}.png';ocr=file.with_suffix('.ocr.json')
  if not file.exists():continue
  if not ocr.exists():
   ocr.write_bytes(subprocess.check_output(['/tmp/almost-immunity-ocr',str(file)]))
  data=json.loads(ocr.read_text());lines=sorted(data['lines'],key=lambda line:line['y']);text=' '.join(line['text'] for line in lines)
  expected=[]
  if stage=='expanded':expected=[dictionary['tamagotchiImmunityDescription'],dictionary['tamagotchiImmunityDetails'].replace('{{hours}}','48')]
  if stage=='party':expected=[dictionary['tamagotchiPartyBenefit'].replace('{{hours}}','48')]
  reviews.append({'case':name,'stage':stage,'ocrFullCopy':[normalized(value) in normalized(text) for value in expected],'texts':expected,'observed':text})
(root/'ocr-review.json').write_text(json.dumps(reviews,ensure_ascii=False,indent=2))
print('Screenshots OCR:',len(reviews),'copy warnings:',[(r['case'],r['stage']) for r in reviews if not all(r['ocrFullCopy'])],flush=True)
