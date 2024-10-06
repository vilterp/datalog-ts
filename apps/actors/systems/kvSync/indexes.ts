import { Json } from "../../../../util/json";
import { MutationCtx } from "./types";

export type Schema = { [tableName: string]: TableSchema };

export type TableSchema = {
  primaryKey: string[];
  fields: { [fieldName: string]: FieldSchema };
  indexes: { [indexName: string]: boolean };
};

export type FieldSchema = {
  type: "string" | "number";
  // TODO: references other tables
};

export class DBCtx {
  schema: Schema;
  mutationCtx: MutationCtx;

  constructor(schema: Schema, mutationCtx: MutationCtx) {
    this.schema = schema;
    this.mutationCtx = mutationCtx;
  }

  insert(table: string, row: Json) {
    // write all indexes
    return XXX;
  }

  update(table: string, row: Json) {
    // write all indexes
    return XXX;
  }

  read(table: string, attr: Json, value: Json): Json {
    // find the right index
    return XXX;
  }
}
