export function linearInterpolate(
  from: [number, number],
  to: [number, number],
  num: number
): number {
  const fromFraction = (num - from[0]) / (from[1] - from[0]);
  return fromFraction * (to[1] - to[0]) + to[0];
}
