import { System } from "../types";
import { todoMVC } from "./todoMVC";
import { simpleCounter } from "./simpleCounter";
import { kvSyncBank, kvSyncChat, kvSyncCounter } from "./kvSync";

export const SYSTEMS: System<any, any>[] = [
  todoMVC,
  simpleCounter,
  kvSyncBank,
  kvSyncChat,
  kvSyncCounter,
];
