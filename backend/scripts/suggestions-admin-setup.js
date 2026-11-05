// Run once in an authorized server shell. The private link expires after 30 minutes.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { adminConfigPath } from '../src/auth/suggestionsAdmin.js';
import { suggestionsDatabasePath } from '../src/suggestions.js';
const file = adminConfigPath(suggestionsDatabasePath());
if (fs.existsSync(file))
  throw new Error(
    'Owner already configured. Use the password rotation script for recovery.',
  );
const token = crypto.randomBytes(32).toString('hex');
fs.writeFileSync(
  `${file}.setup`,
  JSON.stringify({
    hash: crypto.createHash('sha256').update(token).digest('hex'),
    expires: Date.now() + 30 * 60 * 1000,
  }),
  { mode: 0o600 },
);
process.stdout.write(
  `https://almost-monetization-backend.onrender.com/admin/suggestions/#setup=${token}\n`,
);
