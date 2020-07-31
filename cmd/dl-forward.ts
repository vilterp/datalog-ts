import * as WebSocket from "ws";
import * as readline from "readline";
import { language } from "../parser";
import { Statement } from "../types";
import { ToClient, ToServer } from "../server/protocol";

async function main(): Promise<number> {
  const addr = process.argv[2];
  if (!addr) {
    console.log("usage: <address: ws://.../>");
    return -1;
  }

  const ws = await connectWS(addr);
  console.log("connected to", addr);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  return new Promise((resolve) => {
    rl.on("line", (line) => {
      if (line === "") {
        return;
      }
      try {
        const stmt = language.statement.tryParse(line) as Statement;
        const msg: ToServer = {
          type: "Statement",
          body: stmt,
        };
        ws.send(JSON.stringify(msg));
        console.log(line);
      } catch (e) {
        console.error(e);
      }
    });

    rl.on("close", () => {
      resolve(0);
    });
  });
}

function connectWS(url: string): Promise<WebSocket> {
  const ws = new WebSocket(url);
  return new Promise((resolve, reject) => {
    ws.onopen = () => {
      resolve(ws);
    };
  });
}

main().then((code) => process.exit(code));
