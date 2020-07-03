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
    return __spreadArrays([types_1.rec("ast.RootExpr", { id: types_1.int(0) })], recurse(0, e).terms);
}
exports.flatten = flatten;
// TODO: DRY up location being added
function recurse(nextID, e) {
    var nextIDTerm = types_1.int(nextID);
    var simple = function (term) { return ({
        terms: [term],
        id: nextID,
        nextID: nextID + 1
    }); };
    switch (e.type) {
        case "Var":
            return simple(types_1.rec("ast.Var", {
                id: nextIDTerm,
                name: types_1.str(e.name),
                location: spanToDL(e.span)
            }));
        case "StringLit":
            return simple(types_1.rec("ast.StringLit", {
                id: nextIDTerm,
                val: types_1.str(e.val),
                location: spanToDL(e.span)
            }));
        case "IntLit":
            return simple(types_1.rec("ast.IntLit", {
                id: nextIDTerm,
                val: types_1.int(e.val),
                location: spanToDL(e.span)
            }));
        case "Placeholder":
            return simple(types_1.rec("ast.Placeholder", { id: nextIDTerm, location: spanToDL(e.span) }));
        case "FuncCall": {
            var _a = recurse(nextID + 1, e.func), funcExprTerms = _a.terms, funcExprID = _a.id, nid1 = _a.nextID;
            var _b = recurse(nid1, e.arg), argExprTerms = _b.terms, argExprID = _b.id, nid2 = _b.nextID;
            return {
                terms: __spreadArrays([
                    types_1.rec("ast.FuncCall", {
                        id: types_1.int(nextID),
                        funcID: types_1.int(funcExprID),
                        argID: types_1.int(argExprID),
                        location: spanToDL(e.span)
                    })
                ], funcExprTerms, argExprTerms),
                id: nextID,
                nextID: nid2
            };
        }
        case "Let": {
            var _c = recurse(nextID + 1, e.binding), bindingID = _c.id, bindingsTerms = _c.terms, nid1 = _c.nextID;
            var _d = recurse(nid1, e.body), bodyID = _d.id, bodyTerms = _d.terms, nid2 = _d.nextID;
            var overallTerm = types_1.rec("ast.LetExpr", {
                id: nextIDTerm,
                varName: types_1.str(e.name.ident),
                bindingID: types_1.int(bindingID),
                bodyID: types_1.int(bodyID),
                location: spanToDL(e.span),
                varLoc: spanToDL(e.name.span),
                letLoc: spanToDL(e.letT.span),
                inLoc: spanToDL(e.inT.span)
            });
            return {
                terms: __spreadArrays([overallTerm], bindingsTerms, bodyTerms),
                id: nextID,
                nextID: nid2
            };
        }
        case "Lambda": {
            var _e = recurse(nextID + 1, e.body), bodyID = _e.id, nid = _e.nextID, bodyTerms = _e.terms;
            var paramTerms = e.params.map(function (param, idx) {
                return types_1.rec("ast.LambdaParam", {
                    lambdaID: types_1.int(nextID),
                    idx: types_1.int(idx),
                    name: types_1.str(param.name.ident),
                    ty: types_1.str(param.ty.ident),
                    location: spanToDL(param.name.span),
                    typeLoc: spanToDL(param.ty.span)
                });
            });
            return {
                id: nextID,
                nextID: nid + paramTerms.length,
                terms: __spreadArrays([
                    types_1.rec("ast.Lambda", {
                        id: nextIDTerm,
                        body: types_1.int(bodyID),
                        retType: types_1.str(e.retType.ident),
                        numParams: types_1.int(e.params.length),
                        location: spanToDL(e.span),
                        retTypeLoc: spanToDL(e.retType.span)
                    })
                ], bodyTerms, paramTerms)
            };
        }
    }
}
function spanToDL(span) {
    return types_1.rec("span", {
        from: types_1.int(span.from),
        to: types_1.int(span.to)
    });
}
