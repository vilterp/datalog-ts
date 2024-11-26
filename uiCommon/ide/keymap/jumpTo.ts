import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { Rec } from "../../../core/types";
import { dlToSpan } from "../../../languageWorkbench/sourcePositions";
import { EditorState } from "../types";
import { Span, EditorAction, ActionContext } from "./types";
import { getPlaceholders, getCursor, spanContainsIdx } from "./util";

export const jumpToDefnAction: EditorAction = {
  name: "Jump to Definition",
  available(ctx: ActionContext): boolean {
    const span = getDefnForCursor(ctx.interp);
    return !!span;
  },
  apply(ctx: ActionContext): EditorState {
    const span = getDefnForCursor(ctx.interp);
    return {
      ...ctx.state,
      cursorPos: span.from,
    };
  },
};

function getDefnForCursor(interp: AbstractInterpreter): Span | null {
  const res = interp.queryStr(`ide.DefnForCursor{defnLoc: S}?`);
  if (res.length === 0) {
    return null;
  }
  const firstRes = res[0].term as Rec;
  if (firstRes.attrs.defnLoc.type !== "Record") {
    // for "builtin"
    return null;
  }
  return dlToSpan(firstRes.attrs.defnLoc as Rec);
}

export const jumpToFirstUsageAction: EditorAction = {
  name: "Jump to First Usage",
  available(ctx: ActionContext): boolean {
    const span = getFirstUsageForCursor(ctx.interp);
    return !!span;
  },
  apply(ctx: ActionContext): EditorState {
    const span = getFirstUsageForCursor(ctx.interp);
    return {
      ...ctx.state,
      cursorPos: span.from,
    };
  },
};

function getFirstUsageForCursor(interp: AbstractInterpreter): Span | null {
  const res = interp.queryStr(`ide.UsageForCursor{usageSpan: S}?`);
  if (res.length === 0) {
    return null;
  }
  if (res[0].term.type !== "Record") {
    // for "builtin"
    return null;
  }
  return dlToSpan((res[0].term as Rec).attrs.usageSpan as Rec);
}

export const jumpToErrorAction: EditorAction = {
  name: "Jump to First Error",
  available(ctx: ActionContext): boolean {
    return getProblems(ctx.interp).length > 0;
  },
  apply(ctx: ActionContext): EditorState {
    const errors = getProblems(ctx.interp);
    console.log(errors);
    return {
      ...ctx.state,
      cursorPos: errors[0].offset,
    };
  },
};

function getProblems(interp: AbstractInterpreter): { offset: number }[] {
  const offsets = interp.queryStr("tc.Problem{span: S}?").map((res) => {
    const rec = res.term as Rec;
    const span = dlToSpan(rec.attrs.span as Rec);
    return span.from;
  });
  return offsets.map((offset) => ({
    offset,
  }));
}

export const jumpToFirstPlaceholderAction: EditorAction = {
  name: "Jump to Placeholder",
  available(ctx: ActionContext): boolean {
    const placeholders = getPlaceholders(ctx.interp);
    const cursorPos = getCursor(ctx.interp);
    return (
      placeholders.length > 0 && !spanContainsIdx(placeholders[0], cursorPos)
    );
  },
  apply(ctx: ActionContext): EditorState {
    return {
      ...ctx.state,
      cursorPos: getPlaceholders(ctx.interp)[0].from,
    };
  },
};
