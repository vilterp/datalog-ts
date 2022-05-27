import React from "react";
import { EdgeProps, getBezierPath, getEdgeCenter } from "react-flow-renderer";
import { RemovableEdgeData } from "./types";

const FOREIGN_OBJECT_SIZE = 40;

export function RemovableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps<RemovableEdgeData>) {
  const edgePath = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const [edgeCenterX, edgeCenterY] = getEdgeCenter({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      <foreignObject
        width={FOREIGN_OBJECT_SIZE}
        height={FOREIGN_OBJECT_SIZE}
        x={edgeCenterX - FOREIGN_OBJECT_SIZE / 2}
        y={edgeCenterY - FOREIGN_OBJECT_SIZE / 2}
        className="edgebutton-foreignobject"
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <body>
          <button
            className="edgebutton"
            onClick={(event) => {
              event.stopPropagation();
              data.onClick();
            }}
          >
            ×
          </button>
        </body>
      </foreignObject>
    </>
  );
}
