import {
  rec,
  int,
  Rec,
  Term,
  str,
  Statement,
  Rule,
  rule,
  varr,
  or,
  and,
} from "../core/types";
import { Grammar } from "./grammar";
import { RuleTree } from "./ruleTree";

type State = {
  records: Rec[];
  nextID: number;
  source: string;
};

export function getAllStatements(
  grammar: Grammar,
  tree: RuleTree,
  source: string
): Statement[] {
  return [
    ...declareTables(grammar),
    ...flatten(tree, source).map(
      (record): Statement => ({ type: "Insert", record })
    ),
    { type: "Rule", rule: getUnionRule(grammar) },
  ];
}

export function declareTables(grammar: Grammar): Statement[] {
  const stmts: Statement[] = [];
  Object.keys(grammar).forEach((ruleName) => {
    stmts.push({ type: "TableDecl", name: `ast.${ruleName}` });
  });
  return stmts;
}

export function flatten(tree: RuleTree, source: string): Rec[] {
  const state: State = {
    records: [],
    nextID: 0,
    source,
  };
  recur(state, tree, -1);
  return state.records;
}

export function getUnionRule(g: Grammar): Rule {
  return rule(
    rec("ast_internal.node", {
      id: varr("ID"),
      parentID: varr("ParentID"),
      span: varr("S"),
      text: varr("T"),
    }),
    or(
      Object.keys(g).map((ruleName) =>
        and([
          rec(`ast.${ruleName}`, {
            id: varr("ID"),
            parentID: varr("ParentID"),
            span: varr("S"),
            text: varr("T"),
          }),
        ])
      )
    )
  );
}

function recur(state: State, tree: RuleTree, parentID: number): number {
  const id = state.nextID;
  state.nextID++;
  const props: { [name: string]: Term } = {
    id: int(id),
    span: rec("span", {
      from: int(tree.span.from),
      to: int(tree.span.to),
    }),
    parentID: int(parentID),
    text: str(state.source.substring(tree.span.from, tree.span.to)),
  };
  tree.children.forEach((child) => {
    recur(state, child, id);
  });
  state.records.push(rec(`ast.${tree.name}`, props));
  return id;
}
