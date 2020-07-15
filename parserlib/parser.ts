import {
  Grammar,
  Rule,
  Span,
  SingleCharRule,
  spanLength,
  char,
} from "./grammar";
import { prettyPrintCharRule, prettyPrintRule } from "./pretty";

export type TraceTree = {
  span: Span;
  error: ParseError | null;
} & TraceInner;

// TODO:
// Either<{span: Span} & TraceInner, ParseError>

type ParseError = { expected: string[]; got: string };

type TraceInner =
  | { type: "SeqTrace"; itemTraces: TraceTree[] }
  | {
      type: "ChoiceTrace";
      optIdx: number;
      innerTrace: TraceTree;
    }
  | { type: "RepSepTrace"; repTraces: TraceTree[]; sepTraces: TraceTree[] }
  | { type: "RefTrace"; name: string; innerTrace: TraceTree }
  | { type: "TextTrace" }
  | { type: "CharTrace" }
  | { type: "SucceedTrace" };

export function parse(
  grammar: Grammar,
  startRule: string,
  input: string
): TraceTree {
  const rule = grammar[startRule];
  if (!rule) {
    throw new Error(`no such rule: ${startRule}`);
  }
  const res = doParse(grammar, rule, 0, input);
  return {
    type: "RefTrace",
    span: res.span,
    error: null,
    name: startRule,
    innerTrace: res,
  };
}

function doParse(
  grammar: Grammar,
  rule: Rule,
  startIdx: number,
  input: string
): TraceTree {
  if (startIdx > input.length) {
    return {
      type: "TextTrace", // this is messed up... what to return here?
      error: { expected: ["TODO"], got: "EOF" },
      span: { from: startIdx, to: startIdx },
    };
  }
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
        name: rule.name,
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
      const passed = choiceTraces.filter((c) => c.error === null);
      if (passed.length === 0) {
        return {
          type: "ChoiceTrace",
          error: {
            expected: [prettyPrintRule(rule)],
            got: input.slice(startIdx, startIdx + 5), // lol
          },
          // TODO: these should only be set on success
          span: { from: startIdx, to: startIdx },
          innerTrace: null,
          optIdx: -1,
        };
      }
      const longest = passed.reduce<{
        idx: number;
        length: number;
        trace: TraceTree;
      }>(
        (accum, trace, idx) => {
          const length = spanLength(trace.span);
          return length > accum.length ? { idx, length, trace } : accum;
        },
        { idx: -1, length: -1, trace: null }
      );
      return {
        type: "ChoiceTrace",
        // rule,
        error: null,
        innerTrace: longest.trace,
        optIdx: longest.idx,
        span: longest.trace.span,
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
          mode = "sep";
          curIdx = res.span.to;
        } else {
          const res = doParse(grammar, rule.sep, curIdx, input);
          if (res.error) {
            // sep erroring out means we're done...
            // TODO: allow trailing separator
            return resTrace(null);
          }
          sepTraces.push(res);
          mode = "rep";
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
      return !matchesCharRule(charRule.rule, c);
    case "Range":
      return charRule.from <= c && c <= charRule.to;
    case "AnyChar":
      return true;
  }
}
