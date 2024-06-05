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
import { MutationDefns, MutationInvocation, UserInput } from "../types";
import { KVApp } from "./types";
import { UIProps } from "../../../types";
import { ClientState } from "../client";
import { makeClient, useLiveQuery } from "../hooks";
import { Inspector } from "./common/inspector";
import { randStep2, randomFromList } from "../../../../../util/util";

function CounterUI(props: UIProps<ClientState, UserInput>) {
  const client = makeClient(props);
  const [queryResults, queryState] = useLiveQuery(client, "get-counter", {
    prefix: "counter",
  });

  const counter = queryResults["counter"];

  if (queryState === "Loading") {
    return (
      <div style={{ margin: 10 }}>
        <em>Loading...</em>
      </div>
    );
  }

  return (
    <div style={{ margin: 10 }}>
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
      <button onClick={() => client.runMutation("Decrement", [])}>-</button>
      <button onClick={() => client.runMutation("Increment", [])}>+</button>
      <Inspector client={client} />
    </div>
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
      write(str("counter"), apply("-", [varr("cur"), int(1)]))
    )
  ),
};

function choose(
  clients: {
    [id: string]: ClientState;
  },
  randomSeed: number
): [{ clientID: string; invocation: MutationInvocation }, number] {
  const [clientID, randomSeed1] = randomFromList(
    randomSeed,
    Object.keys(clients)
  );
  const [incrDecr, randomSeed2] = randomFromList(randomSeed1, [
    "Increment",
    "Decrement",
  ]);

  return [
    { clientID, invocation: { type: "Invocation", name: incrDecr, args: [] } },
    randomSeed2,
  ];
}

export const counter: KVApp = {
  name: "Counter",
  mutations,
  ui: CounterUI,
  initialKVPairs: { counter: 0 },
  choose,
};
