import { System } from "../types";
import { todoMVC } from "./todoMVC";
import { simpleCounter } from "./simpleCounter";

export const SYSTEMS: System<any, any>[] = [todoMVC, simpleCounter];
