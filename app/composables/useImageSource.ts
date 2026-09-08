import type { MaybeRefOrGetter, Ref } from 'vue'

interface CachedObjectUrl {
  url: string
  refCount: number
}

const objectUrlCache = new Map<string, CachedObjectUrl>()

export function useImageSource(image: MaybeRefOrGetter<string>): Ref<string> {
  const source = ref('')

  let acquiredRef: string | null = null
  let requestId = 0

  function acquire(ref: string): string {
    const cached = objectUrlCache.get(ref)

    if (!cached) {
      return ''
    }

    cached.refCount += 1
    acquiredRef = ref

    return cached.url
  }

  function release(): void {
    if (acquiredRef === null) {
      return
    }

    const cached = objectUrlCache.get(acquiredRef)
    const releasedRef = acquiredRef

    acquiredRef = null

    if (!cached) {
      return
    }

    cached.refCount -= 1

    if (cached.refCount > 0) {
      return
    }

    URL.revokeObjectURL(cached.url)
    objectUrlCache.delete(releasedRef)
  }

  async function resolve(ref: string): Promise<void> {
    const id = ++requestId

    release()

    if (!ref || !import.meta.client) {
      source.value = ''
      return
    }

    if (!isImageRef(ref)) {
      source.value = ref
      return
    }

    if (objectUrlCache.has(ref)) {
      source.value = acquire(ref)
      return
    }

    const blob = await getImageBlob(ref).catch(() => null)

    if (id !== requestId) {
      return
    }

    if (!blob) {
      source.value = ''
      return
    }

    if (!objectUrlCache.has(ref)) {
      objectUrlCache.set(ref, { url: URL.createObjectURL(blob), refCount: 0 })
    }

    source.value = acquire(ref)
  }

  watch(() => toValue(image), (ref) => {
    void resolve(ref)
  }, { immediate: true })
  onScopeDispose(release)

  return source
}

export async function loadImageBlob(image: string): Promise<Blob | null> {
  if (!image) {
    return null
  }

  if (isImageRef(image)) {
    return await getImageBlob(image)
  }

  if (isLegacyDataUri(image)) {
    return await (await fetch(image)).blob()
  }

  return null
}
