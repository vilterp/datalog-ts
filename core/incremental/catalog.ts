import { List } from "immutable";
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
  const table: TableEntry = catalog.tables[fact.relation] || {
    type: "Table",
    records: List(),
  };
  return {
    ...catalog,
    tables: {
      ...catalog.tables,
      // TODO: what's the complexity of this?
      [fact.relation]: { ...table, records: table.records.push(fact) },
    },
  };
}
