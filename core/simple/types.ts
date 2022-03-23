import { Rec, Rule } from "../types";
import { Map } from "immutable";

export interface DB {
  tables: Map<string, Rec[]>;
  rules: Map<string, Rule>;
  virtualTables: { [name: string]: VirtualTable };
}

type VirtualTable = (db: DB) => Rec[];
