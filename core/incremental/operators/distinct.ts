import { clamp } from "../../../util/util";
import { DistinctDesc, MessagePayload } from "../types";

export function processDistinct(
  desc: DistinctDesc,
  payload: MessagePayload
): [DistinctDesc, MessagePayload[]] {
  const data = payload.data;
  if (data.type === "Record") {
    throw new Error("distinct nodes shouldn't get Record messages");
  }
  const newDesc: DistinctDesc = {
    ...desc,
    state: desc.state.update(data.bindings.bindings, payload.multiplicity),
  };
  const curMult = desc.state.get(data.bindings.bindings);
  const newMult = curMult + payload.multiplicity;
  const multDiff =
    curMult < 1 && newMult >= 1 ? 1 : curMult >= 1 && newMult < 1 ? -1 : 0;
  return [newDesc, [{ ...payload, multiplicity: multDiff }]];
}
