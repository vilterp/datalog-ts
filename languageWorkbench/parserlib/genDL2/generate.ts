import { flatMap, mapObj, objToPairs, pairsToObj } from "../../../util/util";
import { TableDecl, TableMember } from "../../languages/dl2/compiler/types";
import { Grammar, Rule } from "../types";

const DEFAULT_LEAVES = new Set(["ident", "string", "int", "ws"]);

const PREFIX = "ast.";

export function generateTableDecls(
  grammar: Grammar,
  leaves = DEFAULT_LEAVES
): {
  [name: string]: TableDecl;
} {
  return pairsToObj(
    objToPairs(grammar).map(([name, rule]) => {
      const rawRefs = findRefs(rule);
      const refs = leaves.has(name) ? [] : rawRefs;
      return {
        key: PREFIX + name,
        value: {
          members: pairsToObj([
            { key: "id", value: { type: "Scalar" } },
            { key: "parentID", value: { type: "Scalar" } },
            { key: "text", value: { type: "Scalar" } },
            { key: "span", value: { type: "Scalar" } },
            ...refs.map((ref): { key: string; value: TableMember } => ({
              key: ref.captureName,
              value: {
                type: "InRef",
                table: PREFIX + ref.rule,
                column: "parentID",
              },
            })),
          ]),
          facts: [],
        },
      };
    })
  );
}

type RuleRef = {
  captureName: string;
  rule: string;
};

function findRefs(rule: Rule): RuleRef[] {
  switch (rule.type) {
    case "Char":
      return [];
    case "Choice":
      return flatMap(rule.choices, findRefs);
    case "Ref": {
      const out = [{ rule: rule.rule, captureName: rule.rule }];
      if (rule.captureName) {
        out.push({ rule: rule.rule, captureName: rule.captureName });
      }
      return out;
    }
    case "RepSep":
      return [...findRefs(rule.rep), ...findRefs(rule.sep)];
    case "Sequence":
      return flatMap(rule.items, findRefs);
    case "Text":
      return [];
  }
}
