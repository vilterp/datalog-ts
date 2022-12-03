import {
  BenchmarkResult,
  BenchmarkSpec,
  doBenchmark,
  runDDBenchmark,
} from "../util/testBench/benchmark";
import { testLangQuery } from "./ddTests";
import { getCompletionItems, getSemanticTokens } from "./languages/dl/dl";
import * as parserlib from "./parserlib/parser";
import { GRAMMAR, parseMain } from "./languages/dl/parser";
import { extractRuleTree } from "./parserlib/ruleTree";
import { flattenByRule } from "./parserlib/flattenByRule";

export const lwbBenchmarks: BenchmarkSpec[] = [
  { lang: "fp", reps: 10 },
  { lang: "dl", reps: 10 },
].map(({ lang, reps }) => ({
  name: lang,
  async run() {
    return runDDBenchmark(
      `languageWorkbench/languages/${lang}/${lang}.dd.txt`,
      testLangQuery,
      reps
    );
  },
}));

export const nativeDLBenchmarks: BenchmarkSpec[] = [
  {
    name: "getCompletions",
    async run() {
      return doBenchmark(10000, testDLCompletions);
    },
  },
  {
    name: "getSemanticTokens",
    async run() {
      return doBenchmark(10000, testGetSemanticTokens);
    },
  },
  {
    name: "flattenByRule",
    async run() {
      return doBenchmark(1000, testFlattenByRule);
    },
  },
];

// native DL benchmark

