import { spanContainsIdx } from "../../../uiCommon/ide/keymap/util";
import { Span } from "../../parserlib/types";
import { DLMain, DLTerm, DLConjunct } from "./parser";

export type CompletionItem = {
  name: string;
  span: Span;
  type: DefnType;
};

type DefnType = "Relation" | "Attr" | "Var";

export type Defn = {
  name: string;
  span: Span;
  type: DefnType;
  scope: Scope;
};

type Scope = { type: "Global" } | { type: "Rule"; name: string };

const globalScope: Scope = { type: "Global" };

function getCurrentScope(main: DLMain, cursor: number): Scope {
  main.statement.forEach((stmt) => {
    if (stmt.type === "Rule" && spanContainsIdx(stmt.span, cursor)) {
      return { type: "Rule", name: stmt.record.ident.text };
    }
  });
  return globalScope;
}

export function getCompletionItems(
  main: DLMain,
  cursor: number
): CompletionItem[] {
  const currentScope = getCurrentScope(main, cursor);
  const defns = getAllDefns(main);

  return defns.filter((defn) => isWithinScope(defn.scope, currentScope));
}

function isWithinScope(usageScope: Scope, defnScope: Scope): boolean {
  if (usageScope.type === "Rule") {
    if (defnScope.type === "Rule") {
      return usageScope.name === defnScope.name;
    }
  }
  return true;
}

export function getAllDefns(main: DLMain): Defn[] {
  const results: Defn[] = [];

  main.statement.forEach((stmt) => {
    switch (stmt.type) {
      case "TableDecl":
        results.push({
          type: "Relation",
          name: stmt.name.text,
          span: stmt.span,
          scope: globalScope,
        });
        break;
      case "Rule": {
        const ruleName = stmt.record.ident.text;
        const ruleScope: Scope = { type: "Rule", name: ruleName };
        results.push({
          type: "Relation",
          name: ruleName,
          span: stmt.span,
          scope: globalScope,
        });
        pushVars(results, ruleScope, stmt.record);
        stmt.record.recordAttrs.recordKeyValue.forEach((attr) => {
          results.push({
            type: "Attr",
            name: attr.ident.text,
            scope: ruleScope,
            span: attr.span,
          });
        });
        stmt.disjunct.forEach((disjunct) => {
          disjunct.conjunct.forEach((conjunct) => {
            pushVars(results, ruleScope, conjunct);
          });
        });
        break;
      }
    }
  });

  return results;
}

// TODO: get all usages

function pushVars(
  results: Defn[],
  scope: Scope,
  conjunct: DLConjunct | DLTerm
) {
  switch (conjunct.type) {
    case "Aggregation":
      pushVars(results, scope, conjunct.record);
      break;
    case "AssignmentOnLeft":
      pushVars(results, scope, conjunct.left);
      pushVars(results, scope, conjunct.right);
      pushVars(results, scope, conjunct.result);
      break;
    case "AssignmentOnRight":
      pushVars(results, scope, conjunct.left);
      pushVars(results, scope, conjunct.right);
      pushVars(results, scope, conjunct.result);
      break;
    case "Comparison":
      pushVars(results, scope, conjunct.left);
      pushVars(results, scope, conjunct.right);
      break;
    case "Negation":
      pushVars(results, scope, conjunct.record);
      break;
    case "Placeholder":
      break;
    case "Record":
      conjunct.recordAttrs.recordKeyValue.forEach((kv) => {
        pushVars(results, scope, kv.term);
      });
      break;
    case "Array":
      conjunct.term.forEach((item) => {
        pushVars(results, scope, item);
      });
      break;
    case "Dict":
      conjunct.dictKeyValue.forEach((item) => {
        pushVars(results, scope, item.value);
      });
    case "Var":
      results.push({
        type: "Var",
        name: conjunct.text,
        span: conjunct.span,
        scope: scope,
      });
    default:
      break;
  }
}
