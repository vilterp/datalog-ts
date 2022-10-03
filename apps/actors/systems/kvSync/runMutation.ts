import { Json } from "../../../../util/json";
import { pairsToObj } from "../../../../util/util";
import { ClientState } from "./client";
import { Expr, MutationDefn, Value } from "./mutationTypes";

export type Trace = { key: string; version: number }[];

export function runMutation(
  clientState: ClientState, // TODO: need to abstract this
  mutation: MutationDefn,
  args: Value[]
): [ClientState, Outcome, Trace] {
  const scope: Scope = pairsToObj(
    args.map((arg, idx) => ({
      key: mutation.args[idx],
      value: arg,
    }))
  );
  const [resVal, outcome, newState, trace] = runMutationExpr(
    clientState,
    [],
    scope,
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
): [Value, Outcome, ClientState, Trace] {
  switch (expr.type) {
    case "Read": {
      const [keyRes, outcome, newState, newTrace] = runMutationExpr(
        state,
        traceSoFar,
        scope,
        expr.key
      );
      if (outcome === "Abort") {
        return [null, "Abort", newState, newTrace];
      }
      // TODO: actually assert string
      const val = state.data[keyRes as string];
      const newTrace2: Trace = [
        ...newTrace,
        { key: keyRes as string, version: val.version },
      ];
      return [val, "Commit", newState, newTrace2];
    }
    case "Write": {
      // key expr
      const [keyRes, keyOutcome, state1, trace1] = runMutationExpr(
        state,
        traceSoFar,
        scope,
        expr.key
      );
      if (keyOutcome === "Abort") {
        return [null, "Abort", state1, trace1];
      }
      // val expr
      const [valRes, valOutcome, state2, trace2] = runMutationExpr(
        state1,
        trace1,
        scope,
        expr.val
      );
      if (valOutcome === "Abort") {
        return [null, "Abort", state2, trace2];
      }
      // TODO: actually assert string
      const val = state.data[keyRes as string];
      const state3: ClientState = {
        ...state2,
        data: {
          ...state2.data,
          [keyRes as string]: {
            value: valRes as string,
            version: val.version + 1,
            serverTimestamp: null,
          },
        },
      };
      return [val, "Commit", state3, trace2];
    }
    case "Lambda":
      // TODO: closure??
      return [expr, "Commit", state, traceSoFar];
    case "Do": {
      let curState = state;
      let curTrace = traceSoFar;
      let outcome: Outcome = "Commit";
      let curRes: Value = null;
      for (const step of expr.ops) {
        const [stepRes, newOutcome, newState, newTrace] = runMutationExpr(
          curState,
          curTrace,
          scope,
          step
        );
        curState = newState;
        curTrace = newTrace;
        outcome = newOutcome;
        curRes = stepRes;
      }
      return [curRes, outcome, curState, curTrace];
    }
    case "Let": {
      const newScope = { ...scope };
      let curState = state;
      let curTrace = traceSoFar;
      for (const binding of expr.bindings) {
        const [res, outcome, newState, newTrace] = runMutationExpr(
          curState,
          curTrace,
          scope,
          binding.val
        );
        if (outcome === "Abort") {
          return [null, "Abort", curState, curTrace];
        }
        newScope[binding.varName] = res;
        curState = newState;
        curTrace = newTrace;
      }
      return runMutationExpr(curState, curTrace, newScope, expr.body);
    }
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

type Builtin = (args: Value[]) => Value;

const BUILTINS: { [name: string]: Builtin } = {
  "+": (args) => {
    return (args[0] as number) + (args[1] as number);
  },
  "-": (args) => {
    return (args[0] as number) - (args[1] as number);
  },
  "<": (args) => {
    return args[0] < args[1];
  },
};
