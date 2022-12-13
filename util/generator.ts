export function generatorCount<T>(gen: Generator<T>): number {
  let count = 0;
  for (const item of gen) {
    count++;
  }
  return count;
}

export function generatorIsEmpty<T>(gen: Generator<T>): boolean {
  return generatorCount(gen) === 0;
}
