import { UIProps } from "../../types";
import { ClientState } from "./client";
import {
  MutationInvocation,
  TSMutationDefns,
  TSQueryDefns,
  UserInput,
} from "./types";

export type KVApp = {
  name: string;
  mutations: TSMutationDefns;
  queries: TSQueryDefns;
  initialKVPairs?: {};
  ui: (props: UIProps<ClientState, UserInput>) => React.ReactElement;
  choose?: ChooseFn;
};

type ChooseFn = (
  clients: {
    [id: string]: ClientState;
  },
  randomSeed: number
) => [{ clientID: string; invocation: MutationInvocation } | null, number];
