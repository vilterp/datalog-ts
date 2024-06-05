import { UIProps } from "../../../types";
import { ClientState } from "../client";
import { MutationDefns, MutationInvocation, UserInput } from "../types";

type ChooseFn = (
  clients: {
    [id: string]: ClientState;
  },
  randomSeed: number
) => [{ clientID: string; invocation: MutationInvocation }, number];

export type KVApp = {
  name: string;
  mutations: MutationDefns;
  initialKVPairs?: {};
  ui: (props: UIProps<ClientState, UserInput>) => React.ReactElement;
  choose?: ChooseFn;
};
