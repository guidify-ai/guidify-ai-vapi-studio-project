#!/usr/bin/env node
/**
 * Prefill config/project.identity.json + .env PROJECT_UUID when missing or
 * still the template placeholder. Wired as yarn postinstall.
 *
 * Committed template: config/project.identity.example.json
 * Local (gitignored): config/project.identity.json
 *
 * Force rename + new UUID: yarn mint-identity --name "…" --slug …
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const identityPath = path.join(root, 'config', 'project.identity.json');
const examplePath = path.join(root, 'config', 'project.identity.example.json');
const envPath = path.join(root, '.env');
const envExamplePath = path.join(root, '.env.example');

const PLACEHOLDER_UUID = '00000000-0000-4000-8000-000000000000';
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function upsertEnv(file, key, value) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  let seen = false;
  const out = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      seen = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!seen) out.push(`${key}=${value}`);
  fs.writeFileSync(file, out.join('\n').replace(/\n*$/, '\n'));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function needsMint(id) {
  const raw = String(id ?? '').trim().toLowerCase();
  if (!raw) return true;
  if (raw === PLACEHOLDER_UUID) return true;
  if (!UUID_RE.test(raw)) return true;
  return false;
}

function seedIdentityFile() {
  if (fs.existsSync(identityPath)) return readJson(identityPath);
  if (!fs.existsSync(examplePath)) {
    throw new Error(`Missing ${examplePath}`);
  }
  fs.mkdirSync(path.dirname(identityPath), { recursive: true });
  fs.copyFileSync(examplePath, identityPath);
  return readJson(identityPath);
}

function seedEnvFile() {
  if (fs.existsSync(envPath)) return;
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
  }
}

function main() {
  const force = process.argv.includes('--force');
  const identity = seedIdentityFile();
  const current = String(identity.id ?? '').trim();

  if (!force && !needsMint(current)) {
    seedEnvFile();
    if (fs.existsSync(envPath)) {
      const env = fs.readFileSync(envPath, 'utf8');
      if (!/^PROJECT_UUID=\S+/m.test(env) || new RegExp(`^PROJECT_UUID=${PLACEHOLDER_UUID}$`, 'm').test(env)) {
        upsertEnv(envPath, 'PROJECT_UUID', current);
      }
    }
    console.log(`[ensure-project-uuid] ok — ${current}`);
    return;
  }

  const uuid = crypto.randomUUID();
  const next = {
    id: uuid,
    slug: String(identity.slug || 'guidify-ai-vapi-studio-project').trim(),
    name: String(identity.name || 'Vapi Studio Project').trim(),
  };
  fs.writeFileSync(identityPath, `${JSON.stringify(next, null, 2)}\n`);
  seedEnvFile();
  upsertEnv(envPath, 'PROJECT_UUID', uuid);

  console.log('[ensure-project-uuid] minted PROJECT_UUID');
  console.log(`  id:   ${uuid}`);
  console.log(`  slug: ${next.slug}`);
  console.log('  written: config/project.identity.json (gitignored) + .env');
}

main();
