import {
  Grammar,
  Rule,
  Span,
  SingleCharRule,
  spanLength,
  char,
  ParseError,
} from "./types";
import { prettyPrintRule } from "./pretty";
import { reduceEarlyReturn } from "../../util/util";

export type TraceTree = {
  span: Span;
  error: ParseError | null;
} & TraceInner;

// TODO:
// Either<{span: Span} & TraceInner, ParseError>

type TraceInner =
  | { type: "SeqTrace"; itemTraces: TraceTree[] }
  | {
      type: "ChoiceTrace";
      optIdx: number;
      innerTrace: TraceTree;
    }
  | { type: "RepSepTrace"; repTraces: TraceTree[]; sepTraces: TraceTree[] }
  | {
      type: "RefTrace";
      name: string;
      captureName: string | null;
      innerTrace: TraceTree;
    }
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
    throw new Error(`no such rule: "${startRule}"`);
  }
  const res = doParse(grammar, rule, 0, input);
  return {
    type: "RefTrace",
    span: res.span,
    error: null,
    name: startRule,
    captureName: null,
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
      error: { offset: startIdx, expected: rule, got: "EOF" },
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
        error: { offset: startIdx, expected: rule, got: next },
      };
    case "Ref":
      const innerRule = grammar[rule.rule];
      const innerTrace = doParse(grammar, innerRule, startIdx, input);
      return {
        type: "RefTrace",
        name: rule.rule,
        captureName: rule.captureName,
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
            offset: startIdx,
            expected: rule,
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
      const accum = reduceEarlyReturn<Rule, SequenceSt>(
        rule.items,
        (accum, rule) => {
          const itemTrace = doParse(grammar, rule, accum.pos, input);
          return {
            itemTraces: [...accum.itemTraces, itemTrace],
            pos: itemTrace.span.to,
            error: itemTrace.error,
          };
        },
        (accum) => accum.error !== null,
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
          offset: startIdx,
          expected: rule,
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

export function formatParseError(error: ParseError): string {
  return `offset ${error.offset}: expected ${
    typeof error.expected === "string"
      ? error.expected
      : prettyPrintRule(error.expected)
  }; got ${error.got}`;
}

function forEachTraceTreeNode(tree: TraceTree, fn: (node: TraceTree) => void) {
  fn(tree);
  switch (tree.type) {
    case "ChoiceTrace":
      if (tree.innerTrace) {
        forEachTraceTreeNode(tree.innerTrace, fn);
      }
      break;
    case "SeqTrace":
      tree.itemTraces.forEach((itemTrace) => {
        forEachTraceTreeNode(itemTrace, fn);
      });
      break;
    case "RefTrace":
      forEachTraceTreeNode(tree.innerTrace, fn);
      break;
    case "RepSepTrace":
      // TODO: in order?
      tree.repTraces.forEach((innerTrace) => {
        forEachTraceTreeNode(innerTrace, fn);
      });
      tree.sepTraces.forEach((innerTrace) => {
        forEachTraceTreeNode(innerTrace, fn);
      });
      break;
  }
}

export function getErrors(input: string, tree: TraceTree): ParseError[] {
  const out: ParseError[] = [];
  forEachTraceTreeNode(tree, (node) => {
    if (node.error) {
      out.push(node.error);
    }
  });
  if (out.length === 0 && tree.span.to !== input.length) {
    out.push({
      offset: tree.span.to,
      // TODO: make this into a different type of parse error
      expected: "end of file",
      got: input.slice(tree.span.to),
    });
  }
  return out;
}
