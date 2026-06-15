/** Axis-aligned bounding box, top-left origin. */
export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** True when two axis-aligned boxes overlap. */
export function aabb(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}
