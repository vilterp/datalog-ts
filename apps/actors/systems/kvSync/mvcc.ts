import { reversed } from "../../../../util/util";
import { KVData, VersionedValue } from "./types";

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

export function addNewVersion(
  kvData: KVData,
  key: string,
  newVersion: VersionedValue
) {
  const versions = kvData[key] || [];
  // Check if the transactionID is already in the list
  // This can result from overlapping live queries
  // TODO: this is O(n) and could be O(1)
  if (versions.some((v) => v.transactionID === newVersion.transactionID)) {
    return versions;
  }
  return [...versions, newVersion];
}
