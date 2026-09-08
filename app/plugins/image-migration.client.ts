const MIGRATION_KEY = 'dm-presenter:image-migration'
const LOCK_TIMEOUT_MS = 30_000

interface MigrationStatus {
  startedAt: string
  completedAt: string | null
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => {
    void runImageMaintenance()
  })
})

async function runImageMaintenance(): Promise<void> {
  const status = readMigrationStatus()

  if (isRunningInAnotherTab(status)) {
    return
  }

  if (!status?.completedAt) {
    const startedAt = new Date().toISOString()

    writeMigrationStatus({ startedAt, completedAt: null })
    await migrateLegacyImages()
    writeMigrationStatus({ startedAt, completedAt: new Date().toISOString() })
  }

  await deleteOrphanedImages()
}

async function migrateLegacyImages(): Promise<void> {
  const npcsStore = useNpcsStore()
  const itemsStore = useItemsStore()
  const locationsStore = useLocationsStore()

  for (const npc of legacyEntries(npcsStore.npcs)) {
    const ref = await storeLegacyImage(npc.image)

    if (ref) {
      npcsStore.updateNpc(npc.id, { image: ref })
    }
  }

  for (const item of legacyEntries(itemsStore.items)) {
    const ref = await storeLegacyImage(item.image)

    if (ref) {
      itemsStore.updateItem(item.id, { name: item.name, image: ref })
    }
  }

  for (const location of legacyEntries(locationsStore.locations)) {
    const ref = await storeLegacyImage(location.image)

    if (ref) {
      locationsStore.replaceLocationImage(location.id, ref)
    }
  }
}

async function deleteOrphanedImages(): Promise<void> {
  const referenced = new Set([
    ...useNpcsStore().npcs,
    ...useItemsStore().items,
    ...useLocationsStore().locations
  ].map(entry => entry.image))

  const orphaned = (await listImageRefs()).filter(ref => !referenced.has(ref))

  await Promise.all(orphaned.map(deleteImageBlob))
}

async function storeLegacyImage(dataUri: string): Promise<string | null> {
  try {
    return await putImageBlob(await (await fetch(dataUri)).blob())
  } catch (error) {
    console.error('Failed to move a stored image into IndexedDB', error)

    return null
  }
}

function legacyEntries<T extends ImageOwner>(entries: T[]): T[] {
  return entries.filter(entry => isLegacyDataUri(entry.image))
}

function isRunningInAnotherTab(status: MigrationStatus | null): boolean {
  return status !== null
    && status.completedAt === null
    && Date.now() - Date.parse(status.startedAt) < LOCK_TIMEOUT_MS
}

function readMigrationStatus(): MigrationStatus | null {
  const raw = window.localStorage.getItem(MIGRATION_KEY)

  if (!raw) {
    return null
  }

  const parsed: unknown = JSON.parse(raw)

  if (!isRecord(parsed) || typeof parsed.startedAt !== 'string') {
    return null
  }

  return { startedAt: parsed.startedAt, completedAt: typeof parsed.completedAt === 'string' ? parsed.completedAt : null }
}

function writeMigrationStatus(status: MigrationStatus): void {
  window.localStorage.setItem(MIGRATION_KEY, JSON.stringify(status))
}
