import * as vscode from "vscode";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { constructInterp } from "../../uiCommon/ide/dlPowered/interp";
import { LANGUAGES } from "../../uiCommon/ide/dlPowered/languages";
import { LOADER, mainDL } from "../../uiCommon/ide/dlPowered/common";
import { Rec } from "../../core/types";
import { dlToSpan } from "../../uiCommon/ide/types";
import { ppt } from "../../core/pretty";
import { lineAndColFromIdx } from "../../util/indexToLineCol";

export function refreshDiagnostics(
  doc: vscode.TextDocument,
  diagnostics: vscode.DiagnosticCollection
) {
  console.log("refresh diagnostics");
  const source = doc.getText();

  const { finalInterp } = constructInterp({
    initInterp: new SimpleInterpreter(".", LOADER),
    builtinSource: mainDL,
    dlSource: LANGUAGES.datalog.datalog,
    grammarSource: LANGUAGES.datalog.grammar,
    langSource: source,
  });

  const problems = finalInterp.queryStr("tc.Problem{}");
  console.log(
    "problems",
    problems.map((r) => ppt(r.term))
  );
  const diags = problems.map((res) =>
    problemToDiagnostic(source, res.term as Rec)
  );
  diagnostics.set(doc.uri, diags);
}

function problemToDiagnostic(source: string, rec: Rec): vscode.Diagnostic {
  const span = dlToSpan(rec.attrs.span as Rec);
  const from = lineAndColFromIdx(source, span.from);
  const to = lineAndColFromIdx(source, span.to);

  console.log("problem", { span, from, to });

  const range = new vscode.Range(from.line, from.col, to.line, to.col);
  return new vscode.Diagnostic(range, ppt(rec.attrs.desc));
}
