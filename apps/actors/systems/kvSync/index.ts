import { spawnInitialActors } from "../../step";
import { ActorResp, LoadedTickInitiator, System } from "../../types";
import { ClientState, initialClientState } from "./client";
import { bankMutations } from "./examples/bank";
import { initialServerState, ServerState } from "./server";
import { MsgToClient, MsgToServer } from "./types";
import { KVSyncUI } from "./ui";

type State = ServerState | ClientState | { type: "UserState" };

type Msg = MsgToServer | MsgToClient;

function update(
  state: State,
  init: LoadedTickInitiator<State, Msg>
): ActorResp<State, Msg> {
  return XXX;
}

export const kvSync: System<State, Msg> = {
  name: "KV Sync",
  id: "kv-sync",
  ui: KVSyncUI,
  update,
  initialState: spawnInitialActors(update, { server: initialServerState }),
  initialClientState: () =>
    initialClientState(Math.random().toString(), bankMutations),
  initialUserState: () => ({ type: "UserState" }),
};
