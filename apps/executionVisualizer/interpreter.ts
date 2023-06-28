import {
  BBMain,
  BBRvalue,
} from "../../languageWorkbench/languages/basicBlocks/parser";
import { Program, compileBasicBlocks } from "./compileToTsObjs";

export type State = {
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
      }
    | { type: "Finished" };
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
  const threadState = state.threadState[threadID];
  switch (threadState.state.type) {
    case "Running":
      return processRunning(state, threadID);
    case "Blocked":
      return processBlocked(state, threadID);
    case "Finished":
      // nothing to do
      return state;
  }
}

function processRunning(state: State, threadID: string): State {
  const threadState = state.threadState[threadID];
  const counter = threadState.counter;
  const instr = state.program.instrs[counter];
  switch (instr.type) {
    case "ValueInstr": {
      const varName = instr.ident.text;
      const rvalue = instr.rvalue;
      // TODO: update counters
      switch (rvalue.type) {
        case "Call": {
          const name = rvalue.ident.text;
          const args = rvalue.params.ident.map(
            (ident) => threadState.scope[ident.text]
          );
          if (name.startsWith("prim.")) {
            const val = getPrimitiveResult(rvalue.ident.text, args);
            return updateThreadScope(state, threadID, varName, val);
          } else if (name.startsWith("block.")) {
            return processBlockingCall(state, threadID, name, args);
          }
        }
        case "EditorVar":
          throw new Error("TODO: editor vars");
        case "Int":
          return updateThreadScope(
            state,
            threadID,
            varName,
            parseInt(instr.rvalue.text)
          );
        case "String":
          return updateThreadScope(
            state,
            threadID,
            varName,
            // TODO: process escapes
            instr.rvalue.text
          );
      }
    }
    case "ForkToInstr": {
      const newThreadID = Object.keys(state.threadState).length;
      return {
        ...state,
        threadState: {
          ...state.threadState,
          [threadID]: {
            ...threadState,
            counter: counter + 1,
          },
          [newThreadID]: {
            ...threadState,
            counter: state.program.blockIndex[instr.label.text],
          },
        },
      };
    }
    case "GotoInstr":
      // TODO: conditional
      return {
        ...state,
        threadState: {
          ...state.threadState,
          [threadID]: {
            ...threadState,
            counter: state.program.blockIndex[instr.label.text],
          },
        },
      };
  }
}

function processBlocked(state: State, threadID: string): State {
  const threadState = state.threadState[threadID];
  // stay blocked unless someone else frees us?
  throw new Error("TODO: process blocked");
}

function updateThreadScope(
  state: State,
  threadID: string,
  varName: string,
  value: Value
): State {
  const threadState = state.threadState[threadID];
  return {
    ...state,
    threadState: {
      ...state.threadState,
      [threadID]: {
        ...threadState,
        counter: threadState.counter + 1,
        scope: {
          ...threadState.scope,
          [varName]: value,
        },
      },
    },
  };
}

function getPrimitiveResult(name: string, args: Value[]): Value {
  switch (name) {
    case "prim.add":
      return (args[0] as number) + (args[1] as number);
    case "prim.incr":
      return (args[0] as number) + 1;
    case "prim.lt":
      return args[0] < args[1];
    default:
      throw new Error(`unknown primitive ${name}`);
  }
}

function processBlockingCall(
  state: State,
  threadID: string,
  name: string,
  args: Value[]
): State {
  switch (name) {
    case "block.acquireLock":
      return XXXX;
    case "block.sleep":
      return XXX;
  }
}
