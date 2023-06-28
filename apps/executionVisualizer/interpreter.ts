import { BBInstr } from "../../languageWorkbench/languages/basicBlocks/parser";

export type State = {
  timestamp: number;
  program: Program;
  threadState: { [threadID: string]: ThreadState };
  timers: { [id: string]: Timer };
  locks: { [id: string]: Lock };
};

type Program = BBInstr[];

type ThreadState = {
  counter: number;
  scope: { [name: string]: number | string };
  state: BlockReason;
};

type Lock = {
  state: { type: "Open" } | { type: "HeldBy"; threadID: string };
};

type Timer = {
  wakeUpAt: number;
};

type BlockReason =
  | { type: "Running" }
  | {
      type: "Blocked";
      reason: { type: "Timer"; id: string } | { type: "Lock"; id: string };
    };

export function initialState(program: Program): State {
  return {
    program,
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
          XXXX;
        case "EditorVar":
          XXXX;
        case "Int":
          XXXX;
        case "String":
          XXXX;
      }
    }
    case "ForkToInstr":
      XXXX;
    case "GotoInstr":
      XXXX;
  }
}
