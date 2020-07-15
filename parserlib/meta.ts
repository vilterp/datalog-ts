import { Grammar, ref, seq, choice, text, repSep, Rule } from "./grammar";
import {
  rep1,
  ident,
  commaSpace,
  block,
  squareBrackets,
  parens,
  stringLit,
  spaceAround,
  whitespace,
} from "./stdlib";
import { RuleTree, childByName, textForSpan } from "./ruleTree";
import { prettyPrintRule, ruleTreeToTree, prettyPrintRuleTree } from "./pretty";
import { prettyPrintTree } from "../pretty";

// hardcoded grammar for parsing grammar rules
export const metaGrammar: Grammar = {
  grammar: repSep(ref("ruleDefn"), whitespace),
  ruleDefn: seq([
    ref("ruleName"),
    spaceAround(text(":-")),
    ref("rule"),
    text("."),
  ]),
  ruleName: ident,
  rule: choice([ref("seq"), ref("choice"), ref("ref"), ref("text")]),
  seq: block(squareBrackets, repSep(ref("rule"), commaSpace)),
  choice: block(parens, repSep(ref("rule"), spaceAround(text("|")))),
  ref: ident,
  text: stringLit,
};

export function extractGrammar(input: string, rt: RuleTree): Grammar {
  const out: Grammar = {};
  rt.children.forEach((ruleDefn) => {
    const name = textForSpan(input, childByName(ruleDefn, "ruleName").span);
    const rule = extractRule(input, childByName(ruleDefn, "rule").children[0]);
    out[name] = rule;
  });
  return out;
}

function extractRule(input: string, rt: RuleTree): Rule {
  console.log("extractRule", prettyPrintRuleTree(rt));
  switch (rt.name) {
    case "choice":
      return choice(rt.children.map((item) => extractRule(input, item)));
    case "seq":
      return seq(rt.children.map((item) => extractRule(input, item)));
    case "ref":
      return ref(textForSpan(input, rt.span));
    case "text":
      return text(textForSpan(input, rt.span));
    default:
      throw new Error(`don't know how to extract "${rt.name}"`);
  }
}
