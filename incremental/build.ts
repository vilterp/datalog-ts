import { Bindings, Rec, Term } from "../types";
import {
  JoinInfo,
  ColsToIndexByRelation,
  AttrPath,
  VarToPath,
  Res,
} from "./types";
import { ppb, ppt } from "../pretty";
import { combineObjects } from "../util/util";

export function getJoinInfo(left: Rec, right: Rec): JoinInfo {
  const leftVars = getVarToPath(left);
  const rightVars = getVarToPath(right);
  return {
    leftVars,
    rightVars,
    join: combineObjects(
      leftVars,
      rightVars,
      (varName, leftAttr, rightAttr) => ({ varName, leftAttr, rightAttr })
    ),
  };
}

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
  Object.values(joinInfo.join).forEach((info) => {
    out.left.push(info.leftAttr);
    out.right.push(info.rightAttr);
  });
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

export function getIndexKey(res: Res, varNames: string[]): string[] {
  return varNames.map((varName) => {
    const term = res.bindings[varName];
    if (!term) {
      throw new Error(
        `couldn't get attr "${varName}" of "${ppb(res.bindings)}"`
      );
    }
    return ppt(term);
  });
}

export function getIndexName(varNames: string[]): string {
  return varNames.join("-");
}

export type JoinTree =
  | {
      type: "Leaf";
      rec: Rec;
    }
  | { type: "Node"; left: Rec; joinInfo: JoinInfo; right: JoinTree | null };

export function getJoinTree(recs: Rec[]): JoinTree {
  if (recs.length === 1) {
    return { type: "Leaf", rec: recs[0] };
  }
  return {
    type: "Node",
    left: recs[0],
    // are we joining with just the next record, or everything on the right?
    joinInfo: getJoinInfo(recs[0], recs[1]),
    right: getJoinTree(recs.slice(1)),
  };
}

export function numJoinsWithCommonVars(joinTree: JoinTree): number {
  if (joinTree.type === "Leaf") {
    return 0;
  }
  const thisDoes = Object.keys(joinTree.joinInfo.join).length > 0 ? 1 : 0;
  return thisDoes + numJoinsWithCommonVars(joinTree.right);
}

export function getBindings(rec: Rec, varPaths: VarToPath): Bindings {
  const out: Bindings = {};
  for (let varName in varPaths) {
    out[varName] = getAtPath(rec, varPaths[varName]);
  }
  return out;
}
