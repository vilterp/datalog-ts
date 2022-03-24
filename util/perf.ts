export function perfMark(key: string) {
  if (performance) {
    performance.mark(key);
  }
}

export function perfMeasure(key: string, start: string, end: string) {
  if (performance) {
    performance.measure(key, start, end);
  }
}
