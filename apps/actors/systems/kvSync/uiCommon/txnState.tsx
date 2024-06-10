import React from "react";
import { Client } from "../hooks";

export function TxnState(props: { client: Client; txnID: string }) {
  const txnRecord = props.client.state.transactions[props.txnID];
  if (!txnRecord) {
    return <>?</>;
  }
  const txnState = txnRecord.state;
  switch (txnState.type) {
    case "Pending":
      return <>...</>;
    case "Committed":
      return <>✅ T{txnState.serverTimestamp}</>;
    case "Aborted":
      return (
        <>
          <span title={JSON.stringify(txnState.reason)}>
            ❌ T{txnState.serverTimestamp}{" "}
          </span>
          <button
            onClick={() => {
              props.client.retryTransaction(props.txnID);
            }}
          >
            Retry
          </button>
          <button
            onClick={() => {
              props.client.cancelTransaction(props.txnID);
            }}
          >
            Cancel
          </button>
        </>
      );
  }
}
