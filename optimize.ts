// TODO: some kind of visitor pattern? lol

import { PlanNode } from "./types";

function collapseOrs(spec: PlanNode): PlanNode {
  switch (spec.type) {
    case "Or":
      return spec.opts.length === 1 ? spec.opts[0] : spec;
    case "And":
      return {
        ...spec,
        left: collapseOrs(spec.left),
        right: collapseOrs(spec.right),
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
    case "And":
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
    case "Filter":
      return { ...spec, inner: collapseAnds(spec.inner) };
    default:
      return spec;
  }
}

export function optimize(spec: PlanNode): PlanNode {
  return collapseOrs(collapseAnds(spec));
}
