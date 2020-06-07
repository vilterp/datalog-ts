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
    repl.evalStr(`cursor{idx: ${cursorPos}}.`);
  } catch (e) {
    error = e.toString();
  }

  return (
    <div>
      <h1>Datalog Typechecker</h1>
      <h2>Source</h2>
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
        <>
          <h2>Parse Error</h2>
          <pre>{error}</pre>
        </>
      ) : null}

      <Collapsible
        heading="AST"
        content={<pre>{JSON.stringify(parsed, null, 2)}</pre>}
      />

      <Tabs repl={repl} />

      <Collapsible
        heading="Flattened"
        content={<pre>{rendered.join("\n")}</pre>}
      />

      <Query heading="Cursor" query="cursor{idx: I}." repl={repl} />

      <Query
        heading="Scope"
        query="scope_item{id: I, name: N, type: T}."
        repl={repl}
      />

      <Query heading="Types" query="type{id: I, type: T}." repl={repl} />

      <Query
        heading="Suggestions"
        query="suggestion{id: I, name: N, type: T}."
        repl={repl}
      />

      <Query
        heading="Parent"
        query="parent_expr{id: I, parentID: P}."
        repl={repl}
      />

      <Collapsible heading="Builtins" content={<pre>{stdlibDL}</pre>} />

      <Collapsible heading="Rules" content={<pre>{typecheckDL}</pre>} />
    </div>
  );
}

function Query(props: { heading: string; query: string; repl: ReplCore }) {
  try {
    const results = props.repl.evalStr(props.query);
    return (
      <Collapsible
        heading={props.heading}
        content={<pre>{renderResults(results).sort().join("\n")}</pre>}
      />
    );
  } catch (e) {
    return (
      <Collapsible
        heading={props.heading}
        content={<pre style={{ color: "red" }}>{e.toString()}</pre>}
      />
    );
  }
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
  const [curRelation, setCurRelation] = useState<Relation>(allRelations[0]);

  return (
    <div style={{ display: "flex" }}>
      <div>
        <ul>
          {allRelations.map((rel) => (
            <li
              key={rel.name}
              style={styles.tab(rel.name === curRelation.name)}
              onClick={() => setCurRelation(rel)}
            >
              ({rel.type[0]}) {rel.name}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <RelationTable relation={curRelation} repl={props.repl} />
      </div>
    </div>
  );
}

type Relation =
  | { type: "Table"; name: string; records: Rec[] }
  | { type: "Rule"; name: string; rule: Rule };

function RelationTable(props: { relation: Relation; repl: ReplCore }) {
  console.log(props);
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
      <ul>
        {records.map((r) => (
          <li key={ppt(r)}>
            <code>{ppt(r)}</code>
          </li>
        ))}
      </ul>
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
