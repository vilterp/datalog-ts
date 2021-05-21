import React from "react";
import {
  ActorResp,
  LoadedTickInitiator,
  Scenario,
  Trace,
  UpdateFn,
} from "../types";
import * as effects from "../effects";
import { spawnInitialActors } from "../step";

// states

export type State = ServerState | ClientState | UserState;

type ClientState = {
  type: "ClientState";
  value: number;
  status: "saving" | "steady";
};

type ServerState = { type: "ServerState"; value: number };

type UserState = { type: "UserState" };

// messages

export type Msg = MsgToUser | MsgToClient | MsgToServer;

type MsgToUser = never;

type MsgToClient = UserInput | ServerResp;

type UserInput = "increment" | "decrement";

type MsgToServer = "increment" | "decrement";

type ServerResp = "ack";

// initial state

const initialClientState = { type: "ClientState", value: 0, status: "steady" };

export function getInitialState(): Trace<State, Msg> {
  return spawnInitialActors(update, {
    server: { type: "ServerState", value: 0 },
    user: { type: "UserState" },
  });
}

// behaviors

export function server(
  state: ServerState,
  init: LoadedTickInitiator<ServerState, MsgToServer>
): ActorResp<ServerState, ServerResp> {
  switch (init.type) {
    case "messageReceived": {
      const msg = init.payload;
      switch (msg) {
        case "increment":
          return effects.reply(
            init,
            { ...state, value: state.value + 1 },
            "ack"
          );
        case "decrement":
          return effects.reply(
            init,
            { ...state, value: state.value - 1 },
            "ack"
          );
        default:
          return effects.doNothing(state);
      }
    }
    default:
      return effects.doNothing(state);
  }
}

export function client(
  state: ClientState,
  init: LoadedTickInitiator<ClientState, MsgToClient>
): ActorResp<ClientState, MsgToServer> {
  switch (init.type) {
    case "messageReceived": {
      switch (init.payload) {
        // from user
        case "increment":
          return effects.send(
            { type: "ClientState", value: state.value + 1, status: "saving" },
            "server",
            ["increment"]
          );
        case "decrement":
          return effects.send(
            { type: "ClientState", value: state.value - 1, status: "saving" },
            "server",
            ["decrement"]
          );
        // from server
        case "ack":
          // unless there are concurrent requests...
          return effects.updateState({ ...state, status: "steady" });
      }
      break;
    }
    default:
      return effects.updateState(state);
  }
}

// tying it all together

export const update: UpdateFn<State, Msg> = (
  state,
  init
): ActorResp<State, Msg> => {
  switch (state.type) {
    case "ClientState":
      return client(
        state,
        init as LoadedTickInitiator<ClientState, MsgToClient>
      );
    case "ServerState":
      return server(
        state,
        init as LoadedTickInitiator<ServerState, MsgToServer>
      );
    case "UserState":
      return effects.updateState(state);
  }
};

// ui

export function ClientServerUI(props: {
  state: ClientState;
  sendUserInput: (msg: UserInput) => void;
}) {
  return (
    <>
      <h2>Client</h2>
      <button onClick={() => props.sendUserInput("decrement")}>-</button>
      <button onClick={() => props.sendUserInput("increment")}>+</button>
    </>
  );
}

// scenario

export const scenario: Scenario<State, Msg> = {
  name: "Counter",
  id: "simple-counter",
  ui: ClientServerUI,
  update,
  initialState: getInitialState(),
  initialClientState: initialClientState as State,
  initialUserState: { type: "UserState" },
};
