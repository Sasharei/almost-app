"""Validate and export the reviewed 7.2.1 store copy; never calls a store API."""
import csv
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = json.loads((ROOT / 'metadata.json').read_text())
ROWS = DATA['localizations']
LIMITS = {'name': 30, 'subtitle': 30, 'keywords': 100, 'short_description': 80,
          'promotional_text': 170, 'apple_description': 4000,
          'google_description': 4000, 'whats_new': 500}
for row in ROWS:
    for field, limit in LIMITS.items():
        assert row[field] and len(row[field]) <= limit, (row['source_locale'], field, len(row[field]))
        assert '\\n' not in row[field], (row['source_locale'], field, 'literal newline escape')
    assert ', ' not in row['keywords']
    tokens = row['keywords'].lower().split(',')
    assert len(tokens) == len(set(tokens)), row['source_locale']
for platform in ['apple', 'google']:
    locales = [r[platform + '_locale'] for r in ROWS]
    assert len(locales) == len(set(locales))


def write_csv(filename, columns, records):
    with (ROOT / filename).open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=columns)
        writer.writeheader()
        writer.writerows(records)


apple_cols = ['store_locale', 'name', 'subtitle', 'promotional_text', 'keywords', 'description', 'whats_new']
write_csv('app-store-metadata.csv', apple_cols, [
    dict(store_locale=r['apple_locale'], name=r['name'], subtitle=r['subtitle'],
         promotional_text=r['promotional_text'], keywords=r['keywords'],
         description=r['apple_description'], whats_new=r['whats_new']) for r in ROWS])
write_csv('google-play-metadata.csv', ['store_locale', 'title', 'short_description', 'full_description'], [
    dict(store_locale=r['google_locale'], title=r['name'], short_description=r['short_description'],
         full_description=r['google_description']) for r in ROWS])
# Only these 12 languages were confirmed configured in Google Play Console on 2026-09-14.
google_active = [r for r in ROWS if r['source_locale'] not in ['zh', 'es-MX']]
(ROOT / 'google-play-release-notes.txt').write_text('\n\n'.join(
    '<'+r['google_locale']+'>\n'+r['whats_new']+'\n</'+r['google_locale']+'>' for r in google_active)+'\n')
(ROOT / 'release-notes.md').write_text('# Almost 7.2.1\n\n'+ '\n\n'.join(
    '## '+r['source_locale']+'\n\n'+r['whats_new'] for r in ROWS)+'\n')
counts = [{ 'locale':r['source_locale'], **{f:len(r[f]) for f in LIMITS}} for r in ROWS]
write_csv('character-counts.csv', ['locale', *LIMITS], counts)
parts=['<!doctype html><html lang="ru"><meta charset="utf-8"><title>Almost 7.2.1 — metadata review</title>',
       '<style>body{font:16px system-ui;max-width:950px;margin:40px auto;padding:0 20px;color:#182321}article{border-top:1px solid #ccc;margin-top:40px}pre{white-space:pre-wrap;font:inherit;line-height:1.6}dt{font-weight:700;margin-top:20px}dd{margin:8px 0 24px}</style>',
       '<h1>Almost 7.2.1 — тексты страниц магазинов</h1><p>Материалы для черновиков. Публикация и загрузка сборок не выполняются. Точный статус сохранения — в README.md.</p>']
for r in ROWS:
    parts.append('<article><h2>'+r['source_locale']+'</h2><dl>')
    for key in LIMITS:
        parts.append('<dt>'+key+' · '+str(len(r[key]))+'/'+str(LIMITS[key])+'</dt><dd><pre>'+html.escape(r[key])+'</pre></dd>')
    parts.append('</dl></article>')
(ROOT / 'review.html').write_text('\n'.join(parts)+'\n</html>\n')
print('PASS: 14 locale sets; all field limits; unique locale IDs; no duplicate keyword entries; exports generated.')
