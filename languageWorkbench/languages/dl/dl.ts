import {
  Defn,
  LangImpl,
  Placeholder,
  TokenType,
  Var,
} from "../../commonDL/types";
import { NodesByRule } from "../../parserlib/flattenByRule";
import { Span } from "../../parserlib/types";

// ==== Defn ====

function* scopeDefn(db: NodesByRule): Generator<Defn> {
  for (const defn of scopeDefnRule(db)) {
    yield defn;
  }
  for (const defn of scopeDefnVar(db)) {
    yield defn;
  }
  for (const defn of scopeDefnTable(db)) {
    yield defn;
  }
  for (const defn of scopeDefnAttr(db)) {
    yield defn;
  }
  for (const defn of scopeDefnInnerVar(db)) {
    yield defn;
  }
}

function* scopeDefnRule(db: NodesByRule): Generator<Defn> {
  for (const ruleID in db["rule"].byID) {
    for (const ident of db["ident"].byParentID[ruleID]) {
      yield {
        kind: "relation",
        name: ident.text,
        scopeID: "global",
        span: ident.span,
      };
    }
  }
}

function* scopeDefnVar(db: NodesByRule): Generator<Defn> {
  for (const ruleID in db["rule"].byID) {
    for (const record of db["record"].byParentID[ruleID]) {
      // TODO: pass argument
      for (const recordVar of scopeRecordVar(db)) {
        if (recordVar.recordID === record.id.toString()) {
          yield {
            kind: "var",
            name: recordVar.name,
            scopeID: ruleID,
            span: recordVar.span,
          };
        }
      }
    }
  }
}

function* scopeDefnTable(db: NodesByRule): Generator<Defn> {
  for (const tableDeclID in db["tableDecl"].byID) {
    for (const ident of db["ident"].byParentID[tableDeclID]) {
      yield {
        kind: "relation",
        name: ident.text,
        scopeID: "global",
        span: ident.span,
      };
    }
  }
}

function* scopeDefnAttr(db: NodesByRule): Generator<Defn> {
  for (const ruleID in db["rule"].byID) {
    for (const record of db["record"].byParentID[ruleID]) {
      for (const headIdent of db["ident"].byParentID[record.id]) {
        for (const attr of db["recordAttrs"].byParentID[record.id]) {
          for (const keyValue of db["recordKeyValue"].byParentID[attr.id]) {
            for (const kvIdent of db["ident"].byParentID[keyValue.id]) {
              yield {
                scopeID: headIdent.text,
                name: kvIdent.text,
                span: kvIdent.span,
                kind: "attr",
              };
            }
          }
        }
      }
    }
  }
}

function* scopeDefnInnerVar(db: NodesByRule): Generator<Defn> {
  for (const varTerm of scopeVarTerm(db)) {
    yield {
      kind: "var",
      name: varTerm.name,
      scopeID: varTerm.scopeID,
      span: varTerm.span,
    };
  }
}

// ==== Var ====

function* scopeVar(db: NodesByRule): Generator<Var> {
  for (const result of scopeVarRuleInvocation(db)) {
    yield result;
  }
  for (const result of scopeVarTerm(db)) {
    yield result;
  }
  for (const result of scopeVarAttr(db)) {
    yield result;
  }
  for (const result of scopeVarFact(db)) {
    yield result;
  }
}

function* ruleConjunct(db: NodesByRule): Generator<{
  ruleID: string;
  conjunctID: string;
}> {
  for (const ruleID in db["rule"].byID) {
    for (const disjunctID in db["disjunct"].byParentID[ruleID]) {
      for (const conjunctID in db["conjunct"].byParentID[disjunctID]) {
        yield { ruleID, conjunctID };
      }
    }
  }
}

function* scopeRuleBodyTerm(
  db: NodesByRule
): Generator<{ ruleID: string; termID: number }> {
  for (const { ruleID, conjunctID } of ruleConjunct(db)) {
    for (const record of db["record"].byParentID[conjunctID]) {
      yield { ruleID, termID: record.id };
    }
    for (const negation of db["negation"].byParentID[conjunctID]) {
      for (const record of db["record"].byParentID[negation.id]) {
        yield { ruleID, termID: record.id };
      }
    }
    for (const aggregation of db["aggregation"].byParentID[conjunctID]) {
      for (const record of db["record"].byParentID[aggregation.id]) {
        yield { ruleID, termID: record.id };
      }
    }
    for (const comparison of db["comparison"].byParentID[conjunctID]) {
      for (const term of db["term"].byParentID[comparison.id]) {
        yield { ruleID, termID: term.id };
      }
    }
    for (const comparison of db["arithmetic"].byParentID[conjunctID]) {
      for (const assignment of db["assignmentOnLeft"].byParentID[
        comparison.id
      ]) {
        for (const term of db["term"].byParentID[assignment.id]) {
          yield { ruleID, termID: term.id };
        }
      }
      for (const assignment of db["assignmentOnRight"].byParentID[
        comparison.id
      ]) {
        for (const term of db["term"].byParentID[assignment.id]) {
          yield { ruleID, termID: term.id };
        }
      }
    }
  }
}

