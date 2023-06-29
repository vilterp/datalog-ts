import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, int, rec, str } from "../../core/types";
import { jsonToDL } from "../../util/json2dl";
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
        // TODO: rename field to status?
        state: jsonToDL(threadState.status),
      })
    );
    Object.entries(threadState.scope).forEach(([name, value]) => {
      records.push(
        rec("state.Var", {
          thread: str(threadID),
          time: int(state.timestamp),
          var: str(name),
          value: jsonToDL(value),
        })
      );
    });
  });
  Object.entries(state.locks).forEach(([lockID, lockState]) => {
    records.push(
      rec("state.Lock", {
        id: str(lockID),
        time: int(state.timestamp),
        state: jsonToDL(lockState),
      })
    );
  });
  Object.entries(state.timers).forEach(([timerID, timer]) => {
    records.push(
      rec("state.Timer", {
        id: str(timerID),
        time: int(state.timestamp),
        wakeUpAt: int(timer.wakeUpAt),
      })
    );
  });
  interp = interp.bulkInsert(records);
  return interp;
}
