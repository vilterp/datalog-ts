import { pairsToObj } from "../../../../../util/util";
import { ServerState } from "../server";
import { Trace } from "../types";
import { BUILTINS } from "./builtins";
import { Expr, Lambda, Outcome, Scope, Value } from "./types";

export function runMutationServer(
  clientState: ServerState, // TODO: need to abstract this
  transactionID: string,
  lambda: Lambda,
  args: Value[]
): [ServerState, Outcome, Trace] {
  const scope: Scope = pairsToObj(
    args.map((arg, idx) => ({
      key: lambda.args[idx],
      value: arg,
    }))
  );
  const [resVal, outcome, newState, trace] = runMutationExpr(
    clientState,
    transactionID,
    [],
    scope,
    lambda.body
  );
  // TODO: check out
  return [newState, outcome, trace];
}

function runMutationExpr(
  state: ServerState, // TODO: need to abstract this
  transactionID: string,
  traceSoFar: Trace,
  scope: Scope,
  expr: Expr
): [Value, Outcome, ServerState, Trace] {
  switch (expr.type) {
    case "Read": {
      const [keyRes, outcome, newState, newTrace] = runMutationExpr(
        state,
        transactionID,
        traceSoFar,
        scope,
        expr.key
      );
      if (outcome === "Abort") {
        return [null, "Abort", newState, newTrace];
      }
      // TODO: actually assert string
      const entry = state.data.find((kv) => kv.key === (keyRes as string));
      const val = entry ? entry.value : null;
      if (!val) {
        const newTrace2: Trace = [
          ...newTrace,
          { type: "Read", key: keyRes as string, transactionID: "-1" },
        ];
        return [expr.default, "Commit", newState, newTrace2];
      }
      const newTrace2: Trace = [
        ...newTrace,
        {
          type: "Read",
          key: keyRes as string,
          transactionID: val.transactionID,
        },
      ];
      return [val.value, "Commit", newState, newTrace2];
    }
    case "Write": {
      // key expr
      const [keyRes, keyOutcome, state1, trace1] = runMutationExpr(
        state,
        transactionID,
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
        transactionID,
        trace1,
        scope,
        expr.val
      );
      if (valOutcome === "Abort") {
        return [null, "Abort", state2, trace2];
      }
      // TODO: actually assert string
      // TODO: use sorted map
      const state3: ServerState = {
        ...state2,
        data: [
          ...state2.data.filter((kv) => kv.key <= keyRes),
          {
            key: keyRes as string,
            value: {
              value: valRes as string,
              transactionID,
            },
          },
          ...state2.data.filter((kv) => kv.key > keyRes),
        ],
      };
      const trace3: Trace = [
        ...trace2,
        { type: "Write", key: keyRes as string, value: valRes },
      ];
      return [valRes, "Commit", state3, trace3];
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
          transactionID,
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
          transactionID,
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
      return runMutationExpr(
        curState,
        transactionID,
        curTrace,
        newScope,
        expr.body
      );
    }
    case "If": {
      const [condRes, condOutcome, clientState1, trace1] = runMutationExpr(
        state,
        transactionID,
        traceSoFar,
        scope,
        expr.cond
      );
      if (condOutcome === "Abort") {
        return [null, "Abort", clientState1, trace1];
      }
      return runMutationExpr(
        clientState1,
        transactionID,
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
      // evaluate args
      const argValues: Value = [];
      let curState = state;
      let curTrace = traceSoFar;
      let outcome: Outcome = "Commit";
      let curRes: Value = null;
      for (const arg of expr.args) {
        const [stepRes, newOutcome, newState, newTrace] = runMutationExpr(
          curState,
          transactionID,
          curTrace,
          scope,
          arg
        );
        curState = newState;
        curTrace = newTrace;
        outcome = newOutcome;
        curRes = stepRes;
        argValues.push(stepRes);
      }
      // TODO: check aborted
      const builtin = BUILTINS[expr.name];
      if (builtin) {
        return [builtin(argValues), "Commit", state, traceSoFar];
      }
      // TODO: look in scope for lambdas
      console.error("missing builtin", expr.name);
    }
  }
}
