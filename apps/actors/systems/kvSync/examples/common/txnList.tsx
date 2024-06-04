import React, { useState } from "react";
import { Client } from "../../hooks";
import { TxnState } from "./txnState";
import { prettyPrintInvocation } from "./pretty";
import { TransactionRecord, TransactionState } from "../../client";
import { Table } from "./table";

export function TransactionList(props: { client: Client }) {
  const [selectedTxnID, setSelectedTxnID] = useState<string | null>(null);

  return (
    <>
      <Table<[string, TransactionRecord]>
        columns={[
          {
            name: "ID",
            render: ([id, txn]) => (
              // TODO: row click
              <span onClick={() => setSelectedTxnID(id)}>id</span>
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
        <ol>
          {props.client.state.transactions[selectedTxnID].clientTrace.map(
            (op, idx) => (
              <li key={idx}>
                <code>{JSON.stringify(op)}</code>
              </li>
            )
          )}
        </ol>
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
