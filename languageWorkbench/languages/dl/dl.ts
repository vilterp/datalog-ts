import { DefaultDict } from "../../../util/defaultDict";
import {
  Defn,
  LangImpl,
  Placeholder,
  Problem,
  TokenType,
  Var,
} from "../../commonDL/types";
import { NodesByRule } from "../../parserlib/flattenByRule";
import { Span } from "../../parserlib/types";

// ==== Defn ====

function* scopeDefn(
  db: NodesByRule,
  scopeID: string,
  kind: string
): Generator<Defn> {
  switch (kind) {
    case "relation":
      for (const defn of scopeDefnRule(db)) {
        yield defn;
      }
      for (const defn of scopeDefnTable(db, scopeID)) {
        yield defn;
      }
      break;
    case "var":
      for (const defn of scopeDefnVar(db, scopeID)) {
        yield defn;
      }
    case "attr":
      for (const defn of scopeDefnAttr(db, scopeID)) {
        yield defn;
      }
      break;
  }
}

function* scopeDefnVar(db: NodesByRule, scopeID: string): Generator<Defn> {
  for (const defn of scopeDefnHeadVar(db, scopeID)) {
    yield defn;
  }
  for (const defn of scopeDefnBodyVar(db, scopeID)) {
    yield defn;
  }
}

