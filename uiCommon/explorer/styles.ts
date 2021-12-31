import { CSSProperties } from "react";

export const highlightColor = "lightgrey";

export function tab(props: {
  selected: boolean;
  nonempty: boolean;
  highlighted: boolean;
}): CSSProperties {
  return {
    cursor: "pointer",
    color: "purple",
    fontFamily: "monospace",
    fontWeight: props.nonempty ? "bold" : "normal",
    backgroundColor: props.highlighted ? highlightColor : "",
  };
}
