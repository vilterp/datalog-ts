import { bank } from "./bank";
import { chat } from "./chat";
import { counter } from "./counter";
import { todoMVC } from "./todoMVC";
import { itemMarket } from "./itemMarket";
import { KVApp } from "./types";
import { commodityMarket } from "./commodityMarket";

export const EXAMPLES: { [name: string]: KVApp } = {
  bank,
  chat,
  counter,
  todoMVC,
  itemMarket,
  commodityMarket,
};
