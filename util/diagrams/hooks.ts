import { useState } from "react";
import { Handlers } from "./types";
import { Point, minusPoint } from "./geom";
import { Json } from "../json";

type DragState<T> =
  | { type: "NotDragging" }
  | { type: "DraggingTag"; tag: T; offset: Point; lastPos: Point };

const initDragState: DragState<any> = { type: "NotDragging" };

export function useDrag<T extends Json>(
  onDrag: (tag: T, delta: Point) => void
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
          onDrag(dragState.tag, delta);
        }
      },
      onMouseDown: (tag: T | null, pt: Point) => {
        if (tag) {
          setDragState({
            type: "DraggingTag",
            tag,
            offset: { x: 0, y: 0 },
            lastPos: pt,
          });
        }
      },
    },
  ];
}
