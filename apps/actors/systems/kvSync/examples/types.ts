import { UIProps } from "../../../types";
import { ClientState } from "../client";
import { MutationDefns, UserInput } from "../types";

export type KVApp = {
  mutations: MutationDefns;
  ui: (props: UIProps<ClientState, UserInput>) => React.ReactElement;
};
