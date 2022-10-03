import { Json } from "../../../../util/json";
import { ClientState } from "./client";
import { Expr, MutationDefn } from "./mutationTypes";

export type Trace = { key: string; version: number }[];

export function runMutation(
  clientState: ClientState, // TODO: need to abstract this
  mutation: MutationDefn
): [ClientState, Outcome, Trace] {
  const [resVal, outcome, newState, trace] = runMutationExpr(
    clientState,
    [],
    {},
    mutation
  );
  // TODO: check out
  return [newState, outcome, trace];
}

type Scope = { [name: string]: Json };

type Outcome = "Commit" | "Abort";

function runMutationExpr(
  state: ClientState, // TODO: need to abstract this
  traceSoFar: Trace,
  scope: Scope,
  expr: Expr
): [Json, Outcome, ClientState, Trace] {
  switch (expr.type) {
    case "Lambda":
      return XXXX;
    case "Do":
      return XXXX;
    case "Read":
      return XXXX;
    case "Write":
      return XXXX;
    case "Let":
      return XXXX;
    case "If": {
      const [condRes, condOutcome, clientState1, trace1] = runMutationExpr(
        state,
        traceSoFar,
        scope,
        expr.cond
      );
      if (condOutcome === "Abort") {
        return [null, "Abort", clientState1, trace1];
      }
      return runMutationExpr(
        clientState1,
        trace1,
        scope,
        condRes ? expr.ifTrue : expr.ifFalse
      );
    }
    case "Abort":
      return [null, "Abort", state, traceSoFar];
    case "Var":
      return [scope[expr.name], "Commit", state, traceSoFar];
    case "StringLit":
      return [expr.val, "Commit", state, traceSoFar];
    case "Apply": {
      const builtin = BUILTINS[expr.name];
      if (builtin) {
        return [builtin(expr.args), "Commit", state, traceSoFar];
      }
    }
  }
}

type Builtin = (args: Json[]) => Json;

const BUILTINS: { [name: string]: Builtin } = {
  "+": (args) => {
    return (args[0] as number) + (args[1] as number);
  },
  "-": (args: Json[]) => {
    return (args[0] as number) - (args[1] as number);
  },
  "<": (args) => {
    return args[0] < args[1];
  },
};
