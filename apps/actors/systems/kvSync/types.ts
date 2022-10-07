import { Json } from "../../../../util/json";
import { Lambda } from "./mutations/types";

export type VersionedValue = {
  value: Json;
  transactionID: string;
};

export type KVData = { [key: string]: VersionedValue };

export type UserInput =
  | { type: "RunMutation"; name: string; args: Json[] }
  | { type: "RegisterQuery"; id: string; query: Query };

export type MsgToServer = LiveQueryRequest | MutationRequest;

export type MsgToClient = MsgFromServer | UserInput;

type MsgFromServer = MutationResponse | LiveQueryUpdate | LiveQueryResponse;

export type MutationDefns = { [name: string]: Lambda };

export type Query = { fromKey: string; toKey: string };

export type LiveQueryRequest = {
  type: "LiveQueryRequest";
  id: string;
  query: Query;
};

export type Trace = TraceOp[];

type TraceOp = ReadOp | WriteOp;

export type ReadOp = { type: "Read"; key: string; transactionID: string };

export type WriteOp = {
  type: "Write";
  key: string;
  value: Json;
};

export type MutationRequest = {
  type: "MutationRequest";
  txnID: string;
  invocation: MutationInvocation;
  trace: Trace;
};

export type MutationResponse = {
  type: "MutationResponse";
  txnID: string;
  payload:
    | {
        type: "Accept";
        timestamp: number;
      }
    | {
        type: "Reject";
        serverTrace: Trace;
        reason: string;
      };
};

export type TransactionMetadata = {
  [id: string]: { serverTimestamp: number; invocation: MutationInvocation };
};

export type LiveQueryUpdate = {
  type: "LiveQueryUpdate";
  clientID: string;
  transactionMetadata: TransactionMetadata;
  updates: KeyUpdate[];
};

export type LiveQueryResponse = {
  type: "LiveQueryResponse";
  id: string;
  results: { [key: string]: VersionedValue };
  transactionMetadata: TransactionMetadata;
};

type KeyUpdate =
  | {
      type: "Updated";
      key: string;
      value: VersionedValue;
    }
  | { type: "Deleted"; key: string };

export type MutationInvocation = {
  name: string;
  args: Json[];
};

// utils

export function keyInQuery(key: string, query: Query): boolean {
  return key >= query.fromKey && key <= query.toKey;
}
