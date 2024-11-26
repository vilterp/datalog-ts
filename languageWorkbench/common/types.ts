import { NodesByRule } from "../parserlib/flattenByRule";
import { Grammar, Span } from "../parserlib/types";

export type LanguageSpec = {
  name: string;
  logic: LogicSpec;
  grammar: string;
  example: string;
  triggerCharacters?: string[]; // TODO: put into DL itself or derive from grammar
  nativeImpl?: LangImpl;
  leaves?: Set<string>;
};

export type LogicSpec =
  | { type: "DL1"; source: string }
  | { type: "DL2"; source: string };

export function dl(source: string): LogicSpec {
  return { type: "DL1", source };
}

export function dl2(source: string): LogicSpec {
  return { type: "DL2", source };
}

export type LangImpl = {
  grammar: Grammar;
  scopeDefn: (
    db: NodesByRule,
    scopeID: string,
    kind: string
  ) => Generator<Defn>;
  scopeVar: (db: NodesByRule) => Generator<Var>;
  scopePlaceholder: (db: NodesByRule) => Generator<Placeholder>;
  scopeParent: (
    db: NodesByRule
  ) => Generator<{ scopeID: string; parentID: string }>;
  highlightMapping: { [ruleName: string]: TokenType };
  tcProblem: (db: NodesByRule) => Generator<Problem>;
};

export type Defn = {
  scopeID: string;
  span: Span;
  name: string;
  kind: string;
  type: string;
};

export type Var = {
  scopeID: string;
  name: string;
  span: Span;
  kind: string;
};

export type Suggestion = {
  scopeID: string;
  name: string;
  span: Span;
  kind: string;
  type: string;
};

export type Placeholder = {
  scopeID: string;
  span: Span;
  kind: string;
};

export type Problem = {
  desc: string;
  span: Span;
};

export type TokenType =
  | "variable"
  | "typeParameter"
  | "number"
  | "number"
  | "string"
  | "comment"
  | "keyword"
  | "string";

export type SemanticToken = { type: TokenType; span: Span };
