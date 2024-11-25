import React from "react";
import { useState } from "react";

export function CollapsibleWithHeadingLocal(props: {
  heading: string;
  content: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <CollapsibleInner
      collapsed={collapsed}
      setCollapsed={setCollapsed}
      content={props.content}
      renderLabel={(collapsed) => (
        <h3>{`${collapsed ? ">" : "v"} ${props.heading}`}</h3>
      )}
    />
  );
}

export function CollapsibleInner(props: {
  renderLabel: (collapsed: boolean) => React.ReactNode;
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  content: React.ReactNode;
}) {
  return (
    <>
      <div
        style={{ cursor: "pointer" }}
        onClick={() => props.setCollapsed(!props.collapsed)}
      >
        {props.renderLabel(props.collapsed)}
      </div>
      {props.collapsed ? null : props.content}
    </>
  );
}
