import {
  Conjunct,
  Rec,
  Rule,
  Term,
  array,
  bool,
  dict,
  int,
  rec,
  str,
  varr,
} from "../../../core/types";
import { pairsToObj } from "../../../util/util";
import { deEscape } from "../../parserlib/types";
import { Span } from "../../sourcePositions";
import {
  DL2Arithmetic,
  DL2Comparison,
  DL2Declaration,
  DL2Main,
  DL2Rule,
  DL2String,
  DL2TableDecl,
  DL2Term,
} from "./parser";
import { Module, TableMembers } from "./types";

export type ExtractionProblem =
  | {
      type: "DuplicateTable";
      name: string;
      span: Span;
    }
  | { type: "DuplicateRule"; name: string; span: Span }
  | { type: "DuplicateImport"; name: string; span: Span }
  | { type: "DuplicateTableMember"; name: string; span: Span };

export function extractModule(main: DL2Main): [Module, ExtractionProblem[]] {
  const problems: ExtractionProblem[] = [];
  const mod: Module = {
    imports: new Set(),
    ruleDecls: {},
    tableDecls: {},
  };
  for (const decl of main.declaration) {
    switch (decl.type) {
      case "Rule":
        if (mod.ruleDecls[decl.record.qualifier.text]) {
          problems.push({
            type: "DuplicateRule",
            name: decl.record.qualifier.text,
            span: decl.record.qualifier.span,
          });
          break;
        }
        mod.ruleDecls[decl.record.qualifier.text] = decl;
        break;
      case "TableDecl":
        if (mod.tableDecls[decl.name.text]) {
          problems.push({
            type: "DuplicateTable",
            name: decl.name.text,
            span: decl.name.span,
          });
          break;
        }
        const [members, memberProblems] = extractTableMembers(decl);
        problems.push(...memberProblems);
        mod.tableDecls[decl.name.text] = members;
        break;
      case "Import":
        if (mod.imports.has(decl.path.text)) {
          problems.push({
            type: "DuplicateImport",
            name: decl.path.text,
            span: decl.path.span,
          });
          break;
        }
        mod.imports.add(decl.path.text);
        break;
      default:
        throw new Error(`unknown decl type: ${decl.type}`);
    }
  }
  return [mod, problems];
}

function extractTableMembers(
  decl: DL2TableDecl
): [TableMembers, ExtractionProblem[]] {
  const problems: ExtractionProblem[] = [];
  const members: TableMembers = {};
  for (const attr of decl.tableAttr) {
    if (members[attr.ident.text]) {
      problems.push({
        type: "DuplicateTableMember",
        name: attr.ident.text,
        span: attr.ident.span,
      });
      continue;
    }
    if (attr.refSpec === null) {
      members[attr.ident.text] = { type: "Scalar" };
      continue;
    }
    if (attr.refSpec.inRef !== null) {
      members[attr.ident.text] = {
        type: "InRef",
        table: attr.refSpec.inRef.table.text,
        name: attr.refSpec.inRef.col.text,
      };
      continue;
    }
    if (attr.refSpec.outRef !== null) {
      members[attr.ident.text] = {
        type: "OutRef",
        table: attr.refSpec.outRef.table.text,
        name: attr.refSpec.outRef.col.text,
      };
      continue;
    }
  }
  return [members, problems];
}

export function extractTerm(term: DL2Term): Term {
  switch (term.type) {
    case "Array":
      return array(term.term.map(extractTerm));
    case "Dict":
      return dict(
        pairsToObj(
          term.dictKeyValue.map((kv) => ({
            key: extractStr(kv.key),
            value: extractTerm(kv.value),
          }))
        )
      );
    case "Bool":
      return bool(term.text === "true");
    case "Int":
      return int(parseInt(term.text));
    case "Placeholder":
      return rec("???", {});
    case "String":
      return str(extractStr(term));
    case "Var":
      return varr(term.text);
    case "Record":
      return rec(
        term.qualifier.text,
        pairsToObj(
          term.recordAttrs.recordKeyValue.map((keyValue) => ({
            key: keyValue.ident.text,
            value: extractTerm(keyValue.term),
          }))
        )
      );
  }
}

function extractStr(term: DL2String): string {
  return deEscape(term.stringChar.map((c) => c.text).join(""));
}
