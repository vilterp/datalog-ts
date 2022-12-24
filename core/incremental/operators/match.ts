import { baseFactTrace } from "../../types";
import { unify } from "../../unify";
import { MatchDesc, MessagePayload } from "../types";

export function processMatch(
  nodeDesc: MatchDesc,
  payload: MessagePayload
): [MatchDesc, MessagePayload[]] {
  if (payload.type === "MarkDone") {
    return [nodeDesc, []];
  }
  const data = payload.data;
  if (data.type === "Bindings") {
    throw new Error("Match nodes should not receive messages of type Bindings");
  }

  const bindings = unify({}, nodeDesc.rec, data.rec);
  if (bindings === null) {
    return [nodeDesc, []];
  }
  for (let key of Object.keys(bindings)) {
    // console.log({ bindings, key });
    if (bindings[key].type === "Var") {
      return [nodeDesc, []];
    }
  }

  return [
    nodeDesc,
    [
      {
        type: "Data",
        multiplicity: 1,
        data: {
          type: "Bindings",
          bindings: {
            bindings,
            trace: {
              type: "MatchTrace",
              fact: { term: data.rec, trace: baseFactTrace, bindings: {} },
              match: nodeDesc.rec,
            },
          },
        },
      },
    ],
  ];
}
