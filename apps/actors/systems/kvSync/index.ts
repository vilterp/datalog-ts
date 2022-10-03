import { spawnInitialActors } from "../../step";
import * as effects from "../../effects";
import { ActorResp, LoadedTickInitiator, System } from "../../types";
import { ClientState, initialClientState, updateClient } from "./client";
import { bankMutations } from "./examples/bank";
import { initialServerState, ServerState, updateServer } from "./server";
import { MsgToClient, MsgToServer } from "./types";
import { KVSyncUI } from "./ui";

type State = ServerState | ClientState | { type: "UserState" };

type Msg = MsgToServer | MsgToClient;

function update(
  state: State,
  init: LoadedTickInitiator<State, Msg>
): ActorResp<State, Msg> {
  switch (state.type) {
    case "ClientState":
      return updateClient(
        state,
        init as LoadedTickInitiator<ClientState, MsgToClient>
      );
    case "ServerState":
      return updateServer(
        state,
        init as LoadedTickInitiator<ServerState, MsgToServer>
      );
    case "UserState":
      return effects.updateState(state);
  }
}

export const kvSync: System<State, Msg> = {
  name: "KV Sync",
  id: "kv-sync",
  ui: KVSyncUI,
  update,
  initialState: spawnInitialActors(update, { server: initialServerState }),
  // TODO: generate ID deterministically
  initialClientState: () =>
    initialClientState(Math.random().toString(), bankMutations),
  initialUserState: () => ({ type: "UserState" }),
};
