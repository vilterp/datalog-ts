import { KVData, VersionedValue } from "../types";

export function getVisibleValue(
  isTxnCommitted: (txnID: string) => boolean,
  kvData: KVData,
  key: string
): VersionedValue | null {
  if (!kvData[key]) {
    return null;
  }

  for (const vv of kvData[key].reverse()) {
    if (isTxnCommitted(vv.transactionID)) {
      return vv;
    }
  }
  return null;
}
