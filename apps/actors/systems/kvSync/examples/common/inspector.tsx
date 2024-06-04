import React, { useState } from "react";
import { Client } from "../../hooks";
import { Tabs } from "../../../../../../uiCommon/generic/tabs";
import { TransactionList } from "./txnList";
import { KVInspector } from "./kvInspector";
import { LiveQueryInspector } from "./liveQueryInspector";

export function Inspector(props: { client: Client }) {
  const [curTab, setTab] = useState("data");

  return (
    <div style={{ width: "100%" }}>
      <h4>Inspector</h4>
      <Tabs
        curTabID={curTab}
        setTabID={setTab}
        tabs={[
          {
            id: "transactions",
            name: "Transactions",
            render: () => <TransactionList client={props.client} />,
          },
          {
            id: "data",
            name: "Data",
            render: () => <KVInspector client={props.client} />,
          },
          {
            id: "queries",
            name: "Queries",
            render: () => <LiveQueryInspector client={props.client} />,
          },
        ]}
      />
    </div>
  );
}
