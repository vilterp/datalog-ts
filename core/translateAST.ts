import {
  DLRule,
  DLStatement,
  DLTerm,
} from "../languageWorkbench/languages/dl/parser";
import { mapListToObj } from "../util/util";
import {
  AndClause,
  array,
  bool,
  int,
  Operator,
  rec,
  Rec,
  Rule,
  Statement,
  str,
  Term,
  varr,
} from "./types";

export function parserStatementToInternal(stmt: DLStatement): Statement {
  switch (stmt.type) {
    case "DeleteFact":
      return {
        type: "Delete",
        record: parserTermToInternal(stmt.record) as Rec,
      };
    case "Fact":
      return {
        type: "Fact",
        record: parserTermToInternal(stmt.record) as Rec,
      };
    case "Rule":
      return {
        type: "Rule",
        rule: parserRuleToInternal(stmt),
      };
    case "TableDecl":
      return {
        type: "TableDecl",
        name: stmt.name.text,
      };
    case "LoadStmt":
      return {
        type: "LoadStmt",
        path: stmt.path.text,
      };
    case "Query":
      return {
        type: "Query",
        record: parserTermToInternal(stmt.record) as Rec,
      };
  }
}

export function parserRuleToInternal(term: DLRule): Rule {
  return {
    head: parserTermToInternal(term.record) as Rec,
    body: {
      type: "Or",
      opts: term.disjunct.map((disjunct) => ({
        type: "And",
        clauses: disjunct.conjunct.map((conjunct): AndClause => {
          switch (conjunct.type) {
            case "BinExpr":
              return {
                type: "BinExpr",
                left: parserTermToInternal(conjunct.left),
                op: conjunct.binOp.text as Operator,
                right: parserTermToInternal(conjunct.right),
              };
            case "Negation":
              return {
                type: "Negation",
                record: parserTermToInternal(term.record) as Rec,
              };
            case "Placeholder":
              return parserTermToInternal(conjunct) as Rec;
            case "Record":
              return parserTermToInternal(conjunct) as Rec;
            case "Aggregation":
              return {
                type: "Aggregation",
                aggregation: conjunct.aggregation.text,
                record: parserTermToInternal(conjunct.record) as Rec,
                varNames: conjunct.var.map((dlVar) => dlVar.text),
              };
          }
        }),
      })),
    },
  };
}

// TODO: how much better is this than writing an extractor?
export function parserTermToInternal(term: DLTerm): Term {
  switch (term.type) {
    case "Array":
      return array(term.term.map(parserTermToInternal));
    case "Bool":
      return bool(term.text === "true");
    case "Int":
      return int(parseInt(term.text));
    case "Placeholder":
      return rec("???", {});
    case "String":
      return str(term.stringChar.map((c) => c.text).join(""));
    case "Var":
      return varr(term.text);
    case "Record":
      return rec(
        term.ident.text,
        mapListToObj(
          term.recordAttrs.keyValue.map((keyValue) => ({
            key: keyValue.ident.text,
            value: parserTermToInternal(keyValue.term),
          }))
        )
      );
  }
}
