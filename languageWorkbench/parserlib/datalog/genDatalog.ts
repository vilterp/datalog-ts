import * as dl from "../../../core/types";
import {
  flatMap,
  flatMapObjToList,
  range,
  stringToArray,
} from "../../../util/util";
import * as gram from "../types";
import { int, Rec, rec, str, varr, or, and } from "../../../core/types";
import { SingleCharRule } from "../types";

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
              to: varr(`P${rule.value.length + 1}`),
            }),
          }),
          or([
            and([
              ...stringToArray(rule.value).map((char, idx) =>
                rec("input.char", {
                  id: varr(`P${idx + 1}`),
                  char: str(char),
                })
              ),
              ...range(rule.value.length).map((idx) =>
                rec("input.next", {
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
      return [
        dl.rule(
          rec(name, {
            span: rec("span", {
              from: varr("P1"),
              to: varr(`P${rule.items.length + 1}`),
            }),
          }),
          or([
            and([
              ...rule.items.map((char, idx) =>
                rec(seqItemName(name, idx), {
                  span: rec("span", {
                    from: varr(`P${idx + 1}`),
                    to: varr(`P${idx + 2}`),
                  }),
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
              rec(rule.rule, {
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
            span: rec("span", { from: varr("P1"), to: varr("P2") }),
          }),
          or([
            and([
              rec("input.char", {
                id: varr("P1"),
                char: varr("C"),
              }),
              rec("input.next", {
                left: varr("P1"),
                right: varr("P2"),
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
            span: rec("span", { from: varr("P1"), to: varr("P4") }),
          }),
          or([
            and([
              rec(`${name}_succeed`, {
                span: rec("span", { from: varr("P1"), to: varr("P4") }),
              }),
            ]),
            and([
              rec(`${name}_rep`, {
                span: rec("span", { from: varr("P1"), to: varr("P4") }),
              }),
            ]),
            and([
              rec(`${name}_rep`, {
                span: rec("span", { from: varr("P1"), to: varr("P2") }),
              }),
              rec(`${name}_sep`, {
                span: rec("span", { from: varr("P2"), to: varr("P3") }),
              }),
              rec(name, {
                span: rec("span", { from: varr("P3"), to: varr("P4") }),
              }),
            ]),
          ])
        ),
        ...ruleToDL(`${name}_rep`, rule.rep),
        // TODO: handle case where this is empty
        ...ruleToDL(`${name}_sep`, rule.sep),
        succeedRule(`${name}_succeed`), // TODO: everyone should use the same succeed rule
      ];
  }
}

function succeedRule(name: string): dl.Rule {
  return dl.rule(
    rec(name, { span: rec("span", { from: varr("P1"), to: varr("P1") }) }),
    or([and([rec("input.char", { id: varr("P1") })])])
  );
}

function exprsForCharRule(charRule: SingleCharRule): Rec[] {
  switch (charRule.type) {
    case "AnyChar":
      return [];
    case "Literal":
      return [rec("base.eq", { a: varr("C"), b: str(charRule.value) })];
    case "Range":
      return [
        rec("base.lte", { a: str(charRule.from), b: varr("C") }),
        rec("base.lte", { a: varr("C"), b: str(charRule.to) }),
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

export function inputToDL(input: string): Rec[] {
  return [
    ...stringToArray(input)
      .map((char, idx) => rec("input.char", { char: str(char), id: int(idx) }))
      .concat(
        range(input.length - 1).map((idx) =>
          rec("input.next", { left: int(idx), right: int(idx + 1) })
        )
      ),
    rec("input.char", { char: str("START"), id: int(-1) }),
    rec("input.char", { char: str("END"), id: int(-2) }),
    rec("input.next", { left: int(-1), right: int(0) }),
    rec("input.next", { left: int(input.length - 1), right: int(-2) }),
  ];
}
