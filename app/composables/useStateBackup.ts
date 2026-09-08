import { strToU8, unzipSync, zipSync } from 'fflate'
import { NPCS_KEY, isStoredNpcArray } from '~/stores/npcs'
import { BACKUP_KEY, serializeLastSavedAt } from '~/stores/backup'
import { LEONARDO_API_KEY_STORAGE_KEY } from '~/composables/useLeonardoApiKey'

const STORAGE_PREFIX = 'dm-presenter:'
const IMAGES_DIR = 'images/'
const STATE_FILE = 'state.json'

const EXT_TO_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml'
}

export function useStateBackup() {
  const backupStore = useBackupStore()

  async function exportState(): Promise<void> {
    const entries = readPrefixedEntries()
    const imageFiles = await readImageFiles()

    const zipped = zipSync({
      [STATE_FILE]: strToU8(JSON.stringify(entries, null, 2)),
      ...imageFiles
    })

    const blob = new Blob([zipped], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `dm-presenter-state-${new Date().toISOString().slice(0, 10)}.zip`
    link.click()

    URL.revokeObjectURL(url)

    backupStore.markSaved(new Date().toISOString())
  }

  async function clearState(): Promise<void> {
    await clearImageBlobs()
    removeSessionDataKeys()
    window.localStorage.removeItem(BACKUP_KEY)
    window.location.reload()
  }

  async function importState(file: File): Promise<void> {
    const files = unzipSync(new Uint8Array(await file.arrayBuffer()))
    const stateFile = files[STATE_FILE]

    if (!stateFile) {
      throw new Error('Invalid state file: missing state.json')
    }

    const parsed: unknown = JSON.parse(new TextDecoder().decode(stateFile))

    if (!isStateData(parsed)) {
      throw new Error('Invalid state file')
    }

    const legacyImagePaths = restoreLegacyNpcImages(parsed, files)

    await clearImageBlobs()
    await restoreImageBlobs(files, legacyImagePaths)

    removeSessionDataKeys()

    for (const [key, value] of Object.entries(parsed)) {
      window.localStorage.setItem(key, value)
    }

    window.localStorage.setItem(BACKUP_KEY, serializeLastSavedAt(new Date().toISOString()))

    window.location.reload()
  }

  return { exportState, importState, clearState }
}

function removeSessionDataKeys(): void {
  for (const key of Object.keys(window.localStorage)) {
    if (isSessionDataKey(key)) {
      window.localStorage.removeItem(key)
    }
  }
}

function isSessionDataKey(key: string): boolean {
  return key.startsWith(STORAGE_PREFIX) && key !== LEONARDO_API_KEY_STORAGE_KEY && key !== BACKUP_KEY
}

function readPrefixedEntries(): Record<string, string> {
  const entries: Record<string, string> = {}

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)

    if (key && isSessionDataKey(key)) {
      entries[key] = window.localStorage.getItem(key) ?? ''
    }
  }

  return entries
}

async function readImageFiles(): Promise<Record<string, Uint8Array>> {
  const files: Record<string, Uint8Array> = {}

  for (const ref of await listImageRefs()) {
    const blob = await getImageBlob(ref)

    if (!blob) {
      continue
    }

    files[`${IMAGES_DIR}${imageIdFromRef(ref)}.${extForMime(blob.type)}`] = new Uint8Array(await blob.arrayBuffer())
  }

  return files
}

function restoreLegacyNpcImages(entries: Record<string, string>, files: Record<string, Uint8Array>): Set<string> {
  const restoredPaths = new Set<string>()
  const raw = entries[NPCS_KEY]

  if (!raw) {
    return restoredPaths
  }

  const npcs: unknown = JSON.parse(raw)

  if (!isStoredNpcArray(npcs)) {
    return restoredPaths
  }

  entries[NPCS_KEY] = JSON.stringify(npcs.map((npc) => {
    const bytes = npc.image.startsWith(IMAGES_DIR) ? files[npc.image] : undefined

    if (!bytes) {
      return npc
    }

    restoredPaths.add(npc.image)

    return { ...npc, image: bytesToDataUri(bytes, mimeForPath(npc.image)) }
  }))

  return restoredPaths
}

async function restoreImageBlobs(files: Record<string, Uint8Array>, restoredPaths: Set<string>): Promise<void> {
  for (const [path, bytes] of Object.entries(files)) {
    if (!path.startsWith(IMAGES_DIR) || restoredPaths.has(path)) {
      continue
    }

    const id = path.slice(IMAGES_DIR.length).replace(/\.[^.]+$/, '')

    if (!id) {
      continue
    }

    await putImageBlobAtRef(imageRefFor(id), bytesToBlob(bytes, mimeForPath(path)))
  }
}

function extForMime(mime: string): string {
  return Object.entries(EXT_TO_MIME).find(([, value]) => value === mime)?.[0] ?? 'webp'
}

function mimeForPath(path: string): string {
  const ext = path.split('.').pop() ?? ''

  return EXT_TO_MIME[ext] ?? 'application/octet-stream'
}

function bytesToBlob(bytes: Uint8Array, mime: string): Blob {
  return new Blob([bytes.slice().buffer as ArrayBuffer], { type: mime })
}

function bytesToDataUri(bytes: Uint8Array, mime: string): string {
  return `data:${mime};base64,${bytesToBase64(bytes)}`
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

function isStateData(value: unknown): value is Record<string, string> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && Object.entries(value).every(([key, entry]) => key.startsWith(STORAGE_PREFIX) && typeof entry === 'string')
}
