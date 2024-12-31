import { CSSProperties } from "react";

export const highlightColor = "lightgrey";

export function tab(props: {
  open: boolean;
  empty: boolean;
  highlighted: boolean;
  errors: boolean;
}): CSSProperties {
  return {
    cursor: "pointer",
    color: props.errors ? "red" : props.empty ? "black" : "purple",
    fontFamily: "monospace",
    fontWeight: props.empty ? "normal" : "bold",
    backgroundColor: props.highlighted ? highlightColor : "",
  };
}

export const TD_STYLES: CSSProperties = {
  paddingLeft: 5,
  paddingRight: 5,
  borderLeft: "1px solid lightgrey",
  borderRight: "1px solid lightgrey",
};
