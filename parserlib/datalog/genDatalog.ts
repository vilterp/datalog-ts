import { objToPairs, range, stringToArray } from "../../util/util";
import * as gram from "../grammar";
import { int, Rec, rec, str } from "../../core/types";

type GeneratorState = {
  nextID: number;
  records: Rec[];
};

// generate datalog rules that implement a parser for this grammar
export function grammarToDL(grammar: gram.Grammar): Rec[] {
  const state: GeneratorState = {
    nextID: 0,
    records: [],
  };
  objToPairs(grammar).forEach(([ruleName, gramRule]) => {
    ruleToDL(state, ruleName, gramRule);
  });
  return state.records;
}

// TODO: write these as strings, or at least make helper functions.
//   building the raw AST is so verbose.
function ruleToDL(
  state: GeneratorState,
  name: string,
  rule: gram.Rule
): { startID: number; endID: number } {
  const startID = pushNode(state);
  const endID = pushNode(state);
  pushRuleMarker(state, name, startID, endID);
  switch (rule.type) {
    case "Text": {
      let curID = startID;
      stringToArray(rule.value).forEach((char) => {
        const newID = pushNode(state);
        pushEdge(state, curID, newID, char);
        curID = newID;
      });
      pushUnlabeledEdge(state, curID, endID);
      return { startID, endID };
    }
    case "Choice": {
      rule.choices.forEach((rule, idx) => {
        const { startID: choiceStartID, endID: choiceEndID } = ruleToDL(
          state,
          choiceName(name, idx),
          rule
        );
        pushUnlabeledEdge(state, startID, choiceStartID);
        pushUnlabeledEdge(state, choiceEndID, endID);
      });
      return { startID, endID };
    }
    case "Sequence": {
      let curID = startID;
      rule.items.forEach((item, idx) => {
        const { startID: itemStartID, endID: itemEndID } = ruleToDL(
          state,
          seqItemName(name, idx),
          item
        );
        pushUnlabeledEdge(state, curID, itemStartID);
        curID = itemEndID;
      });
      pushUnlabeledEdge(state, curID, endID);
      return { startID, endID };
    }
    case "Ref": {
      // TODO: this one seems a bit unnecessary...
      //   these should be collapsed out somehow
      pushRefEdge(state, startID, endID, rule.name);
      return { startID, endID };
    }
    case "Char": {
      if (rule.rule.type === "Range") {
        pushCharRangeEdge(state, startID, endID, rule.rule.from, rule.rule.to);
      } else {
        throw new Error("TODO: other types of char rule");
      }
      return { startID, endID };
    }
    case "RepSep": {
      const { startID: repStartID, endID: repEndID } = ruleToDL(
        state,
        `${name}_rep`,
        rule.rep
      );
      const { startID: sepStartID, endID: sepEndID } = ruleToDL(
        state,
        `${name}_rep`,
        rule.sep
      );
      // rep
      pushUnlabeledEdge(state, startID, repStartID);
      pushUnlabeledEdge(state, repEndID, endID);
      // sep
      pushUnlabeledEdge(state, endID, sepStartID);
      pushUnlabeledEdge(state, sepEndID, startID);
      // not matching either rep or sep is also valid path
      pushUnlabeledEdge(state, startID, endID);
      return { startID, endID };
    }
  }
}

function seqItemName(name: string, idx: number): string {
  return `${name}_seq_${idx}`;
}

function choiceName(name: string, idx: number): string {
  return `${name}_choice_${idx}`;
}

function pushNode(state: GeneratorState): number {
  const id = state.nextID;
  state.nextID++;
  state.records.push(rec("grammar.node", { id: int(id) }));
  return id;
}

function pushRefEdge(
  state: GeneratorState,
  fromID: number,
  toID: number,
  ruleName: string
) {
  state.records.push(
    rec("grammar.refEdge", {
      fromID: int(fromID),
      toID: int(toID),
      ruleName: str(ruleName),
    })
  );
}

function pushRuleMarker(
  state: GeneratorState,
  ruleName: string,
  startID: number,
  endID: number
) {
  state.records.push(
    rec("grammar.ruleMarker", {
      name: str(ruleName),
      startID: int(startID),
      endID: int(endID),
    })
  );
}

function pushEdge(
  state: GeneratorState,
  from: number,
  to: number,
  label: string
) {
  state.records.push(
    rec("grammar.edge", {
      from: int(from),
      to: int(to),
      label: str(label),
    })
  );
}

function pushCharRangeEdge(
  state: GeneratorState,
  from: number,
  to: number,
  fromChar: string,
  toChar: string
) {
  state.records.push(
    rec("grammar.edge", {
      from: int(from),
      to: int(to),
      fromChar: str(fromChar),
      toChar: str(toChar),
    })
  );
}

function pushUnlabeledEdge(state: GeneratorState, from: number, to: number) {
  state.records.push(
    rec("grammar.unlabeledEdge", {
      from: int(from),
      to: int(to),
    })
  );
}

export function inputToDL(input: string): Rec[] {
  return stringToArray(input)
    .map((char, idx) => rec("input.char", { char: str(char), id: int(idx) }))
    .concat(
      range(input.length - 1).map((idx) =>
        rec("input.next", { left: int(idx), right: int(idx + 1) })
      )
    );
}
