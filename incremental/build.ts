import { Rec } from "../types";
import { JoinInfo, ColsToIndexByRelation } from "./types";
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
          leftAttr,
          rightAttr,
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

type ColName = string;

export function getIndexKey(rec: Rec, attrs: ColName[]): string[] {
  return attrs.map((attr) => ppt(rec.attrs[attr]));
}

export function getIndexName(attrs: ColName[]): string {
  return attrs.join("-");
}
