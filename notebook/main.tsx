import React from "react";
import ReactDOM from "react-dom";
import { useFetch } from "use-http";

function Main() {
  const gistURL =
    "https://gist.githubusercontent.com/vilterp/5b506496968c8379717888b04f35ebbf/raw/1ffa006ba9fb4b7955e051f4a5d91bdbd37c04bc/hm-with-ids-test.prolog";

  const { loading, error, data = "" } = useFetch(gistURL, {}, []);

  return (
    <>
      <p>Notebook viewer</p>
      <pre>{data}</pre>
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
