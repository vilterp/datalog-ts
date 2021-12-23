import {
  Grammar,
  ref,
  seq,
  choice,
  text,
  repSep,
  Rule,
  charRule,
  anyChar,
  SingleCharRule,
  literalChar,
  range,
} from "./grammar";
import {
  ident,
  commaSpace,
  block,
  squareBrackets,
  parens,
  stringLit,
  spaceAround,
  whitespace,
} from "./stdlib";
import {
  RuleTree,
  childByName,
  textForSpan,
  extractRuleTree,
} from "./ruleTree";
import { parse, getErrors, formatParseError } from "./parser";

export function parseGrammar(input: string): Grammar {
  const traceTree = parse(metaGrammar, "grammar", input);
  const errors = getErrors(traceTree);
  if (errors.length > 0) {
    throw new Error(`parse errors: ${errors.map(formatParseError).join(", ")}`);
  }
  const ruleTree = extractRuleTree(traceTree);
  const grammar = extractGrammar(input, ruleTree);
  // console.log("parseGrammar", { traceTree, errors, grammar });
  return grammar;
}

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
  rule: choice([
    ref("seq"),
    ref("choice"),
    ref("ref"),
    ref("text"),
    ref("charRule"),
    ref("repSep"),
  ]),
  seq: block(squareBrackets, repSep(ref("rule"), commaSpace)),
  choice: block(parens, repSep(ref("rule"), spaceAround(text("|")))),
  ref: ident,
  text: stringLit,
  // char rules
  charRule: choice([
    ref("crNot"),
    ref("crRange"),
    ref("crLiteral"),
    ref("crAny"),
  ]),
  crNot: seq([text("^"), ref("charRule")]),
  crRange: seq([
    text("["),
    ref("singleChar"),
    text("-"),
    ref("singleChar"),
    text("]"),
  ]),
  crLiteral: seq([text("'"), ref("singleChar"), text("'")]),
  crAny: text("."),
  singleChar: charRule(anyChar), // TODO: escaping
  repSep: seq([
    text("repSep("),
    ref("rule"),
    commaSpace,
    ref("rule"),
    text(")"),
  ]),
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
  switch (rt.name) {
    case "choice":
      return choice(
        rt.children.map((item) => extractRule(input, item.children[0]))
      );
    case "seq":
      return seq(
        rt.children.map((item) => extractRule(input, item.children[0]))
      );
    case "ref":
      return ref(textForSpan(input, rt.span));
    case "text":
      const theText = text(
        textForSpan(input, {
          from: rt.span.from + 1,
          to: rt.span.to - 1,
        }).replace(/\\n/, "\n")
      );
      return theText;
    case "charRule":
      return charRule(extractCharRule(input, rt.children[0]));
    case "repSep":
      return repSep(
        extractRule(input, rt.children[0].children[0]),
        extractRule(input, rt.children[1].children[0])
      );
    default:
      throw new Error(`don't know how to extract "${rt.name}"`);
  }
}

function extractCharRule(input: string, rt: RuleTree): SingleCharRule {
  switch (rt.name) {
    case "crNot":
      return extractCharRule(input, childByName(rt, "charRule"));
    case "crRange":
      return range(
        textForSpan(input, rt.children[0].span),
        textForSpan(input, rt.children[1].span)
      );
    case "crLiteral":
      return literalChar(
        textForSpan(input, childByName(rt, "singleChar").span)
      );
    case "crAny":
      return anyChar;
  }
}
