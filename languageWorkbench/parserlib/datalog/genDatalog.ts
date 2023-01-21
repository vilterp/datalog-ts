import * as dl from "../../../core/types";
import {
  flatMap,
  flatMapObjToList,
  range,
  stringToArray,
} from "../../../util/util";
import * as gram from "../types";
import { int, Rec, rec, str, varr, or, and } from "../../../core/types";
import { SingleCharRule } from "../types";
import { unreachable } from "../../../util/unreachable";

// generate datalog rules that implement a parser for this grammar
export function grammarToDL(grammar: gram.Grammar): dl.Rec[] {
  const builder = new Builder();
  builder.addGrammar(grammar);
  return builder.records;
}

class Builder {
  nextStateID: number;
  records: Rec[];

  constructor() {
    this.nextStateID = 0;
    this.records = [];
  }

  addGrammar(grammar: gram.Grammar) {
    for (const ruleName in grammar) {
      const rule = grammar[ruleName];
      this.addRule(ruleName, rule);
    }
  }

  private addRule(name: string, rule: gram.Rule) {
    const startState = this.addState();
    const endState = this.addSegment(rule, startState);
    this.records.push(
      rec("grammar.rule", {
        name: str(name),
        from: int(startState),
        to: int(endState),
      })
    );
  }

  private addSegment(rule: gram.Rule, startState: number): number {
    switch (rule.type) {
      case "Text": {
        let curState = startState;
        for (let i = 0; i < rule.value.length; i++) {
          const char = rule.value[i];
          const nextState = this.addState();
          this.records.push(
            rec("grammar.charLiteralEdge", {
              from: int(curState),
              to: int(nextState),
              val: str(char),
            })
          );
          curState = nextState;
        }
        return curState;
      }
      case "Ref": {
        const nextState = this.addState();
        this.addRefEdge(startState, nextState, rule.rule, rule.captureName);
        return nextState;
      }
      case "Sequence": {
        let curState = startState;
        for (const item of rule.items) {
          curState = this.addSegment(item, curState);
        }
        return curState;
      }
      case "Choice": {
        const endState = this.addState();
        for (const choice of rule.choices) {
          const ruleEndState = this.addSegment(choice, startState);
          this.addJumpEdge(ruleEndState, endState);
        }
        return endState;
      }
      case "RepSep": {
        const endState = this.addSegment(rule.rep, startState);
        this.addJumpEdge(startState, endState);
        const sepEndState = this.addSegment(rule.sep, endState);
        this.addJumpEdge(sepEndState, startState);
        return endState;
      }
      case "Char": {
        return this.addSingleCharRule(rule.rule, startState);
      }
      default:
        unreachable(rule);
    }
  }

  private addSingleCharRule(rule: SingleCharRule, startState: number): number {
    const endState = this.addState();
    switch (rule.type) {
      case "AnyChar": {
        this.records.push(
          rec("grammar.anyCharEdge", {
            from: int(startState),
            to: int(endState),
          })
        );
        return endState;
      }
      case "Literal": {
        this.records.push(
          rec("grammar.charLiteralEdge", {
            from: int(startState),
            to: int(endState),
            val: str(rule.value),
          })
        );
        return endState;
      }
      case "Not": {
        const ruleEnd = this.addSingleCharRule(rule.rule, startState);
        this.records.push(
          rec("grammar.negateEdge", { from: int(ruleEnd), to: int(endState) })
        );
        return endState;
      }
      case "Range": {
        this.records.push(
          rec("grammar.charRangeEdge", {
            from: int(startState),
            to: int(endState),
            rangeStart: str(rule.from),
            rangeEnd: str(rule.to),
          })
        );
        return endState;
      }
    }
  }

  private addRefEdge(
    from: number,
    to: number,
    rule: string,
    captureName: string | null
  ) {
    const attrs: { [name: string]: dl.Term } = {
      from: int(from),
      to: int(to),
      ref: str(rule),
    };
    if (captureName !== null) {
      attrs.captureName = str(captureName);
    }
    this.records.push(rec("grammar.refEdge", attrs));
  }

  private addJumpEdge(from: number, to: number) {
    this.records.push(
      rec("grammar.jumpEdge", {
        from: int(from),
        to: int(to),
      })
    );
  }

  private addState(): number {
    const newID = this.nextStateID;
    this.nextStateID++;
    this.records.push(rec("grammar.stateNode", { id: int(newID) }));
    return newID;
  }
}

export function inputToDL(input: string): Rec[] {
  return [
    ...stringToArray(input)
      .map((char, idx) => rec("input.char", { char: str(char), id: int(idx) }))
      .concat(
        range(input.length - 1).map((idx) =>
          rec("input.next", { from: int(idx), to: int(idx + 1) })
        )
      ),
    rec("input.char", { char: str("START"), id: int(-1) }),
    rec("input.char", { char: str("END"), id: int(-2) }),
    rec("input.next", { from: int(-1), to: int(0) }),
    rec("input.next", { from: int(input.length - 1), to: int(-2) }),
  ];
}
