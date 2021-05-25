import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, Term } from "../../core/types";

export type VizTypeSpec = {
  name: string;
  description: string;
  component: (props: {
    interp: AbstractInterpreter;
    spec: Rec;
    setHighlightedTerm: (t: Term | null) => void;
  }) => React.ReactElement;
};
