import React from "react";
import { ZoomState } from "./useZoom";

export function ScrollBar(props: { width: number; zoomState: ZoomState }) {
  const barWidth = props.zoomState.zoomPct * props.width;
  const barX = props.zoomState.focusPos - barWidth / 2; // centered on focus

  console.log("scrollBar", props, { barWidth, barX });

  return (
    <svg width={props.width} height={10}>
      <rect height={10} fill="grey" width={barWidth} x={barX} />
    </svg>
  );
}
