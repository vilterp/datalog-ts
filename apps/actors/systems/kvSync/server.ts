import {
  LiveQueryRequest,
  LiveQueryResponse,
  LiveQueryUpdate,
  MutationDefns,
  MutationRequest,
  MutationResponse,
  Query,
  VersionedValue,
} from "./types";

export type ServerState = {
  type: "ServerState";
  data: { [key: string]: VersionedValue };
  liveQueries: { clientID: string; query: Query }[]; // TODO: index
  mutationDefns: MutationDefns;
};

export const initialServerState: ServerState = {
  type: "ServerState",
  data: {},
  liveQueries: [],
  mutationDefns: {},
};

function processLiveQueryRequest(
  state: ServerState,
  req: LiveQueryRequest
): [ServerState, LiveQueryResponse] {
  return XXX;
}

function runMutationOnServer(
  state: ServerState,
  mutation: MutationRequest
): [ServerState, MutationResponse, LiveQueryUpdate[]] {
  // run mutation
  // if conflict, send conflict response
  // if accept
  // send accept response
  // send live query updates
  return XXX;
}
