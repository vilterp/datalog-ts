import * as React from "react";
import { Diag } from "./types";

export function Diagram<T>(props: { diagram: Diag<T> }) {
  console.log("diagram", props.diagram);
  const dims = dimensions(props.diagram);
  console.log("dims", dims);
  const svgNode = render(props.diagram);
  console.log("svg", svgNode);
  return (
    <svg width={dims.width} height={dims.height}>
      {svgNode}
    </svg>
  );
}

export interface Dimensions {
  width: number;
  height: number;
}

export const EMPTY_DIMENSIONS: Dimensions = {
  width: 0,
  height: 0,
};

export function dimensions<T>(d: Diag<T>): Dimensions {
  switch (d.type) {
    case "ABS_POS": {
      const dims = dimensions(d.diag);
      return {
        width: dims.width + d.point.x,
        height: dims.height + d.point.y,
      };
    }
    case "HORIZ_LAYOUT": {
      return d.children.reduce((dims, child) => {
        const childDims = dimensions(child);
        return {
          width: dims.width + childDims.width,
          height: Math.max(dims.height, childDims.height),
        };
      }, EMPTY_DIMENSIONS);
    }
    case "VERT_LAYOUT": {
      return d.children.reduce((dims, child) => {
        const childDims = dimensions(child);
        return {
          width: Math.max(dims.width, childDims.width),
          height: dims.height + childDims.height,
        };
      }, EMPTY_DIMENSIONS);
    }
    case "Z_LAYOUT":
      return d.children.reduce((dims, child) => {
        const childDims = dimensions(child);
        return {
          width: Math.max(dims.width, childDims.width),
          height: Math.max(dims.height, childDims.height),
        };
      }, EMPTY_DIMENSIONS);
    case "SPACER":
      return { width: d.width, height: d.height };
    case "LINE":
      return { width: d.end.x, height: d.end.y };
    case "CIRCLE":
      return {
        width: d.radius * 2,
        height: d.radius * 2,
      };
    case "TEXT":
      // TODO: actually measure text somehow
      return { height: d.fontSize, width: 50 };
    case "TAG":
      return dimensions(d.diag);
  }
}

function render<T>(d: Diag<T>): React.ReactNode {
  switch (d.type) {
    case "ABS_POS":
      return (
        <g transform={`translate(${d.point.x} ${d.point.y})`}>
          {render(d.diag)}
        </g>
      );
    case "HORIZ_LAYOUT": {
      const children: React.ReactNode[] = [];
      let x = 0;
      d.children.forEach((child, idx) => {
        children.push(
          <g key={idx} transform={`translate(${x} 0)`}>
            {render(child)}
          </g>
        );
        x += dimensions(child).width;
      });
      return <g>{children}</g>;
    }
    case "VERT_LAYOUT": {
      const children: React.ReactNode[] = [];
      let y = 0;
      d.children.forEach((child, idx) => {
        children.push(
          <g key={idx} transform={`translate(0 ${y})`}>
            {render(child)}
          </g>
        );
        y += dimensions(child).height;
      });
      return <g>{children}</g>;
    }
    case "Z_LAYOUT":
      return <g>{d.children.map((child) => render(child))}</g>;
    case "SPACER":
      return null;
    case "LINE":
      return (
        <line
          x1={d.start.x}
          y1={d.start.y}
          x2={d.end.x}
          y2={d.end.y}
          stroke={d.stroke}
          strokeWidth={d.width}
        />
      );
    case "CIRCLE":
      return <circle r={d.radius} fill={d.fill} />;
    case "TEXT":
      // TODO: how do I get these to align center?
      return (
        <text style={{ fontSize: d.fontSize, fill: "black" }} x={-20}>
          {d.text}
        </text>
      );
    case "TAG":
      return render(d.diag);
  }
}
