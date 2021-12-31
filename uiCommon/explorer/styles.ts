import { CSSProperties } from "react";

export const highlightColor = "lightgrey";

export function tab(props: {
  open: boolean;
  empty: boolean;
  highlighted: boolean;
}): CSSProperties {
  return {
    cursor: "pointer",
    color: props.empty ? "black" : "purple",
    fontFamily: "monospace",
    fontWeight: props.empty ? "normal" : "bold",
    backgroundColor: props.highlighted ? highlightColor : "",
  };
}
