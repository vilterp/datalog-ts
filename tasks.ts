import { exec, spawn, ExecOptions } from "child_process";
import { build } from "esbuild";
import { flatMap, pairsToObj } from "./util/util";

const APPS = [
  "actors",
  "ddTestViewer",
  "dlParser",
  "fiddle",
  "finance",
  "fp",
  "languageWorkbench",
  "notebook",
  "raceDetector",
  "relSQLPlayground",
  "sim",
];

const tasks: { [name: string]: () => Promise<void> } = {
  ...pairsToObj(
    flatMap(APPS, (app) => [
      { key: `build${titleCase(app)}`, value: () => buildApp(app) },
      { key: `serve${titleCase(app)}`, value: () => serveApp(app) },
    ])
  ),
};

async function buildApp(name: string) {
  await build({
    entryPoints: [`apps/${name}/main.tsx`],
    bundle: true,
    sourcemap: true,
    outfile: `apps/${name}/public/bundle.js`,
    loader: {
      ".dl": "text",
      ".grammar": "text",
      ".ttf": "text",
    },
  });
}

async function serveApp(name: string) {
  await execPromise("../../../node_modules/.bin/http-server -c-1", {
    cwd: `apps/${name}/public`,
  });
}

function execPromise(cmd: string, options: ExecOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = exec(cmd, options, (err) => {
      if (err !== null) {
        reject(err);
      } else {
        resolve();
      }
    });
    proc.stdout?.pipe(process.stdout);
    proc.stderr?.pipe(process.stdout);
  });
}

function titleCase(name: string) {
  return name[0].toUpperCase() + name.slice(1);
}

console.log(tasks);

// tasks.buildLanguageWorkbench();
tasks.serveLanguageWorkbench();
