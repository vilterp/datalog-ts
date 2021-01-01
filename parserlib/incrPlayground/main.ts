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

const inputBox = document.getElementById("input");
inputBox.focus();

inputBox.addEventListener("input", (evt) => {
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
  if (insertedIdx <= positionToID.length) {
    // TODO: ???
    handleEmissions(
      interp.processStmt({
        type: "Insert",
        record: rec("next", {
          left: int(newID),
          right: int(positionToID[insertedIdx + 1]),
        }),
      })
    );
  }
  // TODO: retractions
});

const log = document.getElementById("log");

function handleEmissions(output: Output) {
  console.log("output", output);
  switch (output.type) {
    case "PropagationLog":
      for (let batch of output.log) {
        const newInsertion = document.createElement("li");
        const insertionLabel = document.createTextNode(
          `${batch.insertion.origin} -> ${batch.insertion.destination}: ${ppr(
            batch.insertion.res
          )}`
        );
        newInsertion.appendChild(insertionLabel);
        const outputs = document.createElement("ul");
        for (let item of batch.output) {
          const label = document.createTextNode(ppr(item));
          const itemLi = document.createElement("li");
          itemLi.appendChild(label);
          newInsertion.appendChild(outputs);
        }
        log.appendChild(newInsertion);
      }
  }
}
