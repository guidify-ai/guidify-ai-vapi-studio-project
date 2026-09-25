#!/usr/bin/env node
/**
 * Force a new project identity (name/slug/uuid).
 * Usage:
 *   yarn mint-identity --name "My Bot" --slug my-bot
 *   yarn mint-identity            # new UUID; keep current name/slug
 *
 * For first-clone auto-mint (placeholder only), use postinstall /
 * yarn ensure-project-uuid instead.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const identityPath = path.join(root, 'config', 'project.identity.json');
const envPath = path.join(root, '.env');
const pkgPath = path.join(root, 'package.json');

function flag(name) {
  const args = process.argv.slice(2);
  const i = args.indexOf(name);
  if (i < 0) return null;
  return args[i + 1] ?? '';
}

function slugify(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
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

const existing = fs.existsSync(identityPath)
  ? JSON.parse(fs.readFileSync(identityPath, 'utf8'))
  : { slug: 'my-studio-app', name: 'My Studio App' };

const name = String(flag('--name') || existing.name || 'My Studio App').trim();
const slug = String(flag('--slug') || existing.slug || slugify(name)).trim();
const uuid = crypto.randomUUID();

const identity = { id: uuid, slug, name };
fs.mkdirSync(path.dirname(identityPath), { recursive: true });
fs.writeFileSync(identityPath, `${JSON.stringify(identity, null, 2)}\n`);

upsertEnv(envPath, 'PROJECT_UUID', uuid);

if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.name = slug;
  pkg.description = `${name} — Vapi Studio app`;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

console.log('Wrote config/project.identity.json');
console.log(`  name: ${name}`);
console.log(`  slug: ${slug}`);
console.log(`  uuid: ${uuid}`);
console.log('Do not rotate this UUID after wiring Vapi assistants.');
console.log('(.env.example stays on the template placeholder — only .env is updated.)');
