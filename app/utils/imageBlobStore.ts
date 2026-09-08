const DB_NAME = 'dm-presenter'
const DB_VERSION = 1
const IMAGES_STORE = 'images'

export async function putImageBlob(blob: Blob): Promise<string> {
  const ref = imageRefFor(crypto.randomUUID())

  await putImageBlobAtRef(ref, blob)

  return ref
}

export async function putImageBlobAtRef(ref: string, blob: Blob): Promise<void> {
  await runRequest('readwrite', store => store.put(blob, imageIdFromRef(ref)))
}

export async function getImageBlob(ref: string): Promise<Blob | null> {
  const stored: unknown = await runRequest('readonly', store => store.get(imageIdFromRef(ref)))

  return stored instanceof Blob ? stored : null
}

export async function deleteImageBlob(ref: string): Promise<void> {
  await runRequest('readwrite', store => store.delete(imageIdFromRef(ref)))
}

export async function listImageRefs(): Promise<string[]> {
  const keys = await runRequest('readonly', store => store.getAllKeys())

  return keys.filter((key): key is string => typeof key === 'string').map(imageRefFor)
}

export async function clearImageBlobs(): Promise<void> {
  await runRequest('readwrite', store => store.clear())
}

let databasePromise: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) {
    return databasePromise
  }

  databasePromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IMAGES_STORE)) {
        request.result.createObjectStore(IMAGES_STORE)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open the image database'))
  })

  return databasePromise
}

async function runRequest<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase()

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(IMAGES_STORE, mode)
    const request = run(transaction.objectStore(IMAGES_STORE))

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Image database request failed'))
  })
}
