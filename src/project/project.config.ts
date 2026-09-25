import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface ProjectIdentity {
  id: string;
  slug: string;
  name: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let cached: ProjectIdentity | null = null;

/** Canonical identity from config/project.identity.json — never generate at runtime. */
export function loadProjectIdentity(configDir?: string): ProjectIdentity {
  if (cached) return cached;
  const dir = configDir ?? process.env.CONFIG_DIR ?? join(process.cwd(), 'config');
  const path = join(dir, 'project.identity.json');
  if (!existsSync(path)) {
    throw new Error('Missing ' + path + ' — run yarn new-project or restore the identity file.');
  }
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<ProjectIdentity>;
  const id = String(raw.id ?? '').trim().toLowerCase();
  const slug = String(raw.slug ?? '').trim();
  const name = String(raw.name ?? '').trim();
  if (!UUID_RE.test(id)) throw new Error('project.identity.json id must be a UUID');
  if (!slug || !name) throw new Error('project.identity.json needs slug and name');
  cached = { id, slug, name };
  return cached;
}

export function resolveProjectUuid(): string {
  return loadProjectIdentity().id;
}

export function projectVapiBasePath(projectUuid = resolveProjectUuid()): string {
  return '/' + projectUuid + '/vapi';
}

export function projectWebhookUrl(publicBaseUrl: string, projectUuid = resolveProjectUuid()): string {
  return publicBaseUrl.replace(/\/$/, '') + projectVapiBasePath(projectUuid) + '/webhook';
}

export function projectChatCompletionsUrl(
  publicBaseUrl: string,
  projectUuid = resolveProjectUuid(),
  moduleId?: string | null,
): string {
  const root = publicBaseUrl.replace(/\/$/, '') + projectVapiBasePath(projectUuid);
  if (moduleId?.trim()) return root + '/' + moduleId.trim() + '/chat/completions';
  return root + '/chat/completions';
}
