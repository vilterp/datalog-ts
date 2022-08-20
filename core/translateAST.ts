import {
  DLArithmetic,
  DLComparison,
  DLConjunct,
  DLRelationExpr,
  DLRule,
  DLScalarExpr,
  DLStatement,
  DLString,
} from "../languageWorkbench/languages/dl/parser";
import { deEscape } from "../languageWorkbench/parserlib/types";
import { mapListToObj, pairsToObj } from "../util/util";
import {
  Conjunct,
  array,
  bool,
  dict,
  int,
  rec,
  Rec,
  Rule,
  Statement,
  str,
  varr,
  RelationExpr,
  Conjuncts,
  recCall,
  ScalarExpr,
  RecCallExpr,
} from "./types";

export function parserStatementToInternal(stmt: DLStatement): Statement {
  switch (stmt.type) {
    case "DeleteFact":
      return {
        type: "Delete",
        record: parserScalarToInternal(stmt.record) as RecCallExpr,
      };
    case "Fact":
      return {
        type: "Fact",
        record: parserScalarToInternal(stmt.record) as RecCallExpr,
      };
    case "Rule":
      return {
        type: "Rule",
        rule: parserRuleToInternal(stmt),
      };
    case "TableDecl":
      return {
        type: "TableDecl",
        name: stmt.name.text,
      };
    case "LoadStmt":
      return {
        type: "LoadStmt",
        path: stmt.path.text,
      };
    case "Query":
      return {
        type: "Query",
        record: parserScalarToInternal(stmt.record) as RecCallExpr,
      };
  }
}

export function parserRuleToInternal(rule: DLRule): Rule {
  return {
    name: rule.ident.text,
    body: relationExprToInternal(rule.relationExpr),
  };
}

function relationExprToInternal(relationExpr: DLRelationExpr): RelationExpr {
  switch (relationExpr.type) {
    case "Aggregation":
      return {
        type: "Aggregation",
        aggregation: relationExpr.aggregation.text,
        varNames: relationExpr.var.map((dlVar) => dlVar.text),
        expr: relationExprToInternal(relationExpr.relationExpr),
      };
    case "Disjuncts":
      return {
        type: "Or",
        opts: relationExpr.disjunct.map(
          (disjunct): Conjuncts => ({
            type: "And",
            clauses: disjunct.conjunct.map(conjunctToInternal),
          })
        ),
      };
    case "RelationLiteral":
      // TODO: desugar into like
      // {x: A} :- A = 1 or A = 2 or A = 3
      // but what is the x?
      throw new Error("TODO");
  }
}

function conjunctToInternal(conjunct: DLConjunct): Conjunct {
  switch (conjunct.type) {
    case "AssignmentOnLeft":
    case "AssignmentOnRight":
      return parserArithmeticToInternal(conjunct);
    case "Comparison":
      return parserComparisonToInternal(conjunct);
    case "Negation":
      return {
        type: "Negation",
        record: parserScalarToInternal(conjunct.record) as RecCallExpr,
      };
    case "Placeholder":
      return parserScalarToInternal(conjunct) as RecCallExpr;
    case "RecordCall":
      return parserScalarToInternal(conjunct) as RecCallExpr;
  }
}

export function parserConjunctToInternal(term: DLConjunct): Conjunct {
  switch (term.type) {
    case "Negation":
      return {
        type: "Negation",
        record: recCall(term.)
      }
    case "Array":
      return array(term.term.map(parserTermToInternal));
    case "Dict":
      return dict(
        pairsToObj(
          term.dictKeyValue.map((kv) => ({
            key: parserStrToInternal(kv.key),
            val: parserTermToInternal(kv.value),
          }))
        )
      );
    case "Bool":
      return bool(term.text === "true");
    case "Int":
      return int(parseInt(term.text));
    case "Placeholder":
      return recCall("???", rec({}));
    case "String":
      return str(parserStrToInternal(term));
    case "Var":
      return varr(term.text);
    case "Record":
      return rec(
        term.ident.text,
        mapListToObj(
          term.recordAttrs.recordKeyValue.map((keyValue) => ({
            key: keyValue.ident.text,
            value: parserTermToInternal(keyValue.term),
          }))
        )
      );
  }
}

function parserScalarToInternal(scalar: DLScalarExpr): ScalarExpr {
  switch (scalar.type) {
    XXXX,
  }
}

function parserStrToInternal(term: DLString): string {
  return deEscape(term.stringChar.map((c) => c.text).join(""));
}

// some real desugaring!

const ARITHMETIC_MAPPING = {
  "+": "add",
  "*": "mul",
};

function parserArithmeticToInternal(arithmetic: DLArithmetic): RecCall {
  const op = arithmetic.arithmeticOp.text;
  const left = parserTermToInternal(arithmetic.left);
  const right = parserTermToInternal(arithmetic.right);
  const res = parserTermToInternal(arithmetic.result);
  const mappedOp = ARITHMETIC_MAPPING[op];
  if (!mappedOp) {
    throw new Error(`unknown arithmetic operator: ${op}`);
  }
  return recCall(
    `base.${mappedOp}`,
    rec({
      a: left,
      b: right,
      res: res,
    })
  );
}

const COMPARISON_MAPPING = {
  "=": "eq",
  "!=": "neq",
  "<": "lt",
  ">": "gt",
  "<=": "lte",
  ">=": "gte",
};

function parserComparisonToInternal(comparison: DLComparison): RecCall {
  const op = comparison.comparisonOp.text;
  const left = parserTermToInternal(comparison.left);
  const right = parserTermToInternal(comparison.right);
  const mappedOp = COMPARISON_MAPPING[op];
  if (!mappedOp) {
    throw new Error(`unknown comparison operator: ${op}`);
  }
  return recCall(
    `base.${mappedOp}`,
    rec({
      a: left,
      b: right,
    })
  );
}
