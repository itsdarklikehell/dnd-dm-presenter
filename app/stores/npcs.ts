import type { Npc } from '~/types/npc'

export const NPCS_KEY = 'dm-presenter:npcs'

export type NpcFlag = 'away' | 'introduced' | 'seen'

export const useNpcsStore = defineStore('npcs', () => {
  const npcs = ref<Npc[]>([])

  function addNpc(input: Omit<Npc, 'id' | 'away' | 'introduced' | 'seen'>): void {
    npcs.value = [...npcs.value, { ...input, id: uniqueId(input.name, npcs.value), away: true, introduced: false, seen: false }]
  }

  function updateNpc(id: string, patch: Partial<Omit<Npc, 'id'>>): void {
    npcs.value = npcs.value.map(npc => npc.id === id ? { ...npc, ...patch } : npc)
  }

  function removeNpc(id: string): void {
    npcs.value = npcs.value.filter(npc => npc.id !== id)
  }

  function isFlagSet(id: string, flag: NpcFlag): boolean {
    return npcs.value.find(npc => npc.id === id)?.[flag] === true
  }

  function toggleFlag(id: string, flag: NpcFlag): void {
    updateNpc(id, { [flag]: !isFlagSet(id, flag) })
  }

  function allAway(ids: string[]): boolean {
    return ids.length > 0 && ids.every(id => isFlagSet(id, 'away'))
  }

  function toggleAwayForAll(ids: string[]): void {
    const value = !allAway(ids)

    npcs.value = npcs.value.map(npc => ids.includes(npc.id) ? { ...npc, away: value } : npc)
  }

  function reorderSubset(orderedIds: string[]): void {
    const memberIds = new Set(orderedIds)
    const firstIndex = npcs.value.findIndex(npc => memberIds.has(npc.id))

    if (firstIndex === -1) {
      return
    }

    const others = npcs.value.filter(npc => !memberIds.has(npc.id))
    const insertAt = npcs.value.slice(0, firstIndex).filter(npc => !memberIds.has(npc.id)).length
    const ordered = reorderById(npcs.value, orderedIds)

    npcs.value = [...others.slice(0, insertAt), ...ordered, ...others.slice(insertAt)]
  }

  return {
    npcs,
    addNpc,
    updateNpc,
    removeNpc,
    isFlagSet,
    toggleFlag,
    allAway,
    toggleAwayForAll,
    reorderSubset
  }
}, {
  persist: {
    key: NPCS_KEY,
    serializer: {
      serialize: state => JSON.stringify(state.npcs),
      deserialize: (raw) => {
        const parsed: unknown = JSON.parse(raw)

        if (!isStoredNpcArray(parsed)) {
          return { npcs: [] }
        }

        return { npcs: parsed.map(npc => ({ away: false, introduced: false, seen: false, ...npc })) }
      }
    }
  }
})

export type StoredNpc = Omit<Npc, 'away' | 'introduced' | 'seen'> & Partial<Pick<Npc, 'away' | 'introduced' | 'seen'>>

export function isStoredNpcArray(value: unknown): value is StoredNpc[] {
  return Array.isArray(value) && value.every(entry =>
    isRecord(entry)
    && typeof entry.id === 'string'
    && typeof entry.name === 'string'
    && typeof entry.image === 'string'
    && typeof entry.description === 'string'
  )
}
