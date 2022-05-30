import { VizTypeSpec } from "./typeSpec";
import { sequence } from "./sequence";
import { tree } from "./tree";
import { vegalite } from "./vegalite";
import { tableEditor } from "./tableEditor";
import { dagEditor } from "./dagEditor/dagEditor";

export const VIZ_REGISTRY: { [id: string]: VizTypeSpec } = {
  sequence,
  tree,
  vegalite,
  tableEditor,
  dagEditor,
};
