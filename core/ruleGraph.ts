import { Rec } from "./types";

export type AttrName = string;

export type AttrPath = AttrName[];

export type VarToPath = { [varName: string]: AttrPath };

export type JoinInfo = {
  leftVars: VarToPath;
  rightVars: VarToPath;
  join: {
    [varName: string]: {
      varName: string;
      leftAttr: AttrPath;
      rightAttr: AttrPath;
    };
  };
};

export function getVarToPath(rec: Rec): VarToPath {
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
