import { mapListToObj } from "../../util/util";
import {
  GrammarCharRule,
  GrammarMain,
  GrammarRule,
} from "../languages/grammar/parser";
import { CharRule, Grammar, Rule, SingleCharRule } from "./types";

export function parserGrammarToInternal(grammar: GrammarMain): Grammar {
  return mapListToObj(
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
        // TODO: de-escape
        value: rule.stringChar.map((sc) => sc.text).join(""),
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
      // TODO: de-escape
      return { type: "Literal", value: rule.text };
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
