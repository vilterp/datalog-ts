import { Msg, State, update } from ".";
import { parserTermToInternal } from "../../../../core/translateAST";
import { Array, Rec, StringLit } from "../../../../core/types";
import { parseRecord } from "../../../../languageWorkbench/languages/dl/parser";
import { runDDTestAtPath, TestOutput } from "../../../../util/ddTest";
import { datalogOut } from "../../../../util/ddTest/types";
import { dlToJson } from "../../../../util/json2dl";
import { Suite } from "../../../../util/testBench/testing";
import { spawnSync, stepAll } from "../../step";
import { AddressedTickInitiator, initialTrace } from "../../types";
import { ClientState, initialClientState, updateClient } from "./client";
import { bank } from "./examples/bank";
import { KVApp } from "./examples/types";
import { initialServerState } from "./server";

export function kvSyncTests(writeResults: boolean): Suite {
  return [
    {
      name: "bank",
      test() {
        runDDTestAtPath(
          "apps/actors/systems/kvSync/examples/bank.dd.txt",
          (inputs) => kvSyncTest(bank, inputs),
          writeResults
        );
      },
    },
  ];
}

function kvSyncTest(app: KVApp, testCases: string[]): TestOutput[] {
  return testCases.map((testCase) => {
    let trace = initialTrace<State>();
    // TODO: parse it as a program? idk
    testCase.split("\n").forEach((line) => {
      const rawRec = parseRecord(line);
      const record = parserTermToInternal(rawRec) as Rec;
      switch (record.relation) {
        case "addClient": {
          const clientID = (record.attrs.id as StringLit).val;
          trace = spawnSync(
            trace,
            update,
            clientID,
            initialClientState(clientID, app.mutations)
          );
          break;
        }
        case "runMutation": {
          const clientID = (record.attrs.from as StringLit).val;
          const inits: AddressedTickInitiator<State>[] = [
            {
              from: "user",
              to: clientID,
              init: {
                type: "messageReceived",
                // where the hell do I get this?
                messageID: XXX,
              },
            },
          ];
          trace = stepAll(trace, update, inits);
        }
      }
    });
    return datalogOut(
      trace.interp.evalStr("message{}?")[0].map((res) => res.term)
    );
  });
}
