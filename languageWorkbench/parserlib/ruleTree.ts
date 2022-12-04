import { TraceTree } from "./parser";
import { flatten } from "../../util/util";
import { Span } from "./types";
import { allItems } from "../../util/linkedList";

export type RuleTree = {
  name: string;
  span: Span;
  children: RuleTree[];
  captureName: string | null;
};

export function extractRuleTree(tt: TraceTree): RuleTree | null {
  switch (tt.type) {
    case "RefTrace":
      return {
        name: tt.name,
        captureName: tt.captureName,
        children: getChildren(tt.innerTrace),
        span: tt.span,
      };
    default:
      throw new Error(`have to start with ref trace; got ${tt.type}`);
  }
}

function getChildren(tt: TraceTree): RuleTree[] {
  if (tt.error) {
    return [];
  }
  switch (tt.type) {
    case "SeqTrace":
      return flatten([...allItems(tt.itemTraces)].map(getChildren));
    case "RefTrace":
      return [extractRuleTree(tt)];
    case "ChoiceTrace":
      return getChildren(tt.innerTrace);
    case "RepSepTrace":
      return [
        ...flatten(tt.repTraces.map(getChildren)),
        ...flatten(tt.sepTraces.map(getChildren)),
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
