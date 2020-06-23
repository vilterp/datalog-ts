import { ReplCore } from "../../replCore";
import { Rec, StringLit, Term, Bool } from "../../types";
import { dlToSpan } from "./highlight";
import { uniqBy, repeatArr } from "../../util";

export type Suggestion = { name: string; type: Term; typeMatch: boolean };

export function getSuggestions(repl: ReplCore): Suggestion[] {
  const suggs = repl
    .evalStr("current_suggestion{name: N, type: T, typeMatch: M}.")
    .results.map((res) => {
      const rec = res.term as Rec;
      return {
        name: (rec.attrs.name as StringLit).val,
        type: rec.attrs.type,
        typeMatch: (rec.attrs.typeMatch as Bool).val,
      };
    });
  return uniqBy(suggs, (s) => s.name);
}

export function typeToString(typeTerm: Term): string {
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

export function insertSuggestion(
  repl: ReplCore,
  code: string,
  sugg: Suggestion
): { newCode: string; cursorPos: number } {
  const currentPlaceholder = repl.evalStr("current_placeholder{span: S}.")
    .results[0].term as Rec;
  const span = dlToSpan(currentPlaceholder.attrs.span as Rec);
  const numPlaceholders = placeholdersNeeded(sugg.type);
  // if there are placeholders, put cursor on first placeholder
  const cursorPos =
    span.from + sugg.name.length + (numPlaceholders === 0 ? 0 : 1);
  return {
    newCode:
      code.substring(0, span.from) +
      suggToString(sugg) +
      code.substring(span.to),
    cursorPos,
  };
}

function suggToString(sugg: Suggestion): string {
  const numPlaceholders = placeholdersNeeded(sugg.type);
  if (numPlaceholders === 0) {
    return sugg.name;
  }
  return `${sugg.name}(${repeatArr(numPlaceholders, "???").join(", ")})`;
}
