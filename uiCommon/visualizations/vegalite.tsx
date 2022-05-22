import React from "react";
import { VegaLite, VisualizationSpec } from "react-vega";
import { dlToJson } from "../../util/json2dl";
import { Rec } from "../../core/types";
import { VizArgs, VizTypeSpec } from "./typeSpec";

export const vegalite: VizTypeSpec = {
  name: "Vega Lite",
  description: "visualize data with Vega Lite",
  component: VegaLiteViz,
};

function VegaLiteViz(props: VizArgs) {
  const spec = dlToJson(props.spec, false) as VisualizationSpec;
  const query = props.spec.attrs.query as Rec;
  let data = [];
  let error: string | null = null;
  try {
    data = query
      ? props.interp.queryRec(query).map((res) => dlToJson(res.term, false))
      : [];
  } catch (e) {
    error = e;
  }
  const specWithData = {
    ...spec,
    data: { values: data },
  };
  return error ? (
    <pre style={{ color: "red" }}>{error.toString()}</pre>
  ) : (
    // Slight disagreement about the type of spec, but it doesn't actually
    // prevent us from rendering...
    // @ts-ignore
    <VegaLite spec={specWithData} />
  );
}
