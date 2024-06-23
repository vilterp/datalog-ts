import React, { useState } from "react";
import { ZoomEvt, ZoomState } from "./useZoom";
import { linearInterpolate } from "./util";

export type DragState = { type: "NotDragging" } | { type: "Dragging" };

export function ScrollBar(props: {
  width: number;
  zoomState: ZoomState;
  dispatch: (evt: ZoomEvt) => void;
}) {
  const [dragging, setDragging] = useState(false);

  const barMiddleX = linearInterpolate(
    [0, 1],
    [0, props.width],
    props.zoomState.focusPos
  );
  const barWidth = props.width * props.zoomState.zoomPct;

  return (
    <svg width={props.width} height={20}>
      <rect
        height={20}
        fill={dragging ? "darkgrey" : "lightgrey"}
        style={{ cursor: dragging ? "grabbing" : "grab" }}
        x={barMiddleX - barWidth / 2}
        width={barWidth}
        onMouseDown={() => setDragging(true)}
        onMouseUp={() => setDragging(false)}
        // onMouseMove={(evt) => {
        //   const worldPos = evt.clientX;
        // }}
      />
    </svg>
  );
}
