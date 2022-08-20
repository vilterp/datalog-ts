import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, Statement, Value } from "../../core/types";

export type VizTypeSpec = {
  name: string;
  description: string;
  component: (props: VizArgs) => React.ReactElement;
};

export type VizArgs = {
  interp: AbstractInterpreter;
  spec: Rec;
  id: string; // uniquely identify this visualization instance
  highlightedTerm: Value | null;
  setHighlightedTerm: (t: Value | null) => void;
  runStatements: (stmts: Statement[]) => void;
};
