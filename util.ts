export function mapObj<T, V>(
  obj: { [k: string]: T },
  f: (k: string, t: T) => V
): { [k: string]: V } {
  const out: { [k: string]: V } = {};
  for (const key of Object.keys(obj)) {
    out[key] = f(key, obj[key]);
  }
  return out;
}
