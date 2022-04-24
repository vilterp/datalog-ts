import { Bindings, Rec, Res } from "../types";

export type Builtin = (rec: Rec) => Res[];

export const BUILTINS: { [name: string]: Builtin } = {
  plus,
};

export function plus(rec: Rec): Res[] {
  console.log("hello from plus");
  return [];
}
