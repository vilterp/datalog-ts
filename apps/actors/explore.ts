import { Json } from "../../util/json";
import { insertUserInput, stepAll } from "./step";
import { MessageToClient, SystemInstance } from "./types";

// TODO: generator of what? updates to a DB?

type Frame<ActorState, Msg> = {
  state: SystemInstance<ActorState, Msg>;
  options: Generator<MessageToClient<Msg>>;
};

export function runExplore<ActorState extends Json, Msg extends Json>(
  systemInstance: SystemInstance<ActorState, Msg>,
  stepLimit: number
): Generator<SystemInstance<ActorState, Msg>> {
  let step = 0;
  const generator = explore(systemInstance);
  for (const state of generator) {
    console.log(state);
    step++;

    if (step > stepLimit) {
      console.log("hit step limit");
      return;
    }
  }
}

// TODO:
// - stopping condition
function* explore<ActorState extends Json, Msg extends Json>(
  systemInstance: SystemInstance<ActorState, Msg>
): Generator<SystemInstance<ActorState, Msg>> {
  const system = systemInstance.system;
  if (!system.chooseNextMove) {
    return;
  }

  const stack: Frame<ActorState, Msg>[] = [
    {
      state: systemInstance,
      options: system.chooseNextMove(systemInstance),
    },
  ];

  // DFS
  // TODO: BFS?
  while (stack.length > 0) {
    const frame = stack.pop();

    yield frame.state;

    const chooseRes = frame.options.next();
    if (chooseRes.done) {
      continue;
    }

    const message: MessageToClient<Msg> = chooseRes.value; // TODO: why is this an `any`

    const nextState = stepMessageToClient(frame.state, message);

    stack.push({
      options: system.chooseNextMove(nextState),
      state: nextState,
    });
  }
}

// TODO: DRY up with reducer
function stepMessageToClient<ActorState extends Json, Msg extends Json>(
  state: SystemInstance<ActorState, Msg>,
  message: MessageToClient<Msg>
): SystemInstance<ActorState, Msg> {
  // TODO: DRY this up with reducers
  const { newTrace: trace2, newMessageID } = insertUserInput(
    state.trace,
    message.clientID,
    message.message
  );
  const nextTrace = stepAll(trace2, state.system.update, [
    {
      from: `user${message.clientID}`,
      to: `client${message.clientID}`,
      init: {
        type: "messageReceived",
        messageID: newMessageID.toString(),
      },
    },
  ]);

  return {
    ...state,
    trace: nextTrace,
  };
}
