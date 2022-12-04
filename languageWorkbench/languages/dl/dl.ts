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

function* scopeDefn(db: NodesByRule, scopeID: string): Generator<Defn> {
  for (const defn of scopeDefnRule(db, scopeID)) {
    yield defn;
  }
  for (const defn of scopeDefnVar(db, scopeID)) {
    yield defn;
  }
  for (const defn of scopeDefnTable(db, scopeID)) {
    yield defn;
  }
  for (const defn of scopeDefnAttr(db, scopeID)) {
    yield defn;
  }
  for (const defn of scopeDefnInnerVar(db, scopeID)) {
    yield defn;
  }
}

function* scopeDefnRule(db: NodesByRule, scopeID: string): Generator<Defn> {
  for (const ruleID in db.get("rule").byID) {
    for (const ident of db.get("ident").byParentID.get(ruleID)) {
      yield {
        kind: "relation",
        name: ident.text,
        scopeID: "global",
        span: ident.span,
        type: "",
      };
    }
  }
}

function* scopeDefnVar(db: NodesByRule, ruleID: string): Generator<Defn> {
  // for (const ruleID in db.get("rule").byID) {
  for (const record of db.get("record").byParentID.get(ruleID)) {
    // TODO: pass argument
    for (const recordVar of scopeRecordVar(db, record.id.toString())) {
      if (recordVar.recordID === record.id.toString()) {
        yield {
          kind: "var",
          name: recordVar.name,
          scopeID: ruleID,
          span: recordVar.span,
          type: "",
        };
      }
    }
  }
  // }
}

function* scopeDefnTable(db: NodesByRule, scopeID: string): Generator<Defn> {
  if (!db.get("tableDecl")) {
    return;
  }
  for (const tableDeclID in db.get("tableDecl").byID) {
    for (const ident of db.get("ident").byParentID.get(tableDeclID)) {
      yield {
        kind: "relation",
        name: ident.text,
        scopeID: "global",
        span: ident.span,
        type: "",
      };
    }
  }
}

function* scopeDefnAttr(db: NodesByRule, scopeID: string): Generator<Defn> {
  for (const ruleID in db.get("rule").byID) {
    for (const record of db.get("record").byParentID.get(ruleID)) {
      for (const headIdent of db
        .get("ident")
        .byParentID.get(record.id.toString())) {
        for (const attr of db
          .get("recordAttrs")
          .byParentID.get(record.id.toString())) {
          for (const keyValue of db
            .get("recordKeyValue")
            .byParentID.get(attr.id.toString())) {
            for (const kvIdent of db
              .get("ident")
              .byParentID.get(keyValue.id.toString())) {
              yield {
                scopeID: headIdent.text,
                name: kvIdent.text,
                span: kvIdent.span,
                kind: "attr",
                type: "",
              };
            }
          }
        }
      }
    }
  }
}

