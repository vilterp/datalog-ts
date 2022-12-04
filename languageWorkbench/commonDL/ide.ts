import { spanContainsIdx } from "../../uiCommon/ide/keymap/util";
import { NodesByRule } from "../parserlib/flattenByRule";
import { Span } from "../parserlib/types";
import { LangImpl, Placeholder, SemanticToken, Suggestion } from "./types";

export function* ideCurrentSuggestion(
  db: NodesByRule,
  impl: LangImpl,
  cursor: number
): Generator<Suggestion> {
  const currentPlaceholder = [...ideCurrentPlaceholder(db, impl, cursor)];
  for (const placeholder of currentPlaceholder) {
    for (const suggestion of ideSuggestion(db, impl, placeholder.scopeID)) {
      if (suggestion.scopeID === placeholder.scopeID) {
        yield suggestion;
      }
    }
  }
}

function* ideCurrentPlaceholder(
  db: NodesByRule,
  impl: LangImpl,
  cursor: number
): Generator<Placeholder> {
  for (const placeholder of impl.scopePlaceholder(db)) {
    if (spanContainsIdx(placeholder.span, cursor)) {
      yield placeholder;
    }
  }
}

function* ideSuggestion(
  db: NodesByRule,
  impl: LangImpl,
  scopeID: string
): Generator<Suggestion> {
  // for (const placeholder of impl.scopePlaceholder(db)) {
  for (const item of scopeItem(db, impl, scopeID)) {
    // if (scopeID === item.scopeID) {
    yield {
      name: item.name,
      scopeID: item.scopeID,
      span: item.defnSpan,
      type: item.type,
    };
    // }
  }
  // }
}

type ScopeItem = {
  scopeID: string;
  defnScopeID: string;
  name: string;
  defnSpan: Span;
  kind: string;
  type: string;
};

function* scopeItem(
  db: NodesByRule,
  impl: LangImpl,
  scopeID: string
): Generator<ScopeItem> {
  for (const defn of scopeDefnHere(db, impl, scopeID)) {
    yield defn;
  }
  for (const defn of scopeDefnParent(db, impl)) {
    yield defn;
  }
}

function* scopeDefnHere(
  db: NodesByRule,
  impl: LangImpl,
  scopeID: string
): Generator<ScopeItem> {
  for (const item of impl.scopeDefn(db, scopeID)) {
    yield {
      defnScopeID: item.scopeID,
      defnSpan: item.span,
      kind: item.kind,
      name: item.name,
      scopeID: item.scopeID,
      type: item.type,
    };
  }
}

function* scopeDefnParent(
  db: NodesByRule,
  impl: LangImpl
): Generator<ScopeItem> {
  for (const parent of impl.scopeParent(db)) {
    for (const item of scopeItem(db, impl, parent.parentID)) {
      // if (item.scopeID === parent.parentID) {
      yield item;
      // }
    }
  }
}

type ScopeUsage = {
  name: string;
  defnSpan: Span;
  usageSpan: Span;
  definitionScopeID: string;
  usageScopeID: string;
  kind: string;
};

function* scopeUsage(db: NodesByRule, impl: LangImpl): Generator<ScopeUsage> {
  for (const item of scopeItem(db, impl, "TODO")) {
    for (const varRec of impl.scopeVar(db)) {
      if (
        varRec.kind === item.kind &&
        varRec.name === item.name &&
        item.scopeID === varRec.scopeID
      ) {
        yield {
          definitionScopeID: item.defnScopeID,
          defnSpan: item.defnSpan,
          kind: item.kind,
          name: item.name,
          usageScopeID: varRec.scopeID,
          usageSpan: varRec.span,
        };
      }
    }
  }
}

export function* getSemanticTokens(
  db: NodesByRule,
  impl: LangImpl
): Generator<SemanticToken> {
  for (const rule in impl.highlightMapping) {
    const tokenType = impl.highlightMapping[rule];
    if (!db[rule]) {
      continue;
    }
    for (const nodeID in db[rule].byID) {
      const node = db[rule].byID[nodeID];
      yield {
        span: node.span,
        type: tokenType,
      };
    }
  }
}
