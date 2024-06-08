import { randStep } from "../../../../../util/util";
import { Value } from "./types";

export type InterpreterState = {
  type: "InterpreterState";
  randSeed: number;
  user: string;
};

// mutates InterpreterState
export type Builtin = (
  state: InterpreterState,
  args: Value[]
) => [Value, InterpreterState];

export const BUILTINS: { [name: string]: Builtin } = {
  "+": (state, args) => {
    return [(args[0] as number) + (args[1] as number), state];
  },
  "-": (state, args) => {
    return [(args[0] as number) - (args[1] as number), state];
  },
  "<": (state, args) => {
    return [args[0] < args[1], state];
  },
  ">": (state, args) => {
    return [args[0] > args[1], state];
  },
  concat: (state, args) => {
    return [args.join(""), state];
  },
  parseInt: (state, args) => {
    return [parseInt(args[0] as string), state];
  },
  rand: (state, args) => {
    const newSeed = randStep(state.randSeed);
    return [newSeed, { ...state, randSeed: newSeed }];
  },
  currentUser: (state, args) => {
    return [state.user, state];
  },
};
