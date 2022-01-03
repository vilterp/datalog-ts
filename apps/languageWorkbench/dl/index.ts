import { makeMemoryLoader } from "../../../core/loaders";
// @ts-ignore
import ruleTreeVizDL from "./ruleTreeViz.dl";
// @ts-ignore
import ideDL from "./ide.dl";
// @ts-ignore
import scopeGraphDL from "./scopeGraph.dl";

export const LOADER = makeMemoryLoader({
  "./ruleTreeViz.dl": ruleTreeVizDL,
  "./ide.dl": ideDL,
  "./scopeGraph.dl": scopeGraphDL,
});
