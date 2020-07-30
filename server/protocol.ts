import { Statement } from "../types";

export type ToClient =
  | {
      type: "Broadcast";
      body: Statement;
    }
  | { type: "Error"; msg: string };
