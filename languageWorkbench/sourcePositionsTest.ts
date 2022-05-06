import { assertDeepEqual, Suite } from "../util/testBench/testing";
import { lineAndColFromIdx } from "./sourcePositions";

export const sourcePositionsTests: Suite = [
  {
    name: "lineAndColFromIdx",
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

      const input2 = `# basically getting everything but text
astInternal.ruleTreeNode{id: ID, parentID: PID, display: D} :-
  astInternal.ruleTreeNodeCur{id: ID, parentID: PID, display: D} |
  astInternal.ruleTreeNodeBefore{id: ID, parentID: PID, display: D} |
  astInternal.ruleTreeNodeAfter{id: ID, parentID: PID, display: D}.

astInternal.ruleTreeNodeBefore{
  id: ID,
  parentID: PID,
  display: [ID, R, [F, T]],
  seq: Seq
} :-
  astInternal.node{id: ID, parentID: PID, rule: R, span: span{from: F, to: T}} &
  ide.Cursor{idx: Idx} &
  Idx > T &
  R != "ws".
`;
      const out3 = lineAndColFromIdx(input2, 406);
      assertDeepEqual({ line: 10, col: 10 }, out3);
    },
  },
];
