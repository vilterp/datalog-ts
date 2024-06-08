import React, { useState } from "react";
import { Client } from "../../hooks";

export function LoginWrapper(props: {
  client: Client;
  // TODO: have this pass a 'loggedInClient' object
  loggedIn: (user: string) => React.ReactNode;
}) {
  return props.client.state.loginState.type === "LoggedIn" ? (
    <>{props.loggedIn(props.client.state.loginState.username)}</>
  ) : (
    <LoginSignupForm client={props.client} />
  );
}

function LoginSignupForm(props: { client: Client }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const loginState = props.client.state.loginState;
  const inFlight =
    loginState.type === "LoggedOut" ? loginState.loggingInAs !== null : false;

  return (
    <div>
      <form
        onSubmit={(evt) => {
          evt.preventDefault();
          props.client.login(username, password);
        }}
      >
        <h3>Login or Signup</h3>
        <p>
          <span>Username</span>
          <br />
          <input
            type="text"
            value={username}
            onChange={(evt) => setUsername(evt.target.value)}
          />
        </p>
        <p>
          <span>Password</span>
          <br />
          <input
            type="password"
            value={password}
            onChange={(evt) => setPassword(evt.target.value)}
          />
        </p>
        <button type="submit" disabled={inFlight}>
          Login
        </button>{" "}
        <button
          onClick={() => props.client.signup(username, password)}
          disabled={inFlight}
        >
          Signup
        </button>
      </form>
    </div>
  );
}
