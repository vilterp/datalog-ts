import React from "react";
import { VegaLite, VisualizationSpec } from "react-vega";
import { dlToJson } from "../../util/json2dl";
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
  const spec = dlToJson(props.spec, false) as VisualizationSpec;
  console.log({ spec });
  return <VegaLite spec={spec} data={data1} />;
}
