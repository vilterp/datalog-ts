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
  const newMult = clamp(curMult + payload.multiplicity, [0, 1]);
  const multDiff = newMult - curMult;
  if (newMult === 0) {
    console.log("set to 0");
  }
  return [newDesc, [{ ...payload, multiplicity: multDiff }]];
}
