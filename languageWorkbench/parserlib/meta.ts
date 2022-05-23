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
  notChar,
  notToken,
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
  opt,
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
  const errors = getErrors(input, traceTree);
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
  grammar: notToken(
    repSep(choice([ref("ruleDefn"), ref("comment")]), whitespace)
  ),
  ruleDefn: notToken(
    seq([
      opt(seq([text("@token"), whitespace])),
      ref("ruleName"),
      spaceAround(text(":-")),
      ref("rule"),
      text("."),
    ])
  ),
  comment: notToken(seq([text("#"), repSep(ref("commentChar"), text(""))])),
  ruleName: notToken(ident),
  rule: notToken(
    choice([
      ref("seq"),
      ref("choice"),
      ref("ref"),
      ref("text"),
      ref("charRule"),
      ref("repSep"),
    ])
  ),
  seq: block(squareBrackets, repSep(ref("rule"), commaSpace)),
  choice: block(parens, repSep(ref("rule"), spaceAround(text("|")))),
  ref: seq([opt(seq([ref("captureName"), text(":")])), ref("ruleName")]),
  captureName: ident,
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
  singleChar: choice([text("\\n"), text("\\\\"), charRule(anyChar)]), // TODO: escaping
  commentChar: charRule(notChar(literalChar("\n"))),
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
  rt.children.forEach((ruleDefnOrComment) => {
    if (ruleDefnOrComment.name === "comment") {
      return;
    }
    const name = textForSpan(
      input,
      childByName(ruleDefnOrComment, "ruleName").span
    );
    const rule = extractRule(
      input,
      childByName(ruleDefnOrComment, "rule").children[0]
    );
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
      const captureName = childByName(rt, "captureName");
      const ruleName = childByName(rt, "ruleName");
      const captureNameText = captureName
        ? textForSpan(input, captureName.span)
        : null;
      const ruleNameText = textForSpan(input, ruleName.span);
      return ref(ruleNameText, captureNameText);
    case "text":
      const theText = text(
        textForSpan(input, {
          from: rt.span.from + 1,
          to: rt.span.to - 1,
        })
          .replace(/\\n/, "\n")
          .replace(/\\"/, '"')
          .replace(/\\\\/, "\\")
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
      return notChar(
        extractCharRule(input, childByName(rt, "charRule").children[0])
      );
    case "crRange":
      return range(
        textForSpan(input, rt.children[0].span),
        textForSpan(input, rt.children[1].span)
      );
    case "crLiteral": {
      const text = textForSpan(input, childByName(rt, "singleChar").span);
      switch (text) {
        case "\\n":
          return literalChar("\n");
        case "\\\\":
          return literalChar("\\");
        default:
          return literalChar(text);
      }
    }
    case "crAny":
      return anyChar;
    default:
      throw new Error(`unknown char rule type: ${rt.name}`);
  }
}
