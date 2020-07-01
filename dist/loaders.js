"use strict";
exports.__esModule = true;
exports.nullLoader = exports.makeMemoryLoader = void 0;
function makeMemoryLoader(files) {
    return function (path) {
        var contents = files[path];
        if (!contents) {
            throw new Error("not found: " + path);
        }
        return contents;
    };
}
exports.makeMemoryLoader = makeMemoryLoader;
exports.nullLoader = function (path) {
    throw new Error("can't load " + path + "; loader not set up");
};
// not putting FS loader here since we don't want to try to import
// Node's FS lib when bundling for the browser
