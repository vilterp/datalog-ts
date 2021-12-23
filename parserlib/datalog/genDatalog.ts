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
  str,
  Term,
  varr,
  or,
  and,
} from "../../core/types";
import { SingleCharRule } from "../grammar";

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
      if (rule.value === "") {
        return [succeedRule(name)];
      }
      return [
        dl.rule(
          rec(name, {
            span: rec("span", {
              from: varr("P1"),
              to: varr(`P${rule.value.length}`),
            }),
          }),
          or([
            and([
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
            ]),
          ])
        ),
      ];
    case "Choice":
      return [
        dl.rule(
          rec(name, {
            span: rec("span", {
              from: varr("P1"),
              to: varr(`P2`),
            }),
          }),
          or(
            rule.choices.map((choice, idx) =>
              and([
                rec(choiceName(name, idx), {
                  span: rec("span", {
                    from: varr("P1"),
                    to: varr("P2"),
                  }),
                }),
              ])
            )
          )
        ),
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
        dl.rule(
          rec(name, {
            span: rec("span", {
              from: varr("P1"),
              to: varr(`P${rule.items.length * 2}`),
            }),
            ...headVars,
          }),
          or([
            and([
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
            ]),
          ])
        ),
        ...flatMap(rule.items, (subRule, idx) =>
          ruleToDL(seqItemName(name, idx), subRule)
        ),
      ];
    }
    case "Ref":
      // TODO: this one seems a bit unnecessary...
      //   these should be collapsed out somehow
      return [
        dl.rule(
          rec(name, {
            span: rec("span", {
              from: varr("P1"),
              to: varr(`P2`),
            }),
          }),
          or([
            and([
              rec(rule.name, {
                span: rec("span", { from: varr("P1"), to: varr("P2") }),
              }),
            ]),
          ])
        ),
      ];
    case "Char":
      return [
        dl.rule(
          rec(name, {
            span: rec("span", { from: varr("P1"), to: varr("P1") }),
          }),
          or([
            and([
              rec("source", {
                id: varr("P1"),
                char: varr("C"),
              }),
              ...exprsForCharRule(rule.rule),
            ]),
          ])
        ),
      ];
    case "RepSep":
      return [
        dl.rule(
          rec(name, {
            span: rec("span", { from: varr("P1"), to: varr("P6") }),
          }),
          or([
            and([
              rec(`${name}_rep`, {
                span: rec("span", { from: varr("P1"), to: varr("P6") }),
              }),
            ]),
            and([
              rec(`${name}_rep`, {
                span: rec("span", { from: varr("P1"), to: varr("P2") }),
              }),
              rec("next", {
                left: varr(`P2`),
                right: varr(`P3`),
              }),
              rec(`${name}_sep`, {
                span: rec("span", { from: varr("P3"), to: varr("P4") }),
              }),
              rec("next", {
                left: varr(`P4`),
                right: varr(`P5`),
              }),
              rec(name, {
                span: rec("span", { from: varr("P5"), to: varr("P6") }),
              }),
            ]),
          ])
        ),
        ...ruleToDL(`${name}_rep`, rule.rep),
        // TODO: handle case where this is empty
        ...ruleToDL(`${name}_sep`, rule.sep),
      ];
    case "Succeed":
      return [succeedRule(name)];
  }
}

function succeedRule(name: string): dl.Rule {
  return dl.rule(
    rec(name, {
      span: rec("span", { from: varr("P1"), to: varr("P2") }),
    }),
    or([
      and([
        {
          type: "BinExpr",
          left: varr("P1"),
          op: "==",
          right: varr("P2"),
        },
      ]),
    ])
  );
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
