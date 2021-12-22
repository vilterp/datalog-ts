import * as dl from "../../core/types";
import {
  flatMap,
  flatMapObjToList,
  pairsToObj,
  range,
  stringToArray,
} from "../../util/util";
import * as gram from "../grammar";
import {
  BinExpr,
  binExpr,
  int,
  Rec,
  rec,
  Rule,
  str,
  Term,
  varr,
} from "../../core/types";
import { parseGrammar } from "../meta";
import { SingleCharRule } from "../grammar";
import { AbstractInterpreter } from "../../core/abstractInterpreter";

export function initializeInterp(
  interp: AbstractInterpreter,
  grammarText: string
): {
  interp: AbstractInterpreter;
  rules: Rule[];
} {
  const grammarParsed = parseGrammar(grammarText);
  const rules = grammarToDL(grammarParsed);

  const [_1, interp2] = interp.evalStr(".table source");
  const [_2, interp3] = interp2.evalStr(".table next");

  const [_3, interp4] = interp3.evalStmts(
    rules.map((rule) => ({ type: "Rule", rule }))
  );
  return { interp: interp4, rules };
}

// generate datalog rules that implement a parser for this grammar
export function grammarToDL(grammar: gram.Grammar): dl.Rule[] {
  return flatMapObjToList(grammar, (ruleName, gramRule): dl.Rule[] => {
    return ruleToDL(ruleName, gramRule);
  });
}

// TODO: write these as strings, or at least make helper functions.
//   building the raw AST is so verbose.
function ruleToDL(name: string, rule: gram.Rule): dl.Rule[] {
  switch (rule.type) {
    case "Text":
      return [
        {
          head: rec(name, {
            span: rec("span", {
              from: varr("P1"),
              to: varr(`P${rule.value.length}`),
            }),
          }),
          defn: {
            type: "Or",
            opts: [
              {
                type: "And",
                clauses: [
                  ...stringToArray(rule.value).map((char, idx) =>
                    rec("source", {
                      id: varr(`P${idx + 1}`),
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
    case "Choice":
      return [
        {
          head: rec(name, {
            span: rec("span", {
              from: varr("P1"),
              to: varr(`P2`),
            }),
          }),
          defn: {
            type: "Or",
            opts: rule.choices.map((choice, idx) => ({
              type: "And",
              clauses: [
                rec(choiceName(name, idx), {
                  span: rec("span", {
                    from: varr("P1"),
                    to: varr("P2"),
                  }),
                }),
              ],
            })),
          },
        },
        ...flatMap(rule.choices, (subRule, idx) =>
          ruleToDL(choiceName(name, idx), subRule)
        ),
      ];
    case "Sequence": {
      const headVars: { [key: string]: Term } = pairsToObj(
        range(rule.items.length).map((idx) => ({
          key: `seq_${idx}`,
          val: rec("span", {
            from: varr(`P${idx * 2 + 1}`),
            to: varr(`P${idx * 2 + 2}`),
          }),
        }))
      );
      return [
        {
          head: rec(name, {
            span: rec("span", {
              from: varr("P1"),
              to: varr(`P${rule.items.length * 2}`),
            }),
            ...headVars,
          }),
          defn: {
            type: "Or",
            opts: [
              {
                type: "And",
                clauses: [
                  ...rule.items.map((char, idx) =>
                    rec(seqItemName(name, idx), {
                      span: rec("span", {
                        from: varr(`P${idx * 2 + 1}`),
                        to: varr(`P${idx * 2 + 2}`),
                      }),
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
    }
    case "Ref":
      // TODO: this one seems a bit unnecessary...
      //   these should be collapsed out somehow
      return [
        {
          head: rec(name, {
            span: rec("span", {
              from: varr("P1"),
              to: varr(`P2`),
            }),
          }),
          defn: {
            type: "Or",
            opts: [
              {
                type: "And",
                clauses: [
                  rec(rule.name, {
                    span: rec("span", { from: varr("P1"), to: varr("P2") }),
                  }),
                ],
              },
            ],
          },
        },
      ];
    case "Char":
      return [
        {
          head: rec(name, {
            span: rec("span", { from: varr("P1"), to: varr("P1") }),
          }),
          defn: {
            type: "Or",
            opts: [
              {
                type: "And",
                clauses: [
                  rec("source", {
                    id: varr("P1"),
                    char: varr("C"),
                  }),
                  ...exprsForCharRule(rule.rule),
                ],
              },
            ],
          },
        },
      ];
    case "RepSep":
      return [
        {
          head: rec(name, {
            span: rec("span", { from: varr("P1"), to: varr("P4") }),
          }),
          defn: {
            type: "Or",
            opts: [
              {
                type: "And",
                clauses: [
                  rec(`${name}_rep`, {
                    span: rec("span", { from: varr("P1"), to: varr("P4") }),
                  }),
                ],
              },
              {
                type: "And",
                clauses: [
                  rec(`${name}_rep`, {
                    span: rec("span", { from: varr("P1"), to: varr("P2") }),
                  }),
                  rec(`${name}_sep`, {
                    span: rec("span", { from: varr("P2"), to: varr("P3") }),
                  }),
                  rec(name, {
                    span: rec("span", { from: varr("P3"), to: varr("P4") }),
                  }),
                ],
              },
            ],
          },
        },
        // generate for rep
        {
          head: rec(`${name}_rep`, {
            span: rec("span", { from: varr("P1"), to: varr("P2") }),
          }),
          defn: {
            type: "Or",
            opts: [
              {
                type: "And",
                clauses: [
                  rec("source", {
                    id: varr("P1"),
                    char: varr("C"),
                  }),
                ],
              },
            ],
          },
        },
        // generate for sep
        {
          head: rec(`${name}_sep`, {
            span: rec("span", { from: varr("P1"), to: varr("P2") }),
          }),
          defn: {
            type: "Or",
            opts: [
              {
                type: "And",
                clauses: [
                  rec("source", {
                    id: varr("P1"),
                    char: varr("C"),
                  }),
                ],
              },
            ],
          },
        },
      ];
    case "Succeed":
      throw new Error("todo");
  }
}

function exprsForCharRule(charRule: SingleCharRule): BinExpr[] {
  switch (charRule.type) {
    case "AnyChar":
      return [];
    case "Literal":
      return [binExpr(varr("C"), "==", str(charRule.value))];
    case "Range":
      return [
        binExpr(str(charRule.from), "<=", varr("C")),
        binExpr(varr("C"), "<=", str(charRule.to)),
      ];
    case "Not":
      throw new Error("TODO: `not` single char rules");
  }
}

function seqItemName(name: string, idx: number): string {
  return `${name}_seq_${idx}`;
}

function choiceName(name: string, idx: number): string {
  return `${name}_choice_${idx}`;
}

// TODO: input to DL
export function inputToDL(input: string): Rec[] {
  return stringToArray(input)
    .map((char, idx) => rec("source", { char: str(char), id: int(idx) }))
    .concat(
      range(input.length - 1).map((idx) =>
        rec("next", { left: int(idx), right: int(idx + 1) })
      )
    );
}
