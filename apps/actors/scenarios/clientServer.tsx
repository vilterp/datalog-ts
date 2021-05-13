import React from "react";
import {
  ActorResp,
  initialSteps,
  LoadedTickInitiator,
  sendUserInput,
  Trace,
  UpdateFn,
} from "../model";
import * as effects from "../effects";
import { Scenario } from "../scenario";

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
  // TODO: something about <god>, lol
  return initialSteps(update, [
    {
      to: "client",
      from: "<god>",
      init: {
        type: "spawned",
        initialState: { type: "ClientState", value: 0, status: "steady" },
        spawningTickID: "init",
      },
    },
    {
      to: "server",
      from: "<god>",
      init: {
        type: "spawned",
        initialState: { type: "ServerState", value: 0 },
        spawningTickID: "init",
      },
    },
    {
      to: "user",
      from: "<god>",
      init: {
        type: "spawned",
        initialState: { type: "UserState", step: 0 },
        spawningTickID: "init",
      },
    },
  ]);
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
            { type: "ServerState", value: state.value + 1 },
            { from: init.from, msg: init.payload },
            "ack"
          );
        case "decrement":
          return effects.reply(
            { type: "ServerState", value: state.value - 1 },
            { from: init.from, msg: init.payload },
            "ack"
          );
        default:
          return effects.update(state);
      }
    }
    default:
      return effects.update(state);
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
            "increment",
            "server"
          );
        case "decrement":
          return effects.send(
            { type: "ClientState", value: state.value - 1, status: "saving" },
            "decrement",
            "server"
          );
        // from server
        case "ack":
          // unless there are concurrent requests...
          return effects.update({ ...state, status: "steady" });
      }
      break;
    }
    default:
      return effects.update(state);
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
      return effects.update(state);
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
          props.setTrace(
            sendUserInput(
              props.trace,
              update,
              { type: "UserState", step: 0 },
              {
                to: "client",
                from: "user",
                payload: "decrement",
              }
            )
          )
        }
      >
        -
      </button>
      <button
        onClick={() =>
          props.setTrace(
            sendUserInput(
              props.trace,
              update,
              { type: "UserState", step: 0 },
              {
                to: "client",
                from: "user",
                payload: "increment",
              }
            )
          )
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
