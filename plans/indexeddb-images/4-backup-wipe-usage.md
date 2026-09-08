# Phase 4 — Backup, clear-state and the storage meter

## Goal

Teach backup export/import, clear-all and the nav storage indicator about IndexedDB. Without this phase
the app silently loses images on export and leaks them on wipe.

## Why

`app/composables/useStateBackup.ts` currently extracts images by regexing `data:` URIs out of the NPCs
key only (`:161`) — after phase 3 there are no data URIs to find, so exports would contain refs pointing
at blobs that the zip does not carry, and importing on another machine would produce blank portraits.
This phase is not optional polish; it is the correctness half of the migration.

## Files

### Changed — `app/composables/useStateBackup.ts`

Export becomes generic over "every ref referenced by any store" instead of NPC-specific:

- Drop `readNpcs`, `extractImage`, `base64ToBytes` and the `NPCS_KEY`/`isStoredNpcArray` imports used
  for extraction.
- `exportState` becomes `async`:
  1. `readPrefixedEntries()` as today — `state.json` keeps the refs verbatim, so no JSON rewriting at
     all (a simplification over today's rewrite of `dm-presenter:npcs`).
  2. For each ref from `listImageRefs()`: `getImageBlob` → `new Uint8Array(await blob.arrayBuffer())` →
     `images/<id>.<ext>`, with `<ext>` derived from `blob.type` (reuse `EXT_TO_MIME` inverted, default
     `webp`).
  3. Zip `state.json` + `images/*` exactly as now.

  Exporting all blobs rather than only referenced ones is intentional: `listImageRefs` is the source of
  truth, orphans are swept on boot anyway, and it avoids re-parsing three stores' JSON here.
- `importState`:
  1. Unzip, validate `state.json` as today.
  2. Keep the existing legacy path — an old zip has `images/<npcId>.<ext>` **in the npc's `image`
     field**, so continue rewriting those into data URIs (`:88-105`). The phase-2 migration then moves
     them into IndexedDB on the reload. This is what makes pre-migration backups restorable, so do not
     delete it.
  3. New path: `await clearImageBlobs()`, then for every `images/<id>.<ext>` entry in the zip
     **that was not consumed by the legacy path**, `putImageBlobAtRef(imageRefFor(id), new Blob([bytes],
     { type: mimeForPath(path) }))`. Refs inside `state.json` already match these ids.
  4. `removeSessionDataKeys()`, write keys, `markSaved`, reload — unchanged.
- `clearState` becomes `async`: `await clearImageBlobs()` before `removeSessionDataKeys()`, so a wipe
  does not leave every portrait sitting in IndexedDB forever.

Callers of `exportState` / `clearState` need `await` / `void` — `grep -rn "exportState\|clearState" app`
and update (`AppNav.vue` and whatever hosts `ClearStateModal`).

### Changed — `app/components/ClearStateModal.vue`

The body copy at `:23` lists what is removed. It stays accurate (images are part of "every NPC, item,
location"), but the export-first warning is now more load-bearing because IndexedDB content is not
visible in Local Storage. No wording change required; re-read it and confirm.

### Changed — `app/stores/storageUsage.ts`

The key-length sum stops being meaningful once bytes live in IndexedDB, and the `~5MB` label becomes
actively misleading.

```ts
async function refresh(): Promise<void>
```

- Prefer `navigator.storage.estimate()` → set `usedBytes` from `usage` and a new reactive `limitBytes`
  from `quota`.
- Fall back to the current localStorage sum + `5 * 1024 * 1024` when `estimate` is unavailable
  (Safari/older browsers), so the meter degrades rather than reading zero.
- `limitBytes` changes from a constant to a `ref`, so `app/components/AppNav.vue:31` must destructure it
  via `storeToRefs` alongside `usedBytes`, and `:32`/`:59`/`:61` keep working.

Note `estimate()` reports origin-wide usage with browser-dependent padding, so the number becomes
approximate — the `~` already in the tooltip at `:59` covers this.

## Verification

Round-trip on the same browser:

- Add NPCs, items and a location. Export a zip. Inspect it: `state.json` contains `idb:` refs, and
  `images/` contains one file per image with the matching ids and non-trivial sizes.
- Clear all data → nav storage figure drops to near zero, IndexedDB `images` store is empty, all
  galleries empty.
- Import the zip just exported → every NPC, item and location returns **with its image**, and IndexedDB
  record count matches.

Backward compatibility:

- Import a zip exported from the **pre-migration** build (create one before starting phase 2, per that
  phase's verification): NPC portraits restore, then the boot migration moves them to IndexedDB. Confirm
  `localStorage` ends up free of `data:image`.

Cross-device sanity:

- Export, then import in a fresh browser profile → images render (proves the zip is self-contained and
  not relying on the exporting machine's IndexedDB).

Also `pnpm lint`, `pnpm typecheck`.

## Commit

`feat: include IndexedDB images in backup, wipe and storage usage`
