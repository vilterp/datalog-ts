import * as express from "express";
import * as http from "http";
import * as WebSocket from "ws";
import { Interpreter } from "../interpreter";
import * as fs from "fs";
import { language } from "../parser";
import { Statement } from "../types";
import { hasVars } from "../simpleEvaluate";
import { ToClient } from "./protocol";

const app = express();

app.get("/", (req, res) => {
  const index = fs.readFileSync("./ui/index.html");
  res.end(index);
});

app.get("/bundle.js", (req, res) => {
  const bundle = fs.readFileSync("./ui/bundle.js");
  res.end(bundle);
});

app.get("/bundle.js.map", (req, res) => {
  const bundle = fs.readFileSync("./ui/bundle.js.map");
  res.end(bundle);
});

//initialize a simple http server
const server = http.createServer(app);

//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server, path: "/ws" });

const interp = new Interpreter(".", () => {
  throw new Error("not found");
});

const connections: WebSocket[] = [];

wss.on("connection", (ws: WebSocket) => {
  connections.push(ws);
  //connection is up, let's add a simple simple event
  ws.on("message", (message: string) => {
    try {
      const stmt = language.statement.tryParse(message) as Statement;
      if (evalAndSend(stmt)) {
        console.log("hello? evaluating", stmt);
        interp.evalStmt(stmt);
        sendToAll(connections, { type: "Broadcast", body: stmt });
      }
    } catch (e) {
      console.error(`from: ${ws.url}:`, e);
      sendToOne(ws, { type: "Error", msg: e.toString() });
    }
  });
});

// TODO: handle disconnect

function sendToAll(conns: WebSocket[], msg: ToClient) {
  conns.forEach((conn) => {
    sendToOne(conn, msg);
  });
}

function sendToOne(conn: WebSocket, msg: ToClient) {
  conn.send(JSON.stringify(msg));
}

function evalAndSend(stmt: Statement): boolean {
  switch (stmt.type) {
    case "Insert":
      if (!hasVars(stmt.record)) {
        return true;
      }
      return false;
    case "Rule":
      return true;
    case "TableDecl":
      return true;
    default:
      return false;
  }
}

//start our server
const port = process.env.PORT || 8999;
server.listen(port, () => {
  console.log(`listening at http://0.0.0.0:${port}/`);
});
