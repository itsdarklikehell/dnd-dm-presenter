# IndexedDB images + high-resolution location maps

## Problem

Location maps are stored at `maxDimension: 1024` (`app/components/LocationsGallery.vue:30`) but the
display zooms to `MAX_SCALE = 8` (`app/components/LocationFogCanvas.vue:18`), so deep zoom shows an 8x
upscale of a small image. Raising the resolution is impossible while images are base64 `data:` URIs in
`localStorage`: the budget is ~5MB (`app/stores/storageUsage.ts:1`) and base64 adds ~33% overhead, so
two high-resolution maps would exhaust it.

## Decision

Move **all** images (NPC portraits, items, location maps) out of `localStorage` into IndexedDB as
`Blob`s — native binary, no base64 tax, hundreds of MB of quota. Stores keep an `image: string` field
whose value becomes an `idb:<uuid>` reference. Zoom ceiling stays at 8x.

## Phases

| # | Plan | Scope |
|---|---|---|
| 1 | [1-idb-layer.md](1-idb-layer.md) | IndexedDB store, ref format, resolver composable, `StoredImage`, Blob encoder. No behaviour change. |
| 2 | [2-store-migration.md](2-store-migration.md) | Stores hold refs; existing data URIs migrate on boot; blob deletion + orphan sweep. |
| 3 | [3-components.md](3-components.md) | Uploads and Leonardo write blobs; all consumers render refs. |
| 4 | [4-backup-wipe-usage.md](4-backup-wipe-usage.md) | Backup zip carries blobs, clear-all wipes them, storage meter uses `storage.estimate()`. |
| 5 | [5-high-res-locations.md](5-high-res-locations.md) | Location maps encode at 4096px / q0.85. |

Phase 4 is **not** optional polish — after phase 3 the existing export finds no `data:` URIs to extract,
so backups would carry refs without bytes. Phases 3 and 4 must land together or in immediate succession.

## Before starting

Export a backup zip from the current build. It is the only rollback path once phase 2 rewrites
`localStorage` with refs.
