import {
  Conjunct,
  Conjunction,
  Rec,
  Rule,
  Var,
  rec,
  varr,
} from "../../../core/types";
import { extractTerm } from "./extract";
import {
  DL2Arithmetic,
  DL2Comparison,
  DL2Conjunct,
  DL2Nested,
  DL2Rule,
} from "./parser";
import { ExtractionProblem, Module } from "./types";

export function compile(
  module: Module
): [{ [name: string]: Rule }, ExtractionProblem[]] {
  const out: { [name: string]: Rule } = {};
  const problems: ExtractionProblem[] = [];
  for (const [name, parserRule] of Object.entries(module.ruleDecls)) {
    const [rule, problems] = extractRule(module, parserRule);
    out[name] = rule;
    problems.push(...problems);
  }
  return [out, problems];
}

function extractRule(mod: Module, term: DL2Rule): [Rule, ExtractionProblem[]] {
  const problems: ExtractionProblem[] = [];
  const out: Rule = {
    head: extractTerm(term.record) as Rec,
    body: { type: "Disjunction", disjuncts: [] },
  };

  for (const disjunct of term.disjunct) {
    const conjunction: Conjunction = { type: "Conjunction", conjuncts: [] };
    for (const conjunct of disjunct.conjunct) {
      const [conjuncts, conjunctProblems] = extractConjunct(mod, conjunct);
      conjunction.conjuncts.push(...conjuncts);
      problems.push(...conjunctProblems);
    }
    out.body.disjuncts.push(conjunction);
  }

  return [out, problems];
}

function extractConjunct(
  mod: Module,
  conjunct: DL2Conjunct
): [Conjunct[], ExtractionProblem[]] {
  switch (conjunct.type) {
    case "Nested":
      return extractNested(mod, conjunct, []);
    case "AssignmentOnLeft":
    case "AssignmentOnRight":
      return [[extractArithmetic(conjunct)], []];
    case "Comparison":
      return [[extractComparison(conjunct)], []];
    case "Negation":
      return [
        [
          {
            type: "Negation",
            record: extractTerm(conjunct.record) as Rec,
          },
        ],
        [],
      ];
    case "Placeholder":
      return [[extractTerm(conjunct) as Rec], []];
    case "Record":
      return [[extractTerm(conjunct) as Rec], []];
    case "Aggregation":
      return [
        [
          {
            type: "Aggregation",
            aggregation: conjunct.aggregation.text,
            record: extractTerm(conjunct.record) as Rec,
            varNames: conjunct.var.map((dl2Var) => dl2Var.text),
          },
        ],
        [],
      ];
  }
}

type Path = {
  relation: string;
  attr: string;
  var: string;
}[];

function extractNested(
  mod: Module,
  nested: DL2Nested,
  path: Path
): [Conjunct[], ExtractionProblem[]] {
  const relation =
    path.length === 0 ? nested.qualifier.text : path[path.length - 1].relation;
  const curRec = rec(relation, {});
  if (path.length > 0) {
    const last = path[path.length - 1];
    curRec.attrs[last.attr] = varr(last.var);
  }
  const out: Conjunct[] = [curRec];
  const problems: ExtractionProblem[] = [];
  // Get normal attrs first
  for (const attr of nested.nestedAttr) {
    switch (attr.type) {
      case "NormalAttr":
        curRec.attrs[attr.ident.text] = extractTerm(attr.term);
        break;
      default:
        continue;
    }
  }
  // Now get nested attrs
  for (const attr of nested.nestedAttr) {
    switch (attr.type) {
      case "NormalAttr":
        continue;
      case "Nested": {
        const attrName = attr.qualifier.text;
        const refSpec = mod.tableDecls[relation].members[attrName];
        if (!refSpec) {
          problems.push({
            type: "MissingRefSpec",
            relation,
            name: attrName,
            span: attr.qualifier.span,
          });
          continue;
        }
        switch (refSpec.type) {
          case "InRef": {
            const varName =
              curRec.attrs.id && curRec.attrs.id.type === "Var"
                ? (curRec.attrs.id as Var).name
                : `V${relation}ID`;
            // TODO: not always `id`?
            curRec.attrs.id = varr(varName);
            const [nestedConjuncts, nestedProblems] = extractNested(mod, attr, [
              ...path,
              {
                attr: refSpec.name,
                relation: refSpec.table,
                var: varName,
              },
            ]);
            out.push(...nestedConjuncts);
            problems.push(...nestedProblems);
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
  return [out, problems];
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
