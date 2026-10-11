import http.server,json,pathlib,subprocess,urllib.parse,re,time
root=pathlib.Path(__file__).resolve().parent
translations=json.loads((root/'translations.json').read_text())
class Handler(http.server.BaseHTTPRequestHandler):
 def do_GET(self):
  args=urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
  try:
   language=args['language'][0];theme=args['theme'][0];accent=args['accent'][0]
   assert language in translations and theme in ['light','dark','pro'] and accent in ['indigo','emerald','sunset','gold','violet','aqua']
   subprocess.run(['python3',str(root/'seed.py'),theme,accent,language],check=True,timeout=30)
   d=translations[language];bad=[]
   for key,value in d.items():
    if key.startswith(('tamagotchiSpeechHungry','tamagotchiSpeechNeedPlay','tamagotchiSpeechNeedClean')):
     for text in value if isinstance(value,list) else [value]:
      parts=re.split(r'(\{\{[^}]+\}\})',text)
      bad.append(''.join('.*' if part.startswith('{{') else re.escape(part) for part in parts))
   result={'description':d['tamagotchiImmunityDescription'],'details':d['tamagotchiImmunityDetails'].replace('{{hours}}','48'),'party':d['tamagotchiPartyButtonLabel'].replace('{{cost}}','25'),'badSpeech':'(?s)(?:'+'|'.join(bad)+')'}
   self.send_response(200);self.end_headers();self.wfile.write(json.dumps(result,ensure_ascii=False).encode())
  except Exception as error:
   self.send_response(500);self.end_headers();self.wfile.write(str(error).encode())
http.server.HTTPServer(('127.0.0.1',8769),Handler).serve_forever()
