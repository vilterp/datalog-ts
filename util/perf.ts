export function perfMark(key: string) {
  if (typeof performance !== "undefined") {
    performance.mark(key);
  }
}

export function perfMeasure(key: string, start: string, end: string) {
  if (typeof performance !== "undefined") {
    performance.measure(key, start, end);
  }
}
