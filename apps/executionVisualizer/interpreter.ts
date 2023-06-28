import { BBMain } from "../../languageWorkbench/languages/basicBlocks/parser";
import { Program, compileBasicBlocks } from "./compileToTsObjs";

export type State = {
  timestamp: number;
  program: Program;
  threadState: { [threadID: string]: ThreadState };
  timers: { [id: string]: Timer };
  locks: { [id: string]: Lock };
};

type ThreadState = {
  counter: number;
  scope: { [name: string]: number | string };
  state:
    | { type: "Running" }
    | {
        type: "Blocked";
        reason: BlockReason;
      };
};

type Lock = {
  state: { type: "Open" } | { type: "HeldBy"; threadID: string };
};

type Timer = {
  wakeUpAt: number;
};

type BlockReason = { type: "Timer"; id: string } | { type: "Lock"; id: string };

export function initialState(instrs: BBMain): State {
  return {
    program: compileBasicBlocks(instrs),
    timestamp: 0,
    threadState: { 0: { counter: 0, scope: {}, state: { type: "Running" } } },
    timers: {},
    locks: {},
  };
}

export function step(state: State): State {
  let newState = state;
  for (const threadID in state.threadState) {
    newState = stepThread(state, threadID);
  }
  return newState;
}

function stepThread(state: State, threadID: string): State {
  const thread = state.threadState[threadID];
  const counter = thread.counter;
  const instr = state.program[counter];
  switch (instr.type) {
    case "ValueInstr": {
      switch (instr.rvalue.type) {
        case "Call":
          return XXXX;
        case "EditorVar":
          return XXXX;
        case "Int":
          return XXXX;
        case "String":
          return XXXX;
      }
    }
    case "ForkToInstr":
      return XXXX;
    case "GotoInstr":
      return {
        ...state,
        threadState: {
          ...state.threadState,
          [threadID]: {
            ...thread,
            counter: instr.label,
          },
        },
      };
  }
}
