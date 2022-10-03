import React, { useEffect } from "react";
import { UIProps } from "../../../types";
import { ClientState } from "../client";
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
} from "../mutation";
import { MutationDefns, UserInput } from "../types";
import { KVApp } from "./types";

const mutations: MutationDefns = {
  deposit: lambda(
    ["toAccount", "amount"],
    letExpr(
      [{ varName: "balanceBefore", val: read(varr("toAccount")) }],
      write(
        varr("toAccount"),
        apply("+", [varr("balanceBefore"), varr("amount")])
      )
    )
  ),
  withdraw: lambda(
    ["fromAccount", "amount"],
    letExpr(
      [{ varName: "balanceBefore", val: read(varr("fromAccount")) }],
      write(
        varr("fromAccount"),
        apply("-", [varr("balanceBefore"), varr("amount")])
      )
    )
  ),
  move: lambda(
    ["fromAccount", "toAccount", "amount"],
    letExpr(
      [
        { varName: "fromBalance", val: read(varr("fromAccount")) },
        { varName: "toBalance", val: read(varr("toAccount")) },
      ],
      ifExpr(
        apply(">", [varr("amount"), varr("fromBalance")]),
        abort(str("balance not high enough")),
        doExpr([
          write(
            varr("fromAccount"),
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

function BankUI(props: UIProps<ClientState, UserInput>) {
  useEffect(() => {
    props.sendUserInput({
      type: "RegisterQuery",
      query: { fromKey: "", toKey: "" }, // TODO: begin and end keys?
    });
  }, []);

  return <p>Hello world</p>;
}

export const bank: KVApp = { name: "Bank", mutations, ui: BankUI };
