import { System } from "../types";
import { todoMVC } from "./todoMVC";
import { simpleCounter } from "./simpleCounter";
import { kvSyncBank, kvSyncChat, kvSyncCounter, kvSyncTodoMVC } from "./kvSync";

export const SYSTEMS: System<any, any>[] = [
  todoMVC,
  simpleCounter,
  kvSyncCounter,
  kvSyncTodoMVC,
  kvSyncBank,
  kvSyncChat,
];
