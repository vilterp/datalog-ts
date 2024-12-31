import useLocalStorage from "react-use-localstorage";
import {
  Ref,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { pairsToObj } from "../../util/util";

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
  | { type: "MarkPromiseDispatched"; id: string };

type EffectfulReducerState<S, A> = {
  state: S;
  nextPromiseID: number;
  promises: { [id: string]: Promise<A> };
};

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
        const newPromisesObj = pairsToObj(
          newPromises.map((newPromise, idx) => ({
            key: (prevState.nextPromiseID + idx).toString(),
            value: newPromise,
          }))
        );
        return {
          state: newState,
          nextPromiseID: prevState.nextPromiseID + newPromises.length,
          promises: { ...prevState.promises, ...newPromisesObj },
        };
      }
      case "MarkPromiseDispatched": {
        const newPromises = { ...prevState.promises };
        delete newPromises[action.id];
        return { ...prevState, promises: newPromises };
      }
    }
  };
  const [effRedState, innerDispatch] = useReducer(myReducer, {
    state: initialState,
    nextPromiseID: 0,
    promises: {},
  });
  const outerDispatch = (action: A) => {
    innerDispatch({ type: "OutsideAction", action });
  };
  useEffect(() => {
    Object.entries(effRedState.promises).forEach(([id, promise]) => {
      promise.then((action) => {
        innerDispatch({ type: "OutsideAction", action });
      });
      innerDispatch({ type: "MarkPromiseDispatched", id });
    });
  }, [effRedState]);
  return [effRedState.state, outerDispatch];
}

// TODO: make more generic...
export function useSVGTextBoundingBox(
  deps: any[]
): [Ref<SVGTextElement>, DOMRect] {
  const ref = useRef<SVGTextElement>();
  const [bbox, setBBox] = useState<DOMRect>(null);
  useLayoutEffect(() => {
    if (!ref.current) {
      return;
    }
    const newBBox = ref.current.getBBox();
    if (JSON.stringify(newBBox) !== JSON.stringify(bbox)) {
      setBBox(newBBox);
    }
  }, deps);
  return [ref, bbox];
}
