import React from "react";
import { Json } from "../../../util/json";
import { SystemInstance, SystemInstanceAction } from "../types";
import { Window } from "./window";

export function MultiClient<St extends Json, Msg extends Json>(props: {
  systemInstance: SystemInstance<St, Msg>;
  // hoo that is a big type
  dispatch: (action: SystemInstanceAction<St, Msg>) => void;
}) {
  const sendInput = (clientID: string, input: Msg) => {
    props.dispatch({
      type: "UpdateTrace",
      action: {
        type: "SendUserInput",
        clientID,
        input,
      },
    });
  };

  return (
    <>
      <button
        onClick={() => {
          props.dispatch({ type: "AllocateClientID" });
          // TODO: DRY this up with other place client id is constructed
          const clientID = `client${props.systemInstance.nextClientID}`;
          props.dispatch({
            type: "UpdateTrace",
            action: {
              type: "SpawnClient",
              id: props.systemInstance.nextClientID.toString(),
              initialUserState: props.systemInstance.system.initialUserState,
              initialClientState:
                props.systemInstance.system.initialClientState(clientID),
            },
          });
        }}
      >
        Add Client
      </button>
      <div style={{ display: "flex", flexDirection: "row" }}>
        {props.systemInstance.clientIDs.map((clientID) => {
          const clientState =
            props.systemInstance.trace.latestStates[`client${clientID}`];

          return (
            <Window
              key={clientID}
              name={`Client ${clientID}`}
              onClose={() => {
                props.dispatch({ type: "ExitClient", clientID });
              }}
            >
              {clientState ? (
                <props.systemInstance.system.ui
                  state={clientState}
                  sendUserInput={(input) => sendInput(clientID, input)}
                />
              ) : null}
            </Window>
          );
        })}
      </div>
    </>
  );
}
