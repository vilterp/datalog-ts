import * as express from "express";
import * as http from "http";
import * as WebSocket from "ws";
import { Interpreter } from "../interpreter";
import * as fs from "fs";
import { language } from "../parser";
import { Statement } from "../types";
import { hasVars } from "../simpleEvaluate";
import { ToClient, ToServer } from "./protocol";

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

// TODO: wrap this up in an object
let interp = new Interpreter(".", () => {
  throw new Error("not found");
});

const connections: WebSocket[] = [];

wss.on("connection", (ws: WebSocket) => {
  console.log("connection");
  connections.push(ws);
  catchUp(ws, interp);
  //connection is up, let's add a simple simple event
  ws.on("message", (message: string) => {
    const msg = JSON.parse(message) as ToServer;
    switch (msg.type) {
      case "Statement":
        const stmt = msg.body;
        try {
          if (isDefnOrInsert(stmt)) {
            const [res, newInterp] = interp.evalStmt(stmt);
            interp = newInterp;
            sendToAll(connections, { type: "Broadcast", body: stmt });
          }
        } catch (e) {
          console.error(`from: ${ws.url}:`, e);
          sendToOne(ws, { type: "Error", msg: e.toString() });
        }
        break;
    }
  });
});

// TODO: handle disconnect

function catchUp(ws: WebSocket, interp: Interpreter) {
  console.log("catch up");
  Object.values(interp.db.tables).forEach((table) => {
    table.forEach((record) => {
      sendToOne(ws, { type: "Broadcast", body: { type: "Insert", record } });
    });
  });
  Object.values(interp.db.rules).forEach((rule) => {
    sendToOne(ws, {
      type: "Broadcast",
      body: { type: "Rule", rule },
    });
  });
}

function sendToAll(conns: WebSocket[], msg: ToClient) {
  conns.forEach((conn) => {
    sendToOne(conn, msg);
  });
}

function sendToOne(conn: WebSocket, msg: ToClient) {
  conn.send(JSON.stringify(msg));
}

function isDefnOrInsert(stmt: Statement): boolean {
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
