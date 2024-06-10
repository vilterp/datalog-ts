import { KVSyncState, makeActorSystem, update } from ".";
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
import { SimpleInterpreter } from "../../../../core/simple/interpreter";
import { ParseErrors } from "../../../../languageWorkbench/parserlib/types";
import { Trace } from "../../types";

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
    const interp = new SimpleInterpreter("apps/actors", fsLoader);
    let trace = system.getInitialState(interp);
    // TODO: parse it as a program? idk
    const lines = testCase.split("\n");
    const query = lines[lines.length - 1];
    const actions = lines.slice(0, lines.length - 1);
    actions.forEach((line) => {
      // slice off the `.`
      const [rawRec, errors] = parseRecord(line.slice(0, line.length - 1));
      if (errors.length > 0) {
        throw new ParseErrors(errors);
      }
      const record = parserTermToInternal(rawRec) as Rec;
      switch (record.relation) {
        case "signUp": {
          const clientID = (record.attrs.clientID as StringLit).val;
          const msg: UserInput = {
            type: "Signup",
            username: (record.attrs.username as StringLit).val,
            password: (record.attrs.password as StringLit).val,
          };
          trace = stepUserInput(trace, clientID, msg);
          break;
        }
        case "logIn": {
          const clientID = (record.attrs.clientID as StringLit).val;
          const msg: UserInput = {
            type: "Login",
            username: (record.attrs.username as StringLit).val,
            password: (record.attrs.password as StringLit).val,
          };
          trace = stepUserInput(trace, clientID, msg);
          break;
        }
        case "addClient": {
          // TODO: DRY this up with reducers.ts
          const clientID = (record.attrs.id as StringLit).val;
          const { newTrace: trace2, newInits: newInits1 } = step(
            trace,
            update,
            spawnInitiator(`user${clientID}`, system.initialUserState)
          );
          const { newTrace: trace3, newInits: newInits2 } = step(
            trace2,
            update,
            spawnInitiator(
              `client${clientID}`,
              system.initialClientState(clientID)
            )
          );
          trace = stepAll(trace3, update, [...newInits1, ...newInits2]);
          break;
        }
        case "runMutation": {
          const clientID = (record.attrs.from as StringLit).val;
          const msg: UserInput = {
            type: "RunMutation",
            invocation: {
              type: "Invocation",
              name: (record.attrs.name as StringLit).val,
              args: (record.attrs.args as Array).items.map((i) => dlToJson(i)),
            },
          };
          trace = stepUserInput(trace, clientID, msg);
          break;
        }
      }
    });
    return datalogOut(trace.interp.queryStr(query).map((res) => res.term));
  });
}

function stepUserInput(
  trace: Trace<KVSyncState>,
  clientID: string,
  msg: UserInput
): Trace<KVSyncState> {
  const { newTrace: trace1, newMessageID } = insertUserInput(
    trace,
    clientID,
    msg
  );
  return stepAll(trace1, update, [
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
