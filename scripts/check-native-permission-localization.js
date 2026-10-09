const fs = require('node:fs');
const assert = require('node:assert/strict');
const config = JSON.parse(fs.readFileSync('app.json', 'utf8')).expo;
const project = fs.readFileSync('ios/Almost.xcodeproj/project.pbxproj', 'utf8');
const languages = ['en', 'es', 'fr', 'ru', 'de', 'pt', 'it', 'ar', 'zh', 'zh-Hant', 'ko', 'ja'];
for (const language of languages) {
  const path = `src/locales/native/${language}.json`;
  assert.equal(config.locales[language], `./${path}`, `${language}: Expo locale registration`);
  const text = JSON.parse(fs.readFileSync(path, 'utf8')).NSFaceIDUsageDescription;
  assert.ok(text && !text.includes('{{'), `${language}: complete Face ID purpose`);
  const native = fs.readFileSync(`ios/Almost/${language}.lproj/InfoPlist.strings`, 'utf8');
  assert.ok(native.includes(`"NSFaceIDUsageDescription" = ${JSON.stringify(text)};`), `${language}: native purpose matches locale`);
  assert.ok(project.includes(`Almost/${language}.lproj/InfoPlist.strings`), `${language}: resource registered in Xcode`);
}
assert.equal(config.ios.infoPlist.NSFaceIDUsageDescription,
  JSON.parse(fs.readFileSync('src/locales/native/en.json', 'utf8')).NSFaceIDUsageDescription);
assert.ok(fs.readFileSync('ios/Almost/Info.plist', 'utf8').includes('<key>NSFaceIDUsageDescription</key>'));
console.log('[OK] Face ID permission is localized and registered in all 12 supported languages.');
