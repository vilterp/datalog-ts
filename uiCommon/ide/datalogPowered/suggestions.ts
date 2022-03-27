import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { ppt } from "../../../core/pretty";
import { Rec, StringLit, Term } from "../../../core/types";
import { uniqBy } from "../../../util/util";
import { Suggestion } from "../suggestions";
import { dlToSpan } from "../types";

export function getSuggestions(interp: AbstractInterpreter) {
  return uniqBy(
    interp
      .queryStr("ide.CurrentSuggestion{name: Name, span: Span, type: Type}")
      .map((res): Suggestion => {
        const name = (res.bindings.Name as StringLit).val;
        const replacementSpan = dlToSpan(res.bindings.Span as Rec);

        return {
          kind: getTypeString(res.bindings.Type),
          textToInsert: name,
          cursorOffsetAfter: name.length,
          bold: false,
          replacementSpan,
          display: name,
        };
      }),
    (s) => s.textToInsert
  );
}

function getTypeString(term: Term): string {
  switch (term.type) {
    case "StringLit":
      return term.val;
    case "Record":
      // special-case `tapp`, used by FP for functions
      // TODO: should probably have a better name at least
      if (term.relation === "tapp") {
        return `${getTypeString(term.attrs.from)} -> ${getTypeString(
          term.attrs.to
        )}`;
      }
      return ppt(term);
    case "Var":
      return null;
    default:
      return ppt(term);
  }
}
