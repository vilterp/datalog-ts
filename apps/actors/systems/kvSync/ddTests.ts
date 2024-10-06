import { KVSyncMsg, KVSyncState, makeActorSystem, update } from ".";
import { parserTermToInternal } from "../../../../core/translateAST";
import { Array, Int, Rec, StringLit } from "../../../../core/types";
import { parseRecord } from "../../../../languageWorkbench/languages/dl/parser";
import { runDDTestAtPath, TestOutput } from "../../../../util/ddTest";
import { datalogOut, jsonOut } from "../../../../util/ddTest/types";
import { dlToJson } from "../../../../util/json2dl";
import { Suite } from "../../../../util/testBench/testing";
import { insertUserInput, spawnInitiator, step, stepAll } from "../../step";
import { bank } from "./examples/bank";
import { KVApp } from "./examples/types";
import { UserInput } from "./types";
import { fsLoader } from "../../../../core/fsLoader";
import { SimpleInterpreter } from "../../../../core/simple/interpreter";
import { ParseErrors } from "../../../../languageWorkbench/parserlib/types";
import {
  LoadedTickInitiator,
  System,
  SystemState,
  Trace,
  UpdateFn,
} from "../../types";
import { explore } from "../../explore";
import { mapObj } from "../../../../util/util";

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

  const doUpdate: UpdateFn<KVSyncState, KVSyncMsg> = (
    state: KVSyncState,
    init: LoadedTickInitiator<KVSyncState, KVSyncMsg>
  ) => {
    return update(app.mutations, state, init);
  };

  return testCases.map((testCase) => {
    const interp = new SimpleInterpreter("apps/actors", fsLoader);
    let systemState: SystemState<KVSyncState> = {
      trace: system.getInitialState(interp),
      clientIDs: [],
      nextClientID: 0,
    };
    // TODO: parse it as a program? idk
    const lines = testCase.split("\n");
    const query = lines[lines.length - 1];
    const actions = lines.slice(0, lines.length - 1);
    actions.forEach((line) => {
      // TODO: DRY up with reducers?

      // slice off the `.`
      const [rawRec, errors] = parseRecord(line.slice(0, line.length - 1));
      if (errors.length > 0) {
        throw new ParseErrors(errors);
      }
      const record = parserTermToInternal(rawRec) as Rec;
      systemState = reducer(doUpdate, system, systemState, record);
    });
    if (query === ".jsonState") {
      return jsonOut(justStates(systemState));
    }
    return datalogOut(
      systemState.trace.interp.queryStr(query).map((res) => res.term)
    );
  });
}

function justStates(state: SystemState<KVSyncState>) {
  return mapObj(state.trace.latestStates, (k, v) => {
    switch (v.type) {
      case "ClientState":
        return v.data;
      case "ServerState":
        return v.data;
      case "UserState":
        return {};
    }
  });
}

function reducer(
  doUpdate: UpdateFn<KVSyncState, KVSyncMsg>,
  system: System<KVSyncState, KVSyncMsg>,
  systemState: SystemState<KVSyncState>,
  record: Rec
): SystemState<KVSyncState> {
  switch (record.relation) {
    case "signUp": {
      const clientID = (record.attrs.clientID as StringLit).val;
      const msg: UserInput = {
        type: "Signup",
        username: (record.attrs.username as StringLit).val,
        password: (record.attrs.password as StringLit).val,
      };
      const newTrace = stepUserInput(
        doUpdate,
        systemState.trace,
        clientID,
        msg
      );
      return {
        ...systemState,
        trace: newTrace,
      };
    }
    case "logIn": {
      const clientID = (record.attrs.clientID as StringLit).val;
      const msg: UserInput = {
        type: "Login",
        username: (record.attrs.username as StringLit).val,
        password: (record.attrs.password as StringLit).val,
      };
      const newTrace = stepUserInput(
        doUpdate,
        systemState.trace,
        clientID,
        msg
      );
      return {
        ...systemState,
        trace: newTrace,
      };
    }
    case "addClient": {
      // TODO: DRY this up with reducers.ts
      const clientID = (record.attrs.id as StringLit).val;
      const { newTrace: trace2, newInits: newInits1 } = step(
        systemState.trace,
        doUpdate,
        spawnInitiator(`user${clientID}`, system.initialUserState)
      );
      const { newTrace: trace3, newInits: newInits2 } = step(
        trace2,
        doUpdate,
        spawnInitiator(`client${clientID}`, system.initialClientState(clientID))
      );
      const trace4 = stepAll(trace3, doUpdate, [...newInits1, ...newInits2]);
      return {
        clientIDs: [...systemState.clientIDs, clientID],
        nextClientID: 0, // not using this
        trace: trace4,
      };
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
      const newTrace = stepUserInput(
        doUpdate,
        systemState.trace,
        clientID,
        msg
      );
      return {
        ...systemState,
        trace: newTrace,
      };
    }
    case "explore": {
      const steps = (record.attrs.steps as Int).val;
      const seed = (record.attrs.seed as Int).val;
      const frame = explore(system, systemState, steps, seed);
      return frame.state;
    }
  }
}

function stepUserInput(
  doUpdate: UpdateFn<KVSyncState, KVSyncMsg>,
  trace: Trace<KVSyncState>,
  clientID: string,
  msg: UserInput
): Trace<KVSyncState> {
  const { newTrace: trace1, newMessageID } = insertUserInput(
    trace,
    clientID,
    msg
  );

  return stepAll(trace1, doUpdate, [
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
