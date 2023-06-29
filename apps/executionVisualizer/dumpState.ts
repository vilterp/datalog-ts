import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, int, rec, str } from "../../core/types";
import { State } from "./interpreter";

export function dumpState(
  interp: AbstractInterpreter,
  state: State
): AbstractInterpreter {
  const records: Rec[] = [];
  Object.entries(state.threadStates).forEach(([threadID, threadState]) => {
    records.push(
      rec("state.ProgramCounter", {
        thread: str(threadID),
        counter: int(threadState.counter),
        time: int(state.timestamp),
        // TODO: make into record
        state: str(threadState.state.type),
      })
    );
  });
  interp = interp.bulkInsert(records);
  return interp;
}
