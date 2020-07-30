import { Statement } from "../types";

export type ToClient =
  | {
      type: "Broadcast";
      body: Statement;
    }
  | { type: "Error"; msg: string };

export type ToServer = { type: "Statement"; body: Statement };
