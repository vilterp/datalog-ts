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
import { mapObj } from "../../../util/util";

// states

export type State = ServerState | ClientState | UserState;

type ClientState = {
  type: "ClientState";
  currentText: string;
  nextTodoID: number; // TODO: use UUIDs??
  todos: Query<{ [id: string]: Saving<Todo> }>;
};

type Todo = {
  id: number;
  body: string;
  done: boolean;
};

type ServerState = { type: "ServerState"; todos: { [id: string]: Todo } };

type UserState = { type: "UserState" };

// track client/server state

type Saving<T> = {
  status: "saving" | "stable";
  thing: T;
};

type Query<T> = { status: "loading" | "loaded"; value: T };

// messages

// TODO: we shouldn't really have to prefix everything like this
export type Msg = MsgToUser | MsgToClient | MsgToServer;

type MsgToUser = never;

type UserInput =
  | { type: "enterText"; value: string }
  | { type: "submitTodo" }
  | { type: "toggleTodo"; id: string; value: boolean };

type MsgToClient = UserInput | ServerResp;

type MsgToServer = GetTodos | PutTodo;

type ServerResp = getTodosResp | PutTodoResp;

type GetTodos = { type: "getTodos" };

type PutTodo = { type: "putTodo"; todo: Todo };

type getTodosResp = { type: "getTodosResp"; todos: { [id: string]: Todo } };

// maybe could just return the ID here
type PutTodoResp = { type: "putTodoResp"; todo: Todo };

// initial state

export function getInitialState(): Trace<State, Msg> {
  return spawnActors(update, {
    user: { type: "UserState" },
    client: {
      type: "ClientState",
      currentText: "",
      nextTodoID: 0,
      todos: { status: "loading", value: {} },
    },
    server: { type: "ServerState", todos: {} },
  });
}

// behaviors

export function server(
  state: ServerState,
  init: LoadedTickInitiator<ServerState, Msg>
): ActorResp<ServerState, ServerResp> {
  switch (init.type) {
    case "messageReceived": {
      const msg = init.payload;
      switch (msg.type) {
        case "getTodos":
          return effects.reply(init, state, {
            type: "getTodosResp",
            todos: state.todos,
          });
        case "putTodo":
          return effects.reply(
            init,
            { ...state, todos: { ...state.todos, [msg.todo.id]: msg.todo } },
            { type: "putTodoResp", todo: msg.todo }
          );
        default:
          return effects.updateState(state);
      }
    }
    default:
      return effects.updateState(state);
  }
}

export function client(
  state: ClientState,
  init: LoadedTickInitiator<ClientState, MsgToClient>
): ActorResp<ClientState, MsgToServer> {
  switch (init.type) {
    case "spawned":
      return effects.send(state, "server", { type: "getTodos" });
    case "messageReceived": {
      const msg = init.payload;
      switch (msg.type) {
        // from user
        case "enterText":
          return effects.updateState({ ...state, currentText: msg.value });
        case "submitTodo": {
          const newTodo: Todo = {
            id: state.nextTodoID,
            body: state.currentText,
            done: false,
          };
          return {
            type: "continue",
            state: {
              ...state,
              nextTodoID: state.nextTodoID + 1,
              todos: {
                ...state.todos,
                value: {
                  ...state.todos.value,
                  [state.nextTodoID.toString()]: {
                    status: "saving",
                    thing: newTodo,
                  },
                },
              },
            },
            messages: [
              { to: "server", msg: { type: "putTodo", todo: newTodo } },
            ],
          };
        }
        case "toggleTodo": {
          const currentTodo = state.todos[msg.id];
          return effects.updateState({
            ...state,
            todos: {
              ...state.todos,
              value: {
                ...state.todos.value,
                [msg.id]: {
                  status: "saving",
                  thing: { ...currentTodo.thing, done: msg.value },
                },
              },
            },
          });
        }
        // from server
        case "getTodosResp":
          return effects.updateState({
            ...state,
            todos: {
              status: "loaded",
              value: mapObj(msg.todos, (id, todo) => ({
                status: "stable",
                thing: todo,
              })),
            },
          });
        case "putTodoResp":
          return effects.updateState({
            ...state,
            todos: {
              status: "loaded",
              value: {
                ...state.todos.value,
                [msg.todo.id]: { status: "stable", thing: msg.todo },
              },
            },
          });
      }
      break;
    }
    default:
      return effects.doNothing(state);
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

type CSTrace = Trace<State, Msg>;

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
            sendUserInput(props.trace, update, {
              to: "client",
              from: "user",
              payload: "decrement",
            })
          )
        }
      >
        -
      </button>
      <button
        onClick={() =>
          props.setTrace(
            sendUserInput(props.trace, update, {
              to: "client",
              from: "user",
              payload: "increment",
            })
          )
        }
      >
        +
      </button>
    </>
  );
}

// scenario

export const scenario: Scenario<State, Msg> = {
  name: "Simple Client/Server",
  id: "simple-client-server",
  ui: ClientServerUI,
  update,
  initialState: getInitialState(),
};
