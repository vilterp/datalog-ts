import { makeActorSystem, update } from ".";
import { IncrementalInterpreter } from "../../../../core/incremental/interpreter";
import { parserTermToInternal } from "../../../../core/translateAST";
import { Array, Rec, StringLit } from "../../../../core/types";
import { parseRecord } from "../../../../languageWorkbench/languages/dl/parser";
import { runDDTestAtPath, TestOutput } from "../../../../util/ddTest";
import { datalogOut } from "../../../../util/ddTest/types";
import { dlToJson } from "../../../../util/json2dl";
import { Suite } from "../../../../util/testBench/testing";
import { insertUserInput, spawnInitiator, step, stepAll } from "../../step";
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
  const system = makeActorSystem(app);
  return testCases.map((testCase) => {
    const interp = new IncrementalInterpreter("apps/actors", fsLoader);
    let trace = system.getInitialState(interp);
    // TODO: parse it as a program? idk
    testCase.split("\n").forEach((line) => {
      const rawRec = parseRecord(line);
      const record = parserTermToInternal(rawRec) as Rec;
      switch (record.relation) {
        case "addClient": {
          // TODO: DRY this up with reducers.ts
          const clientID = (record.attrs.id as StringLit).val;
          const { newTrace: trace2, newInits: newInits1 } = step(
            trace,
            update,
            spawnInitiator(`user${clientID}`, system.initialUserState())
          );
          const { newTrace: trace3, newInits: newInits2 } = step(
            trace2,
            update,
            spawnInitiator(`client${clientID}`, system.initialClientState)
          );
          trace = stepAll(trace3, update, [...newInits1, ...newInits2]);
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
              to: `client${clientID}`,
              init: {
                type: "messageReceived",
                messageID: newMessageID.toString(),
              },
            },
          ]);
        }
      }
    });
    return datalogOut([
      ...trace.interp.evalStr("actor{}?")[0].map((res) => res.term),
      ...trace.interp.evalStr("message{}?")[0].map((res) => res.term),
      ...trace.interp.evalStr("tick{}?")[0].map((res) => res.term),
    ]);
  });
}
