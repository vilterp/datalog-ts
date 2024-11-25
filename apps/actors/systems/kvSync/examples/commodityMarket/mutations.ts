import { MutationCtx, TSMutationDefns, WriteOp } from "../../types";
import { Order, OrderSide, readOrder } from "./types";

export const mutations: TSMutationDefns = {
  Order: (ctx, [price, amount, side]) => {
    const id = ctx.rand();
    const order: Order = {
      id,
      price: price as number,
      amount: amount as number,
      side: side as OrderSide,
      status: "Open",
      user: ctx.curUser,
    };
    ctx.write(`/orders/${id}`, order);
  },
};

export function matchOrders(ctx: MutationCtx, evt: WriteOp) {
  // Prevent us from going on forever
  if (evt.desc.type !== "Insert") {
    return;
  }

  const orders = ctx.scan("/orders/").map(readOrder);

  const buys = orders
    .filter((order) => order.side === "Buy" && order.status === "Open")
    .sort((a, b) => b.price - a.price);
  const sells = orders
    .filter((order) => order.side === "Sell" && order.status === "Open")
    .sort((a, b) => a.price - b.price);

  for (const buy of buys) {
    // TODO: keep buying while there's more to buy
    for (const sell of sells) {
      if (sell.status === "Sold") {
        continue;
      }

      if (buy.price >= sell.price) {
        const amount = Math.min(buy.amount, sell.amount);
        const price = (buy.price + sell.price) / 2;

        // Execute the trade
        const newBuyAmount = buy.amount - amount;
        const newBuyStatus = newBuyAmount === 0 ? "Sold" : "Open";
        const newBuy: Order = {
          ...buy,
          amount: newBuyAmount,
          status: newBuyStatus,
        };
        ctx.write(`/orders/${buy.id}`, newBuy);

        const newSellAmount = sell.amount - amount;
        const newSellStatus = newSellAmount === 0 ? "Sold" : "Open";
        const newSell: Order = {
          ...sell,
          amount: newSellAmount,
          status: newSellStatus,
        };
        ctx.write(`/orders/${sell.id}`, newSell);

        // for future loops
        buy.amount = newBuyAmount;
        buy.status = newBuyStatus;
        sell.amount = newSellAmount;
        sell.status = newSellStatus;

        // console.log("matchOrders", { newBuy, newSell });

        const tradeID = ctx.rand();
        ctx.write(`/trades/${tradeID}`, {
          id: tradeID,
          buyOrder: buy.id,
          sellOrder: sell.id,
          amount,
          price,
          timestamp: ctx.curTime,
        });

        if (newBuyAmount === 0) {
          break;
        }
      }
    }
  }
}
