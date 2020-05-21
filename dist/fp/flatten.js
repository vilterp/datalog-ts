"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.flatten = void 0;
var types_1 = require("../types");
function flatten(e) {
    return recurse(0, e).terms;
}
exports.flatten = flatten;
// TODO: positions
function recurse(nextID, e) {
    var nextIDTerm = types_1.int(nextID);
    var simple = function (term) { return ({
        terms: [term],
        id: nextID,
        nextID: nextID + 1
    }); };
    switch (e.type) {
        case "Var":
            return simple(types_1.rec("var", { id: nextIDTerm, name: types_1.str(e.name.ident) }));
        case "StringLit":
            return simple(types_1.rec("stringLit", { id: nextIDTerm, val: types_1.str(e.val) }));
        case "IntLit":
            return simple(types_1.rec("intLit", { id: nextIDTerm, val: types_1.int(e.val) }));
        case "Placeholder":
            return simple(types_1.rec("placeholder", { id: nextIDTerm }));
        case "FuncCall": {
            // TODO: args (maybe just do curried?
            var _a = e.args.reduce(function (accum, arg) {
                var _a = recurse(accum.nid, arg), argID = _a.id, newNID = _a.nextID, newArgTerms = _a.terms;
                return {
                    nid: newNID,
                    terms: __spreadArrays(accum.terms, newArgTerms),
                    argIDs: __spreadArrays(accum.argIDs, [argID])
                };
            }, { nid: nextID + 1, terms: [], argIDs: [] }), nid_1 = _a.nid, argExprTerms = _a.terms, argIDs = _a.argIDs;
            var argTerms = argIDs.map(function (argID, idx) {
                return types_1.rec("funcArg", {
                    id: types_1.int(idx + nid_1),
                    idx: types_1.int(idx),
                    exprID: types_1.int(argID)
                });
            });
            return {
                terms: __spreadArrays([
                    types_1.rec("funcCall", {
                        id: nextIDTerm,
                        name: types_1.str(e.name.ident),
                        numArgs: types_1.int(e.args.length)
                    })
                ], argExprTerms, argTerms),
                id: nextID,
                nextID: nid_1 + argTerms.length
            };
        }
        case "Let": {
            var _b = recurse(nextID + 1, e.binding), bindingID = _b.id, bindingsTerms = _b.terms, nid1 = _b.nextID;
            var _c = recurse(nid1, e.body), bodyID = _c.id, bodyTerms = _c.terms, nid2 = _c.nextID;
            var overallTerm = types_1.rec("letExpr", {
                id: nextIDTerm,
                varName: types_1.str(e.name.ident),
                bindingID: types_1.int(bindingID),
                bodyID: types_1.int(bodyID)
            });
            return {
                terms: __spreadArrays([overallTerm], bindingsTerms, bodyTerms),
                id: nextID,
                nextID: nid2
            };
        }
        case "Lambda": {
            var _d = recurse(nextID + 1, e.body), bodyID = _d.id, nid = _d.nextID, bodyTerms = _d.terms;
            var paramTerms = e.params.map(function (param, idx) {
                return types_1.rec("lambdaParam", {
                    lambdaID: types_1.int(nextID),
                    idx: types_1.int(idx),
                    name: types_1.str(param.name.ident),
                    ty: types_1.str(param.ty.ident)
                });
            });
            return {
                id: nextID,
                nextID: nid + paramTerms.length,
                terms: __spreadArrays([
                    types_1.rec("lambda", {
                        id: nextIDTerm,
                        body: types_1.int(bodyID),
                        retType: types_1.str(e.retType.ident),
                        numParams: types_1.int(e.params.length)
                    })
                ], bodyTerms, paramTerms)
            };
        }
    }
}
