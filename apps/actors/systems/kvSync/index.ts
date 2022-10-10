import { spawnInitialActors } from "../../step";
import * as effects from "../../effects";
import { ActorResp, LoadedTickInitiator, System } from "../../types";
import { ClientState, initialClientState, updateClient } from "./client";
import { initialServerState, ServerState, updateServer } from "./server";
import { MsgToClient, MsgToServer } from "./types";
import { EXAMPLES } from "./examples";
import { KVApp } from "./examples/types";

export type State = ServerState | ClientState | { type: "UserState" };

export type Msg = MsgToServer | MsgToClient;

export function update(
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

export const kvSyncBank: System<State, Msg> = makeActorSystem(EXAMPLES.bank);

export const kvSyncChat: System<State, Msg> = makeActorSystem(EXAMPLES.chat);

export function makeActorSystem(app: KVApp): System<State, Msg> {
  return {
    name: `KV: ${app.name}`,
    id: `kv-${app.name}`,
    ui: app.ui,
    update,
    getInitialState: (interp) =>
      spawnInitialActors(update, interp, {
        server: initialServerState(app.mutations),
      }),
    // TODO: generate ID deterministically
    initialClientState: (id: string) =>
      initialClientState(id, app.mutations, 10),
    initialUserState: { type: "UserState" },
  };
}
