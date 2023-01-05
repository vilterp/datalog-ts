import { baseFactTrace, Res } from "../../types";
import { IndexedMultiSet } from "../indexedMultiSet";
import { MessagePayload } from "../types";

export function processDistinct(
  cache: IndexedMultiSet<Res>,
  payload: MessagePayload
): MessagePayload[] {
  const data = payload.data;
  const res: Res =
    data.type === "Bindings"
      ? {
          bindings: data.bindings.bindings,
          trace: data.bindings.trace,
          term: null,
        }
      : {
          bindings: {},
          trace: baseFactTrace,
          term: data.rec,
        };
  if (cache.has(res)) {
    return [];
  }
  return [payload];
}
