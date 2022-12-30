import { DefaultDict } from "../../util/defaultDict";
import { RuleTree } from "./ruleTree";
import { Span } from "./types";

export type ASTNodeRecord = {
  id: string;
  parentID: number;
  span: Span;
  text: string;
};

type ByRule = {
  length: number;
  byID: { [id: string]: ASTNodeRecord };
  byParentID: DefaultDict<string, ASTNodeRecord[]>;
};

const getEmptyByRule = (): ByRule => ({
  length: 0,
  byID: {},
  byParentID: new DefaultDict<string, ASTNodeRecord[]>(() => []),
});

export type NodesByRule = DefaultDict<string, ByRule>;

export function emptyNodesByRule() {
  return new DefaultDict<string, ByRule>(getEmptyByRule);
}

export function flattenByRule(
  ruleTree: RuleTree,
  source: string,
  leaves: Set<string>
): NodesByRule {
  const result: NodesByRule = emptyNodesByRule();
  let nextID = 0;
  const recur = (node: RuleTree, parentID: number) => {
    const id = nextID;
    nextID++;
    // ensure rule is there
    const forRule = result.get(node.name);
    forRule.length++;
    // construct node
    const record: ASTNodeRecord = {
      id: id.toString(),
      parentID,
      span: node.span,
      text: source.substring(node.span.from, node.span.to),
    };
    // add node by ID
    forRule.byID[id] = record;
    // add node by parent id
    const byParentID = forRule.byParentID.get(parentID.toString());
    byParentID.push(record);
    // short circuit if this is a leaf
    if (leaves.has(node.name)) {
      return;
    }
    // children
    for (const child of node.children) {
      recur(child, id);
    }
  };
  recur(ruleTree, -1);
  return result;
}
