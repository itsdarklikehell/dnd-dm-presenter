import { strToU8, unzipSync, zipSync } from 'fflate'
import { NPCS_KEY, isStoredNpcArray, type StoredNpc } from '~/stores/npcs'
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
  function exportState(): void {
    const entries = readPrefixedEntries()
    const imageFiles: Record<string, Uint8Array> = {}

    const npcs = readNpcs(entries)

    if (npcs) {
      const extracted = npcs.map((npc) => {
        const image = extractImage(npc)

        if (!image) {
          return npc
        }

        const path = `${IMAGES_DIR}${npc.id}.${image.ext}`

        imageFiles[path] = image.bytes

        return { ...npc, image: path }
      })

      entries[NPCS_KEY] = JSON.stringify(extracted)
    }

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

    const npcsRaw = parsed[NPCS_KEY]

    if (npcsRaw) {
      const npcs: unknown = JSON.parse(npcsRaw)

      if (isStoredNpcArray(npcs)) {
        const restored = npcs.map((npc) => {
          if (!npc.image.startsWith(IMAGES_DIR)) {
            return npc
          }

          const bytes = files[npc.image]

          if (!bytes) {
            return npc
          }

          return { ...npc, image: bytesToDataUri(bytes, mimeForPath(npc.image)) }
        })

        parsed[NPCS_KEY] = JSON.stringify(restored)
      }
    }

    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(STORAGE_PREFIX) && key !== LEONARDO_API_KEY_STORAGE_KEY) {
        window.localStorage.removeItem(key)
      }
    }

    for (const [key, value] of Object.entries(parsed)) {
      window.localStorage.setItem(key, value)
    }

    window.location.reload()
  }

  return { exportState, importState }
}

function readPrefixedEntries(): Record<string, string> {
  const entries: Record<string, string> = {}

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)

    if (key?.startsWith(STORAGE_PREFIX) && key !== LEONARDO_API_KEY_STORAGE_KEY) {
      entries[key] = window.localStorage.getItem(key) ?? ''
    }
  }

  return entries
}

function readNpcs(entries: Record<string, string>): StoredNpc[] | null {
  const raw = entries[NPCS_KEY]

  if (!raw) {
    return null
  }

  const parsed: unknown = JSON.parse(raw)

  return isStoredNpcArray(parsed) ? parsed : null
}

function extractImage(npc: StoredNpc): { bytes: Uint8Array, ext: string } | null {
  const match = /^data:image\/([a-z0-9+]+);base64,(.+)$/i.exec(npc.image)

  if (!match) {
    return null
  }

  const [, subtype, base64] = match as unknown as [string, string, string]

  return { bytes: base64ToBytes(base64), ext: subtype === 'svg+xml' ? 'svg' : subtype }
}

function mimeForPath(path: string): string {
  const ext = path.split('.').pop() ?? ''

  return EXT_TO_MIME[ext] ?? 'application/octet-stream'
}

function bytesToDataUri(bytes: Uint8Array, mime: string): string {
  return `data:${mime};base64,${bytesToBase64(bytes)}`
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
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
