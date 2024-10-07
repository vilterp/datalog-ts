import { spawnInitialActors } from "../../step";
import * as effects from "../../effects";
import {
  ActorResp,
  ChooseFn,
  LoadedTickInitiator,
  MessageToClient,
  System,
  Trace,
  UpdateFn,
} from "../../types";
import { ClientState, initialClientState, updateClient } from "./client";
import { initialServerState, ServerState, updateServer } from "./server";
import { MsgToClient, MsgToServer } from "./types";
import { EXAMPLES } from "./examples";
import { hashString } from "../../../../util/util";
import { KVApp } from "./kvApp";

export const KVSYNC_SYSTEMS = Object.values(EXAMPLES).map(makeActorSystem);

export type KVSyncState = ServerState | ClientState | { type: "UserState" };

export type KVSyncMsg = MsgToServer | MsgToClient;

export function makeActorSystem(app: KVApp): System<KVSyncState, KVSyncMsg> {
  const randServerSeed = 1234; // TODO: pass this in
  const doUpdate: UpdateFn<KVSyncState, KVSyncMsg> = (
    state: KVSyncState,
    init: LoadedTickInitiator<KVSyncState, KVSyncMsg>
  ) => {
    return update(app, state, init);
  };
  return {
    name: `KV: ${app.name}`,
    id: `kv-${app.name}`,
    ui: app.ui,
    update: doUpdate,
    getInitialState: (interp): Trace<KVSyncState> => {
      return spawnInitialActors(doUpdate, interp, {
        server: initialServerState(app.initialKVPairs || {}, randServerSeed),
      });
    },
    // TODO: generate ID deterministically
    initialClientState: (id: string) => initialClientState(id, hashString(id)),
    initialUserState: { type: "UserState" },
    chooseNextMove: app.choose ? kvSyncChooseMove(app) : undefined,
  };
}

function kvSyncChooseMove(app: KVApp): ChooseFn<KVSyncState, KVSyncMsg> {
  return (system, state, randomSeed) => {
    if (!app.choose) {
      return [null, randomSeed];
    }
    const clientStates: { [clientID: string]: ClientState } = {};
    for (const clientID of state.clientIDs) {
      const clientState = state.trace.latestStates[`client${clientID}`];
      clientStates[clientID] = clientState as ClientState;
    }
    const [mutation, nextRandomSeed] = app.choose(clientStates, randomSeed);
    if (mutation === null) {
      return [null, nextRandomSeed];
    }

    const msg: MessageToClient<MsgToClient> = {
      clientID: mutation.clientID,
      message: {
        type: "RunMutation",
        invocation: mutation.invocation,
      },
    };
    return [msg, nextRandomSeed];
  };
}

export function update(
  app: KVApp,
  state: KVSyncState,
  init: LoadedTickInitiator<KVSyncState, KVSyncMsg>
): ActorResp<KVSyncState, KVSyncMsg> {
  switch (state.type) {
    case "ClientState":
      return updateClient(
        app,
        state,
        init as LoadedTickInitiator<ClientState, MsgToClient>
      );
    case "ServerState":
      return updateServer(
        app,
        state,
        init as LoadedTickInitiator<ServerState, MsgToServer>
      );
    case "UserState":
      return effects.updateState(state);
  }
}
