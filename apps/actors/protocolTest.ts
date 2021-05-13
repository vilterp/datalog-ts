import { Suite } from "./testing-utils-ts/testing";
import { runDDTestAtPath } from "./testing-utils-ts/datadriven";
import { model } from "./model";

type ActorState =
  | { type: "ClientState"; value: number; status: "saving" | "steady" }
  | { type: "ServerState"; value: number }
  | { type: "UserState" };

type UserInput = "increment" | "decrement";

type Message = "increment" | "decrement";

function protocolTest(input: string[]) {
  const initialState: { [actorID: string]: ActorState } = {
    user: { type: "UserState" },
    client: { type: "ClientState", value: 0, status: "steady" },
    server: { type: "ServerState", value: 0 },
  };

  model(XXX, XXX);

  return input.reduce((state, input: UserInput) => {
    switch (input) {
      case "increment":
        return {
          ...state,
          client: {
            type: "ClientState",
            value: state.client.value + 1,
            status: "saving",
          },
        };
      case "decrement":
        return XXX;
    }
  }, initialState);
}

export function protocol(writeResults: boolean): Suite {
  return [
    {
      name: "protocol",
      test() {
        runDDTestAtPath("datadriven/simple.dd.txt", protocolTest, writeResults);
      },
    },
  ];
}
