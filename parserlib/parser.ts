import {
  Grammar,
  Rule,
  Span,
  SingleCharRule,
  char,
  charRuleToString,
} from "./grammar";
import { start } from "repl";

export type TraceTree = {
  span: Span;
  error: ParseError | null;
} & TraceInner;

type ParseError = { expected: string[]; got: string };

type TraceInner =
  | { type: "SeqTrace"; itemTraces: TraceTree[] }
  | {
      type: "ChoiceTrace";
      optIdx: number;
      innerTrace: TraceTree;
    }
  | { type: "RefTrace"; innerTrace: TraceTree }
  | { type: "TextTrace" }
  | { type: "CharTrace" }
  | { type: "SucceedTrace" };

export function parse(
  grammar: Grammar,
  ruleName: string,
  input: string
): TraceTree {
  const rule = grammar[ruleName];
  return doParse(grammar, rule, 0, input);
}

function doParse(
  grammar: Grammar,
  rule: Rule,
  startIdx: number,
  input: string
): TraceTree {
  switch (rule.type) {
    case "Text":
      const next = input.slice(startIdx, startIdx + rule.value.length);
      // console.log("NEXT:", { startIdx, rule, next, input });
      if (next === rule.value) {
        return {
          type: "TextTrace",
          // rule,
          span: { from: startIdx, to: startIdx + rule.value.length },
          error: null,
        };
      }
      return {
        type: "TextTrace",
        // rule,
        span: { from: startIdx, to: startIdx },
        error: { expected: [rule.value], got: next },
      };
    case "Ref":
      const innerRule = grammar[rule.name];
      const innerTrace = doParse(grammar, innerRule, startIdx, input);
      return {
        type: "RefTrace",
        // rule,
        span: innerTrace.span,
        error: innerTrace.error,
        innerTrace,
      };
    case "Choice":
      // TODO: don't evaluate other rules after we find one that matches?
      const choiceTraces = rule.choices.map((choice) =>
        doParse(grammar, choice, startIdx, input)
      );
      // TODO: find longest trace, not just first?
      const winnerIdx = choiceTraces.findIndex(
        (choiceTree) => choiceTree.error === null
      );
      const winner = choiceTraces[winnerIdx];
      return {
        type: "ChoiceTrace",
        // rule,
        error: winnerIdx === -1 ? { expected: ["TODO"], got: "TODO" } : null,
        innerTrace: winner,
        optIdx: winnerIdx,
        span: winner.span,
      };
    case "Sequence":
      const accum = rule.items.reduce<SequenceSt>(
        (accum, rule) => {
          // TODO: early return variant of reduce
          if (accum.error) {
            return accum;
          }
          const itemTrace = doParse(grammar, rule, accum.pos, input);
          return {
            itemTraces: [...accum.itemTraces, itemTrace],
            pos: itemTrace.span.to,
            error: itemTrace.error,
          };
        },
        { itemTraces: [], pos: startIdx, error: null }
      );
      return {
        type: "SeqTrace",
        // rule,
        itemTraces: accum.itemTraces,
        span: { from: startIdx, to: accum.pos },
        error: accum.error,
      };
    case "Char":
      if (matchesCharRule(rule.rule, input[startIdx])) {
        return {
          type: "CharTrace",
          span: { from: startIdx, to: startIdx + 1 },
          error: null,
        };
      }
      return {
        type: "CharTrace",
        span: { from: startIdx, to: startIdx },
        error: {
          expected: [charRuleToString(rule.rule)],
          got: input[startIdx],
        },
      };
    case "RepSep":
      throw new Error("TODO");
    case "Succeed":
      return {
        type: "SucceedTrace",
        // rule,
        error: null,
        span: { from: startIdx, to: startIdx },
      };
  }
}

type SequenceSt = {
  itemTraces: TraceTree[];
  pos: number;
  error: ParseError | null;
};

function matchesCharRule(charRule: SingleCharRule, c: char): boolean {
  switch (charRule.type) {
    case "Literal":
      return c === charRule.value;
    case "Not":
      return !matchesCharRule(charRule, c);
    case "Range":
      return charRule.from <= c && c <= charRule.to;
  }
}
