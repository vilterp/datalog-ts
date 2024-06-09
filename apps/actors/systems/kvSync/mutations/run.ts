import { pairsToObj } from "../../../../../util/util";
import { Expr, Lambda, Outcome, Scope, Value } from "./types";
import { KVData, Trace, VersionedValue, WriteOp } from "../types";
import { BUILTINS, InterpreterState } from "./builtins";

export function runMutation(
  kvData: KVData,
  state: InterpreterState,
  transactionID: string,
  lambda: Lambda,
  args: Value[],
  userID: string
): [KVData, Value, InterpreterState, Outcome, Trace] {
  const scope: Scope = {
    ...pairsToObj(
      args.map((arg, idx) => ({
        key: lambda.args[idx],
        value: arg,
      }))
    ),
    curUser: userID,
  };
  const [resVal, outcome, newState, newKVState, trace] = runMutationExpr(
    kvData,
    state,
    transactionID,
    [],
    scope,
    lambda.body
  );
  // TODO: check out
  return [newKVState, resVal, state, outcome, trace];
}

function runMutationExpr(
  kvData: KVData,
  state: InterpreterState,
  transactionID: string,
  traceSoFar: Trace,
  scope: Scope,
  expr: Expr
): [Value, Outcome, InterpreterState, KVData, Trace] {
  switch (expr.type) {
    case "Read": {
      const [keyRes, outcome, newState, newKVData, newTrace] = runMutationExpr(
        kvData,
        state,
        transactionID,
        traceSoFar,
        scope,
        expr.key
      );
      if (outcome === "Abort") {
        return [keyRes, "Abort", newState, newKVData, newTrace];
      }
      // TODO: actually assert string
      const val = kvData[keyRes as string];
      if (!val) {
        const newTrace2: Trace = [
          ...newTrace,
          // TODO: get rid of defaulting...
          // reading a nonexistent key should just abort
          { type: "Read", key: keyRes as string, transactionID: "-1" },
        ];
        return [expr.default, "Commit", newState, newKVData, newTrace2];
      }
      const newTrace2: Trace = [
        ...newTrace,
        {
          type: "Read",
          key: keyRes as string,
          transactionID: val.transactionID,
        },
      ];
      return [val.value, "Commit", newState, newKVData, newTrace2];
    }
    case "Write": {
      // key expr
      const [keyRes, keyOutcome, state1, data1, trace1] = runMutationExpr(
        kvData,
        state,
        transactionID,
        traceSoFar,
        scope,
        expr.key
      );
      if (keyOutcome === "Abort") {
        return [keyRes, "Abort", state1, data1, trace1];
      }
      // val expr
      const [valRes, valOutcome, state2, data2, trace2] = runMutationExpr(
        data1,
        state1,
        transactionID,
        trace1,
        scope,
        expr.val
      );
      if (valOutcome === "Abort") {
        return [valRes, "Abort", state2, data2, trace2];
      }
      // TODO: actually assert string

      const [data3, writeDesc] = doWrite(
        data2,
        transactionID,
        keyRes as string,
        valRes
      );

      const trace3: Trace = [...trace2, writeDesc];
      return [valRes, "Commit", state2, data3, trace3];
    }
    case "Lambda":
      // TODO: closure??
      return [expr, "Commit", state, kvData, traceSoFar];
    case "Do": {
      let curData = kvData;
      let curState = state;
      let curTrace = traceSoFar;
      let outcome: Outcome = "Commit";
      let curRes: Value = null;
      for (const step of expr.ops) {
        const [stepRes, newOutcome, newState, newData, newTrace] =
          runMutationExpr(
            curData,
            curState,
            transactionID,
            curTrace,
            scope,
            step
          );
        curData = newData;
        curState = newState;
        curTrace = newTrace;
        outcome = newOutcome;
        curRes = stepRes;
      }
      return [curRes, outcome, curState, curData, curTrace];
    }
    case "Let": {
      const newScope = { ...scope };
      let curData = kvData;
      let curTrace = traceSoFar;
      let curState = state;
      for (const binding of expr.bindings) {
        const [res, outcome, newState, newData, newTrace] = runMutationExpr(
          curData,
          curState,
          transactionID,
          curTrace,
          newScope,
          binding.val
        );
        if (outcome === "Abort") {
          return [res, "Abort", newState, curData, curTrace];
        }
        newScope[binding.varName] = res;
        curData = newData;
        curTrace = newTrace;
        curState = newState;
      }
      return runMutationExpr(
        curData,
        curState,
        transactionID,
        curTrace,
        newScope,
        expr.body
      );
    }
    case "If": {
      const [condRes, condOutcome, newState, clientState1, trace1] =
        runMutationExpr(
          kvData,
          state,
          transactionID,
          traceSoFar,
          scope,
          expr.cond
        );
      if (condOutcome === "Abort") {
        return [condRes, "Abort", newState, clientState1, trace1];
      }
      return runMutationExpr(
        clientState1,
        newState,
        transactionID,
        trace1,
        scope,
        condRes ? expr.ifTrue : expr.ifFalse
      );
    }
    case "Abort": {
      const [abortReason, _1, _2, _3, _4] = runMutationExpr(
        kvData,
        state,
        transactionID,
        traceSoFar,
        scope,
        expr.reason
      );
      return [abortReason, "Abort", state, kvData, traceSoFar];
    }
    case "Var": {
      const val = scope[expr.name];
      if (typeof val === "undefined") {
        // TODO: pass error message through
        return [val, "Abort", state, kvData, traceSoFar];
      }
      return [scope[expr.name], "Commit", state, kvData, traceSoFar];
    }
    case "MemberAccess": {
      const [res, newOutcome, newState, newData, newTrace] = runMutationExpr(
        kvData,
        state,
        transactionID,
        traceSoFar,
        scope,
        expr.expr
      );
      if (typeof res === "object" && typeof res[expr.member] !== undefined) {
        return [res[expr.member], newOutcome, newState, newData, newTrace];
      }
      return [
        `${JSON.stringify(res)} doesn't have member ${expr.member}`,
        "Abort",
        state,
        kvData,
        traceSoFar,
      ];
    }
    case "StringLit":
      return [expr.val, "Commit", state, kvData, traceSoFar];
    case "IntLit":
      return [expr.val, "Commit", state, kvData, traceSoFar];
    case "Bool":
      return [expr.val, "Commit", state, kvData, traceSoFar];
    case "Apply": {
      // evaluate args
      const argValues: Value = [];
      let curData = kvData;
      let curTrace = traceSoFar;
      let curState = state;
      let outcome: Outcome = "Commit";
      for (const arg of expr.args) {
        const [stepRes, newOutcome, newState, newData, newTrace] =
          runMutationExpr(
            curData,
            curState,
            transactionID,
            curTrace,
            scope,
            arg
          );
        curData = newData;
        curState = newState;
        curTrace = newTrace;
        outcome = newOutcome;
        argValues.push(stepRes);
      }
      // TODO: check aborted
      const builtin = BUILTINS[expr.name];
      if (builtin) {
        const [result, newState] = builtin(state, argValues);
        return [result, "Commit", newState, curData, curTrace];
      }
      // TODO: look in scope for lambdas
      console.error("missing builtin", expr.name);
      return ["missing builtin", "Abort", state, kvData, curTrace];
    }
    case "ObjectLit": {
      // evaluate args
      const values: { [key: string]: Value } = {};
      let curData = kvData;
      let curTrace = traceSoFar;
      let curState = state;
      let outcome: Outcome = "Commit";
      Object.entries(expr.object).forEach(([key, valExpr]) => {
        const [valRes, newOutcome, newState, newData, newTrace] =
          runMutationExpr(
            curData,
            curState,
            transactionID,
            curTrace,
            scope,
            valExpr
          );
        curData = newData;
        curState = newState;
        curTrace = newTrace;
        outcome = newOutcome;
        values[key] = valRes;
      });
      return [values, outcome, curState, curData, curTrace];
    }
  }
}

function doWrite(
  kvData: KVData,
  transactionID: string,
  key: string,
  value: Value
): [KVData, WriteOp] {
  const versionedValue: VersionedValue = { transactionID, value };
  const newKVData: KVData = {
    ...kvData,
    [key]: versionedValue,
  };
  if (kvData[key]) {
    return [
      newKVData,
      {
        type: "Write",
        key,
        desc: { type: "Update", before: kvData[key], after: versionedValue },
      },
    ];
  }
  return [
    newKVData,
    {
      type: "Write",
      key,
      desc: { type: "Insert", after: versionedValue },
    },
  ];
}
