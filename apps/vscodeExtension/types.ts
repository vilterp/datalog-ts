import { Res } from "../../core/types";

export type MessageToWebView = {
  type: "Relation";
  relation: string;
  results: Res[];
};
