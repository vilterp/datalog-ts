import { useReducer } from "react";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Statement } from "../../core/types";

// TODO: persist to local storage
export function useInMemoryDB(
  initial: AbstractInterpreter
): [AbstractInterpreter, (stmts: Statement[]) => void] {
  return useReducer(runStmtReducer, initial);
}

function runStmtReducer(
  interp: AbstractInterpreter,
  statements: Statement[]
): AbstractInterpreter {
  return interp.evalRawStmts(statements)[1];
}
