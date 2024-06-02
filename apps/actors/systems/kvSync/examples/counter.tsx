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
import { Inspector } from "./common/inspector";

function CounterUI(props: UIProps<ClientState, UserInput>) {
  const client = makeClient(props);
  const [queryResults, queryState] = useLiveQuery(client, "get-counter", {
    prefix: "counter",
  });

  const counter = queryResults["counter"];

  if (queryState === "Loading") {
    return <em>Loading...</em>;
  }

  return (
    <>
      <h2>Counter</h2>
      <span
        style={{
          color:
            client.state.transactions[counter.transactionID]?.state.type ===
            "Pending"
              ? "lightgrey"
              : "",
        }}
      >
        Value: {counter.value as number}{" "}
      </span>
      <button onClick={() => client.runMutation("Increment", [])}>-</button>
      <button onClick={() => client.runMutation("Decrement", [])}>+</button>
      <Inspector client={client} />
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

export const counter: KVApp = {
  name: "Counter",
  mutations,
  ui: CounterUI,
  initialKVPairs: { counter: 0 },
};
