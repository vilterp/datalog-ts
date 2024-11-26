import { Program } from "./compileToNative";

export type State = {
  program: Program;
  timestamp: number;
  threadStates: { [threadID: string]: ThreadState };
  timers: { [id: string]: Timer };
  locks: { [id: string]: Lock };
};

// TODO: fold into state?
export type Params = { [name: string]: Value };

type ThreadState = {
  counter: number;
  scope: { [name: string]: Value };
  status: ThreadStatus;
};

export type ThreadStatus =
  | { type: "running" }
  | {
      type: "blocked";
      reason: BlockReason;
    }
  | { type: "finished" };

type Lock =
  | { type: "open" }
  | { type: "heldBy"; thread: number; waiters: number[] };

type Timer = {
  wakeUpAt: number;
};

type BlockReason = { type: "timer"; id: number } | { type: "lock"; id: number };

type Value =
  | string
  | number
  | boolean
  // TODO: just pointers into a heap?
  | LockID;

type LockID = { type: "Lock"; id: number };

export function initialState(program: Program): State {
  return {
    program,
    timestamp: 1,
    threadStates: { 1: { counter: 0, scope: {}, status: { type: "running" } } },
    timers: {},
    locks: {},
  };
}

export function step(state: State, params: Params): State {
  let newState = state;
  for (const threadID in state.threadStates) {
    newState = stepThread(newState, parseInt(threadID), params);
  }
  return { ...newState, timestamp: state.timestamp + 1 };
}

function stepThread(state: State, threadID: number, params: Params): State {
  const threadState = state.threadStates[threadID];
  if (!threadState) {
    debugger;
  }
  switch (threadState.status.type) {
    case "running":
      return processRunning(state, threadID, params);
    case "blocked":
      return processBlocked(state, threadID, threadState.status.reason);
    case "finished":
      // nothing to do
      return state;
  }
}

function processRunning(state: State, threadID: number, params: Params): State {
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
          status: { type: "finished" },
        },
      },
    };
  }
  switch (instr.type) {
    case "ValueInstr": {
      const varName = instr.ident ? instr.ident.text : "_";
      const rvalue = instr.rvalue;
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
          } else {
            throw new Error(`unknown function: ${name}`);
          }
        }
        case "EditorVar":
          return updateThreadScope(
            state,
            threadID,
            varName,
            params[instr.ident.text]
          );
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
      // TODO: doing this to match DL
      // should I use a hash instead?
      const newThreadID = threadID + 100 + state.timestamp;
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
    case "GotoInstr": {
      if (instr.ifClause) {
        const varName = instr.ifClause.ident.text;
        const val = threadState.scope[varName];
        const dest = val
          ? instrIdxForBlock(state, instr.label.text)
          : threadState.counter + 1;
        return jumpToIdx(state, threadID, dest);
      }
      return jumpToIdx(
        state,
        threadID,
        instrIdxForBlock(state, instr.label.text)
      );
    }
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
  threadID: number,
  reason: BlockReason
): State {
  const threadState = state.threadStates[threadID];
  switch (reason.type) {
    case "timer": {
      const timer = state.timers[reason.id];
      const wakeUpTime = timer.wakeUpAt;
      return wakeUpTime === state.timestamp
        ? {
            ...state,
            threadStates: {
              ...state.threadStates,
              [threadID]: {
                ...threadState,
                counter: threadState.counter + 1,
                status: { type: "running" },
              },
            },
          }
        : state;
    }
    case "lock":
      // other thread will wake us up
      return state;
  }
}

function updateThreadScope(
  state: State,
  threadID: number,
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

function jumpToIdx(state: State, threadID: number, dest: number): State {
  const threadState = state.threadStates[threadID];
  return {
    ...state,
    threadStates: {
      ...state.threadStates,
      [threadID]: {
        ...threadState,
        counter: dest,
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
  threadID: number,
  varName: string,
  name: string,
  args: Value[]
): State {
  switch (name) {
    case "alloc.newLock": {
      const newLockID = Object.keys(state.locks).length;
      const newLock: Lock = { type: "open" };
      const withLock: State = {
        ...state,
        locks: {
          ...state.locks,
          [newLockID]: newLock,
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
  threadID: number,
  name: string,
  args: Value[]
): State {
  const threadState = state.threadStates[threadID];
  switch (name) {
    case "block.acquireLock": {
      const lockID = (args[0] as LockID).id;
      const lockState = state.locks[lockID];
      switch (lockState.type) {
        case "heldBy":
          return {
            ...state,
            threadStates: {
              ...state.threadStates,
              [threadID]: {
                ...threadState,
                counter: threadState.counter + 1,
                status: {
                  type: "blocked",
                  reason: { type: "lock", id: lockID },
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
        case "open":
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
                type: "heldBy",
                thread: threadID,
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
            status: {
              type: "blocked",
              reason: { type: "timer", id: newTimerID },
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
        case "heldBy": {
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
                  type: "heldBy",
                  thread: firstWaiterID,
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
                  status: { type: "running" },
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
              [lockID]: { type: "open" },
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
        case "open":
          throw new Error("releasing an open lock");
      }
    }
    default:
      throw new Error(`unknown blocking call ${name}`);
  }
}
