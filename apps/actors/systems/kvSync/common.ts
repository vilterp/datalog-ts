import { Json } from "../../../../util/json";
import { randStep2 } from "../../../../util/util";
import { addNewVersion, getVisibleValue } from "./mvcc";
import {
  KVData,
  MutationCtx,
  MutationInvocation,
  QueryResults,
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

  read(key: string, default_: Json = null): VersionedValue {
    const val = getVisibleValue(this.isTxnCommitted, this.kvData, key);
    if (val === null) {
      return { value: default_, transactionID: "-1" };
    }
    this.trace.push({
      type: "Read",
      key,
      transactionID: val.transactionID,
    });
    return val;
  }

  readAll(tableName: string, equalities: [string, Json][]): QueryResults {
    const out: QueryResults = {};

    for (const key in this.kvData) {
      if (key.startsWith(`${tableName}/primary/`)) {
        const value = getVisibleValue(this.isTxnCommitted, this.kvData, key);

        if (recordMatches(value, equalities)) {
          out[key] = value;
        }
      }
    }

    return out;
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

function recordMatches(
  value: VersionedValue,
  equalities: [string, Json][]
): boolean {
  for (const [attr, val] of equalities) {
    if (value.value[attr] !== val) {
      return false;
    }
  }
  return true;
}

function doWrite(
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
