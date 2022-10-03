import { Json } from "../../../../util/json";

export type VersionedValue = {
  version: number;
  value: string;
};

export type MutationDefn = XXX; // JS function or IR?

type MsgToServer = LiveQueryRequest | MutationRequest;

type MsgToClient = MutationResponse | LiveQueryUpdate | LiveQueryResponse;

export type Query = { fromKey: string; toKey: string };

export type LiveQueryRequest = {
  query: Query;
};

export type MutationRequest = {
  mutation: MutationInvocation;
  readKeys: { key: string; version: number }[];
};

export type ConflictingKeys = {
  [key: string]: { sentVersion: number; found: VersionedValue };
};

export type MutationResponse =
  | {
      type: "Accept";
      newKeys: { [key: string]: VersionedValue };
    }
  | {
      type: "Reject";
      conflictingKeys: ConflictingKeys;
    };

export type LiveQueryUpdate = {
  clientID: string;
  updates: KeyUpdate[];
};

export type LiveQueryResponse = {
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
