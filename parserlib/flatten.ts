import {
  rec,
  int,
  Rec,
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

function getUnionRule(g: Grammar): Rule {
  return rule(
    rec("astInternal.node", {
      id: varr("ID"),
      parentID: varr("ParentID"),
      span: varr("Span"),
      text: varr("Text"),
      rule: varr("Rule"),
    }),
    or(
      Object.keys(g).map((ruleName) =>
        and([
          rec(`ast.${ruleName}`, {
            id: varr("ID"),
            parentID: varr("ParentID"),
            span: varr("Span"),
            text: varr("Text"),
            rule: varr("Rule"),
          }),
        ])
      )
    )
  );
}

function recur(state: State, tree: RuleTree, parentID: number): number {
  const id = state.nextID;
  state.nextID++;
  let prevChildID = -1;
  tree.children.forEach((child, idx) => {
    const childID = recur(state, child, id);
    if (parentID != -1 && idx === 0) {
      state.records.push(
        rec(`astInternal.firstChild`, {
          parentID: int(id),
          id: int(childID),
        })
      );
    }
    if (idx > 0 && idx < tree.children.length) {
      state.records.push(
        rec(`astInternal.next`, {
          prev: int(prevChildID),
          next: int(childID),
        })
      );
    }
    if (parentID != -1 && idx === tree.children.length - 1) {
      state.records.push(
        rec(`astInternal.lastChild`, { parentID: int(id), id: int(childID) })
      );
    }
    prevChildID = childID;
  });
  state.records.push(
    rec(`ast.${tree.name}`, {
      id: int(id),
      parentID: int(parentID),
      span: rec("span", {
        from: int(tree.span.from),
        to: int(tree.span.to),
      }),
      text: str(state.source.substring(tree.span.from, tree.span.to)),
      // a bit duplicative to put this in here since it's already in
      // the record name, but it does make rendering the rule tree a
      // lot easier in the absence a virtual `equal` relation.
      rule: str(tree.name),
    })
  );
  return id;
}
