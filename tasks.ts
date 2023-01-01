import { exec, ExecOptions } from "child_process";
import { build } from "esbuild";

const tasks: { [name: string]: () => Promise<void> } = {
  // build
  async buildActors() {
    buildApp("actors");
  },
  async buildDDTestViewer() {
    buildApp("ddTestViewer");
  },
  async buildDLParser() {
    buildApp("dlParser");
  },
  async buildFiddle() {
    buildApp("fiddle");
  },
  async buildFinance() {
    buildApp("finance");
  },
  async buildFP() {
    buildApp("fp");
  },
  async buildLanguageWorkbench() {
    buildApp("languageWorkbench");
  },
  async buildNotebook() {
    buildApp("notebook");
  },
  async buildRaceDetector() {
    buildApp("raceDetector");
  },
  async buildRelSQLPlayground() {
    buildApp("relSQLPlayground");
  },
  async buildSim() {
    buildApp("sim");
  },
  // serve
  async serveLanguageWorkbench() {
    serveApp("languageWorkbench");
  },
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
    exec(cmd, options, (err) => {
      if (err !== null) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// tasks.buildLanguageWorkbench();
tasks.serveLanguageWorkbench();
