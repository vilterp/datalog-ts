import { System } from "../types";
import { todoMVC } from "./todoMVC";
import { simpleCounter } from "./simpleCounter";
import { KVSYNC_SYSTEMS } from "./kvSync";

export const SYSTEMS: System<any, any>[] = [
  todoMVC,
  simpleCounter,
  ...KVSYNC_SYSTEMS,
];
