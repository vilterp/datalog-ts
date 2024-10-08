import React from "react";
import { MutationInvocation, TSMutationDefns, UserInput } from "../types";
import { KVApp } from "./types";
import { UIProps } from "../../../types";
import { ClientState } from "../client";
import { Client, makeClient, useLiveQuery } from "../hooks";
import { Inspector } from "../uiCommon/inspector";
import { randomFromList } from "../../../../../util/util";
import { LoginWrapper } from "../uiCommon/loginWrapper";
import { LoggedInHeader } from "../uiCommon/loggedInHeader";

function CounterUI(props: UIProps<ClientState, UserInput>) {
  const client = makeClient(props);

  return (
    <LoginWrapper
      client={client}
      loggedIn={(user) => <CounterUIInner client={client} user={user} />}
    />
  );
}

function CounterUIInner(props: { client: Client; user: string }) {
  const client = props.client;
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
      <LoggedInHeader user={props.user} client={client}>
        <h2>Counter</h2>
      </LoggedInHeader>

      <span
        style={{
          color:
            client.state.transactions[counter.transactionID]?.state.type ===
            "Committed"
              ? ""
              : "lightgrey",
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

const mutations: TSMutationDefns = {
  Increment: (ctx) => {
    const cur = ctx.read("counter") as number;
    ctx.write("counter", cur + 1);
  },
  Decrement: (ctx) => {
    const cur = ctx.read("counter") as number;
    ctx.write("counter", cur - 1);
  },
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
