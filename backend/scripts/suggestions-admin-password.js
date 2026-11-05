// Password arrives only through standard input. Never put it in command-line arguments or logs.
import fs from 'node:fs';
import {
  createAdminCredentials,
  adminConfigPath,
} from '../src/auth/suggestionsAdmin.js';
import { suggestionsDatabasePath } from '../src/suggestions.js';
let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
  if (input.length > 258) throw new Error('password_length');
}
const credentials = await createAdminCredentials(input.replace(/\r?\n$/, ''));
const file = adminConfigPath(suggestionsDatabasePath());
const temp = `${file}.${process.pid}.tmp`;
fs.writeFileSync(temp, JSON.stringify(credentials), {
  mode: 0o600,
  flag: 'wx',
});
fs.renameSync(temp, file);
console.log(
  'Owner password configured. Existing admin sessions are now invalid.',
);
