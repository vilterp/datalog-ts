import React, { useLayoutEffect, useRef, useState } from "react";
import { CSSProperties } from "react";

export function TextWithBackground(props: {
  text: string;
  textStyle: CSSProperties;
  backgroundStyle: CSSProperties;
  padding: number;
}) {
  const ref = useRef<SVGTextElement>();
  const [bbox, setBBox] = useState<DOMRect>(null);
  useLayoutEffect(() => {
    if (!ref.current) {
      return;
    }
    const newBBox = ref.current.getBBox();
    if (JSON.stringify(newBBox) !== JSON.stringify(bbox)) {
      setBBox(newBBox);
    }
  }, [props.text, props.textStyle]);
  const paddedWidth = bbox ? bbox.width + props.padding : 0;
  const paddedHeight = bbox ? bbox.height + props.padding : 0;

  return (
    <g>
      <rect
        width={paddedWidth}
        height={paddedHeight}
        x={-paddedWidth / 2}
        y={-paddedHeight / 2}
        style={props.backgroundStyle}
      />
      <text
        ref={ref}
        textAnchor="middle"
        alignmentBaseline="middle"
        style={{ fontFamily: "monospace" }}
      >
        {props.text}
      </text>
    </g>
  );
}
