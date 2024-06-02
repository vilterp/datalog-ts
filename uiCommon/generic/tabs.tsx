import React from "react";

export function Tabs(props: {
  tabs: { name: string; id: string; render: () => React.ReactElement }[];
  curTabID: string;
  setTabID: (id: string) => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "row" }}>
        {props.tabs.map((tab, tabIdx) => (
          <div
            style={{
              cursor: "pointer",
              fontWeight: tab.id === props.curTabID ? "bold" : "normal",
              backgroundColor:
                tab.id === props.curTabID ? "lightgray" : "rgb(230, 230, 230)",
              borderRight:
                tabIdx === props.tabs.length - 1 ? null : "1px solid gray",
              paddingLeft: 10,
              paddingRight: 10,
              paddingTop: 5,
              paddingBottom: 5,
            }}
            onClick={() => props.setTabID(tab.id)}
            key={tab.id}
          >
            {tab.name}
          </div>
        ))}
      </div>
      <div>{props.tabs.find((tab) => tab.id === props.curTabID).render()}</div>
    </div>
  );
}
