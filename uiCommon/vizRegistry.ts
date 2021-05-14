import { VizTypeSpec } from "./visualizations/typeSpec";
import { sequence } from "./visualizations/sequence";

export const VIZ_REGISTRY: { [id: string]: VizTypeSpec } = {
  sequence,
};
