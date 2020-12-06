import { Bindings, Rec } from "../types";
import { ColName, JoinVars } from "./types";
import { ppt } from "../pretty";

export function extractBindings(rec: Rec, joinVars: JoinVars): Bindings {
  const res: Bindings = {};
  for (let joinVar in joinVars) {
    const joinAttr = joinVars[joinVar];
    res[joinVar] = rec[joinAttr];
  }
  return res;
}

export function getJoinAttrs(rec: Rec): JoinVars {
  const ret: JoinVars = {};
  for (let attr in rec.attrs) {
    const term = rec.attrs[attr];
    if (term.type === "Var") {
      ret[term.name] = attr;
    }
  }
  return ret;
}

export function getIndexKey(rec: Rec, attrs: ColName[]): string[] {
  return attrs.map((attr) => ppt(rec.attrs[attr]));
}

export function getIndexName(attrs: ColName[]): string {
  return attrs.join("-");
}
