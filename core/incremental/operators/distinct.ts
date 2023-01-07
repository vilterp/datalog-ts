import { DistinctDesc, MessagePayload } from "../types";

export function processDistinct(
  desc: DistinctDesc,
  payload: MessagePayload
): [DistinctDesc, MessagePayload[]] {
  const data = payload.data;
  if (data.type === "Record") {
    throw new Error("distinct nodes shouldn't get Record messages");
  }
  const curMult = desc.state.get(data.bindings.bindings);
  const newMult = curMult + payload.multiplicity;
  const multDiff =
    curMult < 1 && newMult >= 1 ? 1 : curMult >= 1 && newMult < 1 ? -1 : 0;
  // TODO: this is confusing because desc.state is the same object
  const newDesc: DistinctDesc = {
    ...desc,
    state: desc.state.update(data.bindings.bindings, payload.multiplicity),
  };
  return [newDesc, [{ ...payload, multiplicity: multDiff }]];
}
