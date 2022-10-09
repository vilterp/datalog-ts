import { pairsToObj } from "../../../../../util/util";
import { Expr, Lambda, Outcome, Scope, Value } from "./types";
import { KVData, Trace } from "../types";
import { BUILTINS } from "./builtins";

export function runMutation(
  data: KVData,
  transactionID: string,
  lambda: Lambda,
  args: Value[],
  userID: string
): [KVData, Outcome, Trace] {
  const scope: Scope = {
    ...pairsToObj(
      args.map((arg, idx) => ({
        key: lambda.args[idx],
        value: arg,
      }))
    ),
    user: userID,
  };
  const [resVal, outcome, newState, trace] = runMutationExpr(
    data,
    transactionID,
    [],
    scope,
    lambda.body
  );
  // TODO: check out
  return [newState, outcome, trace];
}

function runMutationExpr(
  data: KVData,
  transactionID: string,
  traceSoFar: Trace,
  scope: Scope,
  expr: Expr
): [Value, Outcome, KVData, Trace] {
  switch (expr.type) {
    case "Read": {
      const [keyRes, outcome, newState, newTrace] = runMutationExpr(
        data,
        transactionID,
        traceSoFar,
        scope,
        expr.key
      );
      if (outcome === "Abort") {
        return [null, "Abort", newState, newTrace];
      }
      // TODO: actually assert string
      const val = data[keyRes as string];
      if (!val) {
        const newTrace2: Trace = [
          ...newTrace,
          // TODO: get rid of defaulting...
          // reading a nonexistent key should just abort
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
      const [keyRes, keyOutcome, data1, trace1] = runMutationExpr(
        data,
        transactionID,
        traceSoFar,
        scope,
        expr.key
      );
      if (keyOutcome === "Abort") {
        return [null, "Abort", data1, trace1];
      }
      // val expr
      const [valRes, valOutcome, data2, trace2] = runMutationExpr(
        data1,
        transactionID,
        trace1,
        scope,
        expr.val
      );
      if (valOutcome === "Abort") {
        return [null, "Abort", data2, trace2];
      }
      // TODO: actually assert string
      const data3: KVData = {
        ...data2,
        [keyRes as string]: {
          value: valRes as string,
          transactionID,
        },
      };
      const trace3: Trace = [
        ...trace2,
        { type: "Write", key: keyRes as string, value: valRes },
      ];
      return [valRes, "Commit", data3, trace3];
    }
    case "Lambda":
      // TODO: closure??
      return [expr, "Commit", data, traceSoFar];
    case "Do": {
      let curData = data;
      let curTrace = traceSoFar;
      let outcome: Outcome = "Commit";
      let curRes: Value = null;
      for (const step of expr.ops) {
        const [stepRes, newOutcome, newData, newTrace] = runMutationExpr(
          curData,
          transactionID,
          curTrace,
          scope,
          step
        );
        curData = newData;
        curTrace = newTrace;
        outcome = newOutcome;
        curRes = stepRes;
      }
      return [curRes, outcome, curData, curTrace];
    }
    case "Let": {
      const newScope = { ...scope };
      let curData = data;
      let curTrace = traceSoFar;
      for (const binding of expr.bindings) {
        const [res, outcome, newData, newTrace] = runMutationExpr(
          curData,
          transactionID,
          curTrace,
          scope,
          binding.val
        );
        if (outcome === "Abort") {
          return [null, "Abort", curData, curTrace];
        }
        newScope[binding.varName] = res;
        curData = newData;
        curTrace = newTrace;
      }
      return runMutationExpr(
        curData,
        transactionID,
        curTrace,
        newScope,
        expr.body
      );
    }
    case "If": {
      const [condRes, condOutcome, clientState1, trace1] = runMutationExpr(
        data,
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
      return [null, "Abort", data, traceSoFar];
    case "Var":
      return [scope[expr.name], "Commit", data, traceSoFar];
    case "StringLit":
      return [expr.val, "Commit", data, traceSoFar];
    case "IntLit":
      return [expr.val, "Commit", data, traceSoFar];
    case "Apply": {
      // evaluate args
      const argValues: Value = [];
      let curData = data;
      let curTrace = traceSoFar;
      let outcome: Outcome = "Commit";
      let curRes: Value = null;
      for (const arg of expr.args) {
        const [stepRes, newOutcome, newData, newTrace] = runMutationExpr(
          curData,
          transactionID,
          curTrace,
          scope,
          arg
        );
        curData = newData;
        curTrace = newTrace;
        outcome = newOutcome;
        curRes = stepRes;
        argValues.push(stepRes);
      }
      // TODO: check aborted
      const builtin = BUILTINS[expr.name];
      if (builtin) {
        return [builtin(argValues), "Commit", curData, traceSoFar];
      }
      // TODO: look in scope for lambdas
      console.error("missing builtin", expr.name);
    }
  }
}
