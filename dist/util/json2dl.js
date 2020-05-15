"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.jsonToDL = void 0;
var types_1 = require("../types");
function jsonToDL(json, emit) {
    recurse([], json, emit);
}
exports.jsonToDL = jsonToDL;
function recurse(pathSoFar, json, emit) {
    if (json === null) {
        return;
    }
    switch (typeof json) {
        case "object":
            if (Array.isArray(json)) {
                json.map(function (item, idx) {
                    recurse(__spreadArrays(pathSoFar, [types_1.int(idx)]), item, emit);
                });
            }
            else {
                Object.keys(json).forEach(function (key) {
                    recurse(__spreadArrays(pathSoFar, [types_1.str(key)]), json[key], emit);
                });
            }
            break;
        case "boolean":
        case "string":
        case "number":
            emit(types_1.rec("val", {
                path: types_1.array(pathSoFar),
                val: primitiveToTerm(json)
            }));
            break;
        default:
            throw new Error("not json: " + json);
    }
}
function primitiveToTerm(v) {
    switch (typeof v) {
        case "boolean":
            return v ? types_1.trueTerm : types_1.falseTerm;
        case "number":
            return types_1.int(v); // TOOD: float...
        case "string":
            return types_1.str(v);
        default:
            throw new Error("wut");
    }
}
