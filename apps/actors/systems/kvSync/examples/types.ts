import { UIProps } from "../../../types";
import { ClientState } from "../client";
import {
  MutationInvocation,
  TriggerDefn,
  TSMutationDefns,
  UserInput,
} from "../types";

type ChooseFn = (
  clients: {
    [id: string]: ClientState;
  },
  randomSeed: number
) => [{ clientID: string; invocation: MutationInvocation } | null, number];

// TODO: move to other types file?
export type KVApp = {
  name: string;
  mutations: TSMutationDefns;
  initialKVPairs?: {};
  ui: (props: UIProps<ClientState, UserInput>) => React.ReactElement;
  choose?: ChooseFn;
  triggers?: TriggerDefn[];
};
