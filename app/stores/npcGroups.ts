import type { NpcGroup } from '~/types/npc'

const NPC_GROUPS_KEY = 'dm-presenter:npc-groups'

export const useNpcGroupsStore = defineStore('npcGroups', () => {
  const groups = ref<NpcGroup[]>([])

  function addGroup(input: Omit<NpcGroup, 'id'>): void {
    groups.value = [...groups.value, { ...input, id: uniqueId(input.name, groups.value) }]
  }

  function updateGroup(id: string, patch: Partial<Omit<NpcGroup, 'id'>>): void {
    groups.value = groups.value.map(group => group.id === id ? { ...group, ...patch } : group)
  }

  function removeGroup(id: string): void {
    groups.value = groups.value.filter(group => group.id !== id)

    const npcsStore = useNpcsStore()

    npcsStore.npcs
      .filter(npc => npc.groupId === id)
      .forEach(npc => npcsStore.updateNpc(npc.id, { groupId: undefined }))
  }

  function removeGroupWithNpcs(id: string): void {
    groups.value = groups.value.filter(group => group.id !== id)

    const npcsStore = useNpcsStore()

    npcsStore.npcs
      .filter(npc => npc.groupId === id)
      .forEach(npc => npcsStore.removeNpc(npc.id))
  }

  return {
    groups,
    addGroup,
    updateGroup,
    removeGroup,
    removeGroupWithNpcs
  }
}, {
  persist: { key: NPC_GROUPS_KEY, ...fieldPersistence('groups', isNpcGroupArray, () => []) }
})

function isNpcGroupArray(value: unknown): value is NpcGroup[] {
  return Array.isArray(value) && value.every(entry =>
    isRecord(entry)
    && typeof entry.id === 'string'
    && typeof entry.name === 'string'
  )
}
