import { System } from "../../types";

type State = ServerState | ClientState;

type Msg = MsgToServer | MsgToClient;

export const kvSync: System<State, Msg> = {
  name: "KV Sync",
  id: "kv-sync",
  ui: XXX,
  update,
  initialState: spawnInitialActors(update, { server: initialServerState }),
  initialClientState: XXX,
  initialUserState: XXX,
};
