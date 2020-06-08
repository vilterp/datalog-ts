import React from "react";
import { useBoolLocalStorage } from "../fp/ui/util";

export function Collapsible(props: {
  heading: string;
  content: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useBoolLocalStorage(
    `collapsed-${props.heading}`,
    false
  );

  return (
    <>
      <h3
        style={{ cursor: "pointer" }}
        onClick={() => setCollapsed(!collapsed)}
      >
        {`${collapsed ? ">" : "v"} ${props.heading}`}
      </h3>
      {collapsed ? null : props.content}
    </>
  );
}
