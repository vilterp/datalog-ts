import { Json, jsonEq } from "../../../../util/json";
import { QueryStatus } from "./client";
import { Client, QueryResults, useLiveQuery } from "./hooks";
import { MutationCtx, Query } from "./types";

export type Schema = { [tableName: string]: TableSchema };

export type TableSchema = {
  primaryKey: IndexDef;
  fields: { [fieldName: string]: FieldSchema };
  indexes: IndexDef[];
};

type IndexDef = string[];

export type FieldSchema = {
  type: "string" | "number";
  // TODO: references other tables
};

export type QueryCtx = {
  client: Client;
  schema: Schema;
};

export function useTablePointQuery(
  ctx: QueryCtx,
  table: string,
  equalities: [string, Json][]
): [QueryResults, QueryStatus] {
  const vals = equalities.map(
    ([attr, value]) => `${attr}-${JSON.stringify(value)}`
  );
  return useLiveQuery(
    ctx.client,
    `${table}-${vals}`,
    getQuery(ctx.schema, table, equalities)
  );
}

function getQuery(
  schema: Schema,
  table: string,
  equalities: [string, Json][]
): Query {
  const attrs = equalities.map(([attr, _]) => attr);
  const values = equalities.map(([_, value]) => value);
  const index = getIndex(schema, table, attrs);
  if (index !== null) {
    return {
      prefix: getPrimaryKeyStr(table, values),
    };
  }

  throw new Error(`No index for ${table}.[${attrs.join("_")}]`);
}

function getIndex(
  schema: Schema,
  table: string,
  attrs: string[]
): IndexDef | null {
  const tableSchema = schema[table];

  if (jsonEq(attrs, tableSchema.primaryKey)) {
    return tableSchema.primaryKey;
  }

  const res = tableSchema.indexes.find((index) => jsonEq(attrs, index));

  if (!res) {
    return null;
  }
  return res;
}

type Equalities = [string, Json][];

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
    for (const index of tableSchema.indexes) {
      const equalities: Equalities = index.map((col) => [col, row[col]]);

      const indexKey = getIndexKeyStr(table, equalities);
      this.mutationCtx.write(indexKey, primaryKey);
    }
  }

  read(table: string, equalities: Equalities): Json {
    const tableSchema = this.schema[table];
    const attrs = equalities.map(([attr, _]) => attr);
    const values = equalities.map(([_, value]) => value);

    // read primary key
    if (jsonEq(attrs, tableSchema.primaryKey)) {
      const keyStr = getPrimaryKeyStr(table, values);
      return this.mutationCtx.read(keyStr);
    }

    const index = getIndex(this.schema, table, attrs);
    if (index) {
      const keyStr = getIndexKeyStr(table, equalities);
      const primaryKeyStr = this.mutationCtx.read(keyStr) as string;
      if (!primaryKeyStr) {
        return null;
      }
      return this.mutationCtx.read(primaryKeyStr);
    }

    throw new Error(`No index for ${table}.${attrs}`);
  }
}

function getPrimaryKeyStr(table: string, values: Json[]): string {
  return `/${table}/primary/${values.map((v) => JSON.stringify(v)).join("/")}`;
}

function getIndexKeyStr(table: string, equalities: Equalities): string {
  const attrs = equalities.map(([attr, _]) => attr);
  const values = equalities.map(([_, value]) => value);

  return `/${table}/by_${attrs.join("_")}/${JSON.stringify(values)}`;
}

// initial data loading

type InitialData = { [table: string]: Json[] };
type KVPairs = { [key: string]: Json };

export function getInitialData(schema: Schema, data: InitialData): KVPairs {
  const out: KVPairs = {};

  const simpleMutationCtx: MutationCtx = {
    curUser: "system",
    rand: () => -1,
    read: (key) => {
      throw new Error(`Read not supported in initial data`);
    },
    write: (key, value) => {
      out[key] = value;
    },
  };

  const ctx = new DBCtx(schema, simpleMutationCtx);

  for (const table in data) {
    for (const row of data[table]) {
      ctx.insert(table, row);
    }
  }

  return out;
}
