import React, { useState } from "react";
import { KVApp } from "./types";
import { MutationDefns, UserInput } from "../types";
import { apply, lambda, obj, str, varr, write } from "../mutations/types";
import { Client, makeClient, useLiveQuery } from "../hooks";
import { UIProps } from "../../../types";
import { ClientState, QueryStatus, TransactionState } from "../client";
import { LoginWrapper } from "../uiCommon/loginWrapper";

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
  const [offers, queryStatus] = useOffers(props.client);

  return (
    <>
      <h1>Market</h1>

      {queryStatus === "Loading" ? (
        <em>Loading...</em>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(offers).map(([id, offer]) => (
              <tr key={id}>
                <td>{offer.item}</td>
                <td>{offer.price}</td>
                <td>{offer.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <OfferForm client={props.client} />
    </>
  );
}

function OfferForm(props: { client: Client }) {
  const [item, setItem] = useState("");
  const [price, setPrice] = useState(0);

  return (
    <form
      onSubmit={(evt) => {
        evt.preventDefault();

        props.client.runMutation("Offer", [item, price]);
      }}
    >
      <input
        type="text"
        placeholder="Item"
        value={item}
        onChange={(evt) => setItem(evt.target.value)}
      />
      <input
        type="number"
        placeholder="Price"
        value={price}
        onChange={(evt) => setPrice(parseInt(evt.target.value))}
      />
      <button type="submit">Create Offer</button>
    </form>
  );
}

type Offer = {
  item: string;
  price: number;
  status: "open" | "sold";
  state: TransactionState;
};

function useOffers(client: Client): [Offer[], QueryStatus] {
  const [rawOffers, queryStatus] = useLiveQuery(client, "list-todos", {
    prefix: "/offers/",
  });

  const offers = Object.entries(rawOffers).map(([id, rawOffer]) => {
    const offer = rawOffer as any;
    return {
      item: offer.item as string,
      price: offer.price as number,
      status: offer.status as "open" | "sold",
      state: client.state.transactions[id]?.state,
    };
  });

  return [offers, queryStatus];
}

const mutations: MutationDefns = {
  Offer: lambda(
    ["item", "price"],
    write(
      apply("concat", [str("/offers/"), apply("rand", [])]),
      obj({
        item: varr("item"),
        price: varr("price"),
        status: str("open"),
      })
    )
  ),
  // Buy: lambda(["itemID"], doExpr([write(varr("itemID"), obj({}))])),
};

export const market: KVApp = {
  name: "Market",
  mutations,
  ui: MarketUI,
};
