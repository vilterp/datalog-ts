import { diff } from "deep-diff";

export type Json = number | string | boolean | { [key: string]: Json } | Json[];

export function jsonEq(left: Json, right: Json): boolean {
  return diff(left, right) === undefined;
}
