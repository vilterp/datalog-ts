export type Point = { x: number; y: number };

export function distance(a: Point, b: Point): number {
  const xDist = a.x - b.x;
  const yDist = a.y - b.y;
  return Math.sqrt(xDist ** 2 + yDist ** 2);
}

// TODO: split out Vector type?
export function plusPoint(a: Point, b: Point): Point {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
  };
}

export function minusPoint(a: Point, b: Point): Point {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  };
}

export function rectCenter(rect: DOMRect): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}
