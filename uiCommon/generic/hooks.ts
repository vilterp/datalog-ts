import useLocalStorage from "react-use-localstorage";
import { Dispatch, useReducer, useState } from "react";

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

export function useJSONLocalStorage<T>(key: string, initVal: T) {
  const [val, setVal] = useLocalStorage(key, JSON.stringify(initVal));
  return [JSON.parse(val), (v: T) => setVal(JSON.stringify(v))];
}

export function useIntLocalStorage(
  key: string,
  initVal: number
): [number, (v: number) => void] {
  const [val, setVal] = useLocalStorage(key, `${initVal}`);
  return [parseInt(val), (v: number) => setVal(`${v}`)];
}

// inspired by the Elm architecture
export function useEffectfulReducer<S, A>(
  reducer: (state: S, action: A) => [S, Promise<A>],
  initialState: S
): [S, (a: A) => void] {
  const [state, setState] = useState(initialState);
  const dispatch = (action: A) => {
    const [newState, promise] = reducer(state, action);
    setState(newState);
    if (promise) {
      promise.then((newAction) => dispatch(newAction));
    }
  };
  return [state, dispatch];
}
