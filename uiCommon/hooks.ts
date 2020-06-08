import useLocalStorage from "react-use-localstorage";

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
