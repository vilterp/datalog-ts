import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, Statement, Term } from "../../core/types";

export type VizTypeSpec = {
  name: string;
  description: string;
  component: (props: VizArgs) => React.ReactElement;
};

export type VizArgs = {
  interp: AbstractInterpreter;
  spec: Rec;
  id: string; // uniquely identify this visualization instance
  setHighlightedTerm: (t: Term | null) => void;
  runStatements: (stmts: Statement[]) => void;
};
