import { Action, Effect, State } from "./common";

export type StateRef = {
  state: State;
  update: (state: State, action: Action) => [State, Effect[]];
  runEffect: (state: State, effect: Effect) => Action[];
};

export function dispatch(stateRef: StateRef, action: Action) {
  const queue = [action];
  while (queue.length > 0) {
    const nextAction = queue.shift();
    try {
      console.log(
        "update(",
        "action=",
        nextAction,
        ",",
        "state=",
        stateRef.state,
        ")"
      );
      const before = new Date().getTime();
      const [newState, effects] = stateRef.update(stateRef.state, nextAction);
      const after = new Date().getTime();
      console.log("=>", [newState, effects], after - before, "ms");
      effects.forEach((eff) => {
        try {
          const actions = stateRef.runEffect(newState, eff);
          actions.forEach((action) => {
            console.log("pushing onto action queue:", action);
            queue.push(action);
          });
        } catch (e) {
          console.error("while running effect", eff, "got error", e);
        }
      });
      stateRef.state = newState;
    } catch (e) {
      console.error(
        "while running update(",
        stateRef.state,
        ",",
        action,
        ") got error",
        e
      );
    }
  }
}