const DLSample = `
scope.Defn{scopeID: I, name: N, type: T, span: S} :-
  scope.builtin{id: I, name: N, type: T, location: S} |
  scope.let{id: I, name: N, type: T, location: S} |
  scope.lambda{id: I, name: N, type: T, location: S}.
scope.builtin{id: I, name: N, type: T, location: "builtin"} :-
  ast.RootExpr{id: I} &
  lang.Builtin{name: N, type: T}.
scope.let{id: I, name: N, type: T, location: S} :-
  ast.letBodyExpr{letID: L, bodyID: I} &
  ast.letBindingExpr{letID: L, bindingID: B} &
  ast.letVar{letID: L, name: N, span: S} &
  tc.Type{id: B, type: T}.
scope.lambda{id: I, name: N, type: T, location: L} :-
  ast.lambda{body: I, id: LID} &
  ast.lambdaParam{lambdaID: LID, name: N, ty: T, location: L}.
scope.Var{scopeID: I, name: N, span: S} :-
  ast.expr{id: I} &
  ast.varExpr{parentID: I, text: N, span: S} |
  ast.expr{id: I} &
  ast.funcCall{id: FuncCallID, parentID: I} &
  ast.varExpr{parentID: FuncCallID, text: N, span: S}.
scope.Scope{id: I, label: I} :-
  ast.expr{id: I}.
scope.Placeholder{scopeID: I, span: S} :-
  ast.expr{id: I} &
  ast.placeholder{parentID: I, span: S}.
scope.Parent{childID: I, parentID: P} :-
  ast.letExpr{id: L, parentID: P} &
  ast.letBindingExpr{letID: L, bindingID: I} |
  ast.letExpr{id: L, parentID: P} &
  ast.letBodyExpr{letID: L, bodyID: I} |
  ast.funcCall{id: C, parentID: P} &
  ast.funcCallArg{callID: C, argID: I} |
  ast.funcCall{id: C, parentID: P} &
  ast.funcCallFunc{callID: C, funcID: I}.
  # ast.lambda{body: I, id: P}.
ast.letBindingExpr{letID: L, bindingID: D} :-
  ast.letExpr{id: L} &
  ast.inKW{id: IN, parentID: L} &
  astInternal.next{prev: WS, next: IN} &
  astInternal.next{prev: D, next: WS}.
ast.letBodyExpr{letID: L, bodyID: I} :-
  ast.letExpr{id: L} &
  ast.inKW{id: IN, parentID: L} &
  astInternal.next{prev: IN, next: WS} &
  astInternal.next{prev: WS, next: I}.
ast.letVar{letID: L, name: N, span: S} :-
  ast.letExpr{id: L} &
  ast.ident{parentID: L, text: N, span: S}.
ast.funcCallArg{callID: C, argID: I} :-
  ast.funcCall{id: C} &
  ast.expr{parentID: C, id: I}.
ast.funcCallFunc{callID: C, funcID: F} :-
  ast.funcCall{id: C} &
  ast.varExpr{id: F, parentID: C}.
tc.Type{id: I, type: T} :-
  tc.typeS{id: I, type: T} |
  tc.typeI{id: I, type: T} |
  tc.typeLambda{id: I, type: T} |
  tc.typeFC{id: I, type: T} |
  tc.typeLet{id: I, type: T} |
  tc.typeVar{id: I, type: T} |
  tc.typePlaceholder{id: I, type: T}.
tc.typeS{id: I, type: "string"} :-
  ast.expr{id: I} &
  ast.stringLit{parentID: I}.
tc.typeI{id: I, type: "int"} :-
  ast.expr{id: I} &
  ast.intLit{parentID: I}.
tc.typeFC{id: I, type: T} :-
  ast.expr{id: I} &
  ast.funcCall{parentID: I, id: FC} &
  ast.funcCallArg{callID: FC, argID: AID} &
  ast.funcCallFunc{callID: FC, funcID: FID} &
  ast.varExpr{id: FID, text: N} &
  scope.Item{scopeID: FID, name: N, type: tapp{from: F, to: T}} &
  tc.Type{id: AID, type: F}.
tc.typeLet{id: I, type: T} :-
  ast.expr{id: I} &
  ast.letExpr{id: L, parentID: I} &
  ast.letBodyExpr{letID: L, bodyID: BID} &
  tc.Type{id: BID, type: T}.
tc.typeVar{id: I, type: T} :-
  ast.expr{id: I} &
  ast.varExpr{id: V, parentID: I, text: N} &
  scope.Item{scopeID: I, name: N, type: T}.
tc.typeLambda{id: I, type: tapp{from: F, to: R}} :-
  ast.expr{id: I} &
  ast.lambda{id: L, parentID: I, retType: R, body: B} &
  ast.lambdaParam{lambdaID: L, ty: F} &
  tc.Type{id: B, type: R}.
tc.typePlaceholder{id: I, type: "unknown"} :-
  ast.expr{id: ???} &
  ast.Placeholder{id: P, parentID: I}.
lang.Builtin{name: "plus2", type: tapp{from: "int", to: "int"}}.
ast.RootExpr{id: 1}.
hl.mapping{rule: "intLit", type: "int"}.
hl.mapping{rule: "stringLit", type: "string"}.
hl.mapping{rule: "bool", type: "bool"}.
hl.mapping{rule: "ident", type: "ident"}.
hl.mapping{rule: "letKW", type: "keyword"}.
hl.mapping{rule: "inKW", type: "keyword"}.
`;

const LEAVES = new Set(["ident", "intLit", "stringLit"]);

const main = parseMain(DLSample);
const tree = parserlib.parse(GRAMMAR, "main", DLSample);
const ruleTree = extractRuleTree(tree);
const flattenedByRule = flattenByRule(ruleTree, DLSample, LEAVES);
console.log(flattenedByRule);

function testDLCompletions() {
  const items = getCompletionItems(main, 3412);
  if (items.length === 0) {
    throw new Error("items length should be > 0");
  }
}

function testGetSemanticTokens() {
  const tokens = getSemanticTokens(ruleTree);
  if (tokens.length === 0) {
    throw new Error("tokens length should be > 0");
  }
}

function testFlattenByRule() {
  flattenByRule(ruleTree, DLSample, LEAVES);
}
