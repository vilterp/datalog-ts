import { BBMain } from "../../languageWorkbench/languages/basicBlocks/parser";
import { Program, compileBasicBlocks } from "./compileToTsObjs";

export type State = {
  program: Program;
  timestamp: number;
  threadStates: { [threadID: string]: ThreadState };
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

type Lock =
  | { type: "Open" }
  | { type: "HeldBy"; threadID: number; waiters: number[] };

type Timer = {
  wakeUpAt: number;
};

type BlockReason = { type: "Timer"; id: number } | { type: "Lock"; id: number };

type Value =
  | string
  | number
  | boolean
  // TODO: just pointers into a heap?
  | LockID;

type LockID = { type: "Lock"; id: number };

export function initialState(instrs: BBMain): State {
  return {
    program: compileBasicBlocks(instrs),
    timestamp: 0,
    threadStates: { 0: { counter: 0, scope: {}, state: { type: "Running" } } },
    timers: {},
    locks: {},
  };
}

export function step(state: State): State {
  let newState = state;
  for (const threadID in state.threadStates) {
    newState = stepThread(state, threadID);
  }
  return { ...newState, timestamp: state.timestamp + 1 };
}

function stepThread(state: State, threadID: string): State {
  const threadState = state.threadStates[threadID];
  switch (threadState.state.type) {
    case "Running":
      return processRunning(state, threadID);
    case "Blocked":
      return processBlocked(state, threadID, threadState.state.reason);
    case "Finished":
      // nothing to do
      return state;
  }
}

function processRunning(state: State, threadID: string): State {
  const threadState = state.threadStates[threadID];
  const counter = threadState.counter;
  const instr = state.program.instrs[counter];
  if (!instr) {
    return {
      ...state,
      threadStates: {
        ...state.threadStates,
        [threadID]: {
          ...threadState,
          state: { type: "Finished" },
        },
      },
    };
  }
  switch (instr.type) {
    case "ValueInstr": {
      const varName = instr.ident ? instr.ident.text : "_";
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
          } else if (name.startsWith("alloc.")) {
            return processAllocCall(state, threadID, varName, name, args);
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
      const newThreadID = Object.keys(state.threadStates).length;
      return {
        ...state,
        threadStates: {
          ...state.threadStates,
          [threadID]: {
            ...threadState,
            counter: counter + 1,
          },
          [newThreadID]: {
            ...threadState,
            counter: instrIdxForBlock(state, instr.label.text),
          },
        },
      };
    }
    case "GotoInstr":
      // TODO: conditional
      return {
        ...state,
        threadStates: {
          ...state.threadStates,
          [threadID]: {
            ...threadState,
            counter: instrIdxForBlock(state, instr.label.text),
          },
        },
      };
  }
}

function instrIdxForBlock(state: State, blockName: string) {
  const block = state.program.blockIndex.blocks[blockName];
  if (!block) {
    throw new Error(`unkown block ${blockName}`);
  }
  return block.startIndex;
}

function processBlocked(
  state: State,
  threadID: string,
  reason: BlockReason
): State {
  const threadState = state.threadStates[threadID];
  switch (reason.type) {
    case "Timer": {
      const timer = state.timers[reason.id];
      const wakeUpTime = timer.wakeUpAt;
      return wakeUpTime === state.timestamp
        ? {
            ...state,
            threadStates: {
              [threadID]: {
                ...threadState,
                counter: threadState.counter + 1,
                state: { type: "Running" },
              },
            },
          }
        : state;
    }
    case "Lock":
      // other thread will wake us up
      return state;
  }
}

function updateThreadScope(
  state: State,
  threadID: string,
  varName: string,
  value: Value
): State {
  const threadState = state.threadStates[threadID];
  return {
    ...state,
    threadStates: {
      ...state.threadStates,
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

function processAllocCall(
  state: State,
  threadID: string,
  varName: string,
  name: string,
  args: Value[]
): State {
  switch (name) {
    case "alloc.newLock": {
      const newLockID = Object.keys(state.locks).length;
      const withLock: State = {
        ...state,
        locks: {
          ...state.locks,
          [newLockID]: { type: "Open" },
        },
      };
      return updateThreadScope(withLock, threadID, varName, {
        type: "Lock",
        id: newLockID,
      });
    }
    default:
      throw new Error(`unknown alloc call ${name}`);
  }
}

function processBlockingCall(
  state: State,
  threadID: string,
  name: string,
  args: Value[]
): State {
  const threadState = state.threadStates[threadID];
  switch (name) {
    case "block.acquireLock": {
      const lockID = (args[0] as LockID).id;
      const lockState = state.locks[lockID];
      switch (lockState.type) {
        case "HeldBy":
          return {
            ...state,
            threadStates: {
              ...state.threadStates,
              [threadID]: {
                ...threadState,
                state: {
                  type: "Blocked",
                  reason: { type: "Lock", id: lockID },
                },
              },
            },
            locks: {
              ...state.locks,
              // add ourselves to waiters
              [lockID]: {
                ...lockState,
                waiters: [...lockState.waiters, threadID],
              },
            },
          };
        case "Open":
          // acquire lock
          return {
            ...state,
            threadStates: {
              ...state.threadStates,
              [threadID]: {
                ...threadState,
                counter: threadState.counter + 1,
              },
            },
            locks: {
              ...state.locks,
              [lockID]: {
                type: "HeldBy",
                threadID,
                waiters: [],
              },
            },
          };
      }
    }
    case "block.sleep": {
      const newTimerID = Object.keys(state.timers).length;
      const sleepTime = args[0] as number;
      return {
        ...state,
        threadStates: {
          ...state.threadStates,
          [threadID]: {
            ...threadState,
            state: {
              type: "Blocked",
              reason: { type: "Timer", id: newTimerID },
            },
          },
        },
        timers: {
          ...state.timers,
          [newTimerID]: {
            wakeUpAt: state.timestamp + sleepTime,
          },
        },
      };
    }
    case "block.releaseLock": {
      // doesn't block, but unblocks other threads...
      const lockID = (args[0] as LockID).id;
      const lock = state.locks[lockID];
      // TODO: need a waiters queue?
      switch (lock.type) {
        case "HeldBy": {
          const waiters = lock.waiters;
          if (waiters.length > 0) {
            const firstWaiterID = waiters[0];
            const firstWaiterState = state.threadStates[firstWaiterID];
            return {
              ...state,
              locks: {
                ...state.locks,
                // transfer lock ownership
                [lockID]: {
                  type: "HeldBy",
                  threadID: firstWaiterID,
                  waiters: waiters.slice(1),
                },
              },
              threadStates: {
                ...state.threadStates,
                // advance current thread
                [threadID]: {
                  ...threadState,
                  counter: threadState.counter + 1,
                },
                // unblock and advance acquiring thread
                [firstWaiterID]: {
                  ...firstWaiterState,
                  state: { type: "Running" },
                  counter: firstWaiterState.counter + 1,
                },
              },
            };
          }
          // just open up the lock
          return {
            ...state,
            locks: {
              ...state.locks,
              // transfer lock ownership
              [lockID]: { type: "Open" },
            },
            threadStates: {
              ...state.threadStates,
              // advance current thread
              [threadID]: {
                ...threadState,
                counter: threadState.counter + 1,
              },
            },
          };
        }
        case "Open":
          throw new Error("releasing an open lock");
      }
    }
    default:
      throw new Error(`unknown blocking call ${name}`);
  }
}
