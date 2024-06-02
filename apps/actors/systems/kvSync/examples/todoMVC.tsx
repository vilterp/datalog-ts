import React from "react";
import { UIProps } from "../../../types";
import { ClientState, QueryStatus, TransactionState } from "../client";
import { MutationDefns, UserInput } from "../types";
import { KVApp } from "./types";
import { apply, bool, lambda, obj, str, varr, write } from "../mutations/types";
import { mapObjToList } from "../../../../../util/util";
import { Client, makeClient, useLiveQuery } from "../hooks";

function TodoMVC(props: UIProps<ClientState, UserInput>) {
  const client = makeClient(props);
  const [todos, queryStatus] = useTodos(client);

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
        {props.state.todos.status === "loading"
          ? "Loading..."
          : mapObjToList(props.state.todos.value, (id, savingTodo) => (
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
                  checked={savingTodo.thing.done}
                />{" "}
                <span
                  style={{
                    color: savingTodo.status === "saving" ? "grey" : "inherit",
                  }}
                >
                  {savingTodo.thing.body}
                </span>
              </li>
            ))}
      </ul>
    </>
  );
}

type Todo = {
  id: string;
  body: string;
  done: boolean;
  state: TransactionState;
};

function useTodos(client: Client): [Todo[], QueryStatus] {
  const [todos, queryStatus] = useLiveQuery(client, "list-todos", {
    prefix: "/todos/",
  });

  return [
    mapObjToList(todos, (key, val) => ({
      id: key.split("/")[2],
      body: XXX,
      done: XXX,
      state: XXX,
    })),
    queryStatus,
  ];
}

// Schema:
// /todos/<id> => { name, done }
const mutations: MutationDefns = {
  AddTodo: lambda(
    ["name"],
    write(
      apply("concat", [str("/todos/"), apply("rand", [])]),
      obj({ name: varr("name"), done: bool(false) })
    )
  ),
  ChangeCompletionStatus: lambda(
    ["id", "newCompletionStatus"],
    write(
      apply("concat", [str("/todos/"), varr("id"), str("/done")]),
      varr("newCompletionStatus")
    )
  ),
};

export const todoMVC: KVApp = {
  name: "TodoMVC",
  ui: TodoMVC,
  mutations,
};
