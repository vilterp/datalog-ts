import { PlanNode } from "./types";

// TODO: dry this up with some kind of visitor pattern? lol

function collapseProject(spec: PlanNode): PlanNode {
  switch (spec.type) {
    case "Or":
      return { ...spec, opts: spec.opts.map(collapseProject) };
    case "And":
      return {
        ...spec,
        left: collapseProject(spec.left),
        right: collapseProject(spec.right),
      };
    case "Filter":
      return {
        ...spec,
        inner: collapseProject(spec.inner),
      };
    case "Project":
      if (Object.keys(spec.mappings).length === 0) {
        return spec.inner;
      }
      return spec;
    default:
      return spec;
  }
}

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
    case "Project":
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
    case "Project":
      return { ...spec, inner: collapseAnds(spec.inner) };
    default:
      return spec;
  }
}

export function optimize(spec: PlanNode): PlanNode {
  return collapseProject(collapseOrs(collapseAnds(spec)));
}
