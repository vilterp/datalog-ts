import React, { useState } from "react";
import { KVApp } from "./types";
import {
  MutationCtx,
  TraceOp,
  TSMutationDefns,
  UserInput,
  WriteOp,
} from "../types";
import { Client, makeClient, useLiveQuery } from "../hooks";
import { UIProps } from "../../../types";
import { ClientState, QueryStatus, TransactionState } from "../client";
import { LoginWrapper } from "../uiCommon/loginWrapper";
import { Inspector } from "../uiCommon/inspector";
import { Table } from "../../../../../uiCommon/generic/table";
import { LoggedInHeader } from "../uiCommon/loggedInHeader";
import { Json } from "../../../../../util/json";

function MarketUI(props: UIProps<ClientState, UserInput>) {
  const client = makeClient(props);

  return (
    <LoginWrapper
      client={client}
      loggedIn={(user) => <MarketInner client={client} user={user} />}
    />
  );
}

function MarketInner(props: { client: Client; user: string }) {
  const [orders, queryStatus] = useOrders(props.client);

  return (
    <>
      <LoggedInHeader user={props.user} client={props.client}>
        <h2>Market</h2>
      </LoggedInHeader>

      <h3>Orders</h3>

      {queryStatus === "Loading" ? (
        <em>Loading...</em>
      ) : (
        <Table<Order>
          data={orders}
          getKey={(order) => order.id.toString()}
          columns={[
            { name: "price", render: (order) => `$${order.price}` },
            { name: "amount", render: (order) => order.amount },
            { name: "side", render: (order) => order.side },
            { name: "offered by", render: (order) => order.user },
            { name: "status", render: (order) => order.status },
          ]}
        />
      )}

      <h3>Create Order</h3>

      <OrderForm client={props.client} />

      <Inspector client={props.client} />
    </>
  );
}

function OrderForm(props: { client: Client }) {
  const [price, setPrice] = useState(0);
  const [amount, setAmount] = useState(0);
  const [side, setSide] = useState<OrderSide>("buy");

  return (
    <form
      onSubmit={(evt) => {
        evt.preventDefault();

        setPrice(0);
        setSide("buy");
        setAmount(0);

        props.client.runMutation("Order", [price, amount, side]);
      }}
    >
      Amount:{" "}
      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(evt) => setAmount(parseInt(evt.target.value))}
      />{" "}
      Price:{" "}
      <input
        type="number"
        placeholder="Price"
        value={price}
        onChange={(evt) => setPrice(parseInt(evt.target.value))}
      />
      <div>
        <label>
          <input
            type="radio"
            value="buy"
            checked={side === "buy"}
            onChange={(evt) => setSide("buy")}
          />
          Buy
        </label>
        <label>
          <input
            type="radio"
            value="sell"
            checked={side === "sell"}
            onChange={(evt) => setSide("sell")}
          />
          Sell
        </label>
      </div>
      <button type="submit">Create Order</button>
    </form>
  );
}

type OfferStatus = "open" | "sold";

type OrderSide = "sell" | "buy";

type Order = {
  id: number;
  price: number;
  amount: number;
  side: OrderSide;
  user: string;
  status: OfferStatus;
};

type OrderWithState = Order & { state: TransactionState };

function useOrders(client: Client): [OrderWithState[], QueryStatus] {
  const [rawOrders, queryStatus] = useLiveQuery(client, "list-orders", {
    prefix: "/orders/",
  });

  const orders = Object.entries(rawOrders).map(
    ([id, rawOrder]): OrderWithState => {
      const order = rawOrder.value as any;
      const mapped = readOrder(order);
      return {
        ...mapped,
        state: client.state.transactions[rawOrder.transactionID]?.state,
      };
    }
  );

  return [orders, queryStatus];
}

function readOrder(rawOrder: Json): Order {
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

const mutations: TSMutationDefns = {
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

function matchOrders(ctx: MutationCtx, evt: WriteOp) {
  // Prevent us from going on forever
  if (evt.desc.type !== "Insert") {
    return;
  }

  const orders = ctx.scan("/orders/").map(readOrder);

  const buys = orders
    .filter((order) => order.side === "buy")
    .sort((a, b) => b.price - a.price);
  const sells = orders
    .filter((order) => order.side === "sell")
    .sort((a, b) => a.price - b.price);

  for (const buy of buys) {
    for (const sell of sells) {
      if (buy.price >= sell.price) {
        const amount = Math.min(buy.amount, sell.amount);
        const price = (buy.price + sell.price) / 2;

        // Execute the trade
        ctx.write(`/orders/${buy.id}`, {
          ...buy,
          amount: buy.amount - amount,
          status: buy.amount - amount === 0 ? "sold" : "open",
        });
        ctx.write(`/orders/${sell.id}`, {
          ...sell,
          amount: sell.amount - amount,
          status: sell.amount - amount === 0 ? "sold" : "open",
        });
        ctx.write(`/trades/${ctx.rand()}`, {
          buyOrder: buy.id,
          sellOrder: sell.id,
          amount,
          price,
        });

        if (buy.amount - amount === 0) {
          break;
        }
      }
    }
  }
}

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
};
