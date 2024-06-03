import { UIProps } from "../../../types";
import { ClientState } from "../client";
import { MutationDefns, UserInput } from "../types";

export type KVApp = {
  name: string;
  mutations: MutationDefns;
  initialKVPairs?: {};
  ui: (props: UIProps<ClientState, UserInput>) => React.ReactElement;
};
