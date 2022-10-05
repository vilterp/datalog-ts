import { State, update } from ".";
import { IncrementalInterpreter } from "../../../../core/incremental/interpreter";
import { makeMemoryLoader } from "../../../../core/loaders";
import { parserTermToInternal } from "../../../../core/translateAST";
import { Array, Rec, StringLit } from "../../../../core/types";
import { parseRecord } from "../../../../languageWorkbench/languages/dl/parser";
import { runDDTestAtPath, TestOutput } from "../../../../util/ddTest";
import { datalogOut } from "../../../../util/ddTest/types";
import { dlToJson } from "../../../../util/json2dl";
import { Suite } from "../../../../util/testBench/testing";
import { insertUserInput, spawnSync, stepAll } from "../../step";
import { initialTrace } from "../../types";
import { initialClientState } from "./client";
import { bank } from "./examples/bank";
import { KVApp } from "./examples/types";
import { UserInput } from "./types";
import { fsLoader } from "../../../../core/fsLoader";

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
    const interp = new IncrementalInterpreter("apps/actors", fsLoader);
    let trace = initialTrace<State>(interp);
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
          const msg: UserInput = {
            type: "RunMutation",
            name: (record.attrs.name as StringLit).val,
            args: (record.attrs.args as Array).items.map((i) => dlToJson(i)),
          };
          const { newTrace: trace1, newMessageID } = insertUserInput(
            trace,
            clientID,
            msg
          );
          trace = stepAll(trace1, update, [
            {
              from: `user${clientID}`,
              to: clientID,
              init: {
                type: "messageReceived",
                messageID: newMessageID.toString(),
              },
            },
          ]);
        }
      }
    });
    return datalogOut(
      trace.interp.evalStr("message{}?")[0].map((res) => res.term)
    );
  });
}
