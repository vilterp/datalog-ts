import { StringLit, Rec, Bool, Term } from "../../types";
import { Suggestion } from "../../uiCommon/ide/suggestions";
import { Interpreter } from "../../incremental/interpreter";
import { repeatArr, uniqBy } from "../../util";
import { getCurrentPlaceholder } from "../../uiCommon/ide/util";
import { Span } from "../../uiCommon/ide/types";

// TODO: derive more of this from the grammar & rules :P

export function getSuggestions(interp: Interpreter): Suggestion[] {
  const replacementSpan = getCurrentPlaceholder(interp);
  if (replacementSpan === null) {
    return [];
  }
  const varSuggs: Suggestion[] = uniqBy(
    interp
      .queryStr("ide.CurrentSuggestion{name: N, type: T, typeMatch: M}")
      .map(
        (res): Suggestion => {
          const rec = res.term as Rec;
          const type = rec.attrs.type as Rec;
          const name = (rec.attrs.name as StringLit).val;
          const numPlaceholders = placeholdersNeeded(type);
          const typeMatch = (rec.attrs.typeMatch as Bool).val;

          return {
            kind: typeToString(rec.attrs.type),
            textToInsert:
              numPlaceholders === 0
                ? name
                : `${name}(${repeatArr(numPlaceholders, "???").join(", ")})`,
            cursorOffsetAfter:
              numPlaceholders === 0 ? name.length : name.length + 1,
            bold: typeMatch,
            replacementSpan,
            display: name,
          };
        }
      ),
    (s) => s.textToInsert
  );
  const syntaxSuggs: Suggestion[] = [
    {
      kind: "let",
      replacementSpan: replacementSpan,
      textToInsert: "let x = ??? in ???",
      cursorOffsetAfter: "let x = ".length,
      bold: false,
    },
    {
      kind: "lambda",
      replacementSpan: replacementSpan,
      textToInsert: "(x: int): int => ???",
      cursorOffsetAfter: "(x: int): int => ".length,
      bold: false,
    },
    mkLiteralSuggestion(replacementSpan, "2", "int"),
    mkLiteralSuggestion(replacementSpan, `"hello"`, "string"),
  ];
  return [...varSuggs, ...syntaxSuggs];
}

function typeToString(typeTerm: Term): string {
  switch (typeTerm.type) {
    case "StringLit":
      return typeTerm.val;
    case "Record":
      if (typeTerm.relation !== "tapp") {
        throw new Error(`unexpected type: ${typeTerm.relation}`);
      }
      const from = (typeTerm.attrs.from as StringLit).val;
      const to = typeToString(typeTerm.attrs.to);
      return `${from} -> ${to}`;
  }
}

function placeholdersNeeded(typeTerm: Term): number {
  switch (typeTerm.type) {
    case "StringLit":
      return 0;
    case "Record":
      if (typeTerm.relation !== "tapp") {
        throw new Error(`unexpected type: ${typeTerm.relation}`);
      }
      return 1 + placeholdersNeeded(typeTerm.attrs.to);
  }
}

function mkLiteralSuggestion(
  replacementSpan: Span,
  contents: string,
  kind: string
): Suggestion {
  return {
    bold: false,
    cursorOffsetAfter: contents.length,
    kind,
    textToInsert: contents,
    replacementSpan,
  };
}
