export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface LocationFogState {
  fogEnabled: boolean
  revealedRects: Rect[]
}

export interface LocationView {
  scale: number
  offsetX: number
  offsetY: number
}
