"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.blockInner = exports.block = exports.prettyPrintGraph = exports.removeOrphanNodes = void 0;
var pp = require("prettier-printer");
var util_1 = require("./util");
function hasEdgesToOrFrom(g, id) {
    return g.edges.some(function (e) { return e.from === id || e.to === id; });
}
function removeOrphanNodes(g) {
    return {
        nodes: g.nodes.filter(function (node) { return hasEdgesToOrFrom(g, node.id); }),
        edges: g.edges
    };
}
exports.removeOrphanNodes = removeOrphanNodes;
function prettyPrintGraph(g) {
    return pp.render(100, [
        "digraph G ",
        block(pp.braces, __spreadArrays(g.nodes.map(function (node) { return [
            "\"" + node.id + "\"",
            " [",
            util_1.mapObjToList(node.attrs, function (k, v) { return [k, "=", "\"" + v + "\""]; }),
            "]",
        ]; }), g.edges.map(function (edge) { return [
            "\"" + edge.from + "\"",
            " -> ",
            "\"" + edge.to + "\"",
            " [",
            util_1.mapObjToList(edge.attrs, function (k, v) { return [k, "=", "\"" + v + "\""]; }),
            "]",
        ]; })), { sep: ";" }),
    ]);
}
exports.prettyPrintGraph = prettyPrintGraph;
function block(pair, docs, opts) {
    if (docs.length === 0) {
        return [pair[0], pair[1]];
    }
    return [pair[0], blockInner(docs, opts), pair[1]];
}
exports.block = block;
function blockInner(docs, opts) {
    var sep = opts ? opts.sep : ",";
    return pp.choice(pp.intersperse(sep + " ")(docs), [
        pp.lineBreak,
        pp.indent(2, pp.intersperse([sep, pp.lineBreak])(docs)),
        pp.lineBreak,
    ]);
}
exports.blockInner = blockInner;
