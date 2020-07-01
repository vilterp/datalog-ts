"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.insertAtPath = exports.treeToArr = exports.collapseTree = exports.getLeaves = exports.filterTree = exports.mapTree = exports.leaf = exports.node = void 0;
var util_1 = require("./util");
function node(key, item, children) {
    return { key: key, item: item, children: children };
}
exports.node = node;
function leaf(key, item) {
    return node(key, item, []);
}
exports.leaf = leaf;
function mapTree(tree, f) {
    return {
        key: tree.key,
        item: f(tree.item),
        children: tree.children.map(function (c) { return mapTree(c, f); })
    };
}
exports.mapTree = mapTree;
function filterTree(tree, f) {
    return __assign(__assign({}, tree), { children: tree.children
            .filter(function (child) { return f(child.item); })
            .map(function (child) { return filterTree(child, f); }) });
}
exports.filterTree = filterTree;
function getLeaves(tree) {
    if (tree.children.length === 0) {
        return [tree.item];
    }
    return util_1.flatMap(tree.children, getLeaves);
}
exports.getLeaves = getLeaves;
// this is a weird algorithm
function collapseTree(tree, pred) {
    if (!pred(tree.item)) {
        return util_1.flatMap(tree.children, function (child) { return collapseTree(child, pred); });
    }
    return __spreadArrays([
        tree.item
    ], util_1.flatMap(tree.children, function (child) { return collapseTree(child, pred); }));
}
exports.collapseTree = collapseTree;
function treeToArr(tree) {
    return __spreadArrays([tree.item], util_1.flatMap(tree.children, treeToArr));
}
exports.treeToArr = treeToArr;
function insertAtPath(tree, path, toInsert, mkNamespaceNode) {
    if (path.length === 0) {
        return toInsert;
    }
    var curSeg = path[0];
    var childIdx = tree.children.findIndex(function (child) { return child.key === curSeg; });
    return __assign(__assign({}, tree), { children: childIdx !== -1
            ? util_1.updateAtIdx(tree.children, childIdx, function (child) {
                return insertAtPath(child, path.slice(1), toInsert, mkNamespaceNode);
            })
            : __spreadArrays(tree.children, [
                insertAtPath({ key: curSeg, item: mkNamespaceNode(curSeg), children: [] }, path.slice(1), toInsert, mkNamespaceNode),
            ]) });
}
exports.insertAtPath = insertAtPath;
