import { build } from "esbuild";

const tasks: { [name: string]: () => Promise<void> } = {
  // build
  buildActors: async () => {
    buildApp("actors");
  },
  buildDDTestViewer: async () => {
    buildApp("ddTestViewer");
  },
  buildDLParser: async () => {
    buildApp("dlParser");
  },
  buildFiddle: async () => {
    buildApp("fiddle");
  },
  buildFinance: async () => {
    buildApp("finance");
  },
  buildFP: async () => {
    buildApp("fp");
  },
  buildLanguageWorkbench: async () => {
    buildApp("languageWorkbench");
  },
  buildNotebook: async () => {
    buildApp("notebook");
  },
  buildRaceDetector: async () => {
    buildApp("raceDetector");
  },
  buildRelSQLPlayground: async () => {
    buildApp("relSQLPlayground");
  },
  buildSim: async () => {
    buildApp("sim");
  },
  // serve
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

tasks.buildLanguageWorkbench();
