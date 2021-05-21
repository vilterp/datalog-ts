import React from "react";

export function Tabs(props: {
  tabs: { name: string; id: string; render: () => React.ReactElement }[];
  curTabID: string;
  setTabID: (id: string) => void;
}) {
  return (
    <div>
      <ul>
        {props.tabs.map((tab) => (
          <li
            style={{
              cursor: "pointer",
              fontWeight: tab.id === props.curTabID ? "bold" : "normal",
            }}
            onClick={() => props.setTabID(tab.id)}
            key={tab.id}
          >
            {tab.name}
          </li>
        ))}
      </ul>
      <div>{props.tabs.find((tab) => tab.id === props.curTabID).render()}</div>
    </div>
  );
}
