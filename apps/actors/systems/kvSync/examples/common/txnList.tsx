import React, { useState } from "react";
import { Client } from "../../hooks";
import { TxnState } from "./txnState";
import { prettyPrintInvocation } from "./pretty";
import { TransactionRecord, TransactionState } from "../../client";
import { Table } from "./table";
import { TraceOp } from "../../types";

export function TransactionList(props: { client: Client }) {
  const [selectedTxnID, setSelectedTxnID] = useState<string | null>(null);

  return (
    <>
      <Table<[string, TransactionRecord]>
        columns={[
          {
            name: "ID",
            render: ([id, txn]) => (
              <span
                style={{
                  cursor: "pointer",
                  backgroundColor: id === selectedTxnID ? "lightskyblue" : null,
                }}
                onClick={() => setSelectedTxnID(id)}
              >
                <code>{id}</code>
              </span>
            ),
          },
          {
            name: "Invocation",
            render: ([id, txn]) => (
              <code>{prettyPrintInvocation(txn.invocation)}</code>
            ),
          },
          {
            name: "Status",
            render: ([id, txn]) => (
              <TxnState client={props.client} txnID={id} />
            ),
          },
        ]}
        data={Object.entries(props.client.state.transactions)
          .sort(comparator)
          .reverse()}
        getKey={([id, txn]) => id}
      />
      {selectedTxnID !== null ? (
        <>
          <h5>Trace</h5>
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
                    <code>{JSON.stringify(op.value)}</code>
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
    </>
  );
}

function comparator(
  a: [string, TransactionRecord],
  b: [string, TransactionRecord]
) {
  return getTime(a[1].state) - getTime(b[1].state);
}

function getTime(state: TransactionState) {
  switch (state.type) {
    case "Pending":
      return state.sentTime;
    case "Committed":
      return state.serverTimestamp;
    case "Aborted":
      return state.serverTimestamp;
  }
}
