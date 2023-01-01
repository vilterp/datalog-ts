import { build } from "esbuild";
import { execPromise, taskRunnerMain, Tasks } from "./util/taskRunner";
import { flatMap, pairsToObj, titleCase } from "./util/util";

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

const tasks: Tasks = {
  // apps
  ...pairsToObj(
    flatMap(APPS, (app) => [
      { key: `build${titleCase(app)}`, value: () => buildApp(app) },
      { key: `serve${titleCase(app)}`, value: () => serveApp(app) },
    ])
  ),
  async test() {
    await bundleTests();
    await execPromise("node --enable-source-maps allTests.js", {});
  },
  async testWriteResults() {
    await bundleTests();
    await execPromise(
      "node --enable-source-maps allTests.js --write-results",
      {}
    );
  },
};

async function bundleTests() {
  await build({
    entryPoints: ["allTests.ts"],
    bundle: true,
    platform: "node",
    outfile: "allTests.js",
    sourcemap: true,
    loader: {
      ".dl": "text",
      ".grammar": "text",
    },
  });
}

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

taskRunnerMain(tasks, process.argv);
