import React, { useState } from "react";
import ReactDOM from "react-dom";
import { useFetch } from "use-http";
import { HashRouter as Router, Switch, Route, Link } from "react-router-dom";
import { parse, markdownToText } from "./markdown";
import { Editor, Doc, emptyDoc } from "./editor";

function Viewer(props: { username: string; gistID: string }) {
  const rawGistURL = `https://gist.githubusercontent.com/${props.username}/${props.gistID}/raw`;
  const gistURL = `https://gist.github.com/${props.username}/${props.gistID}`;

  const { loading, error, data = "" } = useFetch(rawGistURL, {}, []);

  const [viewMode, setViewMode] = useState(true);

  return (
    <>
      <p>
        <Link to="/">&lt; Back</Link> | Gist: <a href={gistURL}>{gistURL}</a>
      </p>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <pre>Error: {error}</pre>
      ) : (
        <>
          <Editor viewMode={viewMode} doc={initializeDoc(data)} />
          <p>
            <input
              type="checkbox"
              id="view-mode-check"
              checked={viewMode}
              onChange={(evt) => setViewMode(evt.target.checked)}
            />{" "}
            <label htmlFor="view-mode-check">View mode</label>
          </p>
        </>
      )}
    </>
  );
}

function initializeDoc(markdown: string): Doc {
  const parsedDoc = parse(markdown);
  return {
    blocks: parsedDoc.map((b, idx) =>
      b.type === "codeBlock" && b.lang === "dl"
        ? { type: "Code", content: b.content, id: idx }
        : { type: "Markdown", content: markdownToText(b), id: idx }
    ),
    nextID: parsedDoc.length,
    editingID: null,
  };
}

const examples: { name: string; gistID: string }[] = [
  { name: "Family", gistID: "9f06dbef549ab0fec87d7a79df05cf50" },
  {
    name: "Datalog Typechecking",
    gistID: "bbd21b2dece125786a71ed00f435d049",
  },
];

function HomePage() {
  const [gistURL, setGistURL] = useState("");

  return (
    <div className="markdown-body">
      <h1>Notebook viewer</h1>
      <h2>View Gist</h2>
      <div>
        URL{" "}
        <form>
          <input
            value={gistURL}
            className="form-control"
            onChange={(evt) => setGistURL(evt.target.value)}
            placeholder={"https://gist.github.com/username/gistid"}
            size={100}
          />
          <button
            className="btn"
            onClick={(evt) => {
              evt.preventDefault();
              const url = new URL(gistURL);
              window.location.assign(`/#/notebook/gist${url.pathname}`);
            }}
          >
            Go
          </button>
        </form>
      </div>
      <p>
        or{" "}
        <button
          className="form-control"
          onClick={() => {
            window.location.assign("/#/notebook/new");
          }}
        >
          New Blank Notebook
        </button>
      </p>
      <h2>Examples:</h2>
      <ul>
        {examples.map((ex, idx) => (
          <li key={idx}>
            <Link to={`/notebook/gist/vilterp/${ex.gistID}`}>{ex.name}</Link>
          </li>
        ))}
      </ul>
    </div>
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
            path="/notebook/new"
            render={() => (
              <>
                <h1>New Notebook</h1>
                <Editor doc={emptyDoc} viewMode={false} />
              </>
            )}
          />
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