function* scopeVarAttr(db: NodesByRule): Generator<{
  scopeID: string;
  nodeID: string;
  name: string;
  span: Span;
  kind: "attr";
}> {
  for (const { termID: recordID } of scopeRuleBodyTerm(db)) {
    if (db["record"].byID[recordID]) {
      for (const headIdent of db["ident"].byParentID[recordID]) {
        for (const attr of db["recordAttrs"].byParentID[recordID]) {
          for (const keyValue of db["recordKeyValue"].byParentID[attr.id]) {
            for (const kvIdent of db["ident"].byParentID[keyValue.id]) {
              yield {
                scopeID: headIdent.text,
                name: kvIdent.text,
                nodeID: kvIdent.id.toString(),
                span: kvIdent.span,
                kind: "attr",
              };
            }
          }
        }
      }
    }
  }
}

function* scopeVarFact(db: NodesByRule): Generator<Var> {
  for (const factID in db["fact"].byID) {
    for (const record of db["record"].byParentID[factID]) {
      for (const ident of db["ident"].byParentID[record.id]) {
        yield {
          scopeID: "global",
          kind: "relation",
          name: ident.text,
          span: ident.span,
        };
      }
    }
  }
}

function* scopeVarRuleInvocation(db: NodesByRule): Generator<Var> {
  // TODO: pass in rule id?
  for (const { termID: recordID, ruleID } of scopeRuleBodyTerm(db)) {
    if (db["record"].byID[recordID]) {
      for (const ident of db["ident"].byParentID[recordID]) {
        yield {
          scopeID: "global", // TODO: not string
          kind: "relation",
          name: ident.text,
          span: ident.span,
        };
      }
    }
  }
}

function* scopeVarTerm(db: NodesByRule): Generator<Var> {
  for (const { ruleID, termID } of scopeRuleBodyTerm(db)) {
    // TODO: pass in some id so we're not doing a cross join?
    for (const { termID: innerTermID, name, span } of scopeTermOrRecordVar(
      db
    )) {
      if (termID.toString() === innerTermID) {
        yield { scopeID: ruleID, name, span, kind: "var" };
      }
    }
  }
}

function* scopeTermOrRecordVar(
  db: NodesByRule
): Generator<{ termID: string; name: string; span: Span }> {
  for (const { recordID, name, span } of scopeRecordVar(db)) {
    yield { termID: recordID, name, span };
  }
  for (const { termID, name, span } of scopeTermVar(db)) {
    yield { termID, name, span };
  }
}

function* scopeTermVar(
  db: NodesByRule
): Generator<{ termID: string; name: string; span: Span }> {
  for (const termID in db["term"].byID) {
    for (const varRecord of db["var"].byParentID[termID]) {
      yield { termID, name: varRecord.text, span: varRecord.span };
    }
  }
  for (const termID in db["term"].byID) {
    for (const record of db["record"].byParentID[termID]) {
      // TODO: pass argument to avoid cross join?
      for (const { recordID, name, span } of scopeRecordVar(db)) {
        if (record.id.toString() === recordID) {
          yield { termID, name, span };
        }
      }
    }
  }
  for (const termID in db["term"].byID) {
    for (const array of db["array"].byParentID[termID]) {
      for (const arrItemTerm of db["term"].byParentID[array.id]) {
        // TODO: pass argument
        for (const { termID, name, span } of scopeTermVar(db)) {
          if (termID === arrItemTerm.id.toString()) {
            yield { name, span, termID };
          }
        }
      }
    }
  }
}

function* scopeRecordVar(
  db: NodesByRule
): Generator<{ recordID: string; name: string; span: Span }> {
  for (const recordID in db["record"].byID) {
    for (const recordAttr of db["recordAttrs"].byParentID[recordID]) {
      for (const recordKeyValue of db["recordKeyValue"].byParentID[
        recordAttr.id
      ]) {
        for (const term of db["term"].byParentID[recordKeyValue.id]) {
          // TODO: pass argument
          for (const { termID: valueTerm, name, span } of scopeTermVar(db)) {
            if (valueTerm === term.id.toString()) {
              yield { recordID: valueTerm, name, span };
            }
          }
        }
      }
    }
  }
}

function* scopePlaceholder(db: NodesByRule): Generator<Placeholder> {
  for (const placeholder of scopePlaceholderVar(db)) {
    yield placeholder;
  }
  for (const placeholder of scopePlaceholderRule(db)) {
    yield placeholder;
  }
  for (const placeholder of scopePlaceholdeKeyValue(db)) {
    yield placeholder;
  }
}

function* scopeParent(
  db: NodesByRule
): Generator<{ scopeID: string; parentID: string }> {
  // nothing here in dl.dl
}

const SYNTAX_HIGHLIGHTING_MAPPING: { [ruleType: string]: TokenType } = {
  ident: "ident",
  var: "typeParameter",
  int: "number",
  bool: "number",
  string: "string",
  comment: "comment",
  tableKW: "keyword",
  loadKW: "keyword",
  path: "string",
};

export const datalog: LangImpl = {
  highlightMapping: SYNTAX_HIGHLIGHTING_MAPPING,
  scopeDefn,
  scopePlaceholder,
  scopeVar,
  scopeParent,
};
