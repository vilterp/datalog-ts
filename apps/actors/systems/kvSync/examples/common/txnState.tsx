import React from "react";
import { Client } from "../../hooks";

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
      return <>{txnState.serverTimestamp}</>;
    case "Aborted":
      // TODO: cancel
      return (
        <>
          <button
            onClick={() => {
              props.client.retryTransaction(props.txnID);
            }}
          >
            retry
          </button>
          <button
            onClick={() => {
              props.client.cancelTransaction(props.txnID);
            }}
          >
            cancel
          </button>
        </>
      );
  }
}
