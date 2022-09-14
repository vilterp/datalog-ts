import {
  DLArithmetic,
  DLComparison,
  DLRule,
  DLStatement,
  DLString,
  DLTerm,
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
  Term,
  varr,
} from "./types";

export function parserStatementToInternal(stmt: DLStatement): Statement {
  switch (stmt.type) {
    case "DeleteFact":
      return {
        type: "Delete",
        record: parserTermToInternal(stmt.record) as Rec,
      };
    case "Fact":
      return {
        type: "Fact",
        record: parserTermToInternal(stmt.record) as Rec,
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
        record: parserTermToInternal(stmt.record) as Rec,
      };
  }
}

export function parserRuleToInternal(term: DLRule): Rule {
  return {
    head: parserTermToInternal(term.record) as Rec,
    // TODO: grab position map from comment
    positionMap: {},
    body: {
      type: "Disjunction",
      disjuncts: term.disjunct.map((disjunct) => ({
        type: "Conjunction",
        conjuncts: disjunct.conjunct.map((conjunct): Conjunct => {
          switch (conjunct.type) {
            case "AssignmentOnLeft":
            case "AssignmentOnRight":
              return parserArithmeticToInternal(conjunct);
            case "Comparison":
              return parserComparisonToInternal(conjunct);
            case "Negation":
              return {
                type: "Negation",
                record: parserTermToInternal(conjunct.record) as Rec,
              };
            case "Placeholder":
              return parserTermToInternal(conjunct) as Rec;
            case "Record":
              return parserTermToInternal(conjunct) as Rec;
            case "Aggregation":
              return {
                type: "Aggregation",
                aggregation: conjunct.aggregation.text,
                record: parserTermToInternal(conjunct.record) as Rec,
                varNames: conjunct.var.map((dlVar) => dlVar.text),
              };
          }
        }),
      })),
    },
  };
}

export function parserTermToInternal(term: DLTerm): Term {
  switch (term.type) {
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
      return rec("???", {});
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

function parserStrToInternal(term: DLString): string {
  return deEscape(term.stringChar.map((c) => c.text).join(""));
}

// some real desugaring!

const ARITHMETIC_MAPPING = {
  "+": "add",
  "*": "mul",
};

function parserArithmeticToInternal(arithmetic: DLArithmetic): Rec {
  const op = arithmetic.arithmeticOp.text;
  const left = parserTermToInternal(arithmetic.left);
  const right = parserTermToInternal(arithmetic.right);
  const res = parserTermToInternal(arithmetic.result);
  const mappedOp = ARITHMETIC_MAPPING[op];
  if (!mappedOp) {
    throw new Error(`unknown arithmetic operator: ${op}`);
  }
  return rec(`base.${mappedOp}`, {
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

function parserComparisonToInternal(comparison: DLComparison): Rec {
  const op = comparison.comparisonOp.text;
  const left = parserTermToInternal(comparison.left);
  const right = parserTermToInternal(comparison.right);
  const mappedOp = COMPARISON_MAPPING[op];
  if (!mappedOp) {
    throw new Error(`unknown comparison operator: ${op}`);
  }
  return rec(`base.${mappedOp}`, {
    a: left,
    b: right,
  });
}
