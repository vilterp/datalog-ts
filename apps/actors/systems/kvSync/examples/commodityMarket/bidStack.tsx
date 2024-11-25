import React from "react";
import { Order, OrderSide } from "./types";
import { VegaLite, VisualizationSpec } from "react-vega";
import { Dimensions } from "../../../../../../util/diagrams/render";

type Rect = {
  x: number;
  y: number;
  x2: number;
  y2: number;
  side: OrderSide;
};

export function BidStack(props: { orders: Order[]; size: Dimensions }) {
  const layout = doLayout(props.orders);

  const spec: VisualizationSpec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: props.size.width,
    height: props.size.height,
    data: {
      values: layout,
    },
    mark: "rect",
    encoding: {
      x: { field: "x", type: "quantitative", axis: { title: "Amount" } },
      y: { field: "y", type: "quantitative", axis: { title: "Price" } },
      x2: { field: "x2", type: "quantitative" },
      y2: { field: "y2", type: "quantitative" },
      color: {
        field: "side",
        type: "nominal",
        scale: { range: ["#1f77b4", "#ff7f0e"] },
      },
    },
  };

  return <VegaLite spec={spec} />;
}

function doLayout(orders: Order[]): Rect[] {
  const out: Rect[] = [];

  let x = 0;

  for (const order of orders) {
    out.push({
      x,
      y: 0,
      x2: x + order.amount,
      y2: order.price,
      side: order.side,
    });
    x += order.amount;
  }

  return out;
}
