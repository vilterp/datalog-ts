import { ppt } from "../pretty";
import { Rec, Rule } from "../types";
import { termEq } from "../unify";

export type Catalog = Map<string, RuleEntry | TableEntry>;

export type TableEntry = { type: "Table"; records: Rec[] };

export type RuleEntry = { type: "Rule"; rule: Rule };

export function emptyCatalog(): Catalog {
  return new Map();
}

export function declareTable(catalog: Catalog, name: string): Catalog {
  return catalog.set(name, { type: "Table", records: [] });
}

export function addRule(catalog: Catalog, rule: Rule): Catalog {
  return catalog.set(rule.head.relation, { type: "Rule", rule });
}

export function addFact(catalog: Catalog, fact: Rec): Catalog {
  let existing = catalog.get(fact.relation);
  if (!existing) {
    existing = { type: "Table", records: [] };
  }
  if (existing.type === "Rule") {
    throw new Error(`trying to add fact ${ppt(fact)} but that's a rule`);
  }
  const table: TableEntry = existing || {
    type: "Table",
    records: [],
  };
  table.records.push(fact);
  return catalog;
}

export function removeFact(catalog: Catalog, fact: Rec): Catalog {
  // TODO: faster than linear time...
  const table = catalog.get(fact.relation);
  if (table.type !== "Table") {
    throw new Error("trying to retract a fact from a rule");
  }
  return catalog.set(fact.relation, {
    ...table,
    records: table.records.filter((existing) => !termEq(fact, existing)),
  });
}

export function numFacts(catalog: Catalog): number {
  let output = 0;
  for (const entry of catalog.values()) {
    if (entry.type === "Table") {
      output += entry.records.length;
    }
  }
  return output;
}
