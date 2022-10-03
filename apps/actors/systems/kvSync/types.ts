import { Json } from "../../../../util/json";
import { Lambda } from "./mutations/types";

export type ServerValue = {
  version: number;
  value: string;
  serverTimestamp: number;
};

export type VersionedValue = {
  version: number;
  value: string;
};

export type UserInput =
  | { type: "RunMutation"; name: string; args: Json[] }
  | { type: "RegisterQuery"; query: Query };

export type MsgToServer = LiveQueryRequest | MutationRequest;

export type MsgToClient = MsgFromServer | UserInput;

type MsgFromServer = MutationResponse | LiveQueryUpdate | LiveQueryResponse;

export type MutationDefns = { [name: string]: Lambda };

export type Query = { fromKey: string; toKey: string };

export type LiveQueryRequest = {
  type: "LiveQueryRequest";
  query: Query;
};

export type Trace = { key: string; version: number }[];

export type MutationRequest = {
  type: "MutationRequest";
  invocation: MutationInvocation;
  trace: Trace;
};

export type MutationResponse = {
  type: "MutationResponse";
  payload:
    | { type: "Aborted" }
    | {
        type: "Accept";
        // TODO: new keys? with server timestamps?
      }
    | {
        type: "Reject";
        serverTrace: Trace;
      };
};

export type LiveQueryUpdate = {
  type: "LiveQueryUpdate";
  clientID: string;
  updates: KeyUpdate[];
};

export type LiveQueryResponse = {
  type: "LiveQueryResponse";
  results: { [key: string]: ServerValue };
};

type KeyUpdate =
  | {
      type: "Updated";
      key: string;
      value: string;
      newVersion: number;
    }
  | { type: "Deleted"; key: string };

export type MutationInvocation = {
  name: string;
  args: Json[];
};
