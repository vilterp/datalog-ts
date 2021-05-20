import React from "react";
import {
  ActorResp,
  LoadedTickInitiator,
  Scenario,
  Trace,
  UpdateFn,
} from "../types";
import * as effects from "../effects";
import { sendUserInput, spawnActors } from "../step";

// states

export type ClientServerActorState = ServerState | ClientState | UserState;

type ClientState = {
  type: "ClientState";
  value: number;
  status: "saving" | "steady";
};

type ServerState = { type: "ServerState"; value: number };

type UserState = { type: "UserState"; step: number };

// messages

export type ClientServerMsg = MsgToUser | MsgToClient | MsgToServer;

type MsgToUser = never;

type MsgToClient = "increment" | "decrement" | ServerResp;

type MsgToServer = "increment" | "decrement";

type ServerResp = "ack";

// initial state

export function getInitialState(): Trace<
  ClientServerActorState,
  ClientServerMsg
> {
  return spawnActors(update, {
    client: { type: "ClientState", value: 0, status: "steady" },
    server: { type: "ServerState", value: 0 },
    user: { type: "UserState", step: 0 },
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
            "increment"
          );
        case "decrement":
          return effects.send(
            { type: "ClientState", value: state.value - 1, status: "saving" },
            "server",
            "decrement"
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

export const update: UpdateFn<ClientServerActorState, ClientServerMsg> = (
  state,
  init
): ActorResp<ClientServerActorState, ClientServerMsg> => {
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

type CSTrace = Trace<ClientServerActorState, ClientServerMsg>;

export function ClientServerUI(props: {
  trace: CSTrace;
  setTrace: (t: CSTrace) => void;
}) {
  return (
    <>
      <h2>Client</h2>
      <button
        onClick={() =>
          props.setTrace(sendUserInput(props.trace, update, "decrement"))
        }
      >
        -
      </button>
      <button
        onClick={() =>
          props.setTrace(sendUserInput(props.trace, update, "increment"))
        }
      >
        +
      </button>
    </>
  );
}

// scenario

export const scenario: Scenario<ClientServerActorState, ClientServerMsg> = {
  name: "Simple Client/Server",
  id: "simple-client-server",
  ui: ClientServerUI,
  update,
  initialState: getInitialState(),
};
