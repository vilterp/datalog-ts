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
  recExpr,
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
    case "AttachedRule":
      return {
        type: "Rule",
        rule: parserRuleToInternal(stmt),
      };
    case "DetachedRule":
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
  switch (rule.type) {
    case "AttachedRule":
      return {
        name: rule.recordCall.ident.text,
        body: relationExprToInternal({
          type: "AnonymousRelation",
          record: rule.recordCall.record,
          relationExpr: rule.relationExpr,
          span: rule.relationExpr.span,
          text: rule.relationExpr.text,
        }),
      };
    case "DetachedRule":
      return {
        name: rule.ident.text,
        body: relationExprToInternal(rule.relationExpr),
      };
  }
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
            clauses: disjunct.conjunct.map(parserConjunctToInternal),
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

function parserConjunctToInternal(conjunct: DLConjunct): Conjunct {
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

function parserScalarToInternal(scalar: DLScalarExpr): ScalarExpr {
  switch (scalar.type) {
    case "Array":
      return {
        type: "ArrayExpr",
        items: scalar.scalarExpr.map(parserScalarToInternal),
      };
    case "Dict":
      return {
        type: "DictExpr",
        items: pairsToObj(
          scalar.dictKeyValue.map((kv) => ({
            key: parserStrToInternal(kv.key),
            val: parserScalarToInternal(kv.value),
          }))
        ),
      };
    case "Bool":
      return bool(scalar.text === "true");
    case "Int":
      return int(parseInt(scalar.text));
    case "Placeholder":
      return recCall("???", {});
    case "String":
      return str(parserStrToInternal(scalar));
    case "Var":
      return varr(scalar.text);
    case "Record":
      return recExpr(
        mapListToObj(
          scalar.recordAttrs.recordKeyValue.map((keyValue) => ({
            key: keyValue.ident.text,
            value: parserScalarToInternal(keyValue.scalarExpr),
          }))
        )
      );
    case "RecordCall":
      return {
        type: "RecCallExpr",
        relation: scalar.ident.text,
        attrs: mapListToObj(
          scalar.record.recordAttrs.recordKeyValue.map((keyValue) => ({
            key: keyValue.ident.text,
            value: parserScalarToInternal(keyValue.scalarExpr),
          }))
        ),
      };
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

function parserArithmeticToInternal(arithmetic: DLArithmetic): RecCallExpr {
  const op = arithmetic.arithmeticOp.text;
  const left = parserScalarToInternal(arithmetic.left);
  const right = parserScalarToInternal(arithmetic.right);
  const res = parserScalarToInternal(arithmetic.result);
  const mappedOp = ARITHMETIC_MAPPING[op];
  if (!mappedOp) {
    throw new Error(`unknown arithmetic operator: ${op}`);
  }
  return recCall(`base.${mappedOp}`, {
    a: left,
    b: right,
    res: res,
  });
}

const COMPARISON_MAPPING = {
  "=": "eq",
  "!=": "neq",
  "<": "lt",
  ">": "gt",
  "<=": "lte",
  ">=": "gte",
};

function parserComparisonToInternal(comparison: DLComparison): RecCallExpr {
  const op = comparison.comparisonOp.text;
  const left = parserScalarToInternal(comparison.left);
  const right = parserScalarToInternal(comparison.right);
  const mappedOp = COMPARISON_MAPPING[op];
  if (!mappedOp) {
    throw new Error(`unknown comparison operator: ${op}`);
  }
  return recCall(`base.${mappedOp}`, {
    a: left,
    b: right,
  });
}
