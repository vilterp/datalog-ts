import { Json } from "../../../../../../util/json";
import { TransactionState } from "../../client";

export type OfferStatus = "Open" | "Sold";

export type OrderSide = "Sell" | "Buy";

export type Order = {
  id: number;
  price: number;
  amount: number;
  side: OrderSide;
  user: string;
  status: OfferStatus;
};

export function readOrder(rawOrder: Json): Order {
  const order = rawOrder as any;
  return {
    id: order.id as number,
    price: order.price as number,
    amount: order.amount as number,
    status: order.status as OfferStatus,
    side: order.side as OrderSide,
    user: order.user as string,
  };
}

export type Trade = {
  id: number;
  price: number;
  amount: number;
  buyOrder: number;
  sellOrder: number;
  timestamp: number;
};

export function readTrade(rawTrade: Json): Trade {
  const trade = rawTrade as any;
  return {
    id: trade.id as number,
    price: trade.price as number,
    amount: trade.amount as number,
    buyOrder: trade.buyOrder as number,
    sellOrder: trade.sellOrder as number,
    timestamp: trade.timestamp as number,
  };
}

export type OrderWithState = Order & { state: TransactionState };
