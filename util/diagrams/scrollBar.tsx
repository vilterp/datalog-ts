import React from "react";
import { ZoomState, visibleViewSpaceRange } from "./useZoom";

export function ScrollBar(props: { width: number; zoomState: ZoomState }) {
  const [leftPos, rightPos] = visibleViewSpaceRange(props.zoomState);

  return (
    <svg width={props.width} height={10}>
      <rect height={10} fill="grey" x1={leftPos} x2={rightPos} />
    </svg>
  );
}
