import React from "react";
import { Trace, UpdateFn } from "./types";

export type Scenario<St, Msg> = {
  name: string;
  id: string;
  initialState: Trace<St, Msg>;
  update: UpdateFn<St, Msg>;
  ui: (props: {
    trace: Trace<St, Msg>;
    setTrace: (t: Trace<St, Msg>) => void;
  }) => React.ReactElement;
};
