import { Grammar, Rule, Span, SingleCharRule, char } from "./grammar";
import { prettyPrintCharRule, prettyPrintRule } from "./pretty";

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
  | { type: "RepSepTrace"; repTraces: TraceTree[]; sepTraces: TraceTree[] }
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
      // debug
      if (!winner) {
        console.error(choiceTraces);
      }
      // end debug
      return {
        type: "ChoiceTrace",
        // rule,
        error:
          winnerIdx === -1
            ? {
                expected: [prettyPrintRule(rule)],
                got: input.slice(startIdx, startIdx + 5), // lol
              }
            : null,
        innerTrace: winner,
        optIdx: winnerIdx,
        span: winner ? winner.span : { from: startIdx, to: startIdx },
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
          expected: [prettyPrintCharRule(rule.rule)],
          got: input[startIdx],
        },
      };
    case "RepSep":
      let mode: "rep" | "sep" = "rep";
      let curIdx = startIdx;
      const repTraces: TraceTree[] = [];
      const sepTraces: TraceTree[] = [];
      const resTrace = (error: ParseError | null): TraceTree => ({
        type: "RepSepTrace",
        repTraces,
        sepTraces,
        error: error,
        span: { from: startIdx, to: curIdx },
      });
      // TODO: DRY up
      while (true) {
        if (mode === "rep") {
          const res = doParse(grammar, rule.rep, curIdx, input);
          if (res.error) {
            return resTrace(null);
          }
          repTraces.push(res);
          curIdx = res.span.to;
        } else {
          const res = doParse(grammar, rule.sep, curIdx, input);
          if (res.error) {
            // sep erroring out means we're done...
            // TODO: allow trailing separator
            return resTrace(null);
          }
          sepTraces.push(res);
          curIdx = res.span.to;
        }
      }
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
