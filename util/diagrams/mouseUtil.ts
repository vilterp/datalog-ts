import { Ref, MouseEvent } from "react";
import { Point } from "./types";
import { rectCenter } from "./geom";

export function mouseRelativeToElementTopLeft(
  svgRef: Ref<SVGElement>,
  evt: MouseEvent
): Point {
  // @ts-ignore
  const svgRect = svgRef.current.getBoundingClientRect();
  const x = evt.clientX - svgRect.left;
  const y = evt.clientY - svgRect.top;
  return { x, y };
}

export function mouseRelativeToElementCenter(
  svgRef: Ref<SVGElement>,
  evt: MouseEvent
): Point {
  // @ts-ignore
  const svgRect = svgRef.current.getBoundingClientRect();
  const center = rectCenter(svgRect);
  const x = evt.clientX - center.x;
  const y = evt.clientY - center.y;
  return { x, y };
}
