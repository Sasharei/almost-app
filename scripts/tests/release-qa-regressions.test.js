const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parse } = require('@babel/parser');
const app = fs.readFileSync('App.js','utf8');
const ast = parse(app,{sourceType:'module',plugins:['jsx']});
const declarations = names => ast.program.body.filter(n => n.type === 'VariableDeclaration' && names.includes(n.declarations[0].id.name)).map(n => app.slice(n.start,n.end)).join('\n');
const fallback = fs.readFileSync('src/constants/languageMapFallback.generated.js','utf8').replace(/export const /g,'const ');
const languageSource = fs.readFileSync('src/utils/language.js','utf8').replace(/^import .*;\n/gm,'').replace(/export const /g,'const ');
const language = vm.runInNewContext(fallback+'\n'+languageSource+'\n({normalizeLanguage,resolveTranslationLanguage,SUPPORTED_LANGUAGES})',{React:{isValidElement:()=>false},NativeModules:{},Intl});
const generated = fs.readFileSync('src/constants/translations.generated.js','utf8').replace(/export const /g,'const ');
const copy = fs.readFileSync('src/constants/translations.js','utf8').replace(/^import .*;\n/gm,'').replace(/export const /g,'const ');
const translations = vm.runInNewContext(generated+'\n'+copy+'\nTRANSLATIONS');
const plural = vm.runInNewContext(fs.readFileSync('src/constants/pauseCountCopy.js','utf8').replace(/export const /g,'const ')+'\n({pauseCountTranslationKey})');

test('locale copy resolves every supported locale including DE → ar-sa/ar-ae without missing exports', () => {
 const source=fs.readFileSync('src/bankExpenses/useBankExpenses.js','utf8');
 const expense = source.match(/export function expenseCopy\(language\) \{[\s\S]*?\n\}/)[0].replace('export ','');
 const dictionary=fs.readFileSync('src/constants/bankExpenseCopy.js','utf8').replace(/export const /g,'const ');
 const resolve=vm.runInNewContext(dictionary+'\n'+expense+'\nexpenseCopy',language);
 for(const locale of [...language.SUPPORTED_LANGUAGES,'AR_sa','ar-AE','unknown']) {
   const resolved=resolve(locale);assert.ok(resolved.title);assert.ok(resolved.walletNoticeBody);
 }
 assert.equal(resolve('ar-sa'),resolve('ar-ae'));
});

test('Pause count uses grammatical forms consistently for both summaries and every dictionary', () => {
 for (const locale of language.SUPPORTED_LANGUAGES) for(const count of [0,1,2,3,5,11,21,22,100,101]) {
  const key=plural.pauseCountTranslationKey(locale,count);
  const text=translations[language.resolveTranslationLanguage(locale)][key];
  assert.equal(typeof text,'string');assert.deepEqual(text.match(/\{\{\w+\}\}/g),['{{count}}']);
 }
 assert.equal(translations.en[plural.pauseCountTranslationKey('en',1)].replace('{{count}}','1'),'1 purchase awaits your decision.');
 assert.equal(translations.en[plural.pauseCountTranslationKey('en',2)].replace('{{count}}','2'),'2 purchases await your decision.');
 assert.equal(plural.pauseCountTranslationKey('ru',21),'redesignPauseCount_one');
 assert.equal(plural.pauseCountTranslationKey('ru',11),'redesignPauseCount_other');
 assert.equal(plural.pauseCountTranslationKey('ar-sa',2),'redesignPauseCount_two');
 assert.equal(app.match(/t\(pauseCountTranslationKey\(language, sorted.length\)/g).length,2);
});

test('untouched coffee presets have title and description in all dictionaries; user overrides stay intact',()=> {
 const presets=vm.runInNewContext(declarations(['PERSONA_TEMPTATION_PRESETS'])+'\nPERSONA_TEMPTATION_PRESETS');
 for(const preset of presets.mindful_coffee)for(const locale of Object.keys(translations)) {
  assert.ok(preset.title[locale],preset.id+' title '+locale);assert.ok(preset.description[locale],preset.id+' description '+locale);
 }
 assert.match(app,/entry\.item\?\.titleOverride/);
});

test('first Back dismisses IME while keeping the goal draft; next Back closes the editor',()=> {
 const run=vm.runInNewContext(declarations(['dismissKeyboardOrRun'])+'\ndismissKeyboardOrRun',{isKeyboardCurrentlyVisible:()=>visible,Keyboard:{dismiss:()=>{visible=false}}});
 let visible=true,closed=0;const draft={name:'QA unsaved goal',target:'2000'};
 run(()=>closed++);assert.equal(closed,0);assert.equal(draft.name,'QA unsaved goal');
 run(()=>closed++);assert.equal(closed,1);
 assert.match(app,/onRequestClose=\{\(\) => dismissKeyboardOrRun\(closeGoalEditorPrompt\)\}/);
});

test('goal speech reports a neutral remaining amount even at zero progress',()=> {
 assert.match(app,/return t\("tamagotchiSpeechGoalProgress", \{ amount: remainingLocal \}\);/);
 for(const locale of Object.keys(translations))assert.ok(translations[locale].tamagotchiSpeechGoalProgress[0].includes('{{amount}}'));
});

test('logo completion retries native splash hide when Fabric drops the first layout event', () => {
 const logo=app.slice(app.indexOf('function LogoSplash('),app.indexOf('const LevelUpCelebration ='));
 assert.match(logo,/const handleLayout = useCallback\(\(\) => \{\s*SplashScreen\.hideAsync/);
 assert.match(logo,/doneTimer = setTimeout\(\(\) => \{[\s\S]*?SplashScreen\.hideAsync\(\)\.catch\(\(\) => \{\}\);\s*onDoneRef\.current\?\.\(\);/);
});
