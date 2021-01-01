import { Interpreter, Output } from "../../incremental/interpreter";
import { nullLoader } from "../../loaders";
import { parseGrammar } from "../meta";
import { grammarToDL } from "../genDatalog";
import { int, rec, str } from "../../types";
import { ppr } from "../../incremental/pretty";

const grammarText = `main :- (foo | barBaz).
foo :- "foo".
barBaz :- ["bar", "baz"].`;

const grammarParsed = parseGrammar(grammarText);
const gramamrRules = grammarToDL(grammarParsed);

const interp = new Interpreter(nullLoader);
interp.evalStr(".table source");
interp.evalStr(".table next");

for (let rule of gramamrRules) {
  interp.processStmt({ type: "Rule", rule });
}

let nextID = 0;
const positionToID = [];

document.getElementById("input").addEventListener("change", (evt) => {
  console.log("evt", evt);

  const insertedChar = "a"; // TODO: ???
  const insertedIdx = 0; // TODO: ???

  // TODO: maybe use linked list to avoid linear operation here
  const newID = nextID;
  nextID++;
  positionToID.splice(insertedIdx, 1, newID);

  handleEmissions(
    interp.processStmt({
      type: "Insert",
      record: rec("source", { id: int(newID), char: str(insertedChar) }),
    })
  );
  if (insertedIdx > 0) {
    handleEmissions(
      interp.processStmt({
        type: "Insert",
        record: rec("next", {
          left: int(positionToID[insertedIdx - 1]),
          right: int(newID),
        }),
      })
    );
  }
  if (insertedIdx < positionToID.length) {
    // TODO: ???
    handleEmissions(
      interp.processStmt({
        type: "Insert",
        record: rec("next", {
          left: int(newID),
          right: str(positionToID[insertedIdx + 1]),
        }),
      })
    );
  }
  // TODO: retractions
});

const log = document.getElementById("log");

function handleEmissions(output: Output) {
  switch (output.type) {
    case "PropagationLog":
      for (let batch of output.log) {
        const newItem = document.createElement("li");
        const label = document.createTextNode(batch.output.map(ppr).join(", "));
        newItem.appendChild(label);
        log.appendChild(newItem);
      }
  }
}
