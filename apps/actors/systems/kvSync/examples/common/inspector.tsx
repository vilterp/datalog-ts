import React, { useState } from "react";
import { Client } from "../../hooks";
import { Tabs } from "../../../../../../uiCommon/generic/tabs";
import { TransactionList } from "./txnList";
import { KVInspector } from "./kvInspector";
import { Collapsible } from "../../../../../../uiCommon/generic/collapsible";

export function Inspector(props: { client: Client }) {
  const [curTab, setTab] = useState("data");

  return (
    <Collapsible
      renderLabel={(collapsed) => <h4>{collapsed ? ">" : "v"} Inspector</h4>}
      storageKey={props.client.state.id}
      content={
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
          ]}
        />
      }
    />
  );
}
