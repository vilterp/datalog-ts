import React from "react";
import { Client } from "../../hooks";
import { TxnState } from "./txnState";
import { prettyPrintInvocation } from "./pretty";
import { TransactionRecord, TransactionState } from "../../client";
import { Table } from "./table";

export function TransactionList(props: { client: Client }) {
  return (
    <Table<[string, TransactionRecord]>
      columns={[
        { name: "ID", render: ([id, txn]) => id },
        {
          name: "Invocation",
          render: ([id, txn]) => (
            <code>{prettyPrintInvocation(txn.invocation)}</code>
          ),
        },
        {
          name: "Status",
          render: ([id, txn]) => <TxnState client={props.client} txnID={id} />,
        },
      ]}
      data={Object.entries(props.client.state.transactions)
        .sort(comparator)
        .reverse()}
      getKey={([id, txn]) => id}
    />
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
