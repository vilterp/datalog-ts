import { spawnInitialActors } from "../../step";
import * as effects from "../../effects";
import { ActorResp, LoadedTickInitiator, System } from "../../types";
import { ClientState, initialClientState, updateClient } from "./client";
import { initialServerState, ServerState, updateServer } from "./server";
import { MsgToClient, MsgToServer } from "./types";
import { EXAMPLES } from "./examples";
import { KVApp } from "./examples/types";

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

// instantiated to the bank example
export const kvSync: System<State, Msg> = makeActorSystem(EXAMPLES.bank);

function makeActorSystem(app: KVApp): System<State, Msg> {
  return {
    name: "KV Sync",
    id: "kv-sync",
    ui: app.ui,
    update,
    initialState: spawnInitialActors(update, { server: initialServerState }),
    // TODO: generate ID deterministically
    initialClientState: () =>
      initialClientState(Math.random().toString(), app.mutations),
    initialUserState: () => ({ type: "UserState" }),
  };
}
