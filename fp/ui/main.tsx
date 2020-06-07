import React, { useState } from "react";
import ReactDOM from "react-dom";
import { Expr, language as fpLanguage } from "../parser";
import { flatten } from "../flatten";
import { prettyPrintTerm, prettyPrintRule } from "../../pretty";
import * as pp from "prettier-printer";
import { Rec, Res, Rule, rec, Term } from "../../types";
import { Loader } from "../../repl";
// @ts-ignore
import typecheckDL from "../typecheck.dl";
// @ts-ignore
import stdlibDL from "../stdlib.dl";
import { ReplCore } from "../../replCore";
import useLocalStorage from "react-use-localstorage";
import { useBoolLocalStorage } from "./util";
import * as styles from "./styles";
import { ppt } from "../../simpleEvaluate";

const loader: Loader = (path: string) => {
  switch (path) {
    case "typecheck.dl":
      return typecheckDL;
    case "stdlib.dl":
      return stdlibDL;
  }
};

function renderResults(results: Res[]): string[] {
  return results.map((res) => pp.render(100, prettyPrintTerm(res.term)));
}

function Main() {
  const [source, setSource] = useLocalStorage(
    "source",
    "let x = 2 in toString(x)"
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
        <textarea
          onChange={(evt) => setSource(evt.target.value)}
          onKeyDown={(evt) => {
            setCursorPos(evt.target.selectionStart);
          }}
          onKeyUp={(evt) => {
            setCursorPos(evt.target.selectionStart);
          }}
          onClick={(evt) => {
            setCursorPos(evt.target.selectionStart);
          }}
          style={{ fontFamily: "monospace" }}
          cols={50}
          rows={10}
          value={source}
        />

        {error ? (
          <div style={{ marginLeft: 15, color: "red" }}>
            <h2>Parse Error</h2>
            <pre>{error}</pre>
          </div>
        ) : null}
      </div>

      <Tabs repl={repl} />

      <Collapsible
        heading="AST"
        content={<pre>{JSON.stringify(parsed, null, 2)}</pre>}
      />

      <Collapsible
        heading="Flattened AST"
        content={<pre>{rendered.join("\n")}</pre>}
      />

      <Collapsible heading="Rules" content={<pre>{typecheckDL}</pre>} />
    </div>
  );
}

function Tabs(props: { repl: ReplCore }) {
  const allRules: Relation[] = Object.keys(props.repl.db.rules)
    .sort()
    .map((name) => ({ type: "Rule", name, rule: props.repl.db.rules[name] }));
  const allTables: Relation[] = Object.keys(props.repl.db.tables)
    .sort()
    .map((name) => ({
      type: "Table",
      name,
      records: props.repl.db.tables[name],
    }));
  const allRelations: Relation[] = [...allTables, ...allRules];
  const [curRelation, setCurRelation]: [
    string,
    (v: string) => void
  ] = useLocalStorage("selected-relation", allRelations[0].name);

  return (
    <div style={{ display: "flex" }}>
      <div>
        <ul>
          {allRelations.map((rel) => (
            <li
              key={rel.name}
              style={styles.tab(rel.name === curRelation)}
              onClick={() => setCurRelation(rel.name)}
            >
              ({rel.type[0]}) {rel.name}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <RelationTable
          relation={allRelations.find((r) => r.name === curRelation)}
          repl={props.repl}
        />
      </div>
    </div>
  );
}

type Relation =
  | { type: "Table"; name: string; records: Rec[] }
  | { type: "Rule"; name: string; rule: Rule };

function RelationTable(props: { relation: Relation; repl: ReplCore }) {
  const records: Term[] =
    props.relation.type === "Table"
      ? props.relation.records
      : props.repl
          .evalStmt({
            type: "Insert",
            record: props.relation.rule.head,
          })
          .map((res) => res.term);
  return (
    <>
      {props.relation.type === "Rule" ? (
        <pre>{pp.render(100, prettyPrintRule(props.relation.rule))}</pre>
      ) : null}
      {records.length === 0 ? (
        <div style={{ marginTop: 16, fontStyle: "italic" }}>No results</div>
      ) : (
        <ul>
          {records.map((r) => (
            <li key={ppt(r)}>
              <code>{ppt(r)}</code>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Collapsible(props: { heading: string; content: React.ReactNode }) {
  const [collapsed, setCollapsed] = useBoolLocalStorage(
    `collapsed-${props.heading}`,
    false
  );

  return (
    <>
      <h3
        style={{ cursor: "pointer" }}
        onClick={() => setCollapsed(!collapsed)}
      >
        {`${collapsed ? ">" : "v"} ${props.heading}`}
      </h3>
      {collapsed ? null : props.content}
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
