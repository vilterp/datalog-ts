import {
  BBMain,
  BBRvalue,
} from "../../languageWorkbench/languages/basicBlocks/parser";
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
  scope: { [name: string]: Value };
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

type Value = string | number | boolean;

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
  const instr = state.program.instrs[counter];
  switch (instr.type) {
    case "ValueInstr": {
      const threadState = state.threadState[threadID];
      return {
        ...state,
        threadState: {
          ...state.threadState,
          [threadID]: {
            ...threadState,
            scope: {
              ...threadState.scope,
              [instr.ident.text]: getRValue(instr.rvalue, threadState),
            },
          },
        },
      };
    }
    case "ForkToInstr":
      return XXXX;
    case "GotoInstr":
      // TODO: conditional
      return {
        ...state,
        threadState: {
          ...state.threadState,
          [threadID]: {
            ...thread,
            counter: state.program.blockIndex[instr.label.text],
          },
        },
      };
  }
}

function getRValue(rvalue: BBRvalue, threadState: ThreadState): Value {
  switch (rvalue.type) {
    case "Call": {
      const name = rvalue.ident.text;
      const args = rvalue.params.ident.map(
        (ident) => threadState.scope[ident.text]
      );
      if (name.startsWith("prim.")) {
        return getPrimitiveResult(rvalue.ident.text, args);
      } else if (name.startsWith("block.")) {
        // this should be elsewhere
      }
    }
    case "EditorVar":
      throw new Error("TODO: editor vars");
    case "Int":
      return parseInt(rvalue.text);
    case "String":
      // TODO: process escapes
      return rvalue.text;
  }
}

function getPrimitiveResult(name: string, args: Value[]): Value {
  switch (name) {
    case "prim.add":
      return (args[0] as number) + (args[1] as number);
    case "prim.incr":
      return (args[0] as number) + 1;
    case "prim.lt":
      return args[0] < args[1];
  }
}
