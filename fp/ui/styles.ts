export function tab(selected: boolean) {
  const base = { cursor: "pointer" };
  return selected ? { ...base, fontWeight: "bold" } : base;
}
