import { baseFactTrace } from "../../types";
import { unify } from "../../unify";
import { MatchDesc, MessagePayload } from "../types";

export function processMatch(
  nodeDesc: MatchDesc,
  payload: MessagePayload
): MessagePayload[] {
  const data = payload.data;
  if (data.type === "Bindings") {
    throw new Error("Match nodes should not receive messages of type Bindings");
  }

  const bindings = unify({}, nodeDesc.rec, data.rec);
  if (bindings === null) {
    return [];
  }

  // Debug logging to detect mismatched attr names.
  // TODO: do this by statically analyzing the DL somehow.
  // const allVars = Object.keys(getVarToPath(nodeDesc.rec));
  // if (Object.keys(bindings).length < allVars.length) {
  //   console.warn("didn't match everything", {
  //     bindings: ppb(bindings),
  //     rec: ppt(nodeDesc.rec),
  //     input: ppt(data.rec),
  //   });
  // }

  for (let key of Object.keys(bindings)) {
    // console.log({ bindings, key });
    if (bindings[key].type === "Var") {
      return [];
    }
  }

  return [
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
  ];
}
