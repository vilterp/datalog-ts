import { Conjunct, Rec, Rule, rec, varr } from "../../../core/types";
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
      return extractNested(mod, conjunct, []);
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

type Path = {
  relation: string;
  attr: string;
  var: string;
}[];

function extractNested(mod: Module, nested: DL2Nested, path: Path): Conjunct[] {
  const relation = path.length === 0 ? nested.ident.text : path[0].relation;
  const curRec = rec(relation, {});
  if (path.length > 0) {
    const last = path[path.length - 1];
    curRec.attrs[last.attr] = varr(last.var);
  }
  const out: Conjunct[] = [curRec];
  for (const attr of nested.nestedAttr) {
    switch (attr.type) {
      case "NormalAttr":
        curRec.attrs[attr.ident.text] = extractTerm(attr.term);
        break;
      case "Nested": {
        const attrName = attr.ident.text;
        const refSpec = mod[relation][attrName];
        switch (refSpec.type) {
          case "InRef": {
            const varName = `V${relation}ID`;
            // TODO: not always `id`?
            curRec.attrs.id = varr(varName);
            out.push(
              ...extractNested(mod, attr, [
                ...path,
                {
                  attr: refSpec.name,
                  relation,
                  var: varName,
                },
              ])
            );
            break;
          }
          case "Scalar":
            throw new Error("scalar refspec in nested");
          case "OutRef":
            throw new Error("outRef not yet supported");
        }
        break;
      }
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
