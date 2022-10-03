import { Json } from "../../../../util/json";
import { MutationDefn } from "./mutation";

export type VersionedValue = {
  version: number;
  value: string;
};

export type MsgToServer = LiveQueryRequest | MutationRequest;

export type MsgToClient =
  | MutationResponse
  | LiveQueryUpdate
  | LiveQueryResponse;

export type MutationDefns = { [name: string]: MutationDefn };

export type Query = { fromKey: string; toKey: string };

export type LiveQueryRequest = {
  type: "LiveQueryRequest";
  query: Query;
};

export type MutationRequest = {
  type: "MutationRequest";
  mutation: MutationInvocation;
  readKeys: { key: string; version: number }[];
};

export type ConflictingKeys = {
  [key: string]: { sentVersion: number; found: VersionedValue };
};

export type MutationResponse = {
  type: "MutationResponse";
  payload:
    | {
        type: "Accept";
        newKeys: { [key: string]: VersionedValue };
      }
    | {
        type: "Reject";
        conflictingKeys: ConflictingKeys;
      };
};

export type LiveQueryUpdate = {
  type: "LiveQueryUpdate";
  clientID: string;
  updates: KeyUpdate[];
};

export type LiveQueryResponse = {
  type: "LiveQueryResponse";
  results: { [key: string]: VersionedValue };
};

type KeyUpdate =
  | {
      type: "Updated";
      key: string;
      value: string;
      newVersion: number;
    }
  | { type: "Deleted"; key: string };

// full SSA for mutations? or just JS?

export type MutationInvocation = {
  name: string;
  args: Json[];
};
