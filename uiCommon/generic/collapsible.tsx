import React from "react";
import { useBoolLocalStorage } from "./hooks";

export function CollapsibleWithHeading(props: {
  heading: string;
  initiallyCollapsed?: boolean;
  content: React.ReactNode;
}) {
  return (
    <Collapsible
      id={props.heading}
      renderLabel={(collapsed) => (
        <h3>{`${collapsed ? ">" : "v"} ${props.heading}`}</h3>
      )}
      initiallyCollapsed={props.initiallyCollapsed}
      content={props.content}
    />
  );
}

export function Collapsible(props: {
  renderLabel: (collapsed: boolean) => React.ReactNode;
  id: string;
  initiallyCollapsed?: boolean;
  content: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useBoolLocalStorage(
    `collapsed-${props.id}`,
    !!props.initiallyCollapsed
  );

  return (
    <>
      <div
        style={{ cursor: "pointer" }}
        onClick={() => setCollapsed(!collapsed)}
      >
        {props.renderLabel(collapsed)}
      </div>
      {collapsed ? null : props.content}
    </>
  );
}
