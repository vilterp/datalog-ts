import { List, Map } from "immutable";
import { ppt } from "../pretty";
import { Rec, Rule } from "../types";
import { termEq } from "../unify";

export type Catalog = Map<string, RuleEntry | TableEntry>;

export type TableEntry = { type: "Table"; records: List<Rec> };

export type RuleEntry = { type: "Rule"; rule: Rule };

export const emptyCatalog: Catalog = Map();

export function declareTable(catalog: Catalog, name: string): Catalog {
  return catalog.set(name, { type: "Table", records: List() });
}

export function addRule(catalog: Catalog, rule: Rule): Catalog {
  return catalog.set(rule.head.relation, { type: "Rule", rule });
}

export function addFact(catalog: Catalog, fact: Rec): Catalog {
  let existing = catalog.get(fact.relation);
  if (!existing) {
    existing = { type: "Table", records: List() };
  }
  if (existing.type === "Rule") {
    throw new Error(`trying to add fact ${ppt(fact)} but that's a rule`);
  }
  const table: TableEntry = existing || {
    type: "Table",
    records: List(),
  };
  return catalog.set(fact.relation, {
    ...table,
    records: table.records.push(fact),
  });
}

export function removeFact(catalog: Catalog, fact: Rec): Catalog {
  // TODO: faster than linear time...
  const table = catalog.get(fact.relation);
  if (table.type !== "Table") {
    throw new Error(`trying to retract a fact from a rule: ${fact.relation}`);
  }
  return catalog.set(fact.relation, {
    ...table,
    records: table.records.filter((existing) => !termEq(fact, existing)),
  });
}

export function numFacts(catalog: Catalog): number {
  return catalog
    .valueSeq()
    .reduce(
      (accum, val) => accum + (val.type === "Table" ? val.records.size : 0),
      0
    );
}
