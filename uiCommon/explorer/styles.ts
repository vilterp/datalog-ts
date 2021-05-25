import { CSSProperties } from "react";

export const highlightColor = "lightgrey";

export function tab(props: {
  selected: boolean;
  highlighted: boolean;
}): CSSProperties {
  return {
    cursor: "pointer",
    color: "purple",
    fontFamily: "monospace",
    fontWeight: props.selected ? "bold" : "normal",
    backgroundColor: props.highlighted ? highlightColor : "",
  };
}
