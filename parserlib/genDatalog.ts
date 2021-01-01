import * as dl from "../types";
import { flatMap, flatMapObjToList, range, stringToArray } from "../util/util";
import * as gram from "./grammar";
import { int, Rec, rec, str, Term, varr } from "../types";

// generate datalog rules that implement a parser for this grammar
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
      // generate a rule for each clause
      // or them together
      throw new Error("todo");
    case "Ref":
      throw new Error("todo");
    case "RepSep":
      throw new Error("todo");
    case "Sequence":
      return [
        {
          head: rec(name, {
            from: varr("P1"),
            to: varr(`P${rule.items.length + 1}`),
          }),
          defn: {
            type: "Or",
            opts: [
              {
                type: "And",
                clauses: [
                  ...rule.items.map((char, idx) =>
                    rec(seqItemName(name, idx), {
                      from: varr(`P${idx * 2 + 1}`),
                      to: varr(`P${idx * 2 + 2}`),
                    })
                  ),
                  ...range(rule.items.length - 1).map((idx) =>
                    rec("next", {
                      left: varr(`P${idx * 2 + 2}`),
                      right: varr(`P${idx * 2 + 3}`),
                    })
                  ),
                ],
              },
            ],
          },
        },
        ...flatMap(rule.items, (subRule, idx) =>
          ruleToDL(seqItemName(name, idx), subRule)
        ),
      ];
    case "Succeed":
      throw new Error("todo");
  }
}

function seqItemName(name: string, idx: number): string {
  return `${name}_seq_${idx}`;
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
