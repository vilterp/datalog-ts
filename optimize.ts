import { Plan, PlanNode, Term } from "./types";
import { mapObj } from "./util";

// TODO: dry this up with some kind of visitor pattern? lol

function collapseOrs(spec: PlanNode): PlanNode {
  switch (spec.type) {
    case "Or":
      return spec.opts.length === 1 ? spec.opts[0] : spec;
    case "Join":
      return {
        ...spec,
        left: collapseOrs(spec.left),
        right: collapseOrs(spec.right),
      };
    case "Match":
      return {
        ...spec,
        inner: collapseOrs(spec.inner),
      };
    case "Filter":
      return {
        ...spec,
        inner: collapseOrs(spec.inner),
      };
    default:
      return spec;
  }
}

function collapseAnds(spec: PlanNode): PlanNode {
  switch (spec.type) {
    case "Join":
      if (spec.left.type === "EmptyOnce") {
        return collapseAnds(spec.right);
      }
      if (spec.right.type === "EmptyOnce") {
        return collapseAnds(spec.left);
      }
      return {
        ...spec,
        left: collapseAnds(spec.left),
        right: collapseAnds(spec.right),
      };
    case "Or":
      return { type: "Or", opts: spec.opts.map(collapseAnds) };
    case "Match":
      return { ...spec, inner: collapseAnds(spec.inner) };
    case "Filter":
      return {
        ...spec,
        inner: collapseAnds(spec.inner),
      };
    default:
      return spec;
  }
}

export function optimize(plan: Plan): Plan {
  return {
    ...plan,
    rules: mapObj(plan.rules, (_, node) => collapseOrs(collapseAnds(node))),
  };
}

export function hasVars(t: Term): boolean {
  switch (t.type) {
    case "StringLit":
      return false;
    case "Var":
      return true;
    case "Record":
      return Object.keys(t.attrs).some((k) => hasVars(t.attrs[k]));
    case "BinExpr":
      return hasVars(t.left) || hasVars(t.right);
    case "Bool":
      return false;
  }
}
