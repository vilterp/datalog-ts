export type Point = { x: number; y: number };

export function distance(a: Point, b: Point): number {
  const xDist = a.x - b.x;
  const yDist = a.y - b.y;
  return Math.sqrt(xDist ** 2 + yDist ** 2);
}
