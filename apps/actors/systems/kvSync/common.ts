import { Json } from "../../../../util/json";
import { randStep2 } from "../../../../util/util";
import { addNewVersion, getVisibleValue } from "./mvcc";
import {
  KVData,
  MutationCtx,
  MutationInvocation,
  Trace,
  VersionedValue,
  WriteOp,
} from "./types";

export class MutationContextImpl implements MutationCtx {
  curUser: string;
  randState: number;
  kvData: KVData;
  trace: Trace;
  transactionID: string;
  isTxnCommitted: (txnID: string) => boolean;

  constructor(
    txnID: string,
    curUser: string,
    kvData: KVData,
    isTxnCommitted: (txnID: string) => boolean,
    randSeed: number
  ) {
    this.transactionID = txnID;
    this.curUser = curUser;
    this.randState = randSeed;
    this.kvData = kvData;
    this.isTxnCommitted = isTxnCommitted;
    this.trace = [];
  }

  rand(): number {
    const [val, newState] = randStep2(this.randState);
    this.randState = newState;
    return val;
  }

  read(key: string): Json {
    const val = getVisibleValue(this.isTxnCommitted, this.kvData, key);
    this.trace.push({
      type: "Read",
      key,
      transactionID: "-1",
    });
    return val;
  }

  write(key: string, value: Json) {
    const [newKVData, writeOp] = doWrite(
      this.kvData,
      this.isTxnCommitted,
      this.transactionID,
      key,
      value
    );
    this.kvData = newKVData;
    this.trace.push(writeOp);
  }
}

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

export function prettyPrintInvocation(invocation: MutationInvocation): string {
  return `${invocation.name}(${invocation.args.join(", ")})`;
}
