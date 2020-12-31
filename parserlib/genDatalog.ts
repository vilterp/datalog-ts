import * as dl from "../types";
import { flatMapObjToList } from "../util/util";
import * as gram from "./grammar";

export function grammarToDL(grammar: gram.Grammar): dl.Rule[] {
  return flatMapObjToList(grammar, (ruleName, gramRule): dl.Rule[] => {
    return ruleToDL(ruleName, gramRule);
  });
}

function ruleToDL(name: string, rule: gram.Rule): dl.Rule[] {
  switch (rule.type) {
    case "Char":
      throw new Error("todo");
    case "Choice":
      throw new Error("todo");
    case "Ref":
      throw new Error("todo");
    case "RepSep":
      throw new Error("todo");
    case "Sequence":
      throw new Error("todo");
    case "Succeed":
      throw new Error("todo");
    case "Text":
      throw new Error("todo");
  }
}
