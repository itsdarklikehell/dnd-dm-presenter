export interface Npc {
  id: string
  name: string
  image: string
  leonardoImageId?: string
  species?: string
  gender?: string
  age?: string
  role?: string
  description: string
  appearanceDescription?: string
  away: boolean
  introduced: boolean
  seen: boolean
  groupId?: string
}

export interface NpcGroup {
  id: string
  name: string
}
