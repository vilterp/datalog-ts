import { LanguageSpec } from "../commonDL/types";
import { basicBlocks } from "./basicBlocks";
import { contracts } from "./contracts";
import { datalog } from "./dl";
import { fp } from "./fp";
import { grammar } from "./grammar";
import { json } from "./json";
import { modelica } from "./modelica";
import { sql } from "./sql";
import { treeSQL } from "./treeSQL";
import { plainText } from "./plainText";

export const LANGUAGES: { [name: string]: LanguageSpec } = {
  plainText,
  datalog,
  json,
  basicBlocks,
  grammar,
  fp,
  sql,
  treeSQL,
  modelica,
  contracts,
};
