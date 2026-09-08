import type { Player } from '~/types/player'

const PLAYERS_KEY = 'dm-presenter:players'

export const usePlayersStore = defineStore('players', () => {
  const players = ref<Player[]>([])

  function addPlayer(input: Omit<Player, 'id'>): void {
    players.value = [...players.value, { ...input, id: uniqueId(input.name, players.value) }]
  }

  function updatePlayer(id: string, patch: Partial<Omit<Player, 'id'>>): void {
    players.value = players.value.map(player => player.id === id ? { ...player, ...patch } : player)
  }

  function removePlayer(id: string): void {
    players.value = players.value.filter(player => player.id !== id)
  }

  return {
    players,
    addPlayer,
    updatePlayer,
    removePlayer
  }
}, {
  persist: { key: PLAYERS_KEY, ...fieldPersistence('players', isPlayerArray, () => []) }
})

function isPlayerArray(value: unknown): value is Player[] {
  return Array.isArray(value) && value.every(entry =>
    isRecord(entry)
    && typeof entry.id === 'string'
    && typeof entry.name === 'string'
  )
}
