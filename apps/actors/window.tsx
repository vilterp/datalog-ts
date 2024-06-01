import * as React from "react";

export function Window(props: {
  name: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    // outer bar
    <div style={{ border: "1px solid black", padding: "10px" }}>
      {/* top bar */}
      <div>
        <button onClick={props.onClose}>Close</button>
        {props.name}
      </div>
      {/* inner content */}
      <div>{props.children}</div>
    </div>
  );
}
