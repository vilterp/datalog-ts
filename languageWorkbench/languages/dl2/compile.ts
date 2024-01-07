import { Conjunct, Rec, Rule, rec } from "../../../core/types";
import { flatMap } from "../../../util/util";
import { extractTerm } from "./extract";
import {
  DL2Arithmetic,
  DL2Comparison,
  DL2Conjunct,
  DL2Nested,
  DL2Rule,
} from "./parser";
import { Module } from "./types";

export function compile(module: Module): { [name: string]: Rule } {
  const out: { [name: string]: Rule } = {};
  for (const [name, rule] of Object.entries(module.ruleDecls)) {
    out[name] = extractRule(module, rule);
  }
  return out;
}

function extractRule(mod: Module, term: DL2Rule): Rule {
  return {
    head: extractTerm(term.record) as Rec,
    body: {
      type: "Disjunction",
      disjuncts: term.disjunct.map((disjunct) => ({
        type: "Conjunction",
        conjuncts: flatMap(disjunct.conjunct, (c) => extractConjunct(mod, c)),
      })),
    },
  };
}

function extractConjunct(mod: Module, conjunct: DL2Conjunct): Conjunct[] {
  switch (conjunct.type) {
    case "Nested":
      return extractNested(mod, conjunct);
    case "AssignmentOnLeft":
    case "AssignmentOnRight":
      return [extractArithmetic(conjunct)];
    case "Comparison":
      return [extractComparison(conjunct)];
    case "Negation":
      return [
        {
          type: "Negation",
          record: extractTerm(conjunct.record) as Rec,
        },
      ];
    case "Placeholder":
      return [extractTerm(conjunct) as Rec];
    case "Record":
      return [extractTerm(conjunct) as Rec];
    case "Aggregation":
      return [
        {
          type: "Aggregation",
          aggregation: conjunct.aggregation.text,
          record: extractTerm(conjunct.record) as Rec,
          varNames: conjunct.var.map((dl2Var) => dl2Var.text),
        },
      ];
  }
}

function extractNested(mod: Module, nested: DL2Nested): Conjunct[] {
  const curRec = rec(nested.ident.text, {});
  const out: Conjunct[] = [curRec];
  for (const attr of nested.nestedAttr) {
    switch (attr.type) {
      case "NormalAttr":
        curRec.attrs[attr.ident.text] = extractTerm(attr.term);
        break;
      case "Nested":
        const res = extractNested(mod, attr);
        out.push(...res);
        break;
    }
  }
  return out;
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
