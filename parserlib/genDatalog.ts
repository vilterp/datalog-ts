import * as dl from "../types";
import { flatMapObjToList, range, stringToArray } from "../util/util";
import * as gram from "./grammar";
import { int, Rec, rec, str, varr } from "../types";

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
                clauses: [
                  ...stringToArray(rule.value).map((char, idx) =>
                    rec("source", {
                      pos: varr(`P${idx + 1}`),
                      char: str(char),
                    })
                  ),
                  ...range(rule.value.length - 1).map((idx) =>
                    rec("next", {
                      left: varr(`P${idx + 1}`),
                      right: varr(`P${idx + 2}`),
                    })
                  ),
                ],
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
export function inputToDL(input: string): Rec[] {
  return stringToArray(input)
    .map((char, idx) => rec("source", { char: str(char), pos: int(idx) }))
    .concat(
      range(input.length - 1).map((idx) =>
        rec("next", { left: int(idx), right: int(idx + 1) })
      )
    );
}
