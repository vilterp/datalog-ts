import { Interpreter } from "../../core/interpreter";
import { Rec } from "../../core/types";

export type VizTypeSpec = {
  name: string;
  description: string;
  component: (props: { interp: Interpreter; spec: Rec }) => React.ReactElement;
};
