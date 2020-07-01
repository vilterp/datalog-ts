import React from "react";
import ReactDOM from "react-dom";
import { nullLoader } from "../loaders";
import { rec, str } from "../types";
import { Interpreter } from "../interpreter";
import { BareTerm, EvalStmt, Query } from "../uiCommon/replViews";
import { TabbedTables } from "../uiCommon/tabbedTables";

function Essay() {
  const interp = new Interpreter("", nullLoader);

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
      <EvalStmt
        interp={interp}
        stmt={`father{child: "Pete", father: "Paul"}.`}
      />
      <EvalStmt
        interp={interp}
        stmt={`mother{child: "Pete", mother: "Mary"}.`}
      />
      <EvalStmt
        interp={interp}
        stmt={`parent{child: C, parent: P} :- father{child: C, father: P} | mother{child: C, mother: P}.`}
      />
      <p>And this is an embedded query:</p>
      <Query interp={interp} query="parent{child: C, parent: P}" />
      <p>And that's how we're gonna write this essay!</p>
      <p>Here is even an embedded fiddle:</p>
      <TabbedTables interp={interp} />
    </>
  );
}

ReactDOM.render(<Essay />, document.getElementById("main"));
