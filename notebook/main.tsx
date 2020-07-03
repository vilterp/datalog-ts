import React from "react";
import ReactDOM from "react-dom";
import { useFetch } from "use-http";
import { HashRouter as Router, Switch, Route, Link } from "react-router-dom";
import { MarkdownDoc, parse, MarkdownNode } from "./markdown";
import { Interpreter } from "../interpreter";
import { language } from "../parser";
import { Program, Res } from "../types";
import { BareTerm } from "../uiCommon/replViews";

function Viewer(props: { username: string; gistID: string }) {
  const gistURL = `https://gist.githubusercontent.com/${props.username}/${props.gistID}/raw/`;

  const { loading, error, data = "" } = useFetch(gistURL, {}, []);

  const parsedDoc = parse(data);

  return (
    <>
      <h1>Notebook viewer</h1>
      <Blocks doc={parsedDoc} />
    </>
  );
}

type Ctx = { interp: Interpreter; rendered: React.ReactNode[] };

function Blocks(props: { doc: MarkdownDoc }) {
  const interp = new Interpreter(".", null);

  const ctx = props.doc.reduce<Ctx>(
    (ctx, node): Ctx => {
      switch (node.type) {
        case "codeBlock":
          // TODO: check lang
          const program: Program = language.program.tryParse(node.content);
          const newInterpAndResults = program.reduce<{
            interp: Interpreter;
            results: Res[][];
          }>(
            (accum, stmt) => {
              const [res, newInterp] = accum.interp.evalStmt(stmt);
              return {
                interp: newInterp,
                results: [...accum.results, res.results],
              };
            },
            { interp: ctx.interp, results: [] }
          );
          return {
            interp: newInterpAndResults.interp,
            rendered: [
              ...ctx.rendered,
              <>
                <pre>{node.content}</pre>
                <div className="results">
                  <ul>
                    {flatten(newInterpAndResults.results).map((res, idx) => (
                      <li key={idx}>{<BareTerm term={res.term} />}</li>
                    ))}
                  </ul>
                </div>
              </>,
            ],
          };
        default:
          return {
            interp: ctx.interp,
            rendered: [...ctx.rendered, <MarkdownNode block={node} />],
          };
      }
    },
    { interp, rendered: [] }
  );
  return (
    <>
      {ctx.rendered.map((r, idx) => (
        <React.Fragment key={idx}>{r}</React.Fragment>
      ))}
    </>
  );
}

function flatten(results: Res[][]): Res[] {
  const out: Res[] = [];
  results.forEach((resGroup) => {
    resGroup.forEach((res) => {
      out.push(res);
    });
  });
  return out;
}

function HomePage() {
  return (
    <>
      <h1>Notebook viewer</h1>
      <p>Welcome</p>
      <p>Examples:</p>
      <ul>
        <li>
          <Link to="/notebook/gist/vilterp/9f06dbef549ab0fec87d7a79df05cf50">
            Family
          </Link>
        </li>
      </ul>
    </>
  );
}

function Main() {
  return (
    <div
      className="markdown-body"
      style={{
        maxWidth: "60rem",
        marginLeft: "auto",
        marginRight: "auto",
        marginBottom: 20,
        marginTop: 20,
        paddingLeft: 10,
        paddingRight: 10,
      }}
    >
      <Router>
        <Switch>
          <Route path="/" exact>
            <HomePage />
          </Route>
          <Route
            path="/notebook/gist/:username/:gistID"
            render={({ match }) => (
              <Viewer
                username={match.params.username}
                gistID={match.params.gistID}
              />
            )}
          />
        </Switch>
      </Router>
    </div>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
