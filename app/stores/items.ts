import type { Item } from '~/types/item'

const ITEMS_KEY = 'dm-presenter:items'

export const useItemsStore = defineStore('items', () => {
  const items = ref<Item[]>([])

  function addItem(image: string, name = ''): void {
    items.value = [...items.value, { id: crypto.randomUUID(), image, name }]
  }

  function removeItem(id: string): void {
    const removed = items.value.filter(entry => entry.id === id)

    items.value = items.value.filter(entry => entry.id !== id)

    void releaseImages(removed)
  }

  function updateItem(id: string, input: { name: string, image: string }): void {
    const replaced = replacedImages(items.value, id, input.image)

    items.value = items.value.map(entry => entry.id === id ? { ...entry, ...input } : entry)

    void releaseImages(replaced)
  }

  function reorderItems(orderedIds: string[]): void {
    items.value = reorderById(items.value, orderedIds)
  }

  return { items, addItem, removeItem, updateItem, reorderItems }
}, {
  persist: {
    key: ITEMS_KEY,
    serializer: {
      serialize: state => JSON.stringify(state.items),
      deserialize: (raw) => {
        const parsed: unknown = JSON.parse(raw)

        if (!isStoredItemArray(parsed)) {
          return { items: [] }
        }

        return { items: parsed.map(item => ({ name: '', ...item })) }
      }
    }
  }
})

type StoredItem = Omit<Item, 'name'> & Partial<Pick<Item, 'name'>>

function isStoredItemArray(value: unknown): value is StoredItem[] {
  return Array.isArray(value) && value.every(entry =>
    isRecord(entry)
    && typeof entry.id === 'string'
    && typeof entry.image === 'string'
    && (entry.name === undefined || typeof entry.name === 'string')
  )
}
