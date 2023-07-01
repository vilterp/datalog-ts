import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, int, rec, str } from "../../core/types";
import { parseMain } from "../../languageWorkbench/languages/basicBlocks/parser";
import { jsonToDL } from "../../util/json2dl";
import { State, initialState, step } from "./interpreter";

export function stepAndRecord(
  interp: AbstractInterpreter,
  input: string
): [State, AbstractInterpreter, string | null] {
  interp = interp.doLoad("viz.dl");
  interp = interp.doLoad("deadlock.dl");

  const bbMain = parseMain(input);
  let state = initialState(bbMain);

  // insert initial state
  state.program.dlInstrs.forEach((instr, idx) => {
    interp = interp.insert(rec("instr", { idx: int(idx), op: instr }));
  });
  interp = dumpState(interp, state);
  try {
    // step program
    for (let t = 0; t < 50; t++) {
      state = step(state);
      interp = dumpState(interp, state);
    }

    return [state, interp, null];
  } catch (e) {
    return [state, interp, e.toString()];
  }
}

function dumpState(
  interp: AbstractInterpreter,
  state: State
): AbstractInterpreter {
  const records: Rec[] = [];
  Object.entries(state.threadStates).forEach(([threadIDStr, threadState]) => {
    const threadID = parseInt(threadIDStr);
    records.push(
      rec("state.ProgramCounter", {
        thread: int(threadID),
        counter: int(threadState.counter),
        time: int(state.timestamp),
        // TODO: rename field to status?
        state: jsonToDL(threadState.status),
      })
    );
    Object.entries(threadState.scope).forEach(([name, value]) => {
      records.push(
        rec("state.Var", {
          thread: int(threadID),
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