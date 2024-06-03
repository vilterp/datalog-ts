import React, { useState } from "react";
import { Client } from "../../hooks";
import { Tabs } from "../../../../../../uiCommon/generic/tabs";
import { TransactionList } from "./txnList";
import { KVInspector } from "./kvInspector";
import { LiveQueryInspector } from "./liveQueryInspector";

const MAX_WIDTH = 500;

export function Inspector(props: { client: Client }) {
  const [curTab, setTab] = useState("data");

  return (
    <>
      <h4>Inspector</h4>
      <Tabs
        curTabID={curTab}
        setTabID={setTab}
        tabs={[
          {
            id: "transactions",
            name: "Transactions",
            render: () => (
              <div style={{ maxWidth: MAX_WIDTH, overflow: "scroll" }}>
                <TransactionList client={props.client} />
              </div>
            ),
          },
          {
            id: "data",
            name: "Data",
            render: () => (
              <div style={{ maxWidth: MAX_WIDTH, overflow: "scroll" }}>
                <KVInspector client={props.client} />
              </div>
            ),
          },
          {
            id: "queries",
            name: "Queries",
            render: () => (
              <div style={{ maxWidth: MAX_WIDTH, overflow: "scroll" }}>
                <LiveQueryInspector client={props.client} />
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
