import { Rec, Term } from "../types";
import { JoinInfo, ColsToIndexByRelation, AttrPath } from "./types";
import { ppt } from "../pretty";

export function getJoinInfo(left: Rec, right: Rec): JoinInfo {
  // console.log({ left, right });
  // TODO: make this work for nested records
  const out: JoinInfo = {};
  for (let leftAttr in left.attrs) {
    const leftVar = left.attrs[leftAttr];
    if (leftVar.type !== "Var") {
      continue;
    }
    for (let rightAttr in right.attrs) {
      const rightVar = right.attrs[rightAttr];
      if (rightVar.type !== "Var") {
        continue;
      }
      if (leftVar.name === rightVar.name) {
        out[leftVar.name] = {
          varName: leftVar.name,
          leftAttr: [leftAttr],
          rightAttr: [rightAttr],
        };
      }
    }
  }
  if (Object.keys(out).length === 0) {
    throw new Error(
      `no common attributes found between ${ppt(left)} and ${ppt(right)}`
    );
  }
  return out;
}

export function getColsToIndex(joinInfo: JoinInfo): ColsToIndexByRelation {
  const out: ColsToIndexByRelation = {
    left: [],
    right: [],
  };
  for (let varName of Object.keys(joinInfo)) {
    out.left.push(joinInfo[varName].leftAttr);
    out.right.push(joinInfo[varName].rightAttr);
  }
  return out;
}

// TODO: allocate less here
function getAtPath(term: Term, path: AttrPath): Term {
  if (path.length === 0) {
    return term;
  }
  if (term.type !== "Record") {
    throw new Error("expecting Rec");
  }
  const next = term.attrs[path[0]];
  return getAtPath(next, path.slice(1));
}

export function getIndexKey(rec: Rec, attrPaths: AttrPath[]): string[] {
  return attrPaths.map((attrPath) => ppt(getAtPath(rec, attrPath)));
}

export function getIndexName(attrs: AttrPath[]): string {
  return attrs.map((path) => path.join("/")).join("-");
}
