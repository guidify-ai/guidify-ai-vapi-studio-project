# Vapi Studio Project

**Public starter NestJS app** for [**@guidify-ai/vapi-studio**](https://www.npmjs.com/package/@guidify-ai/vapi-studio) — the same role [laravel/laravel](https://github.com/laravel/laravel) plays for Laravel.

This repository is **not** the framework. Clone it (or copy it), mint your project UUID, then build your conversation graph. Agents get Cursor/Claude rules and `AGENTS.md` out of the box.

| | |
| --- | --- |
| Framework | [guidify-ai/vapi-studio](https://github.com/guidify-ai/vapi-studio) · `@guidify-ai/vapi-studio@0.1.0` |
| Showcase | [vapi-studio-landing-page-sample-model](https://github.com/guidify-ai/vapi-studio-landing-page-sample-model) |
| Website | [vapi-studio.guidify.ca](https://vapi-studio.guidify.ca) |

## Create a new bot

```bash
# A — clone this starter (recommended)
git clone git@github.com:guidify-ai/vapi-studio-project.git my-bot
cd my-bot
yarn install
# postinstall → ensure-project-uuid mints a unique PROJECT_UUID into
# config/project.identity.json + .env (template uses a placeholder only)
# Optional rename:
# yarn mint-identity --name "My Bot" --slug my-bot
yarn start   # Docker Postgres + app + ngrok → prints Vapi URLs

# B — from a framework clone
cd /path/to/vapi-studio
yarn new-project --name "My Bot" --slug my-bot -y
```

After `yarn install`, postinstall also refreshes `.cursor/rules/`, `.claude/rules/`, `AGENTS.md`, and `CLAUDE.md` from the package (when `@guidify-ai/vapi-studio` is installed).

## What you get

```text
guidify-ai-vapi-studio-project/
├── .cursor/rules/          # best-practices + UI↔API identity (AI)
├── .claude/rules/          # same doctrine for Claude Code
├── AGENTS.md / CLAUDE.md   # stamped pointers into node_modules handbook
├── config/
│   ├── project.identity.example.json  # template placeholder (committed)
│   ├── project.identity.json          # minted locally (gitignored)
│   └── flow.yaml                      # greet → goodbye (+ portal goodbye)
├── src/
│   ├── main.ts / app.module.ts
│   ├── project/                # identity load, seed, UUID guard
│   ├── conversation/           # entry + agent steps (extend here)
│   ├── vapi/                   # webhook + Custom LLM SSE (wire / extend)
│   ├── brain/                  # adapter switch (mock by default)
│   ├── shadows/                # optional private overlays (gitignored pattern)
│   └── health/
├── scripts/start.sh            # Docker + ngrok
├── docker-compose.stub.yaml    # Postgres + app (promoted on first start)
└── Dockerfile
```

**Northern stars** (conversation design), not flow dumps — see `docs/best-practices` inside the installed package.

## Vapi endpoints

| Setting | URL |
| --- | --- |
| Webhook | `{PUBLIC_BASE_URL}/{PROJECT_UUID}/vapi/webhook` |
| Custom LLM | `{PUBLIC_BASE_URL}/{PROJECT_UUID}/vapi/chat/completions` |

`PROJECT_UUID` comes from `config/project.identity.json` (mirrored into `.env` by `yarn start`).

## Local framework spoof (next package versions)

```bash
# package.json
"@guidify-ai/vapi-studio": "file:../vapi-studio"

# docker / make (platform)
VAPI_STUDIO_CONTEXT=../vapi-studio docker compose build
```

Platform Makefile under Guidify’s private `guidify-ai/` folder: `make spoof-studio`.

## Docs

- [Creating an app](https://github.com/guidify-ai/vapi-studio/blob/master/docs/building-apps/creating-an-app.md)
- [Runtime API](https://github.com/guidify-ai/vapi-studio/blob/master/docs/reference/runtime-api.md)
- [Best practices](https://github.com/guidify-ai/vapi-studio/blob/master/docs/best-practices/README.md)

## License

MIT — see [LICENSE](./LICENSE).
