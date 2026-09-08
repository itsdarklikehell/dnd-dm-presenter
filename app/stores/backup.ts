export const BACKUP_KEY = 'dm-presenter:backup'

export const useBackupStore = defineStore('backup', () => {
  const lastSavedAt = ref<string | null>(null)

  function markSaved(savedAt: string): void {
    lastSavedAt.value = savedAt
  }

  return { lastSavedAt, markSaved }
}, {
  persist: {
    key: BACKUP_KEY,
    ...fieldPersistence('lastSavedAt', isLastSavedAt, () => null)
  }
})

export function serializeLastSavedAt(savedAt: string): string {
  return JSON.stringify(savedAt)
}

function isLastSavedAt(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}
