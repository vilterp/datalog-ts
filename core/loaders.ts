// throws an exception if it's not there I guess
// TODO: wish there was a stdlib Result<E, T> type, lol

// keeping synchronous for now
export type Loader = (path: string) => string;

export function makeMemoryLoader(files: { [path: string]: string }): Loader {
  return (path) => {
    if (path.startsWith("./")) {
      path = path.slice(2);
    }
    if (!files[path]) {
      throw new Error(`not found: ${path}`);
    }
    const contents = files[path];
    return contents;
  };
}

export const nullLoader: Loader = (path) => {
  throw new Error(`can't load ${path}; loader not set up`);
};

// not putting FS loader here since we don't want to try to import
// Node's FS lib when bundling for the browser
