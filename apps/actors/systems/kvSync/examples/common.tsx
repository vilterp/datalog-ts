import React from "react";
import { TransactionState } from "../client";

export function TxnState(props: { state: TransactionState }) {
  if (!props.state) {
    return <>?</>;
  }
  switch (props.state.type) {
    case "Pending":
      return <></>;
    case "Committed":
      return <>{props.state.serverTimestamp}</>;
    case "Aborted":
      return <>(!)</>;
  }
}
