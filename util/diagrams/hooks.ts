import { useState } from "react";
import { Handlers } from "./types";
import { Point } from "./geom";

type DragState<T> =
  | { type: "NotDragging" }
  | { type: "DraggingTag"; tag: T; offset: Point };

const initDragState: DragState<any> = { type: "NotDragging" };

export function useDrag<T>(): [DragState<T>, Handlers<T>] {
  const [dragState, setDragState] = useState(initDragState);

  return [
    dragState,
    {
      onMouseOver: () => {},
      onMouseUp: () => {
        console.log("on mouse up");
        if (dragState.type === "DraggingTag") {
          setDragState({ type: "NotDragging" });
        }
      },
      onMouseMove: (pt) => {
        if (dragState.type === "DraggingTag") {
          console.log("drag", dragState.tag, "somewhere", pt);
        }
      },
      onMouseDown: (tag: T | null) => {
        if (tag) {
          setDragState({ type: "DraggingTag", tag, offset: { x: 0, y: 0 } });
        }
      },
    },
  ];
}
