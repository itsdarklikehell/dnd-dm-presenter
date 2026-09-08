# Phase 2 — Stores hold refs; blobs are released and swept

## Goal

Make `npcs`, `items` and `locations` treat `image` as a blob reference, delete blobs when their owning
entry is removed or its image replaced, and sweep blobs nothing points at any more.

## Why

This is what frees the `localStorage` budget. It deliberately lands before the render swap (phase 3) so
that a failure is one commit to revert.

**No boot-time migration.** Existing data URIs are not converted on load. Users are told to export a
save zip before the update, and the import path (phase 4) converts the legacy images in that zip into
blobs. That trades a one-time manual step for dropping the whole migration machinery: no cross-tab lock,
no status flag in `localStorage`, no partial-migration states to reason about.

## Files

### New — `app/utils/imageOwnership.ts`

Deleting a blob when its owner disappears happens in three stores, so the walk lives in one place.

```ts
export interface ImageOwner {
  image: string
}

export async function releaseImages(entries: ImageOwner[]): Promise<void>
export function replacedImages<T extends { id: string, image: string }>(
  entries: T[],
  id: string,
  nextImage: string | undefined
): ImageOwner[]
```

`releaseImages` deletes every `idb:` ref it is given and ignores anything else, so a leftover data URI
owns nothing and is skipped. `replacedImages` reports the old image of an entry whose image is about to
change, so an edit does not leak the blob it replaces.

### Changed — `app/stores/npcs.ts`, `app/stores/items.ts`, `app/stores/locations.ts`

Type guards are unchanged (`image` is still a `string`). Only deletion changes:

- `removeNpc` / `removeItem` / `removeLocation` — capture the entry before filtering, then
  `void releaseImages(removed)`.
- `updateNpc` / `updateItem` — release the previous image when the patch carries a different one.
- `toggleAwayForAll`, `reorder*` and the flag helpers are untouched.

Fire-and-forget (`void`) rather than making the actions async: the store mutation is synchronous state
the UI depends on, and a failed blob delete leaks a blob rather than breaking the app. The sweep below
is the backstop.

### New — `app/plugins/image-cleanup.client.ts`

On `app:mounted` (so the persisted stores have been read), collect every `idb:` ref held by the three
stores, list the blob store, and delete what is not referenced.

This is not just crash recovery: phase 3 writes a blob as soon as a file is chosen in a form, so
cancelling that form leaves an unreferenced blob, and this is what collects it.

The sweep must never run before the stores are hydrated — on empty stores it would delete every blob.
`app:mounted` fires after `app.vue`'s `onMounted`, which is also where `useHydrationStore` is marked, so
the ordering is the same one the rest of the app gates on.

## Risks

- **Existing data URIs are left in place.** Nothing converts them, so a user who skips the export keeps
  a working app (the phase-1 resolver passes `data:` through) but gets none of the space back, and a
  later export writes those URIs inline in `state.json`. The release note has to say: export first.
- **A blob written but not yet referenced can be swept by another tab's boot.** Uploading in one window
  while opening a second one is the case; the pending image would vanish from the open form. Rare and
  recoverable by re-uploading.

## Verification

- With entries in the stores, load `/`:
  - DevTools → Application → IndexedDB → `dm-presenter` → `images` keeps every referenced blob.
  - No console errors.
- Seed an unreferenced blob by hand into `images`, reload → it is gone, referenced blobs remain.
- Delete an NPC that has a portrait → its `images` record disappears.
- `pnpm lint`, `pnpm typecheck`.

## Commit

`feat: migrate stored images to IndexedDB blobs`
