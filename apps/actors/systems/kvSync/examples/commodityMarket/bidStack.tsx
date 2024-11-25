import React from "react";
import { OrderSide, OrderWithState } from "./types";
import { VegaLite, VisualizationSpec } from "react-vega";
import { Dimensions } from "../../../../../../util/diagrams/render";

type Rect = {
  x: number;
  y: number;
  x2: number;
  y2: number;
  side: OrderSide;
  tooltip: string;
  committed: boolean;
};

export function BidStack(props: {
  orders: OrderWithState[];
  size: Dimensions;
}) {
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
      tooltip: { field: "tooltip" },
      opacity: {
        field: "committed",
        type: "nominal",
        scale: {
          domain: [false, true],
          range: [0.5, 1],
        },
      },
    },
  };

  return <VegaLite spec={spec} />;
}

function doLayout(orders: OrderWithState[]): Rect[] {
  const out: Rect[] = [];
  const { buys, sells } = getTotals(orders);

  let x = -sells;

  for (const order of orders) {
    out.push({
      x,
      y: 0,
      x2: x + order.amount,
      y2: order.price,
      side: order.side,
      tooltip: `ID: ${order.id}, Amount: ${order.amount}, Price: ${order.price}, User: ${order.user}`,
      committed: order.state.type === "Committed",
    });
    x += order.amount;
  }

  return out;
}

function getTotals(orders: OrderWithState[]): { sells: number; buys: number } {
  let sells = 0;
  let buys = 0;

  for (const order of orders) {
    if (order.side === "Buy") {
      buys += order.amount;
    } else {
      sells += order.amount;
    }
  }

  return { sells, buys };
}
