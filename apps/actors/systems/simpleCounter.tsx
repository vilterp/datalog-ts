import React from "react";
import {
  ActorResp,
  LoadedTickInitiator,
  System,
  Trace,
  UpdateFn,
} from "../types";
import * as effects from "../effects";
import { spawnInitialActors } from "../step";
import { AbstractInterpreter } from "../../../core/abstractInterpreter";

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

export function getInitialState(interp: AbstractInterpreter): Trace<State> {
  return spawnInitialActors(update, interp, {
    server: { type: "ServerState", value: 0 },
  });
}

// behaviors

// TODO: push out updates to clients
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
      <h2>Counter</h2>
      <span
        style={{
          color: props.state.status === "saving" ? "lightgrey" : "",
        }}
      >
        Value: {props.state.value}{" "}
      </span>
      <button onClick={() => props.sendUserInput("decrement")}>-</button>
      <button onClick={() => props.sendUserInput("increment")}>+</button>
    </>
  );
}

export const simpleCounter: System<State, Msg> = {
  name: "Counter",
  id: "simple-counter",
  ui: ClientServerUI,
  update,
  getInitialState,
  initialClientState: initialClientState as State,
  initialUserState: { type: "UserState" },
};
