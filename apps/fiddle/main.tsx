import React, { useReducer } from "react";
import ReactDOM from "react-dom";
import { nullLoader } from "../../core/loaders";
// @ts-ignore
import familyRulesDL from "../../core/testdata/family_rules.dl";
// @ts-ignore
import familyFactsDL from "../../core/testdata/family_facts.dl";
import { Explorer } from "../../uiCommon/explorer";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { CollapsibleWithHeading } from "../../uiCommon/generic/collapsible";
import { Statement } from "../../core/types";

function getInitInterp(): AbstractInterpreter {
  const initInterp = new SimpleInterpreter(".", nullLoader);
  return initInterp.evalStr(familyRulesDL + familyFactsDL)[1];
}

function Main() {
  // TODO: persist to local storage
  const [interp, dispatchStatements] = useReducer(
    runStmtReducer,
    getInitInterp()
  );

  return (
    <div>
      <h1>Datalog Fiddle</h1>
      <CollapsibleWithHeading
        heading="Explore"
        content={
          <Explorer
            interp={interp}
            runStatements={dispatchStatements}
            showViz
          />
        }
      />
    </div>
  );
}

function runStmtReducer(
  interp: AbstractInterpreter,
  statements: Statement[]
): AbstractInterpreter {
  return interp.evalRawStmts(statements)[1];
}

ReactDOM.render(<Main />, document.getElementById("main"));
