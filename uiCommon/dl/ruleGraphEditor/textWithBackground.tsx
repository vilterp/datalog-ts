import React from "react";
import { CSSProperties } from "react";
import { useSVGTextBoundingBox } from "../../generic/hooks";

export function TextWithBackground(props: {
  text: string;
  textStyle: CSSProperties;
  rectStyle: CSSProperties;
  padding: number;
}) {
  const [ref, bbox] = useSVGTextBoundingBox([props.text, props.textStyle]);
  const paddedWidth = bbox ? bbox.width + props.padding : 0;
  const paddedHeight = bbox ? bbox.height + props.padding : 0;
  return (
    <g>
      <rect
        width={paddedWidth}
        height={paddedHeight}
        x={-paddedWidth / 2}
        y={-paddedHeight / 2}
        style={props.rectStyle}
      />
      <text
        ref={ref}
        textAnchor="middle"
        alignmentBaseline="middle"
        style={props.textStyle}
      >
        {props.text}
      </text>
    </g>
  );
}
