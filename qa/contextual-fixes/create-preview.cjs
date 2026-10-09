/* global __dirname */
// Create an isolated native component fixture; this command never launches a simulator.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
fs.writeFileSync(path.join(root, '.codex_tmp_contextual_app.js'), fs.readFileSync(path.join(root, 'App.js'), 'utf8') + '\nexport { RedesignTodayHeader, HomeSubscriptionWidgetCard, resolveThemeColors };\n');
fs.copyFileSync(path.join(__dirname, 'preview-entry.fixture'), path.join(root, '.codex_tmp_contextual_entry.js'));
console.log('Created .codex_tmp_contextual_entry.js. Use a QA-only AppDelegate bundle root; restore it and remove temporary files after review.');
