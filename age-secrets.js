#!/usr/bin/env node
/**
 * Age Encryption Helper
 * Wrapper for reading/writing age-encrypted secrets.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SECRETS_DIR = process.env.AGE_SECRETS_DIR || path.join(process.env.HOME, '.secrets');

function getAgeKey() {
  if (process.env.AGE_KEY) return process.env.AGE_KEY;
  const keyFile = process.env.AGE_KEY_FILE || path.join(process.env.HOME, '.secrets', 'age-key.txt');
  if (!fs.existsSync(keyFile)) throw new Error(`Age key not found at ${keyFile}`);
  return fs.readFileSync(keyFile, 'utf8').trim();
}

function readSecret(filename) {
  const filepath = path.join(SECRETS_DIR, filename);
  if (!fs.existsSync(filepath)) throw new Error(`Secret file not found: ${filepath}`);
  const ageKey = getAgeKey();
  try {
    const decrypted = execSync(`echo "${ageKey}" | age -d -i - "${filepath}"`, { encoding: 'utf8', shell: '/bin/bash' });
    try { return JSON.parse(decrypted); } catch { return decrypted; }
  } catch (err) {
    throw new Error(`Failed to decrypt ${filename}: ${err.message}`);
  }
}

function writeSecret(filename, data) {
  const filepath = path.join(SECRETS_DIR, filename);
  if (!fs.existsSync(SECRETS_DIR)) fs.mkdirSync(SECRETS_DIR, { recursive: true, mode: 0o700 });
  const ageKey = getAgeKey();
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  try {
    const pubKey = execSync(`echo "${ageKey}" | age-keygen -y`, { encoding: 'utf8', shell: '/bin/bash' }).trim();
    const encrypted = execSync(`echo "${content}" | age -r ${pubKey}`, { encoding: 'utf8', shell: '/bin/bash' });
    fs.writeFileSync(filepath, encrypted, { mode: 0o600 });
    return filepath;
  } catch (err) {
    throw new Error(`Failed to encrypt ${filename}: ${err.message}`);
  }
}

module.exports = { readSecret, writeSecret };
