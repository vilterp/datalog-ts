import { MutationCtx, TSMutationDefns, WriteOp } from "../../types";
import { Order, readOrder } from "./types";

export const mutations: TSMutationDefns = {
  Order: (ctx, [price, amount, side]) => {
    const id = ctx.rand();
    ctx.write(`/orders/${id}`, {
      id,
      price,
      amount,
      side,
      status: "open",
      user: ctx.curUser,
    });
  },
};

export function matchOrders(ctx: MutationCtx, evt: WriteOp) {
  // Prevent us from going on forever
  if (evt.desc.type !== "Insert") {
    return;
  }

  const orders = ctx.scan("/orders/").map(readOrder);

  const buys = orders
    .filter((order) => order.side === "buy" && order.status === "open")
    .sort((a, b) => b.price - a.price);
  const sells = orders
    .filter((order) => order.side === "sell" && order.status === "open")
    .sort((a, b) => a.price - b.price);

  for (const buy of buys) {
    // TODO: keep buying while there's more to buy
    for (const sell of sells) {
      if (buy.price >= sell.price) {
        const amount = Math.min(buy.amount, sell.amount);
        const price = (buy.price + sell.price) / 2;

        // Execute the trade
        const newBuyAmount = buy.amount - amount;
        const newBuy: Order = {
          ...buy,
          amount: newBuyAmount,
          status: newBuyAmount === 0 ? "sold" : "open",
        };
        ctx.write(`/orders/${buy.id}`, newBuy);

        const newSellAmount = sell.amount - amount;
        const newSell: Order = {
          ...sell,
          amount: newSellAmount,
          status: newSellAmount === 0 ? "sold" : "open",
        };
        ctx.write(`/orders/${sell.id}`, newSell);

        // console.log("matchOrders", { newBuy, newSell });

        const tradeID = ctx.rand();
        ctx.write(`/trades/${tradeID}`, {
          id: tradeID,
          buyOrder: buy.id,
          sellOrder: sell.id,
          amount,
          price,
        });

        if (newBuyAmount === 0) {
          break;
        }
      }
    }
  }
}
