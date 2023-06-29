import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, int, rec, str } from "../../core/types";
import { jsonToDL } from "../../util/json2dl";
import { State, ThreadStatus } from "./interpreter";

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
        state: threadStatusToRec(threadState.status),
      })
    );
  });
  interp = interp.bulkInsert(records);
  return interp;
}

function threadStatusToRec(status: ThreadStatus): Rec {
  return jsonToDL(status) as Rec;
}
