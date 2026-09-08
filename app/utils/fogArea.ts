import type { Point, Rect, RevealArea } from '~/types/locationDisplay'

// Squares are stored as plain four-point areas so that the fog renderer only ever deals with polygons.
export function rectToArea(rect: Rect): RevealArea {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height }
  ]
}

// Shoelace formula, in unit coordinates: 1 is the whole map.
export function areaSize(points: Point[]): number {
  let total = 0

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!
    const next = points[(index + 1) % points.length]!
    total += current.x * next.y - next.x * current.y
  }

  return Math.abs(total) / 2
}
