import React, { useState } from "react";
import ReactDOM from "react-dom";
import { useFetch } from "use-http";
import { HashRouter as Router, Switch, Route, Link } from "react-router-dom";
import { parse, markdownToText } from "./markdown";
import { Editor } from "./editor";

function Viewer(props: { username: string; gistID: string }) {
  const rawGistURL = `https://gist.githubusercontent.com/${props.username}/${props.gistID}/raw/`;
  const gistURL = `https://gist.github.com/${props.username}/${props.gistID}`;

  const { loading, error, data = "" } = useFetch(rawGistURL, {}, []);

  const parsedDoc = parse(data);

  return (
    <>
      <h1>Notebook viewer</h1>
      <p>
        <Link to="/">&lt; Back</Link> | Gist: <a href={gistURL}>{gistURL}</a>
      </p>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <pre>Error: {error}</pre>
      ) : (
        <Editor
          doc={{
            blocks: parsedDoc.map((b, idx) => ({
              type: b.type === "codeBlock" ? "Code" : "Markdown",
              content: b.type === "codeBlock" ? b.content : markdownToText(b),
              id: idx,
            })),
            nextID: parsedDoc.length,
            editingID: null,
          }}
        />
      )}
    </>
  );
}

function HomePage() {
  const [gistURL, setGistURL] = useState("");

  return (
    <>
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
      <h2>Examples:</h2>
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
