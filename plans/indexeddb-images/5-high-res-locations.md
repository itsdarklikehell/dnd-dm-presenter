# Phase 5 — High-resolution location maps

## Goal

Store location maps at a resolution that survives the existing 8x zoom, now that IndexedDB makes the
bytes affordable. This is the phase the whole migration exists for.

## Why

`MAX_SCALE = 8` (`app/components/LocationFogCanvas.vue:18`) against a 1024px source means the DM zooms
into an 8x upscale of a small image. Keeping the 8x ceiling was an explicit decision, so the source has
to carry the pixels instead.

## Choosing the resolution

The map renders `object-contain` inside the display area, so on a 2560px-wide screen the 1x render is
roughly 2560px wide and 8x asks for ~20480px. Matching that exactly is not worth it — a 4096px source
gives a genuinely sharp image up to ~1.6x on that screen and degrades gracefully past it, at a file size
that is now affordable.

`LOCATION_IMAGE_ENCODING = { maxDimension: 4096, quality: 0.85 }` in `app/utils/imageToWebp.ts`,
alongside `PORTRAIT_IMAGE_ENCODING` from phase 3.

Expect roughly 1.5–4MB per map (webp, photographic map art). Ten maps is ~20–40MB — a non-issue for
IndexedDB, and impossible under the old localStorage scheme, which is worth stating in the commit body.

## Files

### Changed — `app/utils/imageToWebp.ts`

Add the exported `LOCATION_IMAGE_ENCODING` constant. Also confirm the canvas resize path handles large
sources: `maxDimension: 4096` with a 6000px input downscales in one `drawImage` step, which is fine for
quality at these ratios; no multi-step downscale needed.

### Changed — `app/components/LocationsGallery.vue:30`

Pass `LOCATION_IMAGE_ENCODING` instead of the portrait constant that phase 3 left in place.

### Changed — `app/components/GalleryGrid.vue:74`

The locations grid renders each map into a small `aspect-square` cell. Feeding a 4096px blob into a
~200px thumbnail is wasteful on decode and memory once a session has a dozen maps.

Minimum: add `decoding="async"` and `loading="lazy"` to `StoredImage` (from phase 1) so grid decode does
not block interaction.

If the grid feels sluggish with several high-resolution maps, the follow-up is a stored thumbnail —
encode a second small blob at upload time and keep both refs on the `Location` entry. **Do not build
this pre-emptively**; measure the grid first (see verification), and only then decide. It is a schema
change on `Location` and belongs in its own change.

## Deliberately unchanged

- `MAX_SCALE` stays 8, per the decision to keep deep zoom available.
- The fog canvas keeps sizing itself to `displaySize` (`resizeCanvas`, `:97-119`), i.e. CSS pixels of
  the on-screen render, not source pixels. Fog rects are stored in normalised 0–1 coordinates
  (`:83-86`), so nothing about fog depends on source resolution and higher-resolution maps need no fog
  changes at all.
- Existing locations already stored at 1024px are **not** re-encoded (the pixels are gone). Users who
  want sharp zoom on an existing map must re-upload it. Say this in the commit body.

## Verification

- Upload a large map (≥3000px on its long edge):
  - The IndexedDB record for it is on the order of megabytes, not kilobytes.
  - `localStorage` is unaffected in size (the store only gains a short ref).
- Open it in the location display modal, zoom to 8x and pan into detail: text/features on the map are
  legible where the 1024px version was mush. Compare directly by keeping one old 1024px location around.
- `/present` in a second window shows the same location at the same zoom/pan, sharp.
- Draw fog reveal rectangles while zoomed to 4x+ — rect placement still lands where the pointer is
  (guards against a coordinate regression from the resolution change).
- Grid performance: with ~8 high-resolution maps loaded, the locations grid scrolls and reorders without
  visible stalling, and the tab's memory in DevTools → Memory stays reasonable. Record the result — it
  decides whether the thumbnail follow-up is needed.
- `pnpm lint`, `pnpm typecheck`, then `pnpm build` to confirm nothing in the new client-only code breaks
  prerendering.

## Commit

`feat: store location maps at high resolution for sharp zoom`
