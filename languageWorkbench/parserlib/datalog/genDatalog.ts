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
import { unreachable } from "../../../util/unreachable";

// generate datalog rules that implement a parser for this grammar
export function grammarToDL(grammar: gram.Grammar): dl.Rec[] {
  const builder = new Builder();
  builder.addGrammar(grammar);
  return builder.records;
}

class Builder {
  nextStateID: number;
  records: Rec[];

  constructor() {
    this.nextStateID = 0;
    this.records = [];
  }

  addGrammar(grammar: gram.Grammar) {
    for (const ruleName in grammar) {
      const rule = grammar[ruleName];
      this.addRule(ruleName, rule);
    }
  }

  private addRule(name: string, rule: gram.Rule) {
    const startState = this.addState();
    const endState = this.addSegment(rule, startState);
    this.records.push(
      rec("grammar.rule", {
        name: str(name),
        from: int(startState),
        to: int(endState),
      })
    );
  }

  private addSegment(rule: gram.Rule, startState: number): number {
    switch (rule.type) {
      case "Text": {
        let curState = startState;
        for (let i = 0; i < rule.value.length; i++) {
          const char = rule.value[i];
          const nextState = this.addState();
          this.records.push(
            rec("grammar.charLiteralEdge", {
              from: int(curState),
              to: int(nextState),
              val: str(char),
            })
          );
          curState = nextState;
        }
        return curState;
      }
      case "Ref": {
        const nextState = this.addState();
        this.records.push(
          rec("grammar.refEdge", {
            from: int(startState),
            to: int(nextState),
            ref: str(rule.rule),
            captureName: str(rule.captureName),
          })
        );
        return nextState;
      }
      case "Sequence": {
        let curState = startState;
        for (const item of rule.items) {
          curState = this.addSegment(item, curState);
        }
        return curState;
      }
      case "Choice": {
        const endState = this.addState();
        for (const choice of rule.choices) {
          const ruleEndState = this.addSegment(choice, startState);
          this.records.push(
            rec("grammar.jumpEdge", {
              from: int(ruleEndState),
              to: int(endState),
            })
          );
        }
        return endState;
      }
      default:
        unreachable(rule.type);
    }
  }

  private addState(): number {
    const newID = this.nextStateID;
    this.nextStateID++;
    return newID;
  }
}

// TODO: write these as strings, or at least make helper functions.
//   building the raw AST is so verbose.
function ruleToDL(name: string, rule: gram.Rule): dl.Rec[] {
  switch (rule.type) {
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
