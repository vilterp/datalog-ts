import { spanContainsIdx } from "../../../uiCommon/ide/keymap/util";
import { NodesByRule } from "../../parserlib/flattenByRule";
import { RuleTree } from "../../parserlib/ruleTree";
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

export type Var = {
  name: string;
  span: Span;
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

function getAllDefns(main: DLMain): Defn[] {
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

function* ruleConjunct(db: NodesByRule): Generator<{
  ruleID: string;
  conjunctID: string;
}> {
  for (const ruleID in db["rule"].byID) {
    for (const disjunctID in db["disjunct"].byParentID[ruleID]) {
      for (const conjunctID in db["conjunct"].byParentID[disjunctID]) {
        yield { ruleID, conjunctID };
      }
    }
  }
}

function* scopeRuleBodyTerm(
  db: NodesByRule
): Generator<{ ruleID: string; termID: number }> {
  for (const { ruleID, conjunctID } of ruleConjunct(db)) {
    for (const record of db["record"].byParentID[conjunctID]) {
      yield { ruleID, termID: record.id };
    }
    for (const negation of db["negation"].byParentID[conjunctID]) {
      for (const record of db["record"].byParentID[negation.id]) {
        yield { ruleID, termID: record.id };
      }
    }
    for (const aggregation of db["aggregation"].byParentID[conjunctID]) {
      for (const record of db["record"].byParentID[aggregation.id]) {
        yield { ruleID, termID: record.id };
      }
    }
    for (const comparison of db["comparison"].byParentID[conjunctID]) {
      for (const term of db["term"].byParentID[comparison.id]) {
        yield { ruleID, termID: term.id };
      }
    }
    for (const comparison of db["arithmetic"].byParentID[conjunctID]) {
      for (const assignment of db["assignmentOnLeft"].byParentID[
        comparison.id
      ]) {
        for (const term of db["term"].byParentID[assignment.id]) {
          yield { ruleID, termID: term.id };
        }
      }
      for (const assignment of db["assignmentOnRight"].byParentID[
        comparison.id
      ]) {
        for (const term of db["term"].byParentID[assignment.id]) {
          yield { ruleID, termID: term.id };
        }
      }
    }
  }
}

function* scopeVar(
  db: NodesByRule
): Generator<{ scopeID: string; name: string; span: Span; kind: string }> {
  for (const result of scopeVarRuleInvocation(db)) {
    yield result;
  }
  for (const result of scopeVarTerm(db)) {
    yield result;
  }
  for (const result of scopeVarAttr(db)) {
    yield result;
  }
  for (const result of scopeVarFact(db)) {
    yield result;
  }
}

function* scopeVarAttr(db: NodesByRule): Generator<{
  scopeID: string;
  nodeID: string;
  name: string;
  span: Span;
  kind: "attr";
}> {
  for (const { termID: recordID } of scopeRuleBodyTerm(db)) {
    if (db["record"].byID[recordID]) {
      for (const headIdent of db["ident"].byParentID[recordID]) {
        for (const attr of db["recordAttrs"].byParentID[recordID]) {
          for (const keyValue of db["recordKeyValue"].byParentID[attr.id]) {
            for (const kvIdent of db["ident"].byParentID[keyValue.id]) {
              yield {
                scopeID: headIdent.text,
                name: kvIdent.text,
                nodeID: kvIdent.id.toString(),
                span: kvIdent.span,
                kind: "attr",
              };
            }
          }
        }
      }
    }
  }
}

function* scopeVarFact(db: NodesByRule): Generator<{
  scopeID: "global";
  name: string;
  span: Span;
  kind: "relation";
}> {
  for (const factID in db["fact"].byID) {
    for (const record of db["record"].byParentID[factID]) {
      for (const ident of db["ident"].byParentID[record.id]) {
        yield {
          scopeID: "global",
          kind: "relation",
          name: ident.text,
          span: ident.span,
        };
      }
    }
  }
}

function* scopeVarRuleInvocation(
  db: NodesByRule
): Generator<{ scopeID: string; name: string; span: Span; kind: string }> {
  // TODO: pass in rule id?
  for (const { termID: recordID, ruleID } of scopeRuleBodyTerm(db)) {
    if (db["record"].byID[recordID]) {
      for (const ident of db["ident"].byParentID[recordID]) {
        yield {
          scopeID: "global", // TODO: not string
          kind: "relation",
          name: ident.text,
          span: ident.span,
        };
      }
    }
  }
}

function* scopeVarTerm(
  db: NodesByRule
): Generator<{ scopeID: string; name: string; span: Span; kind: string }> {
  for (const { ruleID, termID } of scopeRuleBodyTerm(db)) {
    // TODO: pass in some id so we're not doing a cross join?
    for (const { termID: innerTermID, name, span } of scopeTermOrRecordVar(
      db
    )) {
      if (termID.toString() === innerTermID) {
        yield { scopeID: ruleID, name, span, kind: "var" };
      }
    }
  }
}

function* scopeTermOrRecordVar(
  db: NodesByRule
): Generator<{ termID: string; name: string; span: Span }> {
  for (const { recordID, name, span } of scopeRecordVar(db)) {
    yield { termID: recordID, name, span };
  }
  for (const { termID, name, span } of scopeTermVar(db)) {
    yield { termID, name, span };
  }
}

function* scopeTermVar(
  db: NodesByRule
): Generator<{ termID: string; name: string; span: Span }> {
  for (const termID in db["term"].byID) {
    for (const varRecord of db["var"].byParentID[termID]) {
      yield { termID, name: varRecord.text, span: varRecord.span };
    }
  }
  for (const termID in db["term"].byID) {
    for (const record of db["record"].byParentID[termID]) {
      // TODO: pass argument to avoid cross join?
      for (const { recordID, name, span } of scopeRecordVar(db)) {
        if (record.id.toString() === recordID) {
          yield { termID, name, span };
        }
      }
    }
  }
  for (const termID in db["term"].byID) {
    for (const array of db["array"].byParentID[termID]) {
      for (const arrItemTerm of db["term"].byParentID[array.id]) {
        // TODO: pass argument
        for (const { termID, name, span } of scopeTermVar(db)) {
          if (termID === arrItemTerm.id.toString()) {
            yield { name, span, termID };
          }
        }
      }
    }
  }
}

function* scopeRecordVar(
  db: NodesByRule
): Generator<{ recordID: string; name: string; span: Span }> {
  for (const recordID in db["record"].byID) {
    for (const recordAttr of db["recordAttrs"].byParentID[recordID]) {
      for (const recordKeyValue of db["recordKeyValue"].byParentID[
        recordAttr.id
      ]) {
        for (const term of db["term"].byParentID[recordKeyValue.id]) {
          // TODO: pass argument
          for (const { termID: valueTerm, name, span } of scopeTermVar(db)) {
            if (valueTerm === term.id.toString()) {
              yield { recordID: valueTerm, name, span };
            }
          }
        }
      }
    }
  }
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

type TokenType =
  | "ident"
  | "typeParameter"
  | "number"
  | "number"
  | "string"
  | "comment"
  | "keyword"
  | "keyword"
  | "string";

export type SemanticToken = { type: TokenType; span: Span };

export function getSemanticTokens(db: NodesByRule): SemanticToken[] {
  const out: SemanticToken[] = [];
  for (const rule in SYNTAX_HIGHLIGHTING_MAPPING) {
    const tokenType = SYNTAX_HIGHLIGHTING_MAPPING[rule];
    if (!db[rule]) {
      continue;
    }
    for (const nodeID in db[rule].byID) {
      const node = db[rule].byID[nodeID];
      out.push({
        span: node.span,
        type: tokenType,
      });
    }
  }
  return out;
}

const SYNTAX_HIGHLIGHTING_MAPPING: { [ruleType: string]: TokenType } = {
  ident: "ident",
  var: "typeParameter",
  int: "number",
  bool: "number",
  string: "string",
  comment: "comment",
  tableKW: "keyword",
  loadKW: "keyword",
  path: "string",
};
