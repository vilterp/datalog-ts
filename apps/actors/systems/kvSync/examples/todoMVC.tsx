import React, { useState } from "react";
import { UIProps } from "../../../types";
import { ClientState, QueryStatus, TransactionState } from "../client";
import { TSMutationDefns, UserInput } from "../types";
import { KVApp } from "./types";
import { mapObjToList } from "../../../../../util/util";
import { Client, makeClient, useLiveQuery } from "../hooks";
import { Inspector } from "../uiCommon/inspector";
import { LoginWrapper } from "../uiCommon/loginWrapper";
import { Table } from "../../../../../uiCommon/generic/table";
import { LoggedInHeader } from "../uiCommon/loggedInHeader";

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
      <LoggedInHeader user={props.user} client={client}>
        <h2>TodoMVC</h2>
      </LoggedInHeader>

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
              getRowStyle={(todo) =>
                todo.state.type === "Pending" && { color: "grey" }
              }
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
const mutations: TSMutationDefns = {
  AddTodo: (ctx, [name]) => {
    const id = ctx.rand();
    ctx.write(`/todos/${id}`, {
      name,
      user: ctx.curUser,
      done: false,
    });
  },
  ChangeCompletionStatus: (ctx, [id, newCompletionStatus]) => {
    const key = `/todos/${id}`;
    const current = ctx.read(key) as Todo;
    ctx.write(key, {
      ...current,
      done: newCompletionStatus,
    });
  },
};

export const todoMVC: KVApp = {
  name: "TodoMVC",
  ui: TodoMVC,
  mutations,
};
