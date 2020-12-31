import * as dl from "../types";
import { flatMap, flatMapObjToList, range, stringToArray } from "../util/util";
import * as gram from "./grammar";
import { rec, str, varr } from "../types";

export function grammarToDL(grammar: gram.Grammar): dl.Rule[] {
  return flatMapObjToList(grammar, (ruleName, gramRule): dl.Rule[] => {
    return ruleToDL(ruleName, gramRule);
  });
}

function ruleToDL(name: string, rule: gram.Rule): dl.Rule[] {
  switch (rule.type) {
    case "Text":
      return [
        {
          head: rec(name, {
            from: varr("P1"),
            to: varr(`P${rule.value.length}`),
          }),
          defn: {
            type: "Or",
            opts: [
              {
                type: "And",
                clauses: stringToArray(rule.value)
                  .map((char, idx) =>
                    rec("source", {
                      pos: varr(`P${idx + 1}`),
                      char: str(char),
                    })
                  )
                  .concat(
                    range(rule.value.length - 1).map((idx) =>
                      rec("next", {
                        left: varr(`P${idx + 1}`),
                        right: varr(`P${idx + 2}`),
                      })
                    )
                  ),
              },
            ],
          },
        },
      ];
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
  }
}

// TODO: input to DL
