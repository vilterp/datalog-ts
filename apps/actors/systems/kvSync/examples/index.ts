import { bank } from "./bank";
import { chat } from "./chat";
import { counter } from "./counter";
import { todoMVC } from "./todoMVC";
import { KVApp } from "./types";

export const EXAMPLES: { [name: string]: KVApp } = {
  bank,
  chat,
  counter,
  todoMVC,
};
