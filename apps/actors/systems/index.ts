import { System } from "../types";
import { todoMVC } from "./todoMVC";
import { simpleCounter } from "./simpleCounter";
import { kvSync } from "./kvSync";

export const SYSTEMS: System<any, any>[] = [todoMVC, simpleCounter, kvSync];
