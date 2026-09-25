# Vapi Studio project starter (Claude)

Same doctrine as `.cursor/rules/vapi-studio-project.mdc`.

- Grow agent steps under `src/conversation/nodes/`; register in `app.module.ts` and `config/flow.yaml`
- Read `node_modules/@guidify-ai/vapi-studio/agent/AGENTS.md` before conversation changes
- Never rotate `config/project.identity.json` `id` after wiring Vapi
- Secrets only in `.env`
