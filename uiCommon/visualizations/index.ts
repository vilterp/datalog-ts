import { VizTypeSpec } from "./typeSpec";
import { sequence } from "./sequence";
import { graphviz } from "./graphviz";

export const VIZ_REGISTRY: { [id: string]: VizTypeSpec } = {
  sequence,
  graphviz,
};
