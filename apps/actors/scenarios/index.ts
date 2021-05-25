import { System } from "../types";
import { scenario as todoMVC } from "./todoMVC";
import { scenario as simpleCounter } from "./simpleCounter";

export const SCENARIOS: System<any, any>[] = [todoMVC, simpleCounter];
