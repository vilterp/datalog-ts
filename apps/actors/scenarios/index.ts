import { Scenario } from "../types";
import { scenario as todoMVC } from "./todoMVC";
import { scenario as simpleCounter } from "./simpleCounter";

export const SCENARIOS: Scenario<any, any>[] = [todoMVC, simpleCounter];
