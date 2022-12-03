import { RuleTree } from "./ruleTree";
import { Span } from "./types";

export type ASTNodeRecord = {
  id: number;
  parentID: number;
  span: Span;
  text: string;
};

export type NodesByRule = {
  [ruleName: string]: {
    length: number;
    byID: { [id: string]: ASTNodeRecord };
    byParentID: { [parentID: string]: ASTNodeRecord[] };
  };
};

export function flattenByRule(
  ruleTree: RuleTree,
  source: string,
  leaves: Set<string>
): NodesByRule {
  const result: NodesByRule = {};
  let nextID = 0;
  const recur = (node: RuleTree, parentID: number) => {
    if (leaves.has(node.name)) {
      return;
    }
    const id = nextID;
    nextID++;
    // ensure rule is there
    // TODO: I really need a DefaultDict
    let forRule = result[node.name];
    if (!forRule) {
      forRule = { byID: {}, byParentID: {}, length: 0 };
      result[node.name] = forRule;
    }
    forRule.length++;
    // construct node
    const record: ASTNodeRecord = {
      id,
      parentID,
      span: node.span,
      text: source.substring(node.span.from, node.span.to),
    };
    // add node by ID
    result[node.name].byID[id] = record;
    // add node by parent id
    let byParentID = result[node.name].byParentID[parentID];
    if (!byParentID) {
      byParentID = [];
      result[node.name].byParentID[parentID] = byParentID;
    }
    byParentID.push(record);
    // children
    for (const child of node.children) {
      recur(child, id);
    }
  };
  recur(ruleTree, -1);
  return result;
}
