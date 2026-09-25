import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/** Local human identity — one app deploy = one project (name + slug). */
export interface ProjectIdentity {
  slug: string;
  name: string;
}

/**
 * Stable internal DB key for the single local project row.
 * Not used in public URLs — each fork has its own host/port.
 */
export const LOCAL_PROJECT_ID = '00000000-0000-4000-8000-000000000001';

let cached: ProjectIdentity | null = null;

/**
 * Canonical name/slug from config/project.identity.json.
 * Prefer generating that file via `yarn ensure-project-identity` (from .env).
 */
export function loadProjectIdentity(configDir?: string): ProjectIdentity {
  if (cached) return cached;
  const dir = configDir ?? process.env.CONFIG_DIR ?? join(process.cwd(), 'config');
  const path = join(dir, 'project.identity.json');
  if (!existsSync(path)) {
    throw new Error(
      'Missing ' + path + ' — set PROJECT_NAME in .env and run yarn ensure-project-identity',
    );
  }
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<ProjectIdentity>;
  const slug = String(raw.slug ?? '').trim();
  const name = String(raw.name ?? '').trim();
  if (!slug || !name) throw new Error('project.identity.json needs name and slug');
  cached = { slug, name };
  return cached;
}

export function projectVapiBasePath(): string {
  return '/vapi';
}

export function projectWebhookUrl(publicBaseUrl: string): string {
  return publicBaseUrl.replace(/\/$/, '') + projectVapiBasePath() + '/webhook';
}

export function projectChatCompletionsUrl(
  publicBaseUrl: string,
  moduleId?: string | null,
): string {
  const root = publicBaseUrl.replace(/\/$/, '') + projectVapiBasePath();
  if (moduleId?.trim()) return root + '/' + moduleId.trim() + '/chat/completions';
  return root + '/chat/completions';
}
