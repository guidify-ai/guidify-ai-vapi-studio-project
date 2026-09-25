# Vapi Studio Project

**Public starter NestJS app** for [**@guidify-ai/vapi-studio**](https://www.npmjs.com/package/@guidify-ai/vapi-studio). Clone it, set `PROJECT_NAME`, then build your conversation graph. Agents get Cursor/Claude rules and `AGENTS.md` out of the box.

| | |
| --- | --- |
| Framework | [guidify-ai/vapi-studio](https://github.com/guidify-ai/vapi-studio) · `@guidify-ai/vapi-studio@0.1.0` |
| Showcase | [vapi-studio-landing-page-sample-model](https://github.com/guidify-ai/vapi-studio-landing-page-sample-model) |
| Website | [vapi-studio.guidify.ca](https://vapi-studio.guidify.ca) |

## Prerequisites (live voice / outbound)

| Requirement | Notes |
| --- | --- |
| **Vapi access** | Client needs a Vapi org. Set `VAPI_API_KEY` (required — empty in `.env.example` means you must fill it). **Vapi is a paid service** — expect usage / plan charges there as well as on Twilio. |
| **Twilio account** | **Twilio only for now** (Vapi supports more carriers; we will too later). |
| **Trust Hub** | Twilio Trust Hub / voice geo must allow outbound to **+1** destinations. Unverified / trial restrictions often fail with `Account not allowed to call +1…`. |
| **Balance** | Keep money on the Twilio account. Recommend **~$30** with auto-recharge to **$30** when balance hits **~$10** (adjust to taste). |
| **Matching number** | `VAPI_PHONE_NUMBER_ID` is a number **imported in Vapi from that same Twilio account**. Put Twilio API creds in `.env` (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`). |

Copy `.env.example` → `.env` and fill Vapi + Twilio before placing live calls. Local graph / chat can run with empty telephony keys.

## Create a new bot

```bash
git clone git@github.com:guidify-ai/vapi-studio-project.git my-bot
cd my-bot
cp .env.example .env
# Edit PROJECT_NAME=… (PROJECT_SLUG optional — defaults from the name)
# For live voice: VAPI_API_KEY, VAPI_PHONE_NUMBER_ID, TWILIO_* (see Prerequisites)
yarn install
# postinstall → ensure-project-identity writes config/project.identity.json
# from PROJECT_NAME / PROJECT_SLUG (no UUID minted here)
yarn start   # Docker Postgres + app + ngrok
```

Each fork is its own deploy (own host / port / ngrok URL). Vapi routes are host-scoped — no project UUID in the path.

After `yarn install`, postinstall also refreshes `.cursor/rules/`, `.claude/rules/`, `AGENTS.md`, and `CLAUDE.md` from the package (when `@guidify-ai/vapi-studio` is installed).

## What you get

```text
vapi-studio-project/
├── .cursor/rules/          # best-practices + UI↔API identity (AI)
├── .claude/rules/          # same doctrine for Claude Code
├── AGENTS.md / CLAUDE.md   # stamped pointers into node_modules handbook
├── config/
│   ├── project.identity.example.json  # name + slug template (committed)
│   ├── project.identity.json          # synced from .env (gitignored)
│   └── flow.yaml                      # greet → goodbye (+ portal goodbye)
├── src/
│   ├── main.ts / app.module.ts
│   ├── project/                # identity load + seed
│   ├── conversation/           # entry + agent steps (extend here)
│   ├── vapi/                   # webhook + Custom LLM SSE (wire / extend)
│   ├── brain/                  # adapter switch (mock by default)
│   ├── shadows/                # optional private overlays (gitignored pattern)
│   └── health/
├── scripts/start.sh            # Docker + ngrok
├── docker-compose.yaml         # Postgres + app
└── Dockerfile
```

**Northern stars** (conversation design), not flow dumps — see `docs/best-practices` inside the installed package.

## Vapi endpoints

| Setting | URL |
| --- | --- |
| Webhook | `{PUBLIC_BASE_URL}/vapi/webhook` |
| Custom LLM | `{PUBLIC_BASE_URL}/vapi/chat/completions` |

Outbound PSTN: your app asks **Vapi** to dial (`VAPI_API_KEY` + `VAPI_PHONE_NUMBER_ID` + assistant). Vapi uses the **Twilio** account that owns the imported FROM number — that account must match the `TWILIO_*` creds you keep in `.env`.

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
