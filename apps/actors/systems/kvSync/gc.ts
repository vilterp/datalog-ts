import { filterObj, reversed } from "../../../../util/util";
import { ClientState } from "./client";
import { KVData, VersionedValue } from "./types";

export function garbageCollectTransactions(state: ClientState): ClientState {
  const refCounts: { [txnID: string]: number } = {};
  const newData: KVData = {};
  // iterate through each key, refcounting transactions
  for (const key in state.data) {
    const vvs = state.data[key];
    for (const vv of reversed(vvs)) {
      const txn = state.transactions[vv.transactionID];
      const outputVVs: VersionedValue[] = [];
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
      newData[key] = reversed(outputVVs);
    }
  }

  const newTransactions = filterObj(
    state.transactions,
    (txnID) => refCounts[txnID] > 0
  );

  return {
    ...state,
    data: newData,
    transactions: newTransactions,
  };
}
