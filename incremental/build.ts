import { Rec, Term } from "../types";
import { JoinInfo, ColsToIndexByRelation, AttrPath } from "./types";
import { ppt } from "../pretty";
import { combineObjects } from "../util";

export function getJoinInfo(left: Rec, right: Rec): JoinInfo {
  const leftVars = getVarToPath(left);
  const rightVars = getVarToPath(right);
  return combineObjects(
    leftVars,
    rightVars,
    (varName, leftAttr, rightAttr) => ({ varName, leftAttr, rightAttr })
  );
}

type VarToPath = { [varName: string]: AttrPath };

function getVarToPath(rec: Rec): VarToPath {
  const out: VarToPath = {};
  Object.entries(rec.attrs).forEach(([attr, attrVal]) => {
    switch (attrVal.type) {
      case "Var":
        out[attrVal.name] = [attr];
        break;
      case "Record":
        const subMapping = getVarToPath(attrVal);
        Object.entries(subMapping).forEach(([subVar, subPath]) => {
          out[subVar] = [attr, ...subPath];
        });
        break;
      // TODO: lists?
    }
  });
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
