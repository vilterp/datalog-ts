import * as React from "react";

export function Window(props: {
  name: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    // outer container
    <div
      style={{
        border: "1px solid black",
        padding: 10,
        borderRadius: 10,
        boxShadow: "5px 5px 15px rgba(0,0,0,0.3)",
        margin: 10,
        backgroundColor: "hsl(0, 0%, 94%)",
      }}
    >
      {/* top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <CloseButton onClick={props.onClose} />
        <div style={{ textAlign: "center", width: "100%" }}>{props.name}</div>
      </div>
      {/* inner content */}
      <div style={{ backgroundColor: "white" }}>{props.children}</div>
    </div>
  );
}

function CloseButton(props: { onClick: () => void }) {
  return (
    <button
      onClick={props.onClick}
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
  );
}
