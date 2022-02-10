import { makeMemoryLoader } from "../../../../core/loaders";
// @ts-ignore
import astVizDL from "./astViz.dl";
// @ts-ignore
import ideDL from "./ide.dl";
// @ts-ignore
import highlightDL from "./highlight.dl";
// @ts-ignore
import scopeGraphVizDL from "./scopeGraphViz.dl";
// @ts-ignore
import relationGraphVizDL from "../../../visualizations/relationGraphViz.dl";

export const LOADER = makeMemoryLoader({
  "./ide.dl": ideDL,
  "./highlight.dl": highlightDL,
  "./astViz.dl": astVizDL,
  "./scopeGraphViz.dl": scopeGraphVizDL,
  "./relationGraphViz.dl": relationGraphVizDL,
});
