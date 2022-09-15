import React from "react";
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
import { useInMemoryDB } from "../../uiCommon/dl/hooks";

function getInitInterp(): AbstractInterpreter {
  const initInterp = new SimpleInterpreter(".", nullLoader);
  return initInterp.evalStr(familyRulesDL + familyFactsDL)[1];
}

function Main() {
  const [interp, dispatchStatements] = useInMemoryDB(getInitInterp());

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

ReactDOM.render(<Main />, document.getElementById("main"));
