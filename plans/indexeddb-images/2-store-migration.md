# Phase 2 — Stores hold refs; existing data URIs migrate

## Goal

Make `npcs`, `items` and `locations` treat `image` as a blob reference, migrate every existing `data:`
URI in `localStorage` into IndexedDB on first load, and delete blobs when their owning entry is removed
or its image replaced.

## Why

This is the phase that actually frees the `localStorage` budget, and the one that touches persisted user
data — existing NPC portraits must survive. It is deliberately separate from the render swap (phase 3)
so that after this phase the app still renders correctly through `useImageSource`'s `data:` passthrough
if migration is incomplete, and a failure is recoverable by reverting one commit.

## Files

### New — `app/utils/imageOwnership.ts`

Deleting a blob when its owner disappears has to happen in three stores, so the walk lives in one place.

```ts
export interface ImageOwner { image: string }

export async function releaseImages(entries: ImageOwner[]): Promise<void>
```

Deletes every `idb:` ref in `entries` (ignores legacy `data:` values, which own nothing). Store actions
call it with the entries they are about to drop.

### Changed — `app/stores/npcs.ts`, `app/stores/items.ts`, `app/stores/locations.ts`

Type guards are unchanged (`image` is still `string`). Only deletion changes:

- `removeNpc` / `removeItem` / `removeLocation` — capture the entry before filtering, then
  `void releaseImages([entry])`.
- `updateNpc` / `updateItem` — when the patch carries a different non-empty `image`, release the old ref.
- `toggleAwayForAll`, `reorder*`, flag helpers — untouched.

Fire-and-forget (`void`) rather than making the actions async: the store mutation is synchronous state
the UI depends on, and a failed blob delete is a leaked blob, not a broken app. Orphans are swept below.

### New — `app/plugins/image-migration.client.ts`

Runs after hydration, converts legacy data URIs, then sweeps orphans.

Order of operations:

1. Wait for `useHydrationStore` to report initial hydration complete. This is critical — running before
   `localStorage` is read means walking empty stores, and the orphan sweep would delete every blob.
2. Take a migration lock in `localStorage` under `dm-presenter:image-migration` holding a status object
   (`{ startedAt, completedAt }`). If another tab holds an unfinished lock younger than ~30s, skip both
   migration and the sweep this load. Two tabs opening together is normal for this app (`/` plus
   `/present`), and both migrating the same data URI would write two blobs and have the losing tab's
   store patch overwritten.
3. For each store, for each entry whose `image` `isLegacyDataUri`: decode base64 → `Blob` →
   `putImageBlob` → patch the entry's `image` to the returned ref via the store's own update action
   (`updateNpc` / `updateItem`, and a new `replaceLocationImage(id, image)` in the locations store,
   which currently has no update action).
4. Orphan sweep: `listImageRefs()` minus every ref referenced by the three stores → `deleteImageBlob`.
   This catches blobs orphaned by a crash mid-migration or a lost cross-tab race.
5. Mark the lock completed.

Decoding base64 in the browser: `fetch(dataUri).then(r => r.blob())` is the shortest correct path and
avoids a manual `atob`/`Uint8Array` loop.

Note the migration writes each converted entry back through the store, so
`pinia-plugin-persistedstate` rewrites `localStorage` and the `storage` event syncs the other tab
(`app/plugins/storage-sync.client.ts`). The freed space appears immediately.

## Risks

- **Data loss on a failed conversion.** If `putImageBlob` throws for one entry, leave that entry's
  `data:` URI intact and continue with the rest. Never patch the field before the blob write resolves.
- **Quota rejection.** IndexedDB can reject on a full disk. Catch per entry; an unmigrated entry still
  renders via the passthrough.
- **Migration is one-way.** Reverting the code after migrating leaves stores holding `idb:` refs that
  old code renders as broken images. The recovery path is a backup zip exported *before* upgrading, so
  say so in the phase-4 release note.

## Verification

- Before starting, `pnpm dev` on the current build and export a backup zip (Save to zip in the nav) as
  a rollback artifact.
- With existing NPCs/items/locations in `localStorage`, load `/`:
  - DevTools → Application → Local Storage: `dm-presenter:npcs` no longer contains `data:image`, and the
    nav's storage figure drops sharply.
  - DevTools → Application → IndexedDB → `dm-presenter` → `images`: one record per image.
  - Every portrait and map still renders (via `useImageSource`, already in place from phase 1).
- Reload twice more: no new IndexedDB records appear (migration is idempotent), no console errors.
- Delete an NPC that has a portrait → its `images` record disappears.
- Edit an NPC and upload a replacement portrait (still the old data-URI upload path until phase 3, so
  expect a new `data:` URI here; re-verify after phase 3) → old ref released.
- Open `/` and `/present` in two windows simultaneously with unmigrated data: exactly one migration runs,
  the other tab picks up the refs through the `storage` event, and the `images` count matches the number
  of images.
- `pnpm lint`, `pnpm typecheck`.

## Commit

`feat: migrate stored images to IndexedDB blobs`
