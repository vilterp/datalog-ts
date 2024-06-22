import React from "react";
import { ZoomState } from "./useZoom";
import { linearInterpolate } from "./util";

export function ScrollBar(props: { width: number; zoomState: ZoomState }) {
  const barMiddleX = linearInterpolate(
    [0, 1],
    [0, props.width],
    props.zoomState.focusPos
  );
  const barWidth = props.width * props.zoomState.zoomPct;

  return (
    <svg width={props.width} height={10}>
      <rect
        height={10}
        fill="grey"
        x={barMiddleX - barWidth / 2}
        width={barWidth}
      />
    </svg>
  );
}
