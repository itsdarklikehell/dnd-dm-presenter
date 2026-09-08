export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

// Every revealed hole in the fog is a closed polygon in unit (0..1) coordinates. A square selection is
// just a four-point one, so squares and free-form areas share one shape, one store field and one renderer —
// only the drawing gesture differs.
export type RevealArea = Point[]

export type FogSelectionMode = 'rect' | 'freeform'

export interface LocationFogState {
  fogEnabled: boolean
  revealedAreas: RevealArea[]
}

export interface LocationView {
  scale: number
  offsetX: number
  offsetY: number
}
