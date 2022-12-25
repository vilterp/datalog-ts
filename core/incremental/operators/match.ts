import { baseFactTrace } from "../../types";
import { unify } from "../../unify";
import { MatchDesc, MessagePayload } from "../types";

export function processMatch(
  nodeDesc: MatchDesc,
  payload: MessagePayload
): [MatchDesc, MessagePayload[]] {
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
        multiplicity: payload.multiplicity,
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
