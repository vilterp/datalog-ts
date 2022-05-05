import * as vscode from "vscode";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { constructInterp } from "../../languageWorkbench/interp";
import { LANGUAGES, LanguageSpec } from "../../languageWorkbench/languages";
import { LOADER, mainDL } from "../../languageWorkbench/common";
import { Rec, Res } from "../../core/types";
import { dlToSpan } from "../../uiCommon/ide/types";
import { ppt } from "../../core/pretty";
import {
  idxFromLineAndCol,
  lineAndColFromIdx,
} from "../../util/indexToLineCol";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { spanToRange } from "./util";

export function getDefinition(
  doc: vscode.TextDocument,
  position: vscode.Position,
  token: vscode.CancellationToken
): vscode.ProviderResult<vscode.Definition> {
  const source = doc.getText();
  const interp = getInterp(LANGUAGES.datalog, source);
  const idx = idxFromLineAndCol(source, {
    line: position.line,
    col: position.character,
  });
  console.log("hello from getDefinition", { source, position, idx });
  console.log("hello from getDefinition 2");
  let results: Res[] = [];
  // TODO: put this try/catch elsewhere
  try {
    results = interp.queryStr(`ide.DefnAtPos{idx: ${idx}, defnSpan: US}`);
  } catch (e) {
    console.log(e);
  }
  console.log("hello from getDefinition 3", results);
  if (results.length === 0) {
    return null;
  }
  const result = results[0].term as Rec;
  const location = new vscode.Location(
    doc.uri,
    spanToRange(source, result.attrs.defnSpan as Rec)
  );
  console.log("location", location);
  return location;
}

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
