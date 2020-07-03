import React from "react";
import ReactDOM from "react-dom";
import { useFetch } from "use-http";
import { HashRouter as Router, Switch, Route, Link } from "react-router-dom";

function Viewer(props: {
  username: string;
  gistID: string;
  fileID: string;
  filename: string;
}) {
  const gistURL = `https://gist.githubusercontent.com/${props.username}/${props.gistID}/raw/${props.fileID}/${props.filename}`;

  const { loading, error, data = "" } = useFetch(gistURL, {}, []);

  return (
    <>
      <h1>Notebook viewer</h1>
      <pre>{data}</pre>
    </>
  );
}

function HomePage() {
  return (
    <>
      <h1>Notebook viewer</h1>
      <p>Welcome</p>
      <p>Examples:</p>
      <ul>
        <li>
          <Link to="/notebook/gist/vilterp/9f06dbef549ab0fec87d7a79df05cf50/raw/ca8e208fbfcea1dc85ac3690864f0e38a4bbcdf8/family.dl">
            Family
          </Link>
        </li>
      </ul>
    </>
  );
}

function Main() {
  return (
    <Router>
      <Switch>
        <Route path="/" exact>
          <HomePage />
        </Route>
        <Route
          path="/notebook/gist/:username/:gistID/raw/:fileID/:filename"
          render={({ match }) => (
            <Viewer
              username={match.params.username}
              gistID={match.params.gistID}
              fileID={match.params.fileID}
              filename={match.params.filename}
            />
          )}
        />
      </Switch>
    </Router>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
