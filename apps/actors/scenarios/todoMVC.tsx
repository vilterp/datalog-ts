import React from "react";
import {
  ActorID,
  ActorResp,
  LoadedTickInitiator,
  OutgoingMessage,
  Scenario,
  Trace,
  UpdateFn,
} from "../types";
import * as effects from "../effects";
import { spawnInitialActors } from "../step";
import { mapObj, mapObjToList } from "../../../util/util";

// states

export type State = ServerState | ClientState | UserState;

type ClientState = {
  type: "ClientState";
  currentText: string;
  todos: Query<{ [id: string]: Saving<Todo> }>;
};

type Todo = {
  id: number;
  body: string;
  done: boolean;
};

type ServerState = {
  type: "ServerState";
  todos: { [id: string]: Todo };
  subscribers: ActorID[];
};

type UserState = { type: "UserState" };

// track client/server state

type Saving<T> = {
  status: "saving" | "stable";
  thing: T;
};

type Query<T> = { status: "loading" | "loaded"; value: T };

// messages

export type Msg = MsgToUser | MsgToClient | MsgToServer;

type MsgToUser = never;

type UserInput =
  | { type: "enterText"; value: string }
  | { type: "submitTodo" }
  | { type: "toggleTodo"; id: string; value: boolean };

type MsgToClient = UserInput | ServerResp;

type MsgToServer = GetTodos | PutTodo | Subscribe;

type ServerResp = GetTodosResp | PutTodoResp | SubscriptionUpdate;

type GetTodos = { type: "getTodos" };

type PutTodo = { type: "putTodo"; todo: Todo };

type GetTodosResp = { type: "getTodosResp"; todos: { [id: string]: Todo } };

// currently just subscribes to all todos
type Subscribe = { type: "subscribe" };

type SubscriptionUpdate = {
  type: "subscriptionUpdate";
  payload: SubUpdatePayload;
};

type SubUpdatePayload = { type: "putTodo"; todo: Todo };

// maybe could just return the ID here
type PutTodoResp = { type: "putTodoResp"; todo: Todo };

// initial state

export function getInitialState(): Trace<State, Msg> {
  return spawnInitialActors(update, {
    server: {
      type: "ServerState",
      todos: {},
      subscribers: [],
    },
  });
}

export const initialClientState: ClientState = {
  type: "ClientState",
  currentText: "",
  todos: { status: "loading", value: {} },
};

// behaviors

export function server(
  state: ServerState,
  init: LoadedTickInitiator<ServerState, MsgToServer>
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
          return {
            type: "continue",
            state: {
              ...state,
              todos: { ...state.todos, [msg.todo.id]: msg.todo },
            },
            messages: [
              // reply
              { to: init.from, msg: { type: "putTodoResp", todo: msg.todo } },
              // push to subscribers
              ...(state.subscribers
                .filter((id) => id !== init.from)
                .map((to) => ({
                  to,
                  msg: {
                    type: "subscriptionUpdate",
                    payload: { type: "putTodo", todo: msg.todo },
                  },
                })) as OutgoingMessage<ServerResp>[]),
            ],
          };
        case "subscribe":
          return effects.updateState({
            ...state,
            subscribers: [...state.subscribers, init.from],
          });
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
      return effects.send(state, "server", [
        { type: "getTodos" },
        { type: "subscribe" },
      ]);
    case "messageReceived": {
      const msg = init.payload;
      switch (msg.type) {
        // from user
        case "enterText":
          return effects.updateState({ ...state, currentText: msg.value });
        case "submitTodo": {
          const newTodo: Todo = {
            id: Math.random(),
            body: state.currentText,
            done: false,
          };
          return effects.updateAndSend(
            {
              ...state,
              currentText: "",
              todos: {
                ...state.todos,
                value: {
                  ...state.todos.value,
                  [newTodo.id.toString()]: {
                    status: "saving",
                    thing: newTodo,
                  },
                },
              },
            },
            [{ to: "server", msg: { type: "putTodo", todo: newTodo } }]
          );
        }
        case "toggleTodo": {
          const currentTodo = state.todos.value[msg.id];
          return effects.updateAndSend(
            {
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
            },
            [
              {
                to: "server",
                msg: { type: "putTodo", todo: currentTodo.thing },
              },
            ]
          );
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
          // TODO: rebase on changes that have been made since
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
        case "subscriptionUpdate":
          return effects.updateState({
            ...state,
            todos: {
              status: "loaded",
              value: {
                ...state.todos.value,
                [msg.payload.todo.id]: {
                  status: "stable",
                  thing: msg.payload.todo,
                },
              },
            },
          });
        default:
          return effects.doNothing(state);
      }
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

export function ClientServerUI(props: {
  state: ClientState;
  sendUserInput: (msg: UserInput) => void;
}) {
  return (
    <>
      <h2>TodoMVC</h2>
      <input
        type="text"
        value={props.state.currentText}
        onKeyDown={(evt) => {
          if (evt.keyCode === 13) {
            props.sendUserInput({ type: "submitTodo" });
          }
        }}
        onInput={(evt) =>
          props.sendUserInput({
            type: "enterText",
            value: (evt.target as HTMLInputElement).value,
          })
        }
      />
      <button onClick={() => props.sendUserInput({ type: "submitTodo" })}>
        Submit
      </button>
      <ul>
        {mapObjToList(props.state.todos.value, (id, savingTodo) => (
          <li key={id}>
            <input
              type="checkbox"
              onChange={(evt) =>
                props.sendUserInput({
                  type: "toggleTodo",
                  value: (evt.target as HTMLInputElement).checked,
                  id,
                })
              }
              value={savingTodo.thing.done ? "on" : "off"}
            />{" "}
            {savingTodo.thing.body}
            {/*  TODO: saving indicator*/}
          </li>
        ))}
      </ul>
    </>
  );
}

// scenario

export const scenario: Scenario<State, Msg> = {
  name: "Todo List",
  id: "todo-mvc",
  ui: ClientServerUI,
  update,
  initialState: getInitialState(),
  initialClientState: initialClientState as State,
  initialUserState: { type: "UserState" },
};
