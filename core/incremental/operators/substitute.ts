import { Rec } from "../../types";
import { substitute } from "../../unify";
import { MessagePayload, SubstituteDesc } from "../types";

export function processSubstitute(
  nodeDesc: SubstituteDesc,
  payload: MessagePayload
): [SubstituteDesc, MessagePayload[]] {
  const data = payload.data;
  if (data.type === "Record") {
    throw new Error("Substitute nodes should not get Record messages");
  }
  const rec = substitute(nodeDesc.rec, data.bindings.bindings);
  // console.log("substitute", {
  //   inBindings: ppb(ins.res.bindings),
  //   sub: ppt(nodeDesc.rec),
  //   out: ppt(rec),
  // });
  return [
    nodeDesc,
    [
      {
        multiplicity: 1,
        data: { type: "Record", rec: rec as Rec },
      },
    ],
  ];
}
