import React from "react";
import { VegaLite, VisualizationSpec } from "react-vega";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, Term } from "../../core/types";
import { VizTypeSpec } from "./typeSpec";

const data1 = {
  myData: [
    { a: "A", b: 20 },
    { a: "B", b: 34 },
    { a: "C", b: 55 },
    { a: "D", b: 19 },
    { a: "E", b: 40 },
    { a: "F", b: 34 },
    { a: "G", b: 91 },
    { a: "H", b: 78 },
    { a: "I", b: 25 },
  ],
};

const spec1: VisualizationSpec = {
  data: { name: "myData" },
  description: "A simple bar chart with embedded data.",
  encoding: {
    x: { field: "a", type: "ordinal" },
    y: { field: "b", type: "quantitative" },
  },
  mark: "bar",
};

export const vegalite: VizTypeSpec = {
  name: "Vega Lite",
  description: "visualize data with Vega Lite",
  component: VegaLiteViz,
};

function VegaLiteViz(props: {
  interp: AbstractInterpreter;
  spec: Rec;
  setHighlightedTerm: (t: Term | null) => void;
}) {
  return <VegaLite spec={spec1} data={data1} />;
}
