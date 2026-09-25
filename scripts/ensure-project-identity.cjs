#!/usr/bin/env node
/**
 * Sync config/project.identity.json from .env (PROJECT_NAME / PROJECT_SLUG).
 *
 * Project UUID is NOT minted here — vapi-studio-tenants owns SaaS project UUIDs.
 * This file only carries human identity: name + slug (slug defaults from name).
 *
 * Wired as yarn postinstall / yarn ensure-project-identity.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const identityPath = path.join(root, 'config', 'project.identity.json');
const examplePath = path.join(root, 'config', 'project.identity.example.json');
const envPath = path.join(root, '.env');
const envExamplePath = path.join(root, '.env.example');

function slugify(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

function parseEnv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith('#') || !s.includes('=')) continue;
    const i = s.indexOf('=');
    out[s.slice(0, i).trim()] = s.slice(i + 1).trim();
  }
  return out;
}

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

function seedEnvFile() {
  if (fs.existsSync(envPath)) return;
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
  }
}

function main() {
  seedEnvFile();
  const env = parseEnv(envPath);
  const example = fs.existsSync(examplePath)
    ? JSON.parse(fs.readFileSync(examplePath, 'utf8'))
    : { name: 'Vapi Studio Project', slug: 'vapi-studio-project' };

  const name = String(env.PROJECT_NAME || example.name || 'Vapi Studio Project').trim();
  if (!name) {
    throw new Error('PROJECT_NAME is required in .env (human project title)');
  }
  const slug = String(env.PROJECT_SLUG || example.slug || slugify(name)).trim() || slugify(name);

  const identity = { name, slug };
  // Drop legacy `id` if a prior mint left it on disk.
  fs.mkdirSync(path.dirname(identityPath), { recursive: true });
  fs.writeFileSync(identityPath, `${JSON.stringify(identity, null, 2)}\n`);

  upsertEnv(envPath, 'PROJECT_NAME', name);
  upsertEnv(envPath, 'PROJECT_SLUG', slug);

  console.log('[ensure-project-identity] synced from .env');
  console.log(`  name: ${name}`);
  console.log(`  slug: ${slug}`);
  console.log('  (one fork = one host — Vapi paths are /vapi/... with no project UUID)');
}

main();
