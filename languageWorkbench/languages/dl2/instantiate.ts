import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { nullLoader } from "../../../core/loaders";
import { SimpleInterpreter } from "../../../core/simple/interpreter";
import { compile } from "./compile";
import { extractModule } from "./extract";
import { DL2Main } from "./parser";
import { ExtractionProblem } from "./types";

export function instantiate(
  parsed: DL2Main
): [AbstractInterpreter, ExtractionProblem[]] {
  // Extract
  const problems: ExtractionProblem[] = [];
  const [mod, extractProblems] = extractModule(parsed);
  if (extractProblems.length > 0) {
    problems.push(...extractProblems);
  }

  // Compile
  const [compiled, compileProblems] = compile(mod);
  if (compileProblems.length > 0) {
    problems.push(...compileProblems);
  }

  // Instantiate
  let interp: AbstractInterpreter = new SimpleInterpreter(".", nullLoader);
  for (const rule of Object.values(compiled)) {
    interp = interp.evalStmt({ type: "Rule", rule })[1];
  }
  for (const name in mod.tableDecls) {
    interp = interp.evalStmt({ type: "TableDecl", name })[1];
    for (const fact of mod.tableDecls[name].facts) {
      interp = interp.evalStmt({ type: "Fact", record: fact })[1];
    }
  }

  return [interp, problems];
}
