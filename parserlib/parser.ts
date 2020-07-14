import { Grammar, Rule, Span } from "./grammar";

export type TraceTree = {
  rule: Rule;
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
      const next = input.slice(startIdx, rule.value.length);
      if (next === rule.value) {
        return {
          type: "TextTrace",
          rule,
          span: { from: startIdx, to: startIdx + rule.value.length },
          error: null,
        };
      }
      return {
        type: "TextTrace",
        rule,
        span: { from: startIdx, to: startIdx },
        error: { expected: [rule.value], got: next },
      };
    case "Ref":
      const innerRule = grammar[rule.name];
      const innerTrace = doParse(grammar, innerRule, startIdx, input);
      return {
        type: "RefTrace",
        rule,
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
        rule,
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
        rule,
        itemTraces: accum.itemTraces,
        span: { from: startIdx, to: accum.pos },
        error: accum.error,
      };
    case "Char":
      // TODO: replace this with regex?
      throw new Error("TODO");
    case "RepSep":
      throw new Error("TODO");
    case "Succeed":
      return {
        type: "SucceedTrace",
        rule,
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
