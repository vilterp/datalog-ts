import { AbstractInterpreter } from "../../core/abstractinterpreter";
import { Rec } from "../../core/types";

export type VizTypeSpec = {
  name: string;
  description: string;
  component: (props: {
    interp: AbstractInterpreter;
    spec: Rec;
  }) => React.ReactElement;
};
