import { parseGrammar } from "../parserlib/meta";
import { parse } from "../parserlib/parser";
import { childByName, RuleTree, textForSpan } from "../parserlib/ruleTree";
// @ts-ignore
import datalogGrammarStr from "./dl.grammar";
import { Rec, Rule, Statement } from "./types";

const datalogGrammar = parseGrammar(datalogGrammarStr);

export function parseProgram(input: string) {
  const tree = parse(datalogGrammar, "main", input);
}

export function extractGrammar(input: string, rt: RuleTree): Statement[] {
  return rt.children.map(extractStmt);
}

function extractStmt(node: RuleTree): Statement {
  switch (node.name) {
    case "rule":
      const rule = extractRule(node);
      return { type: "Rule", rule };
    case "fact":
      const record = extractFact(node);
      return { type: "Insert", record };
    case "tableDecl":
      const name = extractTableDecl(node);
      return { type: "TableDecl", name };
  }
}

function extractRule(node: RuleTree): Rule {
  return XXX;
}

function extractFact(node: RuleTree): Rec {
  return XXX;
}

function extractTableDecl(node: RuleTree): string {
  return childByName(node, "ident").name;
}

function extractRecord(node: RuleTree): Rec {
  XXXX;
}
