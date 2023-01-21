import { pairsToObj } from "../../util/util";
import {
  GrammarCharRule,
  GrammarMain,
  GrammarRule,
} from "../languages/grammar/parser";
import { deEscape, Grammar, Rule, SingleCharRule } from "./types";

export function parserGrammarToInternal(grammar: GrammarMain): Grammar {
  return pairsToObj(
    grammar.ruleDefn.map((defn) => ({
      key: defn.ident.text,
      value: parserRuleToInternal(defn.rule),
    }))
  );
}

function parserRuleToInternal(rule: GrammarRule): Rule {
  switch (rule.type) {
    case "Text":
      return {
        type: "Text",
        value: deEscape(rule.stringChar.map((sc) => sc.text).join("")),
      };
    case "Choice":
      return { type: "Choice", choices: rule.rule.map(parserRuleToInternal) };
    case "Seq":
      return { type: "Sequence", items: rule.rule.map(parserRuleToInternal) };
    case "RepSep":
      return {
        type: "RepSep",
        rep: parserRuleToInternal(rule.rep),
        sep: parserRuleToInternal(rule.sep),
      };
    case "Ref":
      return {
        type: "Ref",
        captureName: rule.captureName ? rule.captureName.text : null,
        rule: rule.ruleName.text,
      };
    case "Placeholder":
      // TODO: idk
      return { type: "Ref", captureName: "", rule: "???" };
    default:
      return { type: "Char", rule: parserCharRuleToInternal(rule) };
  }
}

function parserCharRuleToInternal(rule: GrammarCharRule): SingleCharRule {
  switch (rule.type) {
    case "SingleChar":
      return {
        type: "Literal",
        // TODO: hate to slice like this instead of using something about the rule tree...
        value: deEscape(rule.text.slice(1, rule.text.length - 1)),
      };
    case "NotChar":
      return { type: "Not", rule: parserCharRuleToInternal(rule.charRule) };
    case "AnyChar":
      return { type: "AnyChar" };
    case "CharRange":
      return {
        type: "Range",
        from: rule.from.text,
        to: rule.to.text,
      };
  }
}
