import React from "react";
import { Client } from "../../hooks";
import { TxnState } from "./txnState";
import { prettyPrintInvocation } from "./pretty";
import { TransactionRecord, TransactionState } from "../../client";

export function TransactionList(props: { client: Client }) {
  return (
    <>
      <h4>Transactions</h4>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Invocation</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(props.client.state.transactions)
            .sort(comparator)
            .reverse()
            .map(([id, txn]) => (
              <tr key={id}>
                <td>{id}</td>
                <td>{prettyPrintInvocation(txn.invocation)}</td>
                <td>
                  <TxnState client={props.client} txnID={id} />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
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
      // max int
      return Number.MAX_SAFE_INTEGER;
    case "Committed":
      return state.serverTimestamp;
    case "Aborted":
      return state.serverTimestamp;
  }
}
