import useLocalStorage from "react-use-localstorage";
import { useEffect, useReducer } from "react";

export function useBoolLocalStorage(
  key: string,
  initVal: boolean
): [boolean, (v: boolean) => void] {
  const [val, setVal] = useLocalStorage(key, `${initVal}`);
  return [parseBool(val), (v: boolean) => setVal(`${v}`)];
}

function parseBool(str: string): boolean {
  return str === "true";
}

export function useJSONLocalStorage<T>(
  key: string,
  initVal: T
): [T, (v: T) => void] {
  const [val, setVal] = useLocalStorage(key, JSON.stringify(initVal));
  return [JSON.parse(val) as T, (v: T) => setVal(JSON.stringify(v))];
}

export function useIntLocalStorage(
  key: string,
  initVal: number
): [number, (v: number) => void] {
  const [val, setVal] = useLocalStorage(key, `${initVal}`);
  return [parseInt(val), (v: number) => setVal(`${v}`)];
}

type EffectfulReducerAction<A> =
  | { type: "OutsideAction"; action: A }
  | { type: "MarkPromisesDispatched" };

type EffectfulReducerState<S, A> = { state: S; promises: Promise<A>[] };

// inspired by the Elm architecture
export function useEffectfulReducer<S, A>(
  reducer: (state: S, action: A) => [S, Promise<A>[]],
  initialState: S
): [S, (a: A) => void] {
  const myReducer = (
    prevState: EffectfulReducerState<S, A>,
    action: EffectfulReducerAction<A>
  ): EffectfulReducerState<S, A> => {
    switch (action.type) {
      case "OutsideAction": {
        const [newState, newPromises] = reducer(prevState.state, action.action);
        return {
          state: newState,
          promises: [...prevState.promises, ...newPromises],
        };
      }
      case "MarkPromisesDispatched":
        return { ...prevState, promises: [] };
    }
  };
  const [effRedState, innerDispatch] = useReducer(myReducer, {
    state: initialState,
    promises: [],
  });
  const outerDispatch = (action: A) => {
    innerDispatch({ type: "OutsideAction", action });
  };
  useEffect(() => {
    console.log("need to dispatch", effRedState.promises);
    effRedState.promises.forEach((eff) => {
      eff.then((action) => {
        console.log("inner: dispatching", action);
        innerDispatch({ type: "OutsideAction", action });
      });
      innerDispatch({ type: "MarkPromisesDispatched" });
    });
  }, [effRedState]);
  return [effRedState.state, outerDispatch];
}
