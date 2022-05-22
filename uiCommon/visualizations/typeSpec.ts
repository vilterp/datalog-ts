import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, Term } from "../../core/types";

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
};
