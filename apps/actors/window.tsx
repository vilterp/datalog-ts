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
        <button
          onClick={props.onClose}
          style={{
            backgroundColor: "red",
            border: "none",
            color: "white",
            textAlign: "center",
            textDecoration: "none",
            display: "inline-block",
            fontSize: "16px",
            margin: "4px 2px",
            cursor: "pointer",
            borderRadius: "50%",
            width: "20px",
            height: "20px",
            padding: "0",
          }}
        >
          x
        </button>
        {props.name}
      </div>
      {/* inner content */}
      <div>{props.children}</div>
    </div>
  );
}
