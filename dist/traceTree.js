"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.makeTermWithBindings = exports.pathToScopePath = exports.getRelatedPaths = exports.traceToTree = void 0;
var tree_1 = require("./tree");
var pretty_1 = require("./pretty");
var util_1 = require("./util");
var pp = require("prettier-printer");
var unify_1 = require("./unify");
function traceToTree(res) {
    var resStr = pretty_1.ppt(res.term);
    switch (res.trace.type) {
        case "AndTrace":
            return tree_1.node("And", res, collapseAndSources(res.trace.sources).map(function (s) { return traceToTree(s); }));
        case "MatchTrace":
            // TODO: might be good to pass actual scope path here
            // but it is just the key so we don't really need it
            return tree_1.leaf(printTermWithBindings(res, [], pretty_1.defaultTracePrintOpts), res);
        case "RefTrace": {
            var innerRes = res.trace.innerRes;
            return tree_1.node(printTermWithBindings(res, [], pretty_1.defaultTracePrintOpts) + "; " + pretty_1.ppVM(res.trace.mappings, [], pretty_1.defaultTracePrintOpts), res, innerRes.trace.type === "AndTrace"
                ? collapseAndSources(innerRes.trace.sources).map(function (s) {
                    return traceToTree(s);
                })
                : [traceToTree(innerRes)]);
        }
        case "VarTrace":
            return tree_1.leaf("var: " + resStr, res);
        case "BinExprTrace":
            return tree_1.leaf("bin_expr: " + resStr, res);
        case "BaseFactTrace":
            return tree_1.leaf("base_fact: " + resStr, res);
        case "LiteralTrace":
            return tree_1.leaf("literal: " + resStr, res);
    }
}
exports.traceToTree = traceToTree;
function collapseAndSources(sources) {
    if (sources.length === 2 && sources[1].trace.type === "AndTrace") {
        return __spreadArrays([sources[0]], collapseAndSources(sources[1].trace.sources));
    }
    return sources;
}
function printTermWithBindings(res, scopePath, opts) {
    return pp.render(100, pretty_1.prettyPrintTermWithBindings(makeTermWithBindings(res.term, res.bindings), scopePath, opts));
}
// returns [leat => root]
// TODO: just pass down list and index?
function walkPath(res, mappings, soFar, path) {
    // console.log("walkPath", { res, soFar, path });
    if (path.length === 0) {
        return [{ res: res, mappings: mappings, path: soFar, rule: "" }];
    }
    switch (res.trace.type) {
        case "AndTrace": {
            var firstSeg = path[0];
            var clauseIdx = util_1.getFirst(firstSeg.invokeLoc, function (seg) {
                return seg.type === "AndClause" ? seg.idx : null;
            });
            return walkPath(res.trace.sources[clauseIdx], mappings, soFar, path);
        }
        case "RefTrace": {
            var firstSeg = path[0];
            return __spreadArrays(walkPath(res.trace.innerRes, res.trace.mappings, __spreadArrays(soFar, [firstSeg]), path.slice(1)), [
                {
                    res: res,
                    rule: res.trace.refTerm.relation,
                    path: soFar,
                    mappings: mappings
                },
            ]);
        }
        case "MatchTrace":
            return [];
        default:
            throw new Error("unreachable");
    }
}
// TODO: also get "parent" paths
function getRelatedPaths(res, highlighted) {
    // console.log("===========");
    var path = walkPath(res, {}, [], highlighted.path);
    var resAtPath = path[0].res;
    var parents = getParentPaths(path, highlighted.name);
    var children = getChildPaths(resAtPath, highlighted);
    // console.log("getRelatedPaths", {
    //   // res,
    //   // highlighted: highlighted.path,
    //   walkedPath: path,
    //   // name: highlighted.name,
    //   parents,
    //   children,
    // });
    return { children: children, parents: parents };
}
exports.getRelatedPaths = getRelatedPaths;
function getChildPaths(res, binding) {
    var trace = res.trace;
    switch (trace.type) {
        case "RefTrace":
            var mapping = Object.keys(trace.mappings).find(function (key) { return trace.mappings[key] === binding.name; });
            if (!mapping) {
                return [];
            }
            return __spreadArrays([
                binding
            ], getChildPaths(trace.innerRes, {
                name: mapping,
                path: __spreadArrays(binding.path, [
                    { name: trace.refTerm.relation, invokeLoc: trace.invokeLoc },
                ])
            }));
        case "AndTrace":
            return util_1.flatMap(trace.sources, function (innerRes) {
                return getChildPaths(innerRes, binding);
            });
        case "MatchTrace":
            return [binding];
        default:
            return [];
    }
}
function getParentPaths(path, binding) {
    if (path.length === 0) {
        return [];
    }
    var first = path[0];
    var mapping = first.mappings[binding];
    // console.log("getParentPath", {
    //   path,
    //   binding,
    //   mappings: first.mappings,
    //   mapping,
    // });
    return mapping
        ? __spreadArrays([
            { name: binding, path: first.path }
        ], getParentPaths(path.slice(1), mapping)) : [{ name: binding, path: first.path }];
}
function pathToScopePath(path) {
    return util_1.filterMap(path, function (res) {
        return res.trace.type === "RefTrace"
            ? { name: res.trace.refTerm.relation, invokeLoc: res.trace.invokeLoc }
            : null;
    });
}
exports.pathToScopePath = pathToScopePath;
function makeTermWithBindings(term, bindings) {
    switch (term.type) {
        case "Record":
            return {
                type: "RecordWithBindings",
                relation: term.relation,
                attrs: util_1.mapObj(term.attrs, function (_, val) {
                    var binding = Object.keys(bindings).find(function (b) {
                        return bindings[b] && unify_1.termEq(val, bindings[b]);
                    });
                    return {
                        term: makeTermWithBindings(val, bindings),
                        binding: binding
                    };
                })
            };
        case "Array":
            return {
                type: "ArrayWithBindings",
                items: term.items.map(function (item) { return makeTermWithBindings(item, bindings); })
            };
        case "BinExpr":
            return {
                type: "BinExprWithBindings",
                left: makeTermWithBindings(term.left, bindings),
                op: term.op,
                right: makeTermWithBindings(term.right, bindings)
            };
        default:
            return { type: "Atom", term: term };
    }
}
exports.makeTermWithBindings = makeTermWithBindings;
