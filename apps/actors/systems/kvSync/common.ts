import { Json } from "../../../../util/json";
import { addNewVersion, getVisibleValue } from "./mvcc";
import { KVData, VersionedValue, WriteOp } from "./types";

export function doWrite(
  kvData: KVData,
  isTxnCommitted: (txnID: string) => boolean,
  transactionID: string,
  key: string,
  value: Json
): [KVData, WriteOp] {
  const newVersionedValue: VersionedValue = { transactionID, value };
  const newKVData: KVData = {
    ...kvData,
    [key]: addNewVersion(kvData, key, newVersionedValue),
  };
  const oldValue = getVisibleValue(isTxnCommitted, kvData, key);
  if (kvData[key] !== undefined) {
    return [
      newKVData,
      {
        type: "Write",
        key,
        desc: { type: "Update", before: oldValue, after: newVersionedValue },
      },
    ];
  }
  return [
    newKVData,
    {
      type: "Write",
      key,
      desc: { type: "Insert", after: newVersionedValue },
    },
  ];
}
