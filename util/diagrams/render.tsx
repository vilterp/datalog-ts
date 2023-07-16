import * as React from "react";
import { Diag, Handlers, Point } from "./types";
import { mouseRelativeToElementCenter } from "./mouseUtil";

export function Diagram<T>(props: {
  diagram: Diag<T>;
  onMouseOver?: (tag: T | null) => void;
  onMouseDown?: (tag: T | null) => void;
  onMouseUp?: () => void;
  onMouseMove?: (pt: Point) => void;
}) {
  // console.log(props.diagram);
  const dims = dimensions(props.diagram);
  const svgNode = render(props.diagram, {
    onMouseOver: props.onMouseOver,
    onMouseDown: props.onMouseDown,
    onMouseUp: props.onMouseUp,
    onMouseMove: props.onMouseMove,
  });
  const ref = React.useRef();
  return (
    <svg
      ref={ref}
      width={dims.width}
      height={dims.height}
      onMouseMove={(evt) => {
        evt.preventDefault();
        const pt = mouseRelativeToElementCenter(ref, evt);
        props.onMouseMove(pt);
      }}
      onMouseUp={(evt) => props.onMouseUp()}
      onMouseLeave={() => {
        // cancel the drag if mouse leaves
        // this is a bit hacky
        props.onMouseUp();
      }}
    >
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

function render<T>(d: Diag<T>, handlers: Handlers<T>): React.ReactNode {
  // TODO: is all this `key=idx` bad?
  switch (d.type) {
    case "ABS_POS":
      return (
        <g transform={`translate(${d.point.x} ${d.point.y})`}>
          {render(d.diag, handlers)}
        </g>
      );
    case "HORIZ_LAYOUT": {
      const children: React.ReactNode[] = [];
      let x = 0;
      d.children.forEach((child, idx) => {
        children.push(
          <g key={idx} transform={`translate(${x} 0)`}>
            {render(child, handlers)}
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
            {render(child, handlers)}
          </g>
        );
        y += dimensions(child).height;
      });
      return <g>{children}</g>;
    }
    case "Z_LAYOUT":
      return (
        <g>
          {d.children.map((child, idx) => (
            <g key={idx}>{render(child, handlers)}</g>
          ))}
        </g>
      );
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
      return (
        <text
          style={{
            fontSize: d.fontSize,
            fontWeight: d.fontWeight,
            fill: "black",
          }}
          textAnchor="middle"
        >
          {d.text}
        </text>
      );
    case "TAG":
      return (
        <g
          // TODO: full tag path, not just one tag
          onMouseOver={() => handlers.onMouseOver(d.tag)}
          onMouseOut={() => handlers.onMouseOver(null)}
          onMouseDown={() => handlers.onMouseDown(d.tag)}
        >
          {render(d.diag, handlers)}
        </g>
      );
  }
}
