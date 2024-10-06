import { Json, jsonEq } from "../../../../util/json";
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
    this.write(table, row);
  }

  update(table: string, row: Json) {
    this.write(table, row);
  }

  private write(table: string, row: Json) {
    // write all indexes
    const tableSchema = this.schema[table];

    // write primary key
    const primaryKey = tableSchema.primaryKey.map((key) => row[key]);
    const keyStr = getPrimaryKeyStr(table, primaryKey);

    this.mutationCtx.write(keyStr, row);

    // write indexes
    for (const indexName in tableSchema.indexes) {
      const indexVal = row[indexName];
      const indexKey = getIndexKeyStr(table, indexName, indexVal);
      this.mutationCtx.write(indexKey, primaryKey);
    }
  }

  read(table: string, attr: string, value: Json): Json {
    const tableSchema = this.schema[table];

    // read primary key
    if (jsonEq([attr], tableSchema.primaryKey)) {
      const keyStr = getPrimaryKeyStr(table, [value]);
      return this.mutationCtx.read(keyStr);
    }

    if (tableSchema.indexes[attr]) {
      const keyStr = getIndexKeyStr(table, attr, value);
      return this.mutationCtx.read(keyStr);
    }

    throw new Error(`No index for ${table}.${attr}`);
  }
}

function getPrimaryKeyStr(table: string, values: Json[]): string {
  return `${table}/primary/${values.map((v) => JSON.stringify(v)).join("/")}`;
}

function getIndexKeyStr(table: string, indexName: string, value: Json): string {
  return `${table}/by_${indexName}/${JSON.stringify(value)}`;
}
