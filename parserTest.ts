import { assertDeepEqual, Suite } from "./util/testing";
import { language } from "./parser";
import { Parser } from "parsimmon";
import { array, binExpr, int, rec, str, trueTerm, varr } from "./types";
import * as assert from "assert";

export const parserTests: Suite = [
  {
    name: "var",
    test() {
      testParser(language.var, `A`, varr("A"));
    },
  },
  {
    name: "varTerm",
    test() {
      testParser(language.term, `A`, varr("A"));
    },
  },
  {
    name: "stringLit",
    test() {
      testParser(language.stringLit, `"hello world"`, str("hello world"));
    },
  },
  {
    name: "intLit",
    test() {
      testParser(language.intLit, `2`, int(2));
      testParser(language.intLit, `-2`, int(-2));
    },
  },
  {
    name: "array",
    test() {
      testParser(
        language.term,
        `["foo", Bar, 2, true]`,
        array([str("foo"), varr("Bar"), int(2), trueTerm])
      );
    },
  },
  {
    name: "record",
    test() {
      testParser(
        language.record,
        `foo{bar: B, baz: "bloop"}`,
        rec("foo", { bar: varr("B"), baz: str("bloop") })
      );
    },
  },
  {
    name: "binExpr",
    test() {
      testParser(
        language.binExpr,
        `A != B`,
        binExpr(varr("A"), "!=", varr("B"))
      );
    },
  },
  {
    name: "statement",
    test() {
      testParser(language.statement, `father{child: "Pete", father: "Paul"}.`, {
        type: "Insert",
        record: rec("father", { child: str("Pete"), father: str("Paul") }),
      });
      testParser(
        language.statement,
        `parent{child: C, parent: P} :- mother{child: C, mother: P} | father{child: C, father: P}.`,
        {
          type: "Rule",
          rule: {
            head: rec("parent", { child: varr("C"), parent: varr("P") }),
            defn: {
              type: "Or",
              opts: [
                {
                  type: "And",
                  clauses: [
                    rec("mother", { child: varr("C"), mother: varr("P") }),
                  ],
                },
                {
                  type: "And",
                  clauses: [
                    rec("father", { child: varr("C"), father: varr("P") }),
                  ],
                },
              ],
            },
          },
        }
      );
      testParser(
        language.statement,
        `grandfather{grandchild: A, grandfather: C} :-
                  parent{child: A, parent: B} &
                  father{child: B, father: C}.`,
        {
          type: "Rule",
          rule: {
            head: rec("grandfather", {
              grandchild: varr("A"),
              grandfather: varr("C"),
            }),
            defn: {
              type: "Or",
              opts: [
                {
                  type: "And",
                  clauses: [
                    rec("parent", { child: varr("A"), parent: varr("B") }),
                    rec("father", { child: varr("B"), father: varr("C") }),
                  ],
                },
              ],
            },
          },
        }
      );
    },
  },
  {
    name: "program",
    test() {
      const input = `
father{child: "Pete", father: "Paul"}.
father{child: "Paul", father: "Peter"}.
father{child: "Ann", father: "Peter"}.
father{child: "Mary", father: "Mark"}.
mother{child: "Pete", mother: "Mary"}.
mother{child: "Paul", mother: "Judith"}.
mother{child: "Ann", mother: "Judith"}.
mother{child: "Bob", mother: "Ann"}.
mother{child: "Mary", mother: "Carolyn K"}.
cousin{left: L, right: R} :- 
  parent{child: L, mother: P1} &
  sibling{left: P1, right: P2} &
  parent{child: R, parent: P2}.
grandfather{grandchild: A, grandfather: C} :- 
  parent{child: A, parent: B} &
  father{child: B, father: C}.
grandmother{grandchild: A, grandmother: C} :- 
  child{child: A, parent: B} &
  mother{child: B, mother: C}.
grandparent{grandchild: A, grandparent: C} :- 
  parent{child: A, parent: B} &
  parent{child: B, parent: C}.
parent{child: C, parent: P} :- mother{child: C, mother: P} | father{child: C, father: P}.
sibling{left: L, right: R} :- 
  mother{child: L, mother: M} &
  father{child: L, father: F} &
  mother{child: R, mother: M} &
  father{child: R, father: F}.
`;
      const output = language.program.tryParse(input);
      assert.equal(output.length, 15);
    },
  },
  {
    name: "newline-record",
    test() {
      const input = `msg{
  from: "B1", to: "S",
  time: 1,
  payload: login{
    username: "vilterp@example.com", password: "password"
  }
}.`;
      // just asserting that there isn't a parse error
      language.statement.tryParse(input);
      // TODO: rewrite these as data driven tests
    },
  },
];

function testParser(
  rule: Parser<any>,
  input: string,
  expectedOutput: any,
  msg?: string
) {
  const output = rule.tryParse(input);
  assertDeepEqual(expectedOutput, output, msg);
}
