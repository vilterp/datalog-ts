import { rec, int, Rec, Term } from "../core/types";
import { RuleTree } from "./ruleTree";

export function flatten(tree: RuleTree): Rec[] {
  const records: Rec[] = [];
  recur(records, tree);
  return records;
}

function recur(records: Rec[], tree: RuleTree): number {
  const props: { [name: string]: Term } = {};
  tree.children.forEach((child) => {
    const childID = recur(records, child);
    props[child.name] = int(childID);
  });
  const id = records.length;
  props.id = int(id);
  records.push(rec(tree.name, props));
  return id;
}
