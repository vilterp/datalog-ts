import { Value } from "./types";

export type Builtin = (args: Value[]) => Value;

export const BUILTINS: { [name: string]: Builtin } = {
  "+": (args) => {
    return (args[0] as number) + (args[1] as number);
  },
  "-": (args) => {
    return (args[0] as number) - (args[1] as number);
  },
  "<": (args) => {
    return args[0] < args[1];
  },
  ">": (args) => {
    return args[0] > args[1];
  },
};
