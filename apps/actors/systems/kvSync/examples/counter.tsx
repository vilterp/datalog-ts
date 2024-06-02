import React from "react";
import {
  apply,
  int,
  lambda,
  letExpr,
  read,
  str,
  varr,
  write,
} from "../mutations/types";
import { MutationDefns, UserInput } from "../types";
import { KVApp } from "./types";
import { UIProps } from "../../../types";
import { ClientState } from "../client";
import { makeClient, useLiveQuery } from "../hooks";

function CounterUI(props: UIProps<ClientState, UserInput>) {
  const client = makeClient(props);
  const [queryResults, queryState] = useLiveQuery(client, "get-counter", {
    prefix: "counter",
  });

  const counter = queryResults["counter"];

  return (
    <>
      <h2>Counter</h2>
      <span
        style={{
          color:
            client.state.transactions[counter.transactionID].state.type ===
            "Pending"
              ? "lightgrey"
              : "",
        }}
      >
        Value: {counter.value as number}{" "}
      </span>
      <button
        onClick={() =>
          client.runMutation({
            type: "Invocation",
            name: "Increment",
            args: [],
          })
        }
      >
        -
      </button>
      <button
        onClick={() =>
          client.runMutation({
            type: "Invocation",
            name: "Decrement",
            args: [],
          })
        }
      >
        +
      </button>
    </>
  );
}

const mutations: MutationDefns = {
  Increment: lambda(
    [],
    letExpr(
      [{ varName: "cur", val: read(str("counter"), 0) }],
      write(str("counter"), apply("+", [varr("cur"), int(1)]))
    )
  ),
  Decrement: lambda(
    [],
    letExpr(
      [{ varName: "cur", val: read(str("counter"), 0) }],
      write(str("counter"), apply("+", [varr("cur"), int(1)]))
    )
  ),
};

export const counter: KVApp = { name: "Counter", mutations, ui: CounterUI };
