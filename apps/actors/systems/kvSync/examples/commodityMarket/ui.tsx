import React, { useState } from "react";
import { UIProps } from "../../../../types";
import { ClientState, QueryStatus } from "../../client";
import { Client, makeClient, useLiveQuery } from "../../hooks";
import { UserInput } from "../../types";
import { LoginWrapper } from "../../uiCommon/loginWrapper";
import { LoggedInHeader } from "../../uiCommon/loggedInHeader";
import { Table } from "../../../../../../uiCommon/generic/table";
import {
  OrderSide,
  OrderWithState,
  readOrder,
  readTrade,
  Trade,
} from "./types";
import { Inspector } from "../../uiCommon/inspector";
import { RadioGroup } from "../../../../../../uiCommon/generic/radioGroup";
import { BidStack } from "./bidStack";
import { CollapsibleWithHeadingLocal } from "../../../../../../uiCommon/generic/collapsibleInner";

export function MarketUI(props: UIProps<ClientState, UserInput>) {
  const client = makeClient(props);

  return (
    <LoginWrapper
      client={client}
      loggedIn={(user) => <MarketInner client={client} user={user} />}
    />
  );
}

function MarketInner(props: { client: Client; user: string }) {
  const [orders, orderQueryStatus] = useOrders(props.client);
  const [trades, tradeQueryStatus] = useTrades(props.client);
  const [showSold, setShowSold] = useState(false);

  const shownOrders = showSold
    ? orders
    : orders.filter((order) => order.status !== "Sold");

  return (
    <>
      <LoggedInHeader user={props.user} client={props.client}>
        <h2>Market</h2>
      </LoggedInHeader>

      <CollapsibleWithHeadingLocal
        heading="Stack"
        content={
          <BidStack orders={shownOrders} size={{ width: 300, height: 300 }} />
        }
      />

      <CollapsibleWithHeadingLocal
        heading="Orders"
        content={
          <>
            <div>
              Show sold:{" "}
              <input
                type="checkbox"
                checked={showSold}
                onChange={(evt) => setShowSold(evt.target.checked)}
              />
            </div>
            {orderQueryStatus === "Loading" ? (
              <em>Loading...</em>
            ) : (
              <Table<OrderWithState>
                data={shownOrders}
                getKey={(order) => order.id.toString()}
                getRowStyle={(order) =>
                  order.state.type === "Pending" && { color: "gray" }
                }
                columns={[
                  { name: "id", render: (order) => order.id },
                  { name: "price", render: (order) => `$${order.price}` },
                  { name: "amount", render: (order) => order.amount },
                  { name: "side", render: (order) => order.side },
                  { name: "user", render: (order) => order.user },
                  { name: "status", render: (order) => order.status },
                ]}
              />
            )}
          </>
        }
      />

      <h3>Create Order</h3>
      <OrderForm client={props.client} />

      <CollapsibleWithHeadingLocal
        heading="Trades"
        content={
          tradeQueryStatus === "Loading" ? (
            <em>Loading...</em>
          ) : (
            <Table<Trade>
              data={trades}
              getKey={(trade) => trade.id.toString()}
              columns={[
                { name: "id", render: (trade) => trade.id },
                { name: "price", render: (trade) => `$${trade.price}` },
                { name: "amount", render: (trade) => trade.amount },
                { name: "buy order", render: (trade) => trade.buyOrder },
                { name: "sell order", render: (trade) => trade.sellOrder },
              ]}
            />
          )
        }
      />

      <Inspector client={props.client} />
    </>
  );
}

function OrderForm(props: { client: Client }) {
  const [price, setPrice] = useState(10);
  const [amount, setAmount] = useState(100);
  const [side, setSide] = useState<OrderSide>("Buy");

  return (
    <form
      onSubmit={(evt) => {
        evt.preventDefault();

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
      <RadioGroup<OrderSide>
        value={side}
        onChange={(value) => setSide(value)}
        options={["Buy", "Sell"]}
      />
      <button type="submit">Create Order</button>
    </form>
  );
}

function useOrders(client: Client): [OrderWithState[], QueryStatus] {
  const [rawOrders, queryStatus] = useLiveQuery(client, "list-orders", {
    prefix: "/orders/",
  });

  const cmpKey = (a: OrderWithState) => (a.side === "Buy" ? a.price : -a.price);

  const orders = Object.entries(rawOrders)
    .map(([id, rawOrder]): OrderWithState => {
      const order = rawOrder.value as any;
      const mapped = readOrder(order);
      return {
        ...mapped,
        state: client.state.transactions[rawOrder.transactionID]?.state,
      };
    })
    .sort((a, b) => cmpKey(a) - cmpKey(b));

  return [orders, queryStatus];
}

function useTrades(client: Client): [Trade[], QueryStatus] {
  const [rawTrades, queryStatus] = useLiveQuery(client, "list-trades", {
    prefix: "/trades/",
  });

  const trades = Object.entries(rawTrades).map(([id, rawTrade]): Trade => {
    const trade = rawTrade.value as any;
    return readTrade(trade);
  });

  return [trades, queryStatus];
}
