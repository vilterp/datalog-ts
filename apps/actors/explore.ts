import { Json } from "../../util/json";
import { randStep2, removeAtRandom } from "../../util/util";
import { stepTrace } from "./step";
import {
  AddressedTickInitiator,
  ChooseFn,
  SystemInstance,
  TraceAction,
} from "./types";

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
  const generator = exploreGenerator(
    systemInstance,
    NEW_USER_INPUT_PROB,
    randomSeed
  );
  for (const frame of generator) {
    step++;

    if (step > stepLimit) {
      console.log("hit step limit");
      return runToQuiescence(frame);
    }
  }
}

function runToQuiescence<ActorState extends Json, Msg extends Json>(
  frame: Frame<ActorState, Msg>
): Frame<ActorState, Msg> {
  let curFrame = frame;
  let steps = 0;
  while (curFrame.messages.length > 0) {
    // new user input prob = 0: no new inputs
    curFrame = exploreStep(curFrame, 0);
    steps++;
  }
  console.log("running to quiescence took", steps, "steps");
  return curFrame;
}

// TODO:
// - stopping condition
function* exploreGenerator<ActorState extends Json, Msg extends Json>(
  systemInstance: SystemInstance<ActorState, Msg>,
  newUserInputProbability: number,
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

    const nextFrame = exploreStep(frame, newUserInputProbability);

    stack.push(nextFrame);
  }
}

function exploreStep<ActorState extends Json, Msg extends Json>(
  frame: Frame<ActorState, Msg>,
  newUserInputProbability: number
): Frame<ActorState, Msg> {
  const {
    nextAction: traceAction,
    remainingInits: remainingInits,
    randomSeed: nextRandSeed,
  } = getNextTraceAction(
    frame.state.system.chooseNextMove,
    frame,
    newUserInputProbability,
    frame.randomSeed
  );

  if (traceAction === null) {
    return frame;
  }

  const [nextTrace, newInits] = stepTrace(
    frame.state.trace,
    frame.state.system.update,
    traceAction
  );

  return {
    parent: frame,
    action: traceAction,
    state: {
      ...frame.state,
      trace: nextTrace,
    },
    messages: [...remainingInits, ...newInits],
    randomSeed: nextRandSeed,
  };
}

// TODO: param in UI
const NEW_USER_INPUT_PROB = 0.1;

function getNextTraceAction<ActorState, Msg>(
  chooseNextMove: ChooseFn<ActorState, Msg>,
  frame: Frame<ActorState, Msg>,
  newUserInputProbability: number,
  randomSeed: number
): {
  nextAction: TraceAction<ActorState, Msg> | null;
  remainingInits: AddressedTickInitiator<ActorState>[];
  randomSeed: number; // random seed
} {
  const [rand, randomSeed1] = randStep2(randomSeed);
  if (rand < newUserInputProbability || frame.messages.length === 0) {
    // SendUserInput

    const [messageToClient, randomSeed2] = chooseNextMove(
      frame.state,
      randomSeed1
    );

    if (messageToClient === null) {
      return {
        nextAction: null,
        randomSeed: randomSeed2,
        remainingInits: frame.messages,
      };
    }

    return {
      nextAction: {
        type: "SendUserInput",
        clientID: messageToClient.clientID,
        input: messageToClient.message,
      },
      remainingInits: frame.messages,
      randomSeed: randomSeed2,
    };
  } else {
    // Step
    const [nextMessage, remainingMessages, randomSeed2] = removeAtRandom(
      frame.messages,
      randomSeed1
    );

    return {
      nextAction: {
        type: "Step",
        init: nextMessage,
      },
      remainingInits: remainingMessages,
      randomSeed: randomSeed2,
    };
  }
}
