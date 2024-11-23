import React, { useState } from "react";
import { KVApp } from "./types";
import { TSMutationDefns, UserInput } from "../types";
import { Client, makeClient, useLiveQuery } from "../hooks";
import { UIProps } from "../../../types";
import { ClientState, QueryStatus, TransactionState } from "../client";
import { LoginWrapper } from "../uiCommon/loginWrapper";
import { Inspector } from "../uiCommon/inspector";
import { Table } from "../../../../../uiCommon/generic/table";
import { LoggedInHeader } from "../uiCommon/loggedInHeader";

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
      <LoggedInHeader user={props.user} client={props.client}>
        <h2>Market</h2>
      </LoggedInHeader>

      <h3>Offers</h3>

      {queryStatus === "Loading" ? (
        <em>Loading...</em>
      ) : (
        <Table<Offer>
          data={offers}
          getKey={(offer) => offer.item}
          columns={[
            { name: "item", render: (offer) => offer.item },
            { name: "price", render: (offer) => offer.price },
            { name: "offered by", render: (offer) => offer.user },
            { name: "status", render: (offer) => offer.status },
            {
              name: "buy",
              render: (offer) => (
                <button
                  disabled={offer.status === "sold"}
                  onClick={() => props.client.runMutation("Buy", [offer.id])}
                >
                  Buy
                </button>
              ),
            },
          ]}
        />
      )}

      <h3>Create Offer</h3>

      <OfferForm client={props.client} />

      <Inspector client={props.client} />
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

        setItem("");
        setPrice(0);

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

type OfferStatus = "open" | "sold";

type Offer = {
  id: number;
  item: string;
  price: number;
  user: string;
  status: OfferStatus;
  state: TransactionState;
};

function useOffers(client: Client): [Offer[], QueryStatus] {
  const [rawOffers, queryStatus] = useLiveQuery(client, "list-todos", {
    prefix: "/offers/",
  });

  const offers = Object.entries(rawOffers).map(([id, rawOffer]) => {
    const offer = rawOffer.value as any;
    return {
      id: offer.id as number,
      item: offer.item as string,
      price: offer.price as number,
      status: offer.status as OfferStatus,
      user: offer.user as string,
      state: client.state.transactions[rawOffer.transactionID]?.state,
    };
  });

  return [offers, queryStatus];
}

const mutations: TSMutationDefns = {
  Offer: (ctx, [item, price]) => {
    const id = ctx.rand();
    ctx.write(`/offers/${id}`, {
      id,
      item,
      price,
      status: "open",
      user: ctx.curUser,
    });
  },
  Buy: (ctx, [id]) => {
    const key = `/offers/${id}`;
    const current = ctx.read(key) as Offer;
    ctx.write(key, {
      ...current,
      status: "sold",
    });
  },
};

export const commodityMarket: KVApp = {
  name: "Commodity Market",
  mutations,
  ui: MarketUI,
};
