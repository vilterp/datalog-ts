import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec } from "../../core/types";

export type VizTypeSpec = {
  name: string;
  description: string;
  component: (props: {
    interp: AbstractInterpreter;
    spec: Rec;
  }) => React.ReactElement;
};
