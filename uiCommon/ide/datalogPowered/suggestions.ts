import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { Rec, StringLit } from "../../../core/types";
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
        // TODO: this is sometimes tapp{}, not a string...
        const suggType = (res.bindings.Type as StringLit).val;

        return {
          kind: suggType,
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
