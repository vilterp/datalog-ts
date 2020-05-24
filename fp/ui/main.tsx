import React, { useState } from "react";
import ReactDOM from "react-dom";
import { language as fpLanguage } from "../parser";
import { language as dlLanguage } from "../../parser";
import { flatten } from "../flatten";
import { prettyPrintTerm } from "../../pretty";
import * as pp from "prettier-printer";
import { DB, Program, Rec, Res, Statement } from "../../types";
import { evaluate, hasVars } from "../../simpleEvaluate";
import { Loader } from "../../repl";
// @ts-ignore
import typecheckDL from "../typecheck.dl";
// @ts-ignore
import stdlibDL from "../stdlib.dl";

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
  const [source, setSource] = useState("let x = 2 in toString(x)");

  const repl = new ReplCore(loader);
  repl.doLoad("typecheck.dl");
  repl.doLoad("stdlib.dl");
  let rendered: string[] = [];
  let scopeItems: Res[] = [];
  let types: Res[] = [];
  let error = null;
  try {
    const parsed = fpLanguage.expr.tryParse(source);
    const flattened = flatten(parsed);
    const printed = flattened.map(prettyPrintTerm);
    rendered = printed.map((t) => pp.render(100, t) + ".");

    flattened.forEach((rec) =>
      repl.evalStmt({ type: "Insert", record: rec as Rec })
    );
    scopeItems = repl.evalStr("scope_item{id: I, name: N, type: T}.");
    types = repl.evalStr("type{id: I, type: T}.");
  } catch (e) {
    error = e.toString();
  }

  console.log({ rendered, scopeItems, types, db: repl.db });

  return (
    <div>
      <h1>Datalog Typechecker</h1>
      <h2>Source</h2>
      <textarea
        onChange={(evt) => setSource(evt.target.value)}
        style={{ fontFamily: "monospace" }}
        cols={50}
        rows={10}
        value={source}
      />

      {error ? (
        <>
          <h2>Error</h2>
          <pre>{error}</pre>
        </>
      ) : null}

      <h2>Flattened AST</h2>
      <pre>{rendered.join("\n")}</pre>

      <h2>Scope</h2>
      <pre>{renderResults(scopeItems).sort().join("\n")}</pre>

      <h2>Types</h2>
      <pre>{renderResults(types).sort().join("\n")}</pre>

      <h2>Builtins (fixed)</h2>
      <pre>{stdlibDL}</pre>

      <h2>Rules (fixed)</h2>
      <pre>{typecheckDL}</pre>
    </div>
  );
}

class ReplCore {
  db: DB;
  loader: Loader;

  constructor(loader: Loader) {
    this.db = {
      tables: {},
      rules: {},
    };
    this.loader = loader;
  }

  evalStr(line: string): Res[] {
    const stmt = dlLanguage.statement.tryParse(line);
    return this.evalStmt(stmt);
  }

  evalStmt(stmt: Statement): Res[] {
    switch (stmt.type) {
      case "Insert": {
        const record = stmt.record;
        if (hasVars(record)) {
          return this.evalQuery(record);
        }
        let tbl = this.db.tables[record.relation];
        if (!tbl) {
          tbl = [];
          this.db.tables[record.relation] = tbl;
        }
        tbl.push(record);
        return [];
      }
      case "Rule": {
        const rule = stmt.rule;
        this.db.rules[rule.head.relation] = rule;
        return [];
      }
      case "TableDecl":
        if (this.db.tables[stmt.name]) {
          return [];
        }
        this.db.tables[stmt.name] = [];
        return [];
      case "LoadStmt":
        this.doLoad(stmt.path);
        return [];
    }
  }

  private evalQuery(record: Rec): Res[] {
    return evaluate(this.db, record);
  }

  doLoad(path: string) {
    const contents = this.loader(path);
    const program: Program = dlLanguage.program.tryParse(contents);
    for (const stmt of program) {
      this.evalStmt(stmt);
    }
  }
}

ReactDOM.render(<Main />, document.getElementById("main"));
