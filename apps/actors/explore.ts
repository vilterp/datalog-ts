import { System } from "./types";

// TODO: generator of what? updates to a DB?

type Frame<ActorState, Msg> = {
  state: ActorState;
  options: Generator;
  messages: Msg[];
};
// TODO:
// - process messages
// - insert into DB
// - stopping condition
export function* explore<ActorState, Msg>(
  system: System<ActorState, Msg>,
  initialState: ActorState,
  choose: (state: ActorState) => Generator<Msg>,
  limit: number
): Generator<ActorState> {
  const stack: Frame<ActorState, Msg>[] = [
    { state: initialState, options: choose(initialState), messages: [] },
  ];
  let steps = 0;

  // BFS
  while (stack.length > 0) {
    if (steps >= limit) {
      return;
    }

    const frame = stack.pop();

    yield frame.state;

    const nextMsg = frame.options.next();
    if (nextMsg.done) {
      continue;
    }
    const resp = system.update(frame.state, nextMsg.value);
    switch (resp.type) {
      case "continue":
        stack.push({
          state: resp.state,
          options: choose(resp.state),
          messages: frame.messages.concat(nextMsg.value),
        });
        break;
      case "exit":
        continue;
      case "sleep":
        // TODO: ???
        continue;
    }

    steps++;
  }
}
