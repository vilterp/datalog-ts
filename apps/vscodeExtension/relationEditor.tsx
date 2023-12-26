import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

type MessageToWebView = { relation: string };

export function Main() {
  const [relation, setRelation] = useState("");
  useEffect(() => {
    const listener = (evt) => {
      const msg = evt.data as MessageToWebView;
      setRelation(msg.relation);
    };
    window.addEventListener("message", listener);
    return () => {
      window.removeEventListener("message", listener);
    };
  });

  return <p>Showing {relation}</p>;
}

ReactDOM.render(<Main />, document.getElementById("main"));
