import React from "react";
import { uniq } from "../../util/util";

export function ErrorList(props: { errors: string[] }) {
  return props.errors.length > 0 ? (
    <ul>
      {uniq(props.errors).map((err) => (
        <li
          key={err}
          style={{ color: "red", fontFamily: "monospace", whiteSpace: "pre" }}
        >
          {err}
        </li>
      ))}
    </ul>
  ) : null;
}
