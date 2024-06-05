import { Json } from "../../util/json";
import { randStep2 } from "../../util/util";
import { stepTrace } from "./step";
import {
  AddressedTickInitiator,
  ChooseFn,
  SystemInstance,
  TraceAction,
} from "./types";

export const DEFAULT_STEP_LIMIT = 100;

type Frame<ActorState, Msg> = {
  parent: Frame<ActorState, Msg> | null;
  action: TraceAction<ActorState, Msg> | { type: "ExploreStart" };
  state: SystemInstance<ActorState, Msg>;
  messages: AddressedTickInitiator<ActorState>[];
  randomSeed: number;
};

// TODO: stopping condition
export function explore<ActorState extends Json, Msg extends Json>(
  systemInstance: SystemInstance<ActorState, Msg>,
  stepLimit: number,
  randomSeed: number
): Frame<ActorState, Msg> {
  let step = 0;
  const generator = exploreGenerator(systemInstance, randomSeed);
  for (const frame of generator) {
    console.log(frame);
    step++;

    if (step > stepLimit) {
      console.log("hit step limit");
      // TODO: step the rest of the txns
      return frame;
    }
  }
}

// TODO:
// - stopping condition
function* exploreGenerator<ActorState extends Json, Msg extends Json>(
  systemInstance: SystemInstance<ActorState, Msg>,
  randomSeed: number
): Generator<Frame<ActorState, Msg>> {
  const system = systemInstance.system;
  if (!system.chooseNextMove) {
    return;
  }

  const stack: Frame<ActorState, Msg>[] = [
    {
      parent: null,
      action: { type: "ExploreStart" },
      randomSeed,
      messages: [],
      state: systemInstance,
    },
  ];

  // DFS
  // TODO: BFS?
  while (stack.length > 0) {
    const frame = stack.pop();

    yield frame;

    const [traceAction, nextRandSeed] = getNextTraceAction(
      systemInstance.system.chooseNextMove,
      frame,
      frame.randomSeed
    );

    if (traceAction === null) {
      continue;
    }

    const [nextTrace, inits] = stepTrace(
      frame.state.trace,
      frame.state.system.update,
      traceAction
    );

    const newSystemInstance: SystemInstance<ActorState, Msg> = {
      ...frame.state,
      trace: nextTrace,
    };

    stack.push({
      parent: frame,
      action: traceAction,
      state: newSystemInstance,
      messages: inits,
      randomSeed: nextRandSeed,
    });
  }
}

const NEW_USER_INPUT_PROB = 0.3;

function getNextTraceAction<ActorState, Msg>(
  chooseNextMove: ChooseFn<ActorState, Msg>,
  frame: Frame<ActorState, Msg>,
  randomSeed: number
): [TraceAction<ActorState, Msg> | null, number] {
  const [rand, randomSeed1] = randStep2(randomSeed);
  if (rand < NEW_USER_INPUT_PROB || frame.messages.length === 0) {
    // SendUserInput

    const [messageToClient, randomSeed2] = chooseNextMove(
      frame.state,
      randomSeed1
    );

    return [
      {
        type: "SendUserInput",
        clientID: messageToClient.clientID,
        input: messageToClient.message,
      },
      randomSeed2,
    ];
  } else {
    // Step

    const [rand01, randomSeed2] = randStep2(randomSeed1);
    const randIdx = rand01 * (frame.messages.length - 1);
    console.log({
      messages: frame.messages,
      randIdx,
      item: frame.messages[randIdx],
    });
    const message = frame.messages[randIdx];

    return [
      {
        type: "Step",
        init: message,
      },
      randomSeed2,
    ];
  }
}
