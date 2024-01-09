import { TraceTree } from "./parser";
import { flatten } from "../../util/util";
import { ParseError, Span } from "./types";

export type RuleTree = {
  name: string;
  span: Span;
  children: RuleTree[];
  captureName: string | null;
};

export function extractRuleTree(
  tt: TraceTree
): [RuleTree | null, ParseError[]] {
  const errors: ParseError[] = [];
  const rt = extractRuleTreeRecurse(errors, tt);
  return [rt, errors];
}

function extractRuleTreeRecurse(errors: ParseError[], tt: TraceTree): RuleTree {
  switch (tt.type) {
    case "RefTrace":
      return {
        name: tt.name,
        captureName: tt.captureName,
        children: getChildren(errors, tt.innerTrace),
        span: tt.span,
      };
    default:
      throw new Error(`have to start with ref trace; got ${tt.type}`);
  }
}

function getChildren(errors: ParseError[], tt: TraceTree): RuleTree[] {
  if (tt.error) {
    return [];
  }
  switch (tt.type) {
    case "SeqTrace":
      return flatten(tt.itemTraces.map((item) => getChildren(errors, item)));
    case "RefTrace":
      return [extractRuleTreeRecurse(errors, tt)];
    case "ChoiceTrace":
      return getChildren(errors, tt.innerTrace);
    case "RepSepTrace":
      return [
        ...flatten(tt.repTraces.map((rep) => getChildren(errors, rep))),
        ...flatten(tt.sepTraces.map((sep) => getChildren(errors, sep))),
      ];
    default:
      return [];
  }
}

export function childrenByName(rt: RuleTree, name: string): RuleTree[] {
  return rt.children.filter((c) => c.name === name);
}

export function childByName(
  rt: RuleTree,
  name: string,
  captureName: string | null = null
): RuleTree {
  return rt.children.find(
    (c) => c.name === name && c.captureName === captureName
  );
}

export function textForSpan(input: string, span: Span): string {
  return input.substring(span.from, span.to);
}
