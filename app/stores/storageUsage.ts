const ESTIMATED_LOCAL_STORAGE_LIMIT_BYTES = 5 * 1024 * 1024

export const useStorageUsageStore = defineStore('storage-usage', () => {
  const usedBytes = ref(0)
  const limitBytes = ref(ESTIMATED_LOCAL_STORAGE_LIMIT_BYTES)

  async function refresh(): Promise<void> {
    const estimate = await estimateOriginUsage()

    if (estimate) {
      usedBytes.value = estimate.usage
      limitBytes.value = estimate.quota

      return
    }

    usedBytes.value = localStorageBytes()
    limitBytes.value = ESTIMATED_LOCAL_STORAGE_LIMIT_BYTES
  }

  return { usedBytes, limitBytes, refresh }
})

async function estimateOriginUsage(): Promise<{ usage: number, quota: number } | null> {
  if (!navigator.storage?.estimate) {
    return null
  }

  const { usage, quota } = await navigator.storage.estimate()

  return typeof usage === 'number' && typeof quota === 'number' ? { usage, quota } : null
}

function localStorageBytes(): number {
  let total = 0

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)

    if (key === null) {
      continue
    }

    total += key.length + (window.localStorage.getItem(key)?.length ?? 0)
  }

  return total
}
