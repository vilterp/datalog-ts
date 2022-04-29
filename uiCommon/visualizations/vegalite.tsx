import React from "react";
import { VegaLite, VisualizationSpec } from "react-vega";
import { dlToJson } from "../../util/json2dl";
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
  const spec = dlToJson(props.spec, false) as VisualizationSpec;
  const query = props.spec.attrs.query as Rec;
  const data = query
    ? props.interp.queryRec(query).map((res) => dlToJson(res.term))
    : [];
  const specWithData = {
    ...spec,
    data: { values: data },
  };
  return <VegaLite spec={specWithData} />;
}
