#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0');
const forbidden = tracked.filter(file =>
  /(^|\/)keystore\.properties$/.test(file) ||
  (/\.(keystore|jks|p8|p12)$/.test(file) && file !== 'android/app/debug.keystore') ||
  /(^|\/)\.env($|\.(?!example$))/.test(file));
if (forbidden.length) throw new Error(`Private signing/environment files are tracked: ${forbidden.join(', ')}`);
console.log('[OK] Private signing keys, signing passwords, and environment files are excluded from Git.');
