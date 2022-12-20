import { Map } from "immutable";
import { Rec, Rule } from "../types";
import { LazyIndexedCollection } from "./lazyIndexedCollection";

export type DB = {
  tables: Map<string, LazyIndexedCollection>;
  rules: Map<string, Rule>;
  virtualTables: Map<string, VirtualTable>;
};

type VirtualTable = (db: DB) => Rec[];

export const emptyDB: DB = {
  tables: Map(),
  rules: Map(),
  virtualTables: Map({
    // TODO: re-enable
    // "internal.Relation": virtualRelations,
    // "internal.RelationReference": virtualReferences,
  }),
};
