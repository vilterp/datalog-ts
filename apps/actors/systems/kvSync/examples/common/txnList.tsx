import React from "react";
import { Client } from "../../hooks";
import { TxnState } from "./txnState";
import { prettyPrintInvocation } from "./pretty";

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
          {Object.entries(props.client.state.transactions).map(([id, txn]) => (
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