function* scopeDefnRule(db: NodesByRule): Generator<Defn> {
  for (const ruleID in db.get("rule").byID) {
    for (const record of db.get("record").byParentID.get(ruleID)) {
      for (const ident of db.get("ident").byParentID.get(record.id)) {
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
}

// a variable declared in a rule's head
function* scopeDefnHeadVar(db: NodesByRule, ruleName: string): Generator<Defn> {
  for (const ruleID of ruleNameToID(db, ruleName)) {
    for (const record of db.get("record").byParentID.get(ruleID)) {
      for (const recordVar of scopeRecordVar(db, record.id)) {
        // if (recordVar.recordID === record.id) {
        yield {
          kind: "var",
          name: recordVar.name,
          scopeID: ruleName,
          span: recordVar.span,
          type: "",
        };
        // }
      }
    }
  }
}

// TODO: build an index
function* ruleNameToID(db: NodesByRule, ruleName: string): Generator<string> {
  for (const ruleID in db.get("rule").byID) {
    for (const record of db.get("record").byParentID.get(ruleID)) {
      for (const ident of db.get("ident").byParentID.get(record.id)) {
        if (ident.text === ruleName) {
          yield ruleID;
        }
      }
    }
  }
}

function* ruleIDToName(db: NodesByRule, ruleID: string): Generator<string> {
  for (const record of db.get("record").byParentID.get(ruleID)) {
    for (const ident of db.get("ident").byParentID.get(record.id)) {
      yield ident.text;
    }
  }
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

function* scopeDefnAttr(db: NodesByRule, ruleID: string): Generator<Defn> {
  // for (const ruleID in db.get("rule").byID) {
  for (const record of db.get("record").byParentID.get(ruleID)) {
    for (const headIdent of db.get("ident").byParentID.get(record.id)) {
      for (const attr of db.get("recordAttrs").byParentID.get(record.id)) {
        for (const keyValue of db
          .get("recordKeyValue")
          .byParentID.get(attr.id)) {
          for (const kvIdent of db.get("ident").byParentID.get(keyValue.id)) {
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
  // }
}

function* scopeDefnBodyVar(db: NodesByRule, ruleID: string): Generator<Defn> {
  for (const varTerm of scopeVarInBodyTerm(db, ruleID)) {
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
  for (const result of scopeVarInBodyTerm(db, "TODO")) {
    yield result;
  }
  for (const ruleID in db.get("rule").byID) {
    for (const result of scopeVarAttr(db, ruleID)) {
      yield result;
    }
  }
  for (const result of scopeVarFact(db)) {
    yield result;
  }
}

function* ruleConjunct(
  db: NodesByRule,
  ruleID: string
): Generator<{
  ruleID: string;
  ruleName: string;
  conjunctID: string;
}> {
  // for (const ruleID in db.get("rule").byID) {
  for (const record of db.get("record").byParentID.get(ruleID)) {
    for (const ident of db.get("ident").byParentID.get(record.id)) {
      for (const disjunct of db.get("disjunct").byParentID.get(ruleID)) {
        for (const conjunct of db.get("conjunct").byParentID.get(disjunct.id)) {
          yield {
            ruleID,
            ruleName: ident.text,
            conjunctID: conjunct.id,
          };
        }
      }
    }
  }
  // }
}

// terms in a rule body (doesn't recurse all the way down)
function* scopeRuleBodyTerm(
  db: NodesByRule,
  ruleID: string
): Generator<{ ruleID: string; termID: string }> {
  for (const { conjunctID } of ruleConjunct(db, ruleID)) {
    for (const record of db.get("record").byParentID.get(conjunctID)) {
      yield { ruleID, termID: record.id };
    }
    for (const negation of db.get("negation").byParentID.get(conjunctID)) {
      for (const record of db.get("record").byParentID.get(negation.id)) {
        yield { ruleID, termID: record.id };
      }
    }
    for (const aggregation of db
      .get("aggregation")
      .byParentID.get(conjunctID)) {
      for (const record of db.get("record").byParentID.get(aggregation.id)) {
        yield { ruleID, termID: record.id };
      }
    }
    for (const comparison of db.get("comparison").byParentID.get(conjunctID)) {
      for (const term of db.get("term").byParentID.get(comparison.id)) {
        yield { ruleID, termID: term.id };
      }
    }
    for (const comparison of db.get("arithmetic").byParentID.get(conjunctID)) {
      for (const assignment of db
        .get("assignmentOnLeft")
        .byParentID.get(comparison.id)) {
        for (const term of db.get("term").byParentID.get(assignment.id)) {
          yield { ruleID, termID: term.id };
        }
      }
      for (const assignment of db
        .get("assignmentOnRight")
        .byParentID.get(comparison.id)) {
        for (const term of db.get("term").byParentID.get(assignment.id)) {
          yield { ruleID, termID: term.id };
        }
      }
    }
  }
}

// attributes used in record invocations
function* scopeVarAttr(
  db: NodesByRule,
  ruleID: string
): Generator<{
  scopeID: string;
  nodeID: string;
  name: string;
  span: Span;
  kind: "attr";
}> {
  // for (const ruleID in db.get("rule").byID) {
  for (const { termID: recordID } of scopeRuleBodyTerm(db, ruleID)) {
    if (db.get("record").byID[recordID]) {
      for (const headIdent of db.get("ident").byParentID.get(recordID)) {
        for (const attr of db.get("recordAttrs").byParentID.get(recordID)) {
          for (const keyValue of db
            .get("recordKeyValue")
            .byParentID.get(attr.id)) {
            for (const kvIdent of db.get("ident").byParentID.get(keyValue.id)) {
              yield {
                scopeID: headIdent.text,
                name: kvIdent.text,
                nodeID: kvIdent.id,
                span: kvIdent.span,
                kind: "attr",
              };
            }
          }
        }
      }
    }
  }
  // }
}

function* scopeVarFact(db: NodesByRule): Generator<Var> {
  for (const factID in db.get("fact").byID) {
    for (const record of db.get("record").byParentID.get(factID)) {
      for (const ident of db.get("ident").byParentID.get(record.id)) {
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
  for (const ruleID in db.get("rule").byID) {
    for (const { termID: recordID } of scopeRuleBodyTerm(db, ruleID)) {
      if (db.get("record").byID[recordID]) {
        for (const ident of db.get("ident").byParentID.get(recordID)) {
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
}

// vars that are used in body
function* scopeVarInBodyTerm(db: NodesByRule, ruleID: string): Generator<Var> {
  for (const { termID } of scopeRuleBodyTerm(db, ruleID)) {
    for (const { name, span } of scopeTermOrRecordVar(db, termID)) {
      // if (termID === innerTermID) {
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
    for (const { recordID, name, span } of scopeRecordVar(db, record.id)) {
      if (record.id === recordID) {
        yield { termID, name, span };
      }
    }
  }
  // }
  // for (const termID in db.get("term").byID) {
  for (const array of db.get("array").byParentID.get(termID)) {
    for (const arrItemTerm of db.get("term").byParentID.get(array.id)) {
      for (const { termID, name, span } of scopeTermVar(db, arrItemTerm.id)) {
        // if (termID === arrItemTerm.id) {
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
      .byParentID.get(recordAttr.id)) {
      for (const term of db.get("term").byParentID.get(recordKeyValue.id)) {
        for (const { termID: valueTerm, name, span } of scopeTermVar(
          db,
          term.id
        )) {
          // if (valueTerm === term.id) {
          yield { recordID: valueTerm, name, span };
          // }
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
  // TODO: start with placeholder, go bottom up
  // requires a version of ruleConjunct where you start with term
  for (const ruleID in db.get("rule").byID) {
    for (const conjunct of ruleConjunct(db, ruleID)) {
      for (const record of db
        .get("record")
        .byParentID.get(conjunct.conjunctID)) {
        for (const recordAttrs of db
          .get("recordAttrs")
          .byParentID.get(record.id)) {
          for (const recordKeyValue of db
            .get("recordKeyValue")
            .byParentID.get(recordAttrs.id)) {
            for (const term of db
              .get("term")
              .byParentID.get(recordKeyValue.id)) {
              for (const placeholder of db
                .get("placeholder")
                .byParentID.get(term.id)) {
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
}

function* scopePlaceholderRule(db: NodesByRule): Generator<Placeholder> {
  for (const placeholderID in db.get("placeholder").byID) {
    const placeholder = db.get("placeholder").byID[placeholderID];
    if (db.get("conjunct").byID[placeholder.parentID]) {
      yield {
        scopeID: "global",
        kind: "relation",
        span: placeholder.span,
      };
    }
  }
}

function* scopePlaceholderKeyValue(db: NodesByRule): Generator<Placeholder> {
  for (const placeholderID in db.get("placeholder").byID) {
    const placeholder = db.get("placeholder").byID[placeholderID];
    const recordAttrs = db.get("recordAttrs").byID[placeholder.parentID];
    if (recordAttrs) {
      const record = db.get("record").byID[recordAttrs.parentID];
      for (const ident of db.get("ident").byParentID.get(record.id)) {
        yield {
          scopeID: ident.text,
          kind: "attr",
          span: placeholder.span,
        };
      }
    }
  }
}

function* scopeParent(
  db: NodesByRule
): Generator<{ scopeID: string; parentID: string }> {
  // nothing here in dl.dl
}

const SYNTAX_HIGHLIGHTING_MAPPING: { [ruleType: string]: TokenType } = {
  ident: "variable",
  var: "typeParameter",
  int: "number",
  bool: "number",
  string: "string",
  comment: "comment",
  tableKW: "keyword",
  loadKW: "keyword",
  path: "string",
};

function* tcProblems(db: NodesByRule): Generator<Problem> {
  for (const problem of tcNonexistentAttr(db)) {
    yield problem;
  }
  for (const problem of tcUnboundVarInHead(db)) {
    yield problem;
  }
}

function* tcNonexistentAttr(db: NodesByRule): Generator<Problem> {
  for (const ruleID in db.get("rule").byID) {
    for (const attr of scopeVarAttr(db, ruleID)) {
      if (generatorIsEmpty(tcRuleAttr(db, attr.scopeID, attr.name))) {
        for (const ruleName of ruleIDToName(db, attr.scopeID)) {
          yield {
            desc: `nonexistent attr \`${attr.name}\` calling rule \`${ruleName}\``,
            span: attr.span,
          };
        }
      }
    }
  }
}

function* tcUnboundVarInHead(db: NodesByRule): Generator<Problem> {
  for (const ruleID in db.get("rule").byID) {
    for (const ruleName of ruleIDToName(db, ruleID)) {
      for (const headVar of scopeDefnHeadVar(db, ruleName)) {
        if (generatorIsEmpty(scopeVarInBodyTerm(db, ruleID))) {
          yield {
            desc: `unbound var ${headVar.name} in head of ${ruleName}`,
            span: headVar.span,
          };
        }
      }
    }
  }
}

function* tcRuleAttr(
  db: NodesByRule,
  ruleID: string,
  attrName: string
): Generator<{ ruleID: string; attr: string; span: Span; ruleName: string }> {
  // for (const ruleID in db.get("rule").byID) {
  for (const record of db.get("record").byParentID.get(ruleID)) {
    for (const ruleName of db.get("ident").byParentID.get(record.id)) {
      for (const attrs of db.get("recordAttrs").byParentID.get(record.id)) {
        for (const kv of db.get("recordKeyValue").byParentID.get(attrs.id)) {
          // would need to index this by name for it to be fast
          for (const attr of db.get("ident").byParentID.get(kv.id)) {
            if (attr.text === attrName) {
              yield {
                ruleID,
                attr: attr.text,
                span: attr.span,
                ruleName: ruleName.text,
              };
            }
          }
        }
      }
    }
    // }
  }
}

export const datalogLangImpl: LangImpl = {
  highlightMapping: SYNTAX_HIGHLIGHTING_MAPPING,
  scopeDefn,
  scopePlaceholder,
  scopeVar,
  scopeParent,
  tcProblem: tcProblems,
};

// util

function generatorCount<T>(gen: Generator<T>): number {
  let count = 0;
  for (const item in gen) {
    count++;
  }
  return count;
}

function generatorIsEmpty<T>(gen: Generator<T>): boolean {
  return generatorCount(gen) === 0;
}
