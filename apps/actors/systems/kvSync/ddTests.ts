import { Msg, State } from ".";
import { parserTermToInternal } from "../../../../core/translateAST";
import { Array, Rec, StringLit } from "../../../../core/types";
import { parseRecord } from "../../../../languageWorkbench/languages/dl/parser";
import { runDDTestAtPath, TestOutput } from "../../../../util/ddTest";
import { datalogOut } from "../../../../util/ddTest/types";
import { dlToJson } from "../../../../util/json2dl";
import { Suite } from "../../../../util/testBench/testing";
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
    const actorStates: { [id: string]: State } = {
      server: initialServerState(app.mutations),
    };
    const trace: Rec[] = [];
    // TODO: parse it as a program? idk
    testCase.split("\n").forEach((line) => {
      const rawRec = parseRecord(line);
      const record = parserTermToInternal(rawRec) as Rec;
      switch (record.relation) {
        case "addClient": {
          const clientID = (record.attrs.id as StringLit).val;
          actorStates[clientID] = initialClientState(clientID, app.mutations);
          break;
        }
        case "runMutation": {
          const messageQueue: Msg[] = [
            { type: "RunMutation", name: XXX, args: XXX },
          ];

          const clientID = (record.attrs.from as StringLit).val;
          const clientState = actorStates[clientID] as ClientState;
          const actorResp = updateClient(clientState, {
            type: "messageReceived",
            from: "user",
            payload: {
              type: "RunMutation",
              name: (record.attrs.name as StringLit).val,
              args: (record.attrs.args as Array).items.map((i) => dlToJson(i)),
            },
          });
          if (actorResp.type === "continue") {
            actorStates[clientID] = actorResp.state;
            const messages = actorResp.messages;
            messages.forEach((msg) => messageQueue.push(msg));
          }
          break;
        }
      }
    });
    return datalogOut(trace);
  });
}
