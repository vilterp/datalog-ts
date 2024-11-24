import { KVApp } from "../types";
import { choose } from "./choose";
import { matchOrders, mutations } from "./mutations";
import { MarketUI } from "./ui";

export const commodityMarket: KVApp = {
  name: "Commodity Market",
  mutations,
  ui: MarketUI,
  triggers: [
    {
      prefix: "/orders/",
      fn: matchOrders,
    },
  ],
  choose,
};
