import fs from 'node:fs';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(crypto.scrypt);
const TTL = 8 * 60 * 60 * 1000;
export const adminConfigPath = (databasePath) => `${databasePath}.admin.json`;
export const createAdminCredentials = async (password) => {
  if (
    typeof password !== 'string' ||
    password.length < 8 ||
    password.length > 256
  )
    throw new Error('password_length');
  const salt = crypto.randomBytes(32).toString('hex');
  return {
    salt,
    hash: (await scrypt(password, salt, 64)).toString('hex'),
    key: crypto.randomBytes(32).toString('hex'),
  };
};
export const readAdminCredentials = (file) => {
  if (!fs.existsSync(file)) return null;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (
    !/^[a-f0-9]{64}$/.test(value.salt) ||
    !/^[a-f0-9]{128}$/.test(value.hash) ||
    !/^[a-f0-9]{64}$/.test(value.key)
  )
    throw new Error('admin_config_invalid');
  return value;
};
export const checkAdminPassword = async (password, credentials) => {
  if (!credentials || typeof password !== 'string' || password.length > 256)
    return false;
  const value = await scrypt(password, credentials.salt, 64);
  return crypto.timingSafeEqual(value, Buffer.from(credentials.hash, 'hex'));
};
const mac = (key, value) =>
  crypto.createHmac('sha256', key).update(value).digest('hex');
export const issueAdminSession = (credentials, now = Date.now()) => {
  const body = `${now + TTL}.${crypto.randomBytes(32).toString('hex')}`;
  return `${body}.${mac(credentials.key, body)}`;
};
export const verifyAdminSession = (token, credentials, now = Date.now()) => {
  if (
    !credentials ||
    typeof token !== 'string' ||
    !/^\d{13}\.[a-f0-9]{64}\.[a-f0-9]{64}$/.test(token)
  )
    return false;
  const [expiry, nonce, signature] = token.split('.');
  if (+expiry <= now || +expiry > now + TTL) return false;
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(mac(credentials.key, `${expiry}.${nonce}`), 'hex'),
  );
};
export const adminCsrf = (token, credentials) =>
  mac(credentials.key, `csrf:${token}`);
