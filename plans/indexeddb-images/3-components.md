# Phase 3 — Uploads write blobs; components render refs

## Goal

Switch every image producer to write a `Blob` into IndexedDB and store the returned ref, and every
image consumer to render through `StoredImage` / `useImageSource`.

## Why

After this phase no new `data:` URI ever enters `localStorage`, so the space saved in phase 2 stays
saved. It also removes the base64 round-trip from the upload path.

## Producers

### `app/components/NpcFormModal.vue:62` and `app/components/ItemFormModal.vue:25`

```ts
form.image = await putImageBlob(await convertImageFileToWebpBlob(file, PORTRAIT_IMAGE_ENCODING))
```

`PORTRAIT_IMAGE_ENCODING = { maxDimension: 1024, quality: 0.8 }` — unchanged from today's defaults;
export it from `app/utils/imageToWebp.ts` so the three call sites share one named constant.

Note both modals hold `form.image` for a pending, possibly-cancelled edit. Writing the blob at upload
time means cancelling the modal leaves an orphan blob. Two options:

- **Chosen:** accept the orphan; the phase-2 boot sweep collects it on next load. Simplest, and the
  modal already behaves this way for its other state.
- Rejected: keep the `Blob` in component state and only write on submit — pushes blob lifetime into two
  more components and complicates the "replace existing image" case.

Also update the preview `<img :src="form.image">` (`NpcFormModal.vue:197`, `ItemFormModal.vue:69`) to
`<StoredImage :image="form.image">`, and the `:disabled="!form.image.trim()"` guards still work since a
ref is a non-empty string.

### `app/components/LocationsGallery.vue:30`

```ts
addLocation(await putImageBlob(await convertImageFileToWebpBlob(file, LOCATION_IMAGE_ENCODING)))
```

`LOCATION_IMAGE_ENCODING` lands in phase 5; use `PORTRAIT_IMAGE_ENCODING` here for now so this phase
changes storage mechanics only, not output quality — that keeps phase 5's "did the resolution actually
improve?" check meaningful.

### `app/utils/leonardoImageGenerator.ts:60`

`generateLeonardoNpcImage` returns `{ image, leonardoImageId }` where `image` is currently a data URI.
Return a ref instead:

```ts
return {
  image: await putImageBlob(await convertImageFileToWebpBlob(await imageResponse.blob(), PORTRAIT_IMAGE_ENCODING)),
  leonardoImageId: generatedImage.id
}
```

The generator util is otherwise transport-only; putting the blob write here (rather than in the modal)
keeps `GeneratedNpcImage.image` meaning the same thing as `Npc.image` everywhere.

### `app/components/AiImageGeneratorModal.vue`

Two spots need real bytes, not a ref:

- `:69` — `{ type: 'BASE64', dataUri: npc.image }` feeds an existing portrait to Leonardo as a style
  reference. Replace with `await loadImageBlob(npc.image)` → base64 data URI (`FileReader.readAsDataURL`
  or `blobToDataUri` helper in `app/utils/imageRef.ts`). Do this when the reference NPC is selected, not
  on every keystroke.
- `:19` — `avatar: { src: npc.image }` for the reference picker, and `:150`
  `<img :src="generatedImage.image">` for the result. The avatar is a Nuxt UI prop, so it needs a
  resolved string rather than `StoredImage`: build the picker items from a resolved map, or drop the
  avatar thumbnail. Resolve refs for the (small) candidate list with `Promise.all` over
  `npcs.filter(npc => npc.image)` and cache in a `ref`.
- `:15` `.filter(npc => npc.image)` still works unchanged.

## Consumers

Swap raw `<img>` for `<StoredImage>`, keeping existing classes (they fall through):

| File | Line | Subject |
|---|---|---|
| `app/components/GalleryGrid.vue` | 74 | items + locations grid |
| `app/components/NpcViewModal.vue` | 27 | NPC detail |
| `app/components/NpcGroupSection.vue` | 151 | NPC row thumbnail |
| `app/components/PresentView.vue` | 65, 122 | `/present` NPC + item |

`NpcGroupSection.vue:177,183` gate the "seen" toggle on `npc.image` being non-empty — a ref is
non-empty, so no change.

### `app/components/LocationFogCanvas.vue`

The component needs a real `src`: `:54` loads the image to read `naturalWidth/naturalHeight` for the
aspect ratio, and `:298` renders it under the fog canvas. Rather than resolving inside it, keep its
`image` prop meaning "a renderable src" and have the two parents resolve — each shows exactly one
location, so a plain composable call works:

- `app/components/LocationDisplayModal.vue:98` — `:image="useImageSource(() => location.image)"`,
  via a `computed`/`const src = useImageSource(...)` in `<script setup>`.
- `app/components/PresentView.vue:94` — same for `activeLocation.image`.

Document the prop's meaning with a one-line comment on the prop block, since it now differs from the
`image` field on the stored entity. This is the one place where "image" means two things, so it earns
the comment.

## Cleanup

Delete `convertImageFileToWebp` (the data-URI version) once no caller remains — `grep -rn
"convertImageFileToWebp" app` should return only `imageToWebp.ts` before deleting.

## Verification

- Upload a new NPC portrait, a new item image and a new location map:
  - `localStorage` values contain `idb:` refs and no `data:image`.
  - One new IndexedDB record per upload.
  - Thumbnails, view modal and `/present` all render.
- Generate an NPC portrait with Leonardo, including using an existing NPC as a style reference — the
  request still sends `BASE64` bytes and the result renders and saves.
- Open `/present` in a second window, toggle an NPC's away flag on `/` → `/present` updates and the
  portrait renders there too (proves object URLs are created per-window, not shared).
- Cancel an NPC form after uploading a portrait, reload → the orphan blob is gone (phase-2 sweep).
- Zoom a location to 8x and pan — behaviour identical to before (still 1024px source; phase 5 fixes the
  blur).
- `pnpm lint`, `pnpm typecheck`.

## Commit

`refactor: read and write images through the blob store`
