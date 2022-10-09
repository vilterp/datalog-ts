import React from "react";
import { TransactionState } from "../client";
import { Client } from "../hooks";

export function TxnState(props: { client: Client; txnID: string }) {
  const txnRecord = props.client.state.transactions[props.txnID];
  if (!txnRecord) {
    return <>?</>;
  }
  const txnState = txnRecord.state;
  switch (txnState.type) {
    case "Pending":
      return <></>;
    case "Committed":
      return <>{txnState.serverTimestamp}</>;
    case "Aborted":
      // TODO: cancel or try again
      return <span>(!)</span>;
  }
}
