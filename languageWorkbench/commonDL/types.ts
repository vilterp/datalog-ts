import { NodesByRule } from "../parserlib/flattenByRule";
import { Span } from "../parserlib/types";

export type LangImpl = {
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
  type: string;
};

export type Placeholder = {
  scopeID: string;
  span: Span;
  kind: string;
};

export type TokenType =
  | "ident"
  | "typeParameter"
  | "number"
  | "number"
  | "string"
  | "comment"
  | "keyword"
  | "string";

export type SemanticToken = { type: TokenType; span: Span };
