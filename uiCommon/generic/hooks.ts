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

// inspired by the Elm architecture
export function useEffectfulReducer<S, A>(
  reducer: (state: S, action: A) => [S, Promise<A>[]],
  initialState: S
): [S, (a: A) => void] {
  const myReducer = (
    prevPair: [S, Promise<A>[]],
    action: A
  ): [S, Promise<A>[]] => {
    const [prevState, _] = prevPair;
    const [newState, promise] = reducer(prevState, action);
    // console.log(
    //   "useEffectfulReducer",
    //   [prevState, action],
    //   [newState, promise]
    // );
    return [newState, promise];
  };
  const [[state, effects], dispatch] = useReducer(myReducer, [
    initialState,
    [],
  ]);
  useEffect(() => {
    console.log("need to dispatch", effects);
    effects.forEach((eff) => {
      eff.then((eff2) => {
        console.log("inner: dispatching", eff2);
        dispatch(eff2);
      });
    });
  }, [effects, dispatch, myReducer]);
  return [state, dispatch];
}
