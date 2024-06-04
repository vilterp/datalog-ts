import { spawnInitialActors } from "../../step";
import * as effects from "../../effects";
import {
  ActorResp,
  LoadedTickInitiator,
  MessageToClient,
  System,
} from "../../types";
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

export const kvSyncCounter: System<State, Msg> = makeActorSystem(
  EXAMPLES.counter
);

export const kvSyncTodoMVC: System<State, Msg> = makeActorSystem(
  EXAMPLES.todoMVC
);

export function makeActorSystem(app: KVApp): System<State, Msg> {
  return {
    name: `KV: ${app.name}`,
    id: `kv-${app.name}`,
    ui: app.ui,
    update,
    getInitialState: (interp) =>
      spawnInitialActors(update, interp, {
        server: initialServerState(app.mutations, app.initialKVPairs || {}),
      }),
    // TODO: generate ID deterministically
    initialClientState: (id: string) =>
      initialClientState(id, app.mutations, 10),
    initialUserState: { type: "UserState" },
    chooseNextMove: function* (state) {
      if (!app.choose) {
        return;
      }
      const clientStates: { [clientID: string]: ClientState } = {};
      for (const clientID of state.clientIDs) {
        const clientState = state.trace.latestStates[clientID];
        clientStates[clientID] = clientState as ClientState;
      }
      const mutations = app.choose(clientStates);
      for (const mutation of mutations) {
        const msg: MessageToClient<MsgToClient> = {
          clientID: mutation.clientID,
          message: {
            type: "RunMutation",
            invocation: mutation.invocation,
          },
        };
        console.log("msg", msg);
        yield msg;
      }
    },
  };
}
