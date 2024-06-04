import { Json } from "../../util/json";
import { stepAll } from "./step";
import { SystemInstance } from "./types";

// TODO: generator of what? updates to a DB?

type Frame<ActorState, Msg> = {
  state: SystemInstance<ActorState, Msg>;
  options: Generator;
};
// TODO:
// - process messages (maybe use `step`?)
// - insert into DB
// - stopping condition
export function* explore<ActorState extends Json, Msg extends Json>(
  systemInstance: SystemInstance<ActorState, Msg>,
  stepLimit: number
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
  let steps = 0;

  while (stack.length > 0) {
    if (steps >= stepLimit) {
      return;
    }

    const frame = stack.pop();
    console.log("explore", frame);

    yield frame.state;

    const nextMsg = frame.options.next();
    if (nextMsg.done) {
      continue;
    }

    const nextState = stepAll(frame.state.trace, frame.state.system.update, [
      nextMsg,
    ]);

    stack.push({
      options: system.chooseNextMove(nextState),
      state: nextState,
    });

    steps++;
  }
}
