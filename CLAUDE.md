# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Nuxt 4 SPA for a D&D dungeon master to run a second-screen NPC display during a session. No backend — all state
lives in the browser's `localStorage`, keyed under the `dm-presenter:` prefix, and syncs live across tabs/windows
(e.g. the `/present` display tab) via the native `storage` event.

## Commands

```bash
pnpm install    # setup
pnpm dev        # dev server on localhost:3000
pnpm lint       # eslint .
pnpm typecheck  # nuxt typecheck (vue-tsc)
pnpm build      # nuxt build
pnpm generate   # static site generation (used for GitHub Pages deploy)
pnpm preview    # preview production build locally
```

No test suite exists in this repo. Always run `pnpm lint` and `pnpm typecheck` after changes.

## Architecture

### Pages

- `/` (`index.vue`) — grid of NPCs (rows) × players (columns) tracking points per NPC/player pair. Drives NPC
  away/introduced flags, which the `/present` tab reflects live.
- `/admin` — manage players (name only).
- `/present` — full-screen, cross-window display of NPCs currently not "away"; reads the same localStorage state as
  `/`, so toggling flags on `/` updates `/present` live even in a separate window.

### State: Pinia stores + persistence

Every store in `app/stores/` is a Pinia setup store persisted via `pinia-plugin-persistedstate`, each under its own
`dm-presenter:<name>` localStorage key with a custom `serializer` (serialize/deserialize pair) rather than the
default JSON dump — this lets each store validate/repair its own shape on read (see `isStoredNpcArray`,
`isDisplayState`, etc.) and migrate old records by filling in defaults for fields added later (e.g. `npcs.ts`
backfilling `away`/`introduced`/`seen`). When adding a persisted field to a store, follow this pattern: write a type
guard, default missing fields on deserialize, and keep `serialize` minimal (don't dump full Pinia internal state).

Shared validation/id helpers live in `app/utils/localList.ts` (`isRecord`, `slugify`, `uniqueId`,
`fieldPersistence`) — reuse these instead of rewriting per-store guards.

Cross-tab sync (`app/plugins/storage-sync.client.ts`) listens for the native `storage` event and calls `$hydrate()`
on every Pinia store, since `pinia-plugin-persistedstate` doesn't do this automatically — this is what makes `/`
and `/present` (or two `/` tabs) stay in sync without a backend. `useHydrationStore` tracks whether initial
hydration has completed, to avoid rendering stale/default state before localStorage is read.

### Backup/restore

`app/composables/useStateBackup.ts` exports/imports the entire app state as a zip (via `fflate`): it walks every
`dm-presenter:*` localStorage key into `state.json`, and separately extracts any NPC images that are `data:` URIs
into `images/<id>.<ext>` files in the zip (keeping the JSON small); import reverses this, decoding zip images back
to data URIs, replaces all `dm-presenter:*` keys, and reloads the page. The Leonardo API key
(`LEONARDO_API_KEY_STORAGE_KEY`) is deliberately excluded from both export and the wipe/restore, since it's a
per-machine secret, not session data.

### NPC images

`app/utils/imageToWebp.ts` and `app/utils/leonardoImageGenerator.ts` handle getting an NPC portrait: either
converting an uploaded image to webp, or generating one via the Leonardo AI API (key stored client-side via
`useLeonardoApiKey`, entered through `AiImageGeneratorModal.vue`).

### Static hosting

Deployed to GitHub Pages (`nuxt generate`), with prerendered routes explicitly listed in `nitro.prerender.routes`
in `nuxt.config.ts` — add new top-level pages there. `app.baseURL` is driven by `NUXT_APP_BASE_URL` for the Pages
subpath.
