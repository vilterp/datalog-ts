import { VizTypeSpec } from "./typeSpec";
import { sequence } from "./sequence";
import { graphviz } from "./graphviz";
import { tree } from "./tree";

export const VIZ_REGISTRY: { [id: string]: VizTypeSpec } = {
  sequence,
  graphviz,
  tree,
};
