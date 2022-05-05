import * as vscode from "vscode";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { constructInterp } from "../../languageWorkbench/interp";
import { LANGUAGES, LanguageSpec } from "../../languageWorkbench/languages";
import { LOADER, mainDL } from "../../languageWorkbench/common";
import { Rec } from "../../core/types";
import { dlToSpan } from "../../uiCommon/ide/types";
import { ppt } from "../../core/pretty";
import { lineAndColFromIdx } from "../../util/indexToLineCol";
import { AbstractInterpreter } from "../../core/abstractInterpreter";

export function refreshDiagnostics(
  doc: vscode.TextDocument,
  diagnostics: vscode.DiagnosticCollection
) {
  const source = doc.getText();

  const interp = getInterp(LANGUAGES.datalog, source);

  const problems = interp.queryStr("tc.Problem{}");
  const diags = problems.map((res) =>
    problemToDiagnostic(source, res.term as Rec)
  );
  diagnostics.set(doc.uri, diags);
}

function problemToDiagnostic(source: string, rec: Rec): vscode.Diagnostic {
  const span = dlToSpan(rec.attrs.span as Rec);
  const from = lineAndColFromIdx(source, span.from);
  const to = lineAndColFromIdx(source, span.to);

  const range = new vscode.Range(from.line, from.col, to.line, to.col);
  return new vscode.Diagnostic(range, ppt(rec.attrs.desc));
}

function getInterp(
  language: LanguageSpec,
  source: string
): AbstractInterpreter {
  const { finalInterp } = constructInterp({
    initInterp: new SimpleInterpreter(".", LOADER),
    builtinSource: mainDL,
    dlSource: language.datalog,
    grammarSource: language.grammar,
    langSource: source,
  });
  return finalInterp;
}
