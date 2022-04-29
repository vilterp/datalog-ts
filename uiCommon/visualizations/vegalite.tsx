import React from "react";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, Term } from "../../core/types";
import { VizTypeSpec } from "./typeSpec";

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
  return <p>Foo</p>;
}
