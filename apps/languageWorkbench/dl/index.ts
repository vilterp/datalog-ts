import { makeMemoryLoader } from "../../../core/loaders";
// @ts-ignore
import ruleTreeVizDL from "./ruleTreeViz.dl";
// @ts-ignore
import ideDL from "./ide.dl";
// @ts-ignore
import scopeGraphVizDL from "./scopeGraphViz.dl";
// @ts-ignore
import relationGraphVizDL from "../../../uiCommon/visualizations/relationGraphViz.dl";

export const LOADER = makeMemoryLoader({
  "./ide.dl": ideDL,
  "./ruleTreeViz.dl": ruleTreeVizDL,
  "./scopeGraphViz.dl": scopeGraphVizDL,
  "./relationGraphViz.dl": relationGraphVizDL,
});
