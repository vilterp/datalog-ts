import {
  Conjunct,
  Rec,
  Rule,
  Term,
  array,
  bool,
  dict,
  int,
  rec,
  str,
  varr,
} from "../../../core/types";
import { pairsToObj } from "../../../util/util";
import { deEscape } from "../../parserlib/types";
import { Span } from "../../sourcePositions";
import {
  DL2Arithmetic,
  DL2Comparison,
  DL2Declaration,
  DL2Rule,
  DL2String,
  DL2Term,
} from "./parser";
import { Module } from "./types";

export type ExtractionProblem =
  | {
      type: "DuplicateTable";
      name: string;
      span: Span;
    }
  | { type: "DuplicateRule"; name: string; span: Span }
  | { type: "DuplicateImport"; name: string; span: Span };

export function extractModule(
  decl: DL2Declaration
): [Module, ExtractionProblem[]] {
  const problems: ExtractionProblem[] = [];
  const mod: Module = {
    imports: new Set(),
    ruleDecls: {},
    tableDecls: {},
  };
  switch (decl.type) {
    case "Rule":
      if (mod.ruleDecls[decl.record.qualifier.text]) {
        problems.push({
          type: "DuplicateRule",
          name: decl.record.qualifier.text,
          span: decl.record.qualifier.span,
        });
        break;
      }
      mod.ruleDecls[decl.record.qualifier.text] = decl;
      break;
    case "TableDecl":
      if (mod.tableDecls[decl.name.text]) {
        problems.push({
          type: "DuplicateTable",
          name: decl.name.text,
          span: decl.name.span,
        });
        break;
      }
      mod.tableDecls[decl.name.text] = decl;
      break;
    case "Import":
      if (mod.imports.has(decl.path.text)) {
        problems.push({
          type: "DuplicateImport",
          name: decl.path.text,
          span: decl.path.span,
        });
        break;
      }
      mod.imports.add(decl.path.text);
      break;
    default:
      throw new Error(`unknown decl type: ${decl.type}`);
  }
  return [mod, problems];
}

export function extractRule(term: DL2Rule): Rule {
  return {
    head: extractTerm(term.record) as Rec,
    body: {
      type: "Disjunction",
      disjuncts: term.disjunct.map((disjunct) => ({
        type: "Conjunction",
        conjuncts: disjunct.conjunct.map((conjunct): Conjunct => {
          switch (conjunct.type) {
            case "AssignmentOnLeft":
            case "AssignmentOnRight":
              return extractArithmetic(conjunct);
            case "Comparison":
              return extractComparison(conjunct);
            case "Negation":
              return {
                type: "Negation",
                record: extractTerm(conjunct.record) as Rec,
              };
            case "Placeholder":
              return extractTerm(conjunct) as Rec;
            case "Record":
              return extractTerm(conjunct) as Rec;
            case "Aggregation":
              return {
                type: "Aggregation",
                aggregation: conjunct.aggregation.text,
                record: extractTerm(conjunct.record) as Rec,
                varNames: conjunct.var.map((dl2Var) => dl2Var.text),
              };
          }
        }),
      })),
    },
  };
}

export function extractTerm(term: DL2Term): Term {
  switch (term.type) {
    case "Array":
      return array(term.term.map(extractTerm));
    case "Dict":
      return dict(
        pairsToObj(
          term.dictKeyValue.map((kv) => ({
            key: extractStr(kv.key),
            value: extractTerm(kv.value),
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
      return str(extractStr(term));
    case "Var":
      return varr(term.text);
    case "Record":
      return rec(
        term.qualifier.text,
        pairsToObj(
          term.recordAttrs.recordKeyValue.map((keyValue) => ({
            key: keyValue.ident.text,
            value: extractTerm(keyValue.term),
          }))
        )
      );
  }
}

function extractStr(term: DL2String): string {
  return deEscape(term.stringChar.map((c) => c.text).join(""));
}

// some real desugaring!

const ARITHMETIC_MAPPING = {
  "+": "add",
  "*": "mul",
};

function extractArithmetic(arithmetic: DL2Arithmetic): Rec {
  const op = arithmetic.arithmeticOp.text;
  const left = extractTerm(arithmetic.left);
  const right = extractTerm(arithmetic.right);
  const res = extractTerm(arithmetic.result);
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

function extractComparison(comparison: DL2Comparison): Rec {
  const op = comparison.comparisonOp.text;
  const left = extractTerm(comparison.left);
  const right = extractTerm(comparison.right);
  const mappedOp = COMPARISON_MAPPING[op];
  if (!mappedOp) {
    throw new Error(`unknown comparison operator: ${op}`);
  }
  return rec(`base.${mappedOp}`, {
    a: left,
    b: right,
  });
}
