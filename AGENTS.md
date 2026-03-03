# Codex Rules TunnelShare

- Keep changes small: max 5 files per task unless I explicitly approve more.
- No refactors or renames unrelated to the current milestone.
- Use strict TypeScript; avoid `any` unless unavoidable (explain if used).
- Validate all API inputs with Zod; never trust client input.
- Keep business logic out of UI: session lifecycle goes in `src/server/*`.
- Env access only through `src/lib/config.ts` (no `process.env` scattered).
- Before claiming done: run `pnpm lint` and ensure `pnpm dev` runs.
- Summarize: what changed, how to test, next step.
- Always use @/ import alias. Never use relative ../../../ paths.