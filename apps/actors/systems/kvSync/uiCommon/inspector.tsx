import React, { useState } from "react";
import { Client } from "../hooks";
import { Tabs } from "../../../../../uiCommon/generic/tabs";
import { TransactionList } from "./txnList";
import { KVInspector } from "./kvInspector";
import { LiveQueryInspector } from "./liveQueryInspector";
import { TraceOp } from "../types";
import { Table } from "../../../../../uiCommon/generic/table";

export function Inspector(props: { client: Client }) {
  const [curTab, setTab] = useState("data");
  const [selectedTxnID, setSelectedTxnID] = useState<string | null>(null);

  return (
    <div style={{ width: "100%" }}>
      <h4>Inspector</h4>
      <Tabs
        curTabID={curTab}
        setTabID={setTab}
        innerPadding={5}
        tabs={[
          {
            id: "transactions",
            name: "Transactions",
            render: () => (
              <TransactionList
                client={props.client}
                selectedTxnID={selectedTxnID}
                onSelectTxn={setSelectedTxnID}
              />
            ),
          },
          {
            id: "data",
            name: "Data",
            render: () => (
              <KVInspector
                client={props.client}
                selectedTxnID={selectedTxnID}
                onSelectTxn={setSelectedTxnID}
              />
            ),
          },
          {
            id: "queries",
            name: "Queries",
            render: () => <LiveQueryInspector client={props.client} />,
          },
        ]}
      />
      {selectedTxnID !== null ? (
        <>
          <h5>Transaction Trace</h5>
          <Table<TraceOp>
            data={props.client.state.transactions[selectedTxnID].clientTrace}
            getKey={(_, idx) => idx.toString()}
            columns={[
              { name: "Op", render: (op) => op.type },
              { name: "Key", render: (op) => <code>{op.key}</code> },
              {
                name: "Value",
                render: (op) =>
                  op.type === "Write" ? (
                    <code>{JSON.stringify(op.desc)}</code>
                  ) : null,
              },
              {
                name: "TxnID",
                render: (op) =>
                  op.type === "Read" ? <code>{op.transactionID}</code> : null,
              },
            ]}
          />
        </>
      ) : null}
    </div>
  );
}
