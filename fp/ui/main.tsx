import React, { useState } from "react";
import ReactDOM from "react-dom";
import Editor from "react-simple-code-editor/src/index";
import { Expr, language as fpLanguage, Span, Pos } from "../parser";
import { flatten } from "../flatten";
import { prettyPrintTerm } from "../../pretty";
import * as pp from "prettier-printer";
import { Rec, Res, Rule, Int } from "../../types";
import { Loader } from "../../repl";
// @ts-ignore
import typecheckDL from "../typecheck.dl";
// @ts-ignore
import stdlibDL from "../stdlib.dl";
import { ReplCore } from "../../replCore";
import useLocalStorage from "react-use-localstorage";
import { TabbedTables } from "../../uiCommon/tabbedTables";
import ReactJson from "react-json-view";
import { Collapsible } from "../../uiCommon/collapsible";

const loader: Loader = (path: string) => {
  switch (path) {
    case "typecheck.dl":
      return typecheckDL;
    case "stdlib.dl":
      return stdlibDL;
  }
};

function Main() {
  const [source, setSource] = useLocalStorage(
    "source",
    "let x = 2 in intToString(x)"
  );
  const [cursorPos, setCursorPos] = useState<number>(0);

  const repl = new ReplCore(loader);
  repl.doLoad("typecheck.dl");
  repl.doLoad("stdlib.dl");
  repl.evalStr(`cursor{idx: ${cursorPos}}.`);
  let parsed: Expr = null;
  let rendered: string[] = [];
  let error = null;
  try {
    parsed = fpLanguage.expr.tryParse(source);
    const flattened = flatten(parsed);
    const printed = flattened.map(prettyPrintTerm);
    rendered = printed.map((t) => pp.render(100, t) + ".");

    flattened.forEach((rec) =>
      repl.evalStmt({ type: "Insert", record: rec as Rec })
    );
  } catch (e) {
    error = e.toString();
  }

  return (
    <div>
      <h1>Datalog Typechecker</h1>
      <h2>Source</h2>
      <div style={{ display: "flex" }}>
        <Editor
          name="wut" // type error without this, even tho optional
          style={{
            fontFamily: "monospace",
            height: 150,
            width: 500,
            backgroundColor: "rgb(250, 250, 250)",
            border: "1px solid black",
            marginBottom: 10,
          }}
          padding={10}
          value={source}
          onValueChange={(code) => setSource(code)}
          highlight={(code) => highlight(repl, code, cursorPos)}
          onKeyDown={(evt) => {
            setCursorPos(evt.currentTarget.selectionStart);
          }}
          onKeyUp={(evt) => {
            setCursorPos(evt.currentTarget.selectionStart);
          }}
          onClick={(evt) => {
            setCursorPos(evt.currentTarget.selectionStart);
          }}
        />

        {error ? (
          <div style={{ marginLeft: 15, color: "red" }}>
            <h2>Parse Error</h2>
            <pre>{error}</pre>
          </div>
        ) : null}
      </div>

      <TabbedTables repl={repl} />

      <Collapsible
        heading="AST"
        content={
          <ReactJson
            name={null}
            enableClipboard={false}
            displayObjectSize={false}
            displayDataTypes={false}
            src={parsed}
            shouldCollapse={({ name }) => name === "span"}
          />
        }
      />
    </div>
  );
}

function highlight(repl: ReplCore, code: string, cursor: number): string {
  const usageInfo = getDefnAndUsages(repl, cursor);
  const segmented = segment(code, usageInfo);
  return segmented
    .map((segment) => {
      switch (segment.type) {
        case "normal":
          return segment.text;
        default:
          return `<span class="segment-${segment.type}">${segment.text}</span>`;
      }
    })
    .join("");
}

type SpanType = "defn" | "usage" | "normal";

type UsageInfo = { defn: Span | null; usages: Span[] };

type OutputSpan = { type: SpanType; text: string };

type UsageSpan = { type: SpanType; span: Span };

function segment(src: string, usageInfo: UsageInfo): OutputSpan[] {
  const defnSpan: UsageSpan[] =
    usageInfo.defn === null ? [] : [{ type: "defn", span: usageInfo.defn }];
  const usageSpans: UsageSpan[] = usageInfo.usages.map((span) => ({
    type: "usage",
    span,
  }));
  const allSpans: UsageSpan[] = [...usageSpans, ...defnSpan].sort(
    (a, b) => a.span.from.offset - b.span.from.offset
  );
  return recurse(src, 0, allSpans);
}

function recurse(
  src: string,
  offset: number,
  spans: UsageSpan[]
): OutputSpan[] {
  if (spans.length === 0) {
    return [];
  }
  const toIdx = spans[0].span.to.offset;
  const outSpan: OutputSpan = {
    type: spans[0].type,
    text: src.substr(offset, toIdx),
  };
  return [outSpan, ...recurse(src, toIdx, spans.slice(1))];
}

function getDefnAndUsages(repl: ReplCore, cursor: number): UsageInfo {
  const defnLoc = getDefnLoc(repl, cursor);
  return {
    defn: defnLoc,
    usages: defnLoc === null ? [] : getUsageLocs(repl, defnLoc),
  };
}

function getDefnLoc(repl: ReplCore, cursor: number): Span | null {
  const usages = repl.evalStr(
    `usage{usageLoc: span{from: pos{idx: ${cursor}}}}.`
  ).results;
  if (usages.length > 0) {
    // we're on a usage
    return dlToSpan((usages[0].term as Rec).attrs.definitionLoc as Rec);
  }
  const defn = repl.evalStr(
    `usage{definitionLoc: span{from: pos{idx: ${cursor}}}}.`
  ).results;
  if (defn.length > 0) {
    // we're on a defn
    return dlToSpan((defn[0].term as Rec).attrs.definitionLoc as Rec);
  }
  return null;
}

function getUsageLocs(repl: ReplCore, defnLoc: Span): Span[] {
  const usages = repl.evalStr(
    `usage{
      defnitionLoc: span{from: pos{idx: ${defnLoc.from.offset}}},
      usageLoc: span{from: pos{idx: UF}, to: pos{idx: UT}}
    }.`
  ).results;
  return usages.map((result) =>
    dlToSpan((result.term as Rec).attrs.usageLoc as Rec)
  );
}

function dlToSpan(rec: Rec): Span {
  return {
    from: dlToPos(rec.attrs.from as Rec),
    to: dlToPos(rec.attrs.to as Rec),
  };
}

// TODO: just have pos's be ints already so we don't have to
// fake line and column
function dlToPos(rec: Rec): Pos {
  return { offset: (rec.attrs.idx as Int).val, line: 0, column: 0 };
}

ReactDOM.render(<Main />, document.getElementById("main"));
