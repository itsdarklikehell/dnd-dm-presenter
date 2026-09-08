# Phase 1 — IndexedDB blob layer + Blob-producing encoder

## Goal

Introduce an IndexedDB-backed image blob store and an image-reference format, plus a resolver composable
and a render component. Nothing consumes it yet — this phase adds infrastructure only, so it is safe to
land on its own.

## Why

Images are currently base64 `data:` URIs inside `localStorage` (~5MB ceiling, tracked in
`app/stores/storageUsage.ts:1`). Base64 adds ~33% overhead on top of an already tight budget, which caps
location maps at 1024px (`app/components/LocationsGallery.vue:30`) while `MAX_SCALE = 8`
(`app/components/LocationFogCanvas.vue:18`) lets the DM zoom 8x into them. IndexedDB stores `Blob`s
natively (no base64 tax) with a quota in the hundreds of MB, which is what makes high-resolution
locations possible at all.

## Files

### New — `app/utils/imageRef.ts`

The persisted `image` field on NPCs, items and locations stays `string`, so every existing type guard
keeps working. Its value becomes a reference instead of a data URI.

```ts
const IMAGE_REF_PREFIX = 'idb:'

export function imageRefFor(id: string): string      // `idb:${id}`
export function isImageRef(value: string): boolean    // startsWith prefix
export function imageIdFromRef(ref: string): string   // strip prefix
export function isLegacyDataUri(value: string): boolean // startsWith 'data:'
```

Keeping `image: string` (rather than a discriminated union) means phase 2's migration can leave legacy
`data:` URIs in place and still render them — old and new coexist during rollout.

### New — `app/utils/imageBlobStore.ts`

Thin promise wrapper over raw IndexedDB (no new dependency; `idb` is not worth it for one object store).

- DB `dm-presenter`, version 1, object store `images`, out-of-line string keys (the image id).
- `putImageBlob(blob: Blob): Promise<string>` — generates `crypto.randomUUID()`, stores, returns the
  **ref** (not the bare id) so callers never build refs by hand.
- `putImageBlobAtRef(ref: string, blob: Blob): Promise<void>` — for backup restore, where the ref in
  `state.json` must be preserved.
- `getImageBlob(ref: string): Promise<Blob | null>`
- `deleteImageBlob(ref: string): Promise<void>`
- `listImageRefs(): Promise<string[]>` — used by backup export and orphan cleanup.
- `clearImageBlobs(): Promise<void>` — used by clear-state and import.

Open the DB once per page (module-level cached promise). Guard on `import.meta.client` /
`typeof indexedDB` so SSG prerender does not touch it.

### New — `app/composables/useImageSource.ts`

Resolves a ref to something an `<img>` can render, with a module-level object-URL cache so the same NPC
portrait shown in the grid, the view modal and `/present` creates one object URL, not three.

```ts
export function useImageSource(image: MaybeRefOrGetter<string>): Ref<string>
export async function loadImageBlob(image: string): Promise<Blob | null>
```

- Cache shape: `Map<string, { url: string, refCount: number }>`.
- Resolution rules: empty string → `''`; `data:` or `http` → passthrough (legacy + Leonardo preview);
  `idb:` → `getImageBlob` then `URL.createObjectURL`.
- Watch the input; on change release the previous ref (decrement, revoke at zero) and acquire the new one.
- `onScopeDispose` releases, so unmounting a component frees its object URLs.
- `loadImageBlob` is the non-render path — phase 3 uses it for Leonardo image-to-image (which needs
  base64) and phase 4 for the backup zip.

### New — `app/components/StoredImage.vue`

```vue
<script setup lang="ts">
const props = defineProps<{ image: string, alt?: string }>()
const src = useImageSource(() => props.image)
</script>

<template>
  <img v-if="src" :src="src" :alt="alt ?? ''">
</template>
```

A component rather than "call the composable in each parent" because the grids render images inside
`v-for` (`app/components/GalleryGrid.vue:74`, `app/components/NpcGroupSection.vue:151`,
`app/components/PresentView.vue:65`), and composables cannot be called per loop iteration. Classes pass
through via Vue's normal fallthrough attributes, so call sites keep their existing utility classes.

### Changed — `app/utils/imageToWebp.ts`

`convertImageFileToWebp` currently returns a `canvas.toDataURL` string. Add a Blob-returning function
and keep the data-URI one only if a caller still needs it (after phase 3, none do — delete it then).

```ts
export async function convertImageFileToWebpBlob(
  file: File | Blob,
  { maxDimension, quality }: { maxDimension: number, quality: number }
): Promise<Blob>
```

- Use `canvas.toBlob(cb, 'image/webp', quality)` wrapped in a promise; reject when the callback gets
  `null`.
- Make `maxDimension`/`quality` required rather than defaulted, so phase 5's high-resolution location
  setting is an explicit decision at each call site instead of a silent inherited default.

## Verification

- `pnpm lint` and `pnpm typecheck` clean.
- `pnpm dev`, then in the browser console:
  ```js
  const blob = await (await fetch('/favicon.ico')).blob()
  // exercise the store through the app's own module graph via a temporary
  // `onMounted(async () => { ... })` probe in app.vue, or via a scratch page
  ```
  Preferred check without console plumbing: add a temporary `onMounted` block in `app/app.vue` that
  puts a fetched blob, reads it back, logs `ref` and `blob.size`, lists refs, deletes, lists again.
  Confirm the round-trip logs a non-zero size and an empty list after delete. **Remove the probe before
  committing.**
- DevTools → Application → IndexedDB → `dm-presenter` → `images` shows the record during the probe and
  no records after it.
- No visual change anywhere in the app — this phase wires nothing up.

## Commit

`feat: add IndexedDB image blob store and reference resolver`
