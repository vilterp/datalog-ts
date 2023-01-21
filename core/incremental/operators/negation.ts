import { MessagePayload } from "../types";

export function processNegation(payload: MessagePayload): MessagePayload[] {
  return [{ ...payload, multiplicity: -payload.multiplicity }];
}
