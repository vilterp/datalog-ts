import { exec, spawn, ExecOptions } from "child_process";

export function execPromise(cmd: string, options: ExecOptions): Promise<void> {
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

export type Tasks = { [name: string]: () => Promise<void> };

export async function taskRunnerMain(tasks: Tasks, argv: string[]) {
  tasks[argv[2]]();
}
