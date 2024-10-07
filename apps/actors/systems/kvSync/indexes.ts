import { Json, jsonEq } from "../../../../util/json";
import { MutationCtx, QueryCtx, QueryResults } from "./types";

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

export class DBQueryCtx<T extends QueryCtx = QueryCtx> {
  schema: Schema;
  queryCtx: T;

  constructor(schema: Schema, queryCtx: T) {
    this.schema = schema;
    this.queryCtx = queryCtx;
  }

  read(table: string, equalities: Equalities): Json {
    const tableSchema = this.schema[table];
    const attrs = equalities.map(([attr, _]) => attr);
    const values = equalities.map(([_, value]) => value);

    // read primary key
    if (jsonEq(attrs, tableSchema.primaryKey)) {
      const keyStr = getPrimaryKeyStr(table, values);
      return this.queryCtx.read(keyStr);
    }

    const index = getIndex(this.schema, table, attrs);
    if (index) {
      const keyStr = getIndexKeyStr(table, equalities);
      const primaryKeyStr = this.queryCtx.read(keyStr) as string;
      if (!primaryKeyStr) {
        return null;
      }
      return this.queryCtx.read(primaryKeyStr);
    }

    throw new Error(`No index for ${table}.${attrs}`);
  }

  readAll(tableName: string, equalities: Equalities): QueryResults {
    throw new Error(`readAll not implemented`);
  }
}

export class DBCtx extends DBQueryCtx<MutationCtx> {
  constructor(schema: Schema, mutationCtx: MutationCtx) {
    super(schema, mutationCtx);
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

    this.queryCtx.write(keyStr, row);

    // write indexes
    for (const index of tableSchema.indexes) {
      const equalities: Equalities = index.map((col) => [col, row[col]]);

      const indexKey =
        getIndexKeyStr(table, equalities) + "/" + primaryKey.join("/");
      this.queryCtx.write(indexKey, null);
    }
  }
}

function getPrimaryKeyStr(table: string, values: Json[]): string {
  return `/${table}/primary/${values.map((v) => JSON.stringify(v)).join("/")}`;
}

export function getIndexKeyStr(table: string, equalities: Equalities): string {
  const attrs = equalities.map(([attr, _]) => attr);
  const values = equalities.map(([_, value]) => value);

  return `/${table}/by_${attrs.join("_")}/${values
    .map((v) => JSON.stringify(v))
    .join("/")}`;
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
    readAll: (prefix) => {
      throw new Error(`ReadAll not supported in initial data`);
    },
    trace: [],
  };

  const ctx = new DBCtx(schema, simpleMutationCtx);

  for (const table in data) {
    for (const row of data[table]) {
      ctx.insert(table, row);
    }
  }

  return out;
}
