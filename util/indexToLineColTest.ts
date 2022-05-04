import { lineAndColFromIdx } from "./indexToLineCol";
import { assertDeepEqual, Suite } from "./testBench/testing";

export const indexToLineColTests: Suite = [
  {
    name: "indexToLineCol",
    test() {
      const input = `.table ast.string
.table ast.ident
.table ast.var
.table ast.int

hl.Segment{type: T, span: S, highlight: HH} :-
  hl.ident{type: T, span: S, highlight: H} |
  ???{type: T, span: S, highlight: H} |
  hl.int{???: T, span: S, highlight: H} |
  hl.string{type: T, span: S, highlight: ???}.

hl.ident{type: "ident", span: S, highlight: false} :-
  ast.ident{span: S}.
hl.var{type: "var", span: S, highlight: false} :-
  ast.var{span: S}.
hl.int{type: "int", span: S, highlight: false} :-
  ast.int{span: S}.
hl.string{type: "string", span: S, highlight: false} :-
  ast.string{span: S}.`;
      const out1 = lineAndColFromIdx(input, 106);
      assertDeepEqual({ line: 5, col: 40 }, out1);

      const out2 = lineAndColFromIdx(input, 108);
      assertDeepEqual({ line: 5, col: 42 }, out2);
    },
  },
];
