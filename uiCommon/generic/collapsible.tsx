import React from "react";
import { useBoolLocalStorage } from "./hooks";
import { CollapsibleInner } from "./collapsibleInner";

export function CollapsibleWithHeading(props: {
  heading: string;
  storageKey?: string;
  initiallyCollapsed?: boolean;
  content: React.ReactNode;
}) {
  return (
    <Collapsible
      storageKey={props.storageKey ? props.storageKey : props.heading}
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
  storageKey: string;
  initiallyCollapsed?: boolean;
  content: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useBoolLocalStorage(
    `collapsed-${props.storageKey}`,
    !!props.initiallyCollapsed
  );

  return (
    <CollapsibleInner
      renderLabel={props.renderLabel}
      collapsed={collapsed}
      setCollapsed={setCollapsed}
      content={props.content}
    />
  );
}
