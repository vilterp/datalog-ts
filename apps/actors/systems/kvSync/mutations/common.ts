import { reversed } from "../../../../../util/util";
import { KVData, VersionedValue } from "../types";

export function getVisibleValue(
  isTxnCommitted: (txnID: string) => boolean,
  kvData: KVData,
  key: string
): VersionedValue | null {
  if (!kvData[key]) {
    return null;
  }

  for (const vv of reversed(kvData[key])) {
    if (isTxnCommitted(vv.transactionID)) {
      return vv;
    }
  }
  return null;
}
