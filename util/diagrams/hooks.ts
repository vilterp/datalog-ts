import { useState } from "react";
import { Diag, Handlers } from "./types";
import { Point, minusPoint } from "./geom";
import { getCoords } from "./getCoords";
import { Json } from "../json";

type DragState<T> =
  | { type: "NotDragging" }
  | { type: "DraggingTag"; tag: T; offset: Point; lastPos: Point };

const initDragState: DragState<any> = { type: "NotDragging" };

export function useDrag<T extends Json>(
  diagram: Diag<T>
): [DragState<T>, Handlers<T>] {
  const [dragState, setDragState] = useState(initDragState);

  return [
    dragState,
    {
      onMouseOver: () => {},
      onMouseUp: () => {
        if (dragState.type === "DraggingTag") {
          setDragState({ type: "NotDragging" });
        }
      },
      onMouseMove: (pt) => {
        if (dragState.type === "DraggingTag") {
          const delta = minusPoint(pt, dragState.lastPos);
          setDragState({
            ...dragState,
            lastPos: pt,
          });
          console.log("drag", dragState.tag, "somewhere", delta);
        }
      },
      onMouseDown: (tag: T | null) => {
        if (tag) {
          const coords = getCoords(diagram, tag);
          setDragState({
            type: "DraggingTag",
            tag,
            offset: { x: 0, y: 0 },
            lastPos: coords,
          });
        }
      },
    },
  ];
}
