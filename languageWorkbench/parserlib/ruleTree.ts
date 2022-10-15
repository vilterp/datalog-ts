import { TraceTree } from "./parser";
import { flatten } from "../../util/util";
import { Span } from "./types";

export type RuleTree = {
  name: string;
  width: number;
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
        width: tt.width,
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
      return flatten(tt.itemTraces.map(getChildren));
    case "RefTrace":
      return [extractRuleTree(tt)];
    case "ChoiceTrace":
      return getChildren(tt.innerTrace);
    case "RepSepTrace":
      // TODO: keep sep traces?
      return flatten(tt.repTraces.map(getChildren));
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
