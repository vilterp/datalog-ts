import React from "react";
import { Trade } from "./types";
import { VegaLite, VisualizationSpec } from "react-vega";
import { Dimensions } from "../../../../../../util/diagrams/render";

export function PriceOverTime(props: { trades: Trade[]; size: Dimensions }) {
  const spec: VisualizationSpec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: props.size.width,
    height: props.size.height,
    data: {
      values: props.trades,
    },
    mark: "line",
    encoding: {
      x: {
        field: "timestamp",
        type: "quantitative",
        axis: { title: "Timestamp" },
      },
      y: { field: "price", type: "quantitative", axis: { title: "Price" } },
    },
  };

  return <VegaLite spec={spec} />;
}
