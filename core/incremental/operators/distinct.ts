import { clamp } from "../../../util/util";
import { baseFactTrace, Res } from "../../types";
import { IndexedMultiSet } from "../indexedMultiSet";
import { MessagePayload } from "../types";

export function processDistinct(
  cache: IndexedMultiSet<Res>,
  payload: MessagePayload
): MessagePayload[] {
  const data = payload.data;
  // TODO: dedup this with building of Res in updateNodeCache
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
  const curMult = cache.get(res);
  const newMult = clamp(curMult + payload.multiplicity, [0, 1]);
  const multDiff = newMult - curMult;
  return [{ ...payload, multiplicity: multDiff }];
}
