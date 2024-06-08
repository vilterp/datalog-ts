import React from "react";

export function Tabs(props: {
  tabs: { name: string; id: string; render: () => React.ReactElement }[];
  curTabID: string;
  setTabID: (id: string) => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "row" }}>
        {props.tabs.map((tab, tabIdx) => {
          const selected = tab.id === props.curTabID;
          return (
            <div
              style={{
                cursor: "pointer",
                // fontWeight: selected ? "bold" : "normal",
                backgroundColor: selected ? null : "rgb(230, 230, 230)",
                border: "1px solid grey",
                borderBottom: selected ? "none" : "1px solid grey",
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
          );
        })}
      </div>
      <div>{props.tabs.find((tab) => tab.id === props.curTabID).render()}</div>
    </div>
  );
}
