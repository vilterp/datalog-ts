import { DistinctDesc, MessagePayload } from "../types";

export function processDistinct(
  desc: DistinctDesc,
  payload: MessagePayload
): MessagePayload[] {
  const data = payload.data;
  if (data.type === "Record") {
    throw new Error("distinct nodes shouldn't get Record messages");
  }
  const curMult = desc.state.get(data.bindings.bindings);
  const newMult = curMult + payload.multiplicity;
  const multDiff =
    curMult < 1 && newMult >= 1 ? 1 : curMult >= 1 && newMult < 1 ? -1 : 0;
  desc.state.update(data.bindings.bindings, payload.multiplicity);
  return [{ ...payload, multiplicity: multDiff }];
}

function getMultDiff(curMult: number, newMult: number): number {
  if (curMult < 1 && newMult >= 1) {
    return 1;
  }
  if (curMult >= 1 && newMult < 1) {
    return -1;
  }
  return 0;
}
