import React, { useState } from "react";
import { UIProps } from "../../../types";
import { ClientState, QueryStatus, TransactionState } from "../client";
import { MutationDefns, UserInput } from "../types";
import { KVApp } from "./types";
import {
  apply,
  bool,
  lambda,
  letExpr,
  memberAccess,
  obj,
  read,
  str,
  varr,
  write,
} from "../mutations/types";
import { mapObjToList } from "../../../../../util/util";
import { Client, makeClient, useLiveQuery } from "../hooks";
import { Json } from "aws-sdk/clients/robomaker";
import { KVInspector } from "./common/kvInspector";

function TodoMVC(props: UIProps<ClientState, UserInput>) {
  const client = makeClient(props);
  const [todos, queryStatus] = useTodos(client);
  const [newTodo, setNewTodo] = useState("");

  const handleSubmit = () => {
    setNewTodo("");
    client.runMutation("AddTodo", [newTodo]);
  };

  return (
    <>
      <h2>TodoMVC</h2>
      <input
        type="text"
        value={newTodo}
        onKeyDown={(evt) => {
          if (evt.keyCode === 13) {
            handleSubmit();
          }
        }}
        onInput={(evt) => {
          setNewTodo((evt.target as HTMLInputElement).value);
        }}
      />
      <button onClick={() => handleSubmit()}>Submit</button>
      <ul>
        {queryStatus === "Loading"
          ? "Loading..."
          : todos.map((todo) => (
              <li key={todo.id}>
                <input
                  type="checkbox"
                  onChange={(evt) => {
                    client.runMutation("ChangeCompletionStatus", [
                      todo.id,
                      (evt.target as HTMLInputElement).checked,
                    ] as Json[]);
                  }}
                  checked={todo.done}
                />{" "}
                <span
                  style={{
                    color: todo.state.type === "Pending" ? "grey" : "inherit",
                  }}
                >
                  {todo.name}
                </span>
              </li>
            ))}
      </ul>
      <KVInspector client={client} />
    </>
  );
}

type Todo = {
  id: string;
  name: string;
  done: boolean;
  state: TransactionState;
};

function useTodos(client: Client): [Todo[], QueryStatus] {
  const [todos, queryStatus] = useLiveQuery(client, "list-todos", {
    prefix: "/todos/",
  });

  return [
    mapObjToList(todos, (key, rawVal) => {
      const val = rawVal.value as any; // ???
      return {
        id: key.split("/todos")[1],
        name: val.name,
        done: val.done,
        state: client.state.transactions[rawVal.transactionID]?.state,
      };
    }),
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
    letExpr(
      [
        { varName: "key", val: apply("concat", [str("/todos/")]) },
        { varName: "current", val: read(varr("key"), obj({})) },
      ],
      write(
        varr("key"),
        obj({
          name: memberAccess(varr("current"), "name"),
          done: varr("newCompletionStatus"),
        })
      )
    )
  ),
};

export const todoMVC: KVApp = {
  name: "TodoMVC",
  ui: TodoMVC,
  mutations,
};
