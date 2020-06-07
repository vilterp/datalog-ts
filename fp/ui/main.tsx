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
import ReactJson from "react-json-view";

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
      <div
        style={{
          padding: 15,
          border: "1px solid black",
          width: 150,
        }}
      >
        <h4 style={{ marginBottom: 5, marginTop: 5 }}>Tables</h4>
        {relList(allTables, curRelation, setCurRelation)}
        <h4 style={{ marginBottom: 5, marginTop: 5 }}>Rules</h4>
        {relList(allRules, curRelation, setCurRelation)}
      </div>
      <div style={{ padding: 10, border: "1px solid black", flexGrow: 1 }}>
        <RelationTable
          relation={allRelations.find((r) => r.name === curRelation)}
          repl={props.repl}
        />
      </div>
    </div>
  );
}

function relList(
  relations: Relation[],
  curRelation: string,
  setCurRelation: (s: string) => void
) {
  return (
    <ul style={{ marginTop: 0, marginBottom: 0, paddingLeft: 20 }}>
      {relations.map((rel) => (
        <li
          key={rel.name}
          style={styles.tab(rel.name === curRelation)}
          onClick={() => setCurRelation(rel.name)}
        >
          {rel.name}
        </li>
      ))}
    </ul>
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
  const fields =
    records.length === 0
      ? []
      : (props.relation.type === "Rule"
          ? Object.keys(props.relation.rule.head.attrs)
          : Object.keys((props.relation.records[0] as Rec).attrs)
        ).sort((a, b) => fieldComparator(a).localeCompare(fieldComparator(b)));
  return (
    <>
      {props.relation.type === "Rule" ? (
        <pre style={{ marginTop: 5 }}>
          {pp.render(100, prettyPrintRule(props.relation.rule))}
        </pre>
      ) : null}
      {records.length === 0 ? (
        <div style={{ fontStyle: "italic" }}>No results</div>
      ) : (
        <table style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid black" }}>
              {fields.map((name) => (
                <th key={name} style={{ paddingLeft: 5, paddingRight: 5 }}>
                  <code>{name}</code>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={ppt(record)}>
                {fields.map((field) => (
                  <td
                    key={field}
                    style={{
                      paddingLeft: 5,
                      paddingRight: 5,
                      borderLeft: "1px solid lightgrey",
                      borderRight: "1px solid lightgrey",
                    }}
                  >
                    <code>{ppt((record as Rec).attrs[field])}</code>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function fieldComparator(field: string): string {
  return field === "id" ? "aaaaa_id" : field;
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
