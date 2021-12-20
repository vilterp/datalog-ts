import { rec, int, Rec, Term, str } from "../core/types";
import { RuleTree } from "./ruleTree";

export function flatten(tree: RuleTree, source: string): Rec[] {
  const records: Rec[] = [];
  recur(records, tree, source);
  return records;
}

function recur(records: Rec[], tree: RuleTree, source: string): number {
  const props: { [name: string]: Term } = {
    span: rec("span", {
      from: int(tree.span.from),
      to: int(tree.span.to),
    }),
  };
  tree.children.forEach((child) => {
    const childID = recur(records, child, source);
    props[child.name] = int(childID);
  });
  const id = records.length;
  props.id = int(id);
  if (tree.children.length === 0) {
    props.text = str(source.substring(tree.span.from, tree.span.to));
  }
  records.push(rec(tree.name, props));
  return id;
}