function* scopeDefnInnerVar(db: NodesByRule, scopeID: string): Generator<Defn> {
  for (const varTerm of scopeVarTerm(db)) {
    yield {
      kind: "var",
      name: varTerm.name,
      scopeID: varTerm.scopeID,
      span: varTerm.span,
      type: "",
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
  ruleName: string;
  conjunctID: string;
}> {
  for (const ruleID in db.get("rule").byID) {
    for (const record of db.get("record").byParentID.get(ruleID)) {
      for (const ident of db
        .get("ident")
        .byParentID.get(record.id.toString())) {
        for (const disjunct of db.get("disjunct").byParentID.get(ruleID)) {
          for (const conjunct of db
            .get("conjunct")
            .byParentID.get(disjunct.id.toString())) {
            yield {
              ruleID,
              ruleName: ident.text,
              conjunctID: conjunct.id.toString(),
            };
          }
        }
      }
    }
  }
}

// terms in a rule body (doesn't recurse all the way down)
function* scopeRuleBodyTerm(
  db: NodesByRule
): Generator<{ ruleID: string; termID: number }> {
  for (const { ruleID, conjunctID } of ruleConjunct(db)) {
    for (const record of db.get("record").byParentID.get(conjunctID)) {
      yield { ruleID, termID: record.id };
    }
    for (const negation of db.get("negation").byParentID.get(conjunctID)) {
      for (const record of db
        .get("record")
        .byParentID.get(negation.id.toString())) {
        yield { ruleID, termID: record.id };
      }
    }
    for (const aggregation of db
      .get("aggregation")
      .byParentID.get(conjunctID)) {
      for (const record of db
        .get("record")
        .byParentID.get(aggregation.id.toString())) {
        yield { ruleID, termID: record.id };
      }
    }
    for (const comparison of db.get("comparison").byParentID.get(conjunctID)) {
      for (const term of db
        .get("term")
        .byParentID.get(comparison.id.toString())) {
        yield { ruleID, termID: term.id };
      }
    }
    for (const comparison of db.get("arithmetic").byParentID.get(conjunctID)) {
      for (const assignment of db
        .get("assignmentOnLeft")
        .byParentID.get(comparison.id.toString())) {
        for (const term of db
          .get("term")
          .byParentID.get(assignment.id.toString())) {
          yield { ruleID, termID: term.id };
        }
      }
      for (const assignment of db
        .get("assignmentOnRight")
        .byParentID.get(comparison.id.toString())) {
        for (const term of db
          .get("term")
          .byParentID.get(assignment.id.toString())) {
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
    if (db.get("record").byID[recordID]) {
      for (const headIdent of db
        .get("ident")
        .byParentID.get(recordID.toString())) {
        for (const attr of db
          .get("recordAttrs")
          .byParentID.get(recordID.toString())) {
          for (const keyValue of db
            .get("recordKeyValue")
            .byParentID.get(attr.id.toString())) {
            for (const kvIdent of db
              .get("ident")
              .byParentID.get(keyValue.id.toString())) {
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
  for (const factID in db.get("fact").byID) {
    for (const record of db.get("record").byParentID.get(factID)) {
      for (const ident of db
        .get("ident")
        .byParentID.get(record.id.toString())) {
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
    if (db.get("record").byID[recordID]) {
      for (const ident of db.get("ident").byParentID.get(recordID.toString())) {
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
      db,
      termID.toString()
    )) {
      // if (termID.toString() === innerTermID) {
      yield { scopeID: ruleID, name, span, kind: "var" };
      // }
    }
  }
}

function* scopeTermOrRecordVar(
  db: NodesByRule,
  curTermID: string
): Generator<{ termID: string; name: string; span: Span }> {
  for (const { recordID, name, span } of scopeRecordVar(db, curTermID)) {
    yield { termID: recordID, name, span };
  }
  for (const { termID, name, span } of scopeTermVar(db, curTermID)) {
    yield { termID, name, span };
  }
}

function* scopeTermVar(
  db: NodesByRule,
  termID: string
): Generator<{ termID: string; name: string; span: Span }> {
  // for (const termID in db.get("term").byID) {
  for (const varRecord of db.get("var").byParentID.get(termID)) {
    yield { termID, name: varRecord.text, span: varRecord.span };
  }
  // }
  // for (const termID in db.get("term").byID) {
  for (const record of db.get("record").byParentID.get(termID)) {
    // TODO: pass argument to avoid cross join?
    for (const { recordID, name, span } of scopeRecordVar(
      db,
      record.id.toString()
    )) {
      if (record.id.toString() === recordID) {
        yield { termID, name, span };
      }
    }
  }
  // }
  // for (const termID in db.get("term").byID) {
  for (const array of db.get("array").byParentID.get(termID)) {
    for (const arrItemTerm of db
      .get("term")
      .byParentID.get(array.id.toString())) {
      for (const { termID, name, span } of scopeTermVar(
        db,
        arrItemTerm.id.toString()
      )) {
        // if (termID === arrItemTerm.id.toString()) {
        yield { name, span, termID };
        // }
      }
    }
  }
  // }
}

function* scopeRecordVar(
  db: NodesByRule,
  recordID: string
): Generator<{ recordID: string; name: string; span: Span }> {
  // for (const recordID in db.get("record").byID) {
  for (const recordAttr of db.get("recordAttrs").byParentID.get(recordID)) {
    for (const recordKeyValue of db
      .get("recordKeyValue")
      .byParentID.get(recordAttr.id.toString())) {
      for (const term of db
        .get("term")
        .byParentID.get(recordKeyValue.id.toString())) {
        // TODO: pass argument
        for (const { termID: valueTerm, name, span } of scopeTermVar(
          db,
          term.id.toString()
        )) {
          if (valueTerm === term.id.toString()) {
            yield { recordID: valueTerm, name, span };
          }
        }
      }
    }
  }
  // }
}

// === Placeholder ===

function* scopePlaceholder(db: NodesByRule): Generator<Placeholder> {
  for (const placeholder of scopePlaceholderVar(db)) {
    yield placeholder;
  }
  for (const placeholder of scopePlaceholderRule(db)) {
    yield placeholder;
  }
  for (const placeholder of scopePlaceholderKeyValue(db)) {
    yield placeholder;
  }
}

function* scopePlaceholderVar(db: NodesByRule): Generator<Placeholder> {
  for (const conjunct of ruleConjunct(db)) {
    for (const record of db
      .get("record")
      .byParentID.get(conjunct.conjunctID.toString())) {
      for (const recordAttrs of db
        .get("recordAttrs")
        .byParentID.get(record.id.toString())) {
        for (const recordKeyValue of db
          .get("recordKeyValue")
          .byParentID.get(recordAttrs.id.toString())) {
          for (const term of db
            .get("term")
            .byParentID.get(recordKeyValue.id.toString())) {
            for (const placeholder of db
              .get("placeholder")
              .byParentID.get(term.id.toString())) {
              yield {
                kind: "var",
                scopeID: conjunct.ruleName,
                span: placeholder.span,
              };
            }
          }
        }
      }
    }
  }
}

function* scopePlaceholderRule(db: NodesByRule): Generator<Placeholder> {
  // ...
}

function* scopePlaceholderKeyValue(db: NodesByRule): Generator<Placeholder> {
  // ...
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
