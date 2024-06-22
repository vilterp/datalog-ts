import React from "react";
import { ZoomState, visibleViewSpaceRange } from "./useZoom";

export function ScrollBar(props: { width: number; zoomState: ZoomState }) {
  const [leftX, rightX] = visibleViewSpaceRange(props.zoomState);

  return (
    <svg width={props.width} height={10}>
      <rect height={10} fill="grey" x={leftX} width={rightX - leftX} />
    </svg>
  );
}
