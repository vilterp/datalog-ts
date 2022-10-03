import { MutationDefn } from "./mutation";
import {
  ConflictingKeys,
  LiveQueryResponse,
  LiveQueryUpdate,
  MutationDefns,
  MutationInvocation,
  MutationRequest,
  MutationResponse,
  Query,
} from "./types";

export type ClientState = {
  type: "ClientState";
  id: string;
  data: { [key: string]: ClientValue };
  liveQueries: Query[];
  nextMutationID: number;
  mutations: MutationState[]; // TODO: index
  mutationDefns: MutationDefns;
};

export function initialClientState(
  id: string,
  mutationDefns: MutationDefns
): ClientState {
  return {
    type: "ClientState",
    data: {},
    id,
    liveQueries: [],
    mutationDefns,
    mutations: [],
    nextMutationID: 0,
  };
}

type ClientValue = {
  version: number;
  value: string;
  serverTimestamp: number | null;
};

// rename "TransactionState"?
type MutationState = {
  id: string;
  mutation: MutationInvocation;
  state:
    | { type: "Pending" }
    | { type: "Applied"; serverTimestamp: number }
    | {
        type: "Rejected";
        conflictingKeys: ConflictingKeys;
      };
};

function processMutationResponse(
  state: ClientState,
  response: MutationResponse
): [ClientState, MutationRequest | null] {
  // update state in mutations list
  // if accepted, apply kv updates
  // if conflict, retry
  return XXX;
}

function processLiveQueryUpdate(
  state: ClientState,
  update: LiveQueryUpdate
): ClientState {
  return XXX;
}

function runMutationOnClient(
  state: ClientState,
  mutation: MutationInvocation
): [ClientState, MutationRequest] {
  // apply to client
  // put mutation in list with state Pending
  // return mutation request
  return XXX;
}

function processLiveQueryResponse(
  state: ClientState,
  resp: LiveQueryResponse
): ClientState {
  return XXX;
}
