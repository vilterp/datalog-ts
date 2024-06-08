import React, { useState } from "react";
import { mapObj, randStep2, randomFromList } from "../../../../../util/util";
import { UIProps } from "../../../types";
import { ClientState, QueryStatus, TransactionState } from "../client";
import { Client, makeClient, useLiveQuery } from "../hooks";
import {
  apply,
  read,
  varr,
  letExpr,
  ifExpr,
  lambda,
  abort,
  str,
  write,
  doExpr,
  int,
} from "../mutations/types";
import { MutationDefns, MutationInvocation, UserInput } from "../types";
import { KVApp } from "./types";
import { Inspector } from "./common/inspector";

function BankUI(props: UIProps<ClientState, UserInput>) {
  const client = makeClient(props);

  return client.state.loginState.type === "LoggedIn" ? (
    <div style={{ margin: 10 }}>
      <h3>MyBank</h3>
      <span>👤 {client.state.loginState.username}</span>
      <InnerContent client={client} />
    </div>
  ) : (
    <LoginSignupForm client={client} />
  );
}

function LoginSignupForm(props: { client: Client }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div>
      <form
        onSubmit={(evt) => {
          evt.preventDefault();
          if (isLogin) {
            props.client.login(username, password);
          } else {
            props.client.signup(username, password);
          }
        }}
      >
        <h3>{isLogin ? "Login" : "Signup"}</h3>
        <p>
          <span>Username</span>
          <br />
          <input
            type="text"
            value={username}
            onChange={(evt) => setUsername(evt.target.value)}
          />
        </p>
        <p>
          <span>Password</span>
          <br />
          <input
            type="password"
            value={password}
            onChange={(evt) => setPassword(evt.target.value)}
          />
        </p>
        <p>
          <span>Login</span>
          <br />
          <input
            type="checkbox"
            checked={isLogin}
            onChange={() => setIsLogin(!isLogin)}
          />
        </p>
        <button type="submit">{isLogin ? "Login" : "Signup"}</button>
      </form>
    </div>
  );
}

function InnerContent(props: { client: Client }) {
  const [balance, txnState, queryState] = useMyBalance(props.client);

  return (
    <div>
      <h4>My balance</h4>
      <p>{queryState === "Loading" ? "..." : `$${balance}`}</p>

      <h4>Operations</h4>
      <ul>
        <li>
          <WithdrawForm client={props.client} />
        </li>
        <li>
          <DepositForm client={props.client} />
        </li>
        <li>
          <PayForm client={props.client} />
        </li>
      </ul>
      <Inspector client={props.client} />
    </div>
  );
}

type Account = {
  name: string;
  balance: number;
  transactionID: string;
};

function useMyBalance(client: Client): [number, TransactionState, QueryStatus] {
  const [accounts, queryState] = useAccountList(client);
  const account = accounts[client.state.id];
  if (!account) {
    return [0, { type: "Committed", serverTimestamp: 0 }, queryState];
  }

  return [
    account.balance,
    client.state.transactions[account.transactionID].state,
    queryState,
  ];
}

// TODO: one client shouldn't be able to query for balances of all accounts
function useAccountList(
  client: Client
): [{ [name: string]: Account }, QueryStatus] {
  const [queryResults, queryState] = useLiveQuery(client, "list-accounts", {
    prefix: "",
  });

  if (queryState === "Loading") {
    return [{}, queryState];
  }

  return [
    mapObj(queryResults, (key, value) => ({
      name: key,
      balance: value.value as number,
      transactionID: value.transactionID,
    })),
    queryState,
  ];
}

function WithdrawForm(props: { client: Client }) {
  const [amount, setAmount] = useState(10);

  return (
    <form
      onSubmit={(evt) => {
        evt.preventDefault();
        props.client.runMutation("Withdraw", [amount]);
      }}
    >
      Withdraw{" "}
      <input
        value={amount}
        size={5}
        onChange={(evt) => setAmount(parseInt(evt.target.value))}
      />{" "}
      <button>Submit</button>
    </form>
  );
}

