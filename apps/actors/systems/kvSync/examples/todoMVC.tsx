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
import { Inspector } from "./common/inspector";
import { LoggedIn, LoginWrapper } from "./common/loginWrapper";
import { Table } from "./common/table";

function TodoMVC(props: UIProps<ClientState, UserInput>) {
  const client = makeClient(props);

  return (
    <LoginWrapper
      client={client}
      loggedIn={(user) => <TodoMVCInner client={client} user={user} />}
    />
  );
}

function TodoMVCInner(props: { client: Client; user: string }) {
  const client = props.client;
  const [todos, queryStatus] = useTodos(client);
  const [newTodo, setNewTodo] = useState("");

  const handleSubmit = () => {
    setNewTodo("");
    client.runMutation("AddTodo", [newTodo]);
  };

  return (
    <div style={{ margin: 10 }}>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h2>TodoMVC</h2>
        <LoggedIn user={props.user} client={client} />
      </div>
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
      <div>
        {queryStatus === "Loading" ? (
          <p>
            <em>Loading...</em>
          </p>
        ) : (
          <div style={{ paddingTop: 10 }}>
            <Table<Todo>
              data={todos}
              getKey={(row) => row.id}
              columns={[
                {
                  name: "Done",
                  width: 50,
                  render: (todo) => (
                    <input
                      type="checkbox"
                      onChange={(evt) => {
                        client.runMutation("ChangeCompletionStatus", [
                          todo.id,
                          (evt.target as HTMLInputElement).checked,
                        ]);
                      }}
                      checked={todo.done}
                    />
                  ),
                },
                { name: "Name", render: (row) => row.name },
                { name: "Added By", width: 75, render: (row) => row.user },
              ]}
            />
          </div>
        )}
      </div>
      <Inspector client={client} />
    </div>
  );
}

type Todo = {
  id: string;
  name: string;
  user: string;
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
        id: key.split("/todos/")[1],
        name: val.name,
        done: val.done,
        user: val.user,
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
      obj({
        name: varr("name"),
        user: varr("curUser"),
        done: bool(false),
      })
    )
  ),
  ChangeCompletionStatus: lambda(
    ["id", "newCompletionStatus"],
    letExpr(
      [
        { varName: "key", val: apply("concat", [str("/todos/"), varr("id")]) },
        { varName: "current", val: read(varr("key"), obj({})) },
      ],
      write(
        varr("key"),
        obj({
          name: memberAccess(varr("current"), "name"),
          user: memberAccess(varr("current"), "user"),
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
