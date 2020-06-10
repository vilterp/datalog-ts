import React from "react";
import ReactDOM from "react-dom";
import { rec, str } from "../types";
import { ReplCore } from "../replCore";
import { BareTerm, EvalStmt, Query } from "../uiCommon/replViews";

function Essay() {
  const repl = new ReplCore((_) => {
    throw new Error("not found");
  });

  return (
    <>
      <h1>Hello world</h1>
      <p>This is an essay</p>
      <BareTerm
        term={rec("blog_post", {
          title: str("hello world"),
          date: str("6/10/20"),
        })}
      />
      <p>And that is an embedded term</p>
      <p>Now we're gonna add some statements:</p>
      <EvalStmt repl={repl} stmt={`father{child: "Pete", father: "Paul"}.`} />
      <EvalStmt repl={repl} stmt={`mother{child: "Pete", mother: "Mary"}.`} />
      <EvalStmt
        repl={repl}
        stmt={`parent{child: C, parent: P} :- father{child: C, father: P} | mother{child: C, mother: P}.`}
      />
      <p>And this is an embedded query:</p>
      <Query repl={repl} query="parent{child: C, parent: P}" />
      <p>And that's how we're gonna write this essay!</p>
    </>
  );
}

ReactDOM.render(<Essay />, document.getElementById("main"));
