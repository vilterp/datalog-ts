import { List } from "immutable";
import { ppt } from "../pretty";
import { Rec, Rule } from "../types";

export type Catalog = {
  [name: string]: RuleEntry | TableEntry;
};

type TableEntry = { type: "Table"; records: List<Rec> };

type RuleEntry = { type: "Rule"; rule: Rule };

export const emptyCatalog = {};

export function declareTable(catalog: Catalog, name: string): Catalog {
  return { ...catalog, [name]: { type: "Table", records: List() } };
}

export function addRule(catalog: Catalog, rule: Rule): Catalog {
  return { ...catalog, [rule.head.relation]: { type: "Rule", rule } };
}

export function addFact(catalog: Catalog, fact: Rec): Catalog {
  const existing = catalog[fact.relation];
  if (existing.type === "Rule") {
    throw new Error(`trying to add fact ${ppt(fact)} but that's a rule`);
  }
  const table: TableEntry = existing || {
    type: "Table",
    records: List(),
  };
  return {
    ...catalog,
    // TODO: what's the complexity of this?
    [fact.relation]: { ...table, records: table.records.push(fact) },
  };
}
