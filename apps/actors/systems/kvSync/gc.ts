import { filterObj, reversed } from "../../../../util/util";
import { ClientState, TransactionRecord } from "./client";
import { KVData, VersionedValue } from "./types";

export function garbageCollectTransactions(state: ClientState): ClientState {
  console.log("===== gc =====");
  const refCounts: { [txnID: string]: number } = {};
  const newData: KVData = {};

  // iterate through each key, refcounting transactions
  for (const key in state.data) {
    console.log("getting refcounts for key", key);
    const vvs = state.data[key];
    const outputVVs: VersionedValue[] = [];
    for (const vv of reversed(vvs)) {
      const txn = state.transactions[vv.transactionID];
      let foundCommittedTxn = false;
      switch (txn.state.type) {
        case "Pending":
          outputVVs.push(vv);
          refCounts[vv.transactionID] = (refCounts[vv.transactionID] || 0) + 1;
          break;
        case "Committed":
          if (!foundCommittedTxn) {
            foundCommittedTxn = true;
            outputVVs.push(vv);
            refCounts[vv.transactionID] =
              (refCounts[vv.transactionID] || 0) + 1;
          }
          break;
        case "Aborted":
          refCounts[vv.transactionID] = (refCounts[vv.transactionID] || 0) + 1;
          outputVVs.push(vv);
          break;
      }
    }
    newData[key] = reversed(outputVVs);
  }

  console.log("refCounts", refCounts);

  // const newTransactions = filterObj(
  //   state.transactions,
  //   (txnID) => refCounts[txnID] > 0
  // );
  const newTransactions: { [txnID: string]: TransactionRecord } = {};
  for (const txnID in state.transactions) {
    if (refCounts[txnID] > 0) {
      newTransactions[txnID] = state.transactions[txnID];
    } else {
      console.log(
        "GC: deleting transaction",
        txnID,
        "with status",
        state.transactions[txnID].state.type
      );
    }
  }

  return {
    ...state,
    data: newData,
    transactions: newTransactions,
  };
  // return state;
}
