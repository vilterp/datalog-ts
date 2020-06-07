import { CSSProperties } from "react";

export function tab(selected: boolean): CSSProperties {
  const base = { cursor: "pointer" };
  return selected ? { ...base, fontWeight: "bold" } : base;
}