function DepositForm(props: { client: Client }) {
  const [amount, setAmount] = useState(10);

  return (
    <form
      onSubmit={(evt) => {
        evt.preventDefault();
        props.client.runMutation("Deposit", [amount]);
      }}
    >
      Deposit{" "}
      <input
        value={amount}
        size={5}
        onChange={(evt) => setAmount(parseInt(evt.target.value))}
      />{" "}
      <button>Submit</button>
    </form>
  );
}

function PayForm(props: { client: Client }) {
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState(10);

  return (
    <form
      onSubmit={(evt) => {
        evt.preventDefault();
        props.client.runMutation("Transfer", [toAccount, amount]);
      }}
    >
      Pay{" "}
      <input
        value={amount}
        size={5}
        onChange={(evt) => setAmount(parseInt(evt.target.value))}
      />{" "}
      to account{" "}
      <input
        type="text"
        value={toAccount}
        onChange={(evt) => setToAccount(evt.target.value)}
      />{" "}
      <button>Submit</button>
    </form>
  );
}

// ==== Mutations ====

// TODO: is default=0 correct for everything here?
const mutations: MutationDefns = {
  CreateAccount: lambda(["name"], write(varr("name"), int(0))),
  Deposit: lambda(
    ["amount"],
    letExpr(
      [{ varName: "balanceBefore", val: read(varr("curUser"), 0) }],
      write(
        varr("curUser"),
        apply("+", [varr("balanceBefore"), varr("amount")])
      )
    )
  ),
  Withdraw: lambda(
    ["amount"],
    letExpr(
      [{ varName: "balanceBefore", val: read(varr("curUser"), 0) }],
      ifExpr(
        apply(">", [varr("amount"), varr("balanceBefore")]),
        abort(str("balance not high enough")),
        write(
          varr("curUser"),
          apply("-", [varr("balanceBefore"), varr("amount")])
        )
      )
    )
  ),
  Transfer: lambda(
    ["toAccount", "amount"],
    letExpr(
      [
        { varName: "fromBalance", val: read(varr("curUser"), 0) },
        { varName: "toBalance", val: read(varr("toAccount"), 0) },
      ],
      ifExpr(
        apply(">", [varr("amount"), varr("fromBalance")]),
        abort(str("balance not high enough")),
        doExpr([
          write(
            varr("curUser"),
            apply("-", [varr("fromBalance"), varr("amount")])
          ),
          write(
            varr("toAccount"),
            apply("+", [varr("toBalance"), varr("amount")])
          ),
        ])
      )
    )
  ),
};

const MAX_RANDOM_TXN_AMOUNT = 100;

function choose(
  clients: {
    [id: string]: ClientState;
  },
  randomSeed: number
): [{ clientID: string; invocation: MutationInvocation } | null, number] {
  const [clientID, randomSeed1] = randomFromList(
    randomSeed,
    Object.keys(clients)
  );

  const accounts = Object.keys(clients[clientID].data);
  if (accounts.length === 0) {
    return [null, randomSeed1];
  }

  const [account, randomSeed2] = randomFromList(randomSeed1, accounts);

  const [amount01, randomSeed3] = randStep2(randomSeed2);
  const amount = Math.floor(amount01 * MAX_RANDOM_TXN_AMOUNT);

  const possibleInvocations: MutationInvocation[] = [
    { type: "Invocation", name: "Withdraw", args: [account, amount] },
    { type: "Invocation", name: "Deposit", args: [account, amount] },
    // TODO: transfer
  ];

  const [invocation, randomSeed4] = randomFromList(
    randomSeed3,
    possibleInvocations
  );

  return [{ clientID, invocation: invocation }, randomSeed4];
}

export const bank: KVApp = {
  name: "Bank",
  mutations,
  ui: BankUI,
  choose,
};
