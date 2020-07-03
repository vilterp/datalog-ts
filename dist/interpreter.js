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
exports.Interpreter = void 0;
var types_1 = require("./types");
var parser_1 = require("./parser");
var simpleEvaluate_1 = require("./simpleEvaluate");
var util_1 = require("./util");
var initialDB = {
    tables: {},
    rules: {},
    virtualTables: {
        "internal.Relation": virtualRelations,
        "internal.RelationReference": virtualReferences
    }
};
var Interpreter = /** @class */ (function () {
    function Interpreter(cwd, loader, db) {
        if (db === void 0) { db = initialDB; }
        this.db = db;
        this.cwd = cwd;
        this.loader = loader;
    }
    Interpreter.prototype.queryStr = function (line) {
        var record = parser_1.language.record.tryParse(line);
        var _a = this.evalStmt({ type: "Insert", record: record }), res = _a[0], _ = _a[1];
        return res;
    };
    Interpreter.prototype.evalStr = function (line) {
        var stmt = parser_1.language.statement.tryParse(line);
        return this.evalStmt(stmt);
    };
    Interpreter.prototype.evalStmt = function (stmt) {
        var _a, _b, _c;
        switch (stmt.type) {
            case "Insert": {
                var record = stmt.record;
                if (simpleEvaluate_1.hasVars(record)) {
                    // TODO: separate method for querying?
                    return [noTrace(this.evalQuery(record)), this];
                }
                var tbl = this.db.tables[record.relation] || [];
                return [
                    noTrace([]),
                    this.withDB(__assign(__assign({}, this.db), { tables: __assign(__assign({}, this.db.tables), (_a = {}, _a[record.relation] = __spreadArrays(tbl, [record]), _a)) })),
                ];
            }
            case "Rule": {
                var rule = stmt.rule;
                return [
                    noTrace([]),
                    this.withDB(__assign(__assign({}, this.db), { rules: __assign(__assign({}, this.db.rules), (_b = {}, _b[rule.head.relation] = rule, _b)) })),
                ];
            }
            case "TableDecl":
                if (this.db.tables[stmt.name]) {
                    return [noTrace([]), this];
                }
                return [
                    noTrace([]),
                    this.withDB(__assign(__assign({}, this.db), { tables: __assign(__assign({}, this.db.tables), (_c = {}, _c[stmt.name] = [], _c)) })),
                ];
            case "LoadStmt":
                return [noTrace([]), this.doLoad(stmt.path)];
            case "TraceStmt":
                var _d = this.evalStmt({
                    type: "Insert",
                    record: stmt.record
                }), res = _d[0], interp = _d[1];
                return [yesTrace(res.results), interp];
            case "Comment":
                return [noTrace([]), this];
        }
    };
    Interpreter.prototype.evalQuery = function (record) {
        return simpleEvaluate_1.evaluate(this.db, record);
    };
    Interpreter.prototype.withDB = function (db) {
        return new Interpreter(this.cwd, this.loader, db);
    };
    Interpreter.prototype.doLoad = function (path) {
        var contents = this.loader(this.cwd + "/" + path);
        var program = parser_1.language.program.tryParse(contents);
        return program.reduce(function (interp, stmt) { return interp.evalStmt(stmt)[1]; }, this);
    };
    return Interpreter;
}());
exports.Interpreter = Interpreter;
function noTrace(results) {
    return { results: results, trace: false };
}
function yesTrace(results) {
    return { results: results, trace: true };
}
function virtualRelations(db) {
    return __spreadArrays(util_1.mapObjToList(db.rules, function (name) {
        return types_1.rec("internal.Relation", { type: types_1.str("rule"), name: types_1.str(name) });
    }), util_1.mapObjToList(db.tables, function (name) {
        return types_1.rec("internal.Relation", { type: types_1.str("table"), name: types_1.str(name) });
    }), util_1.mapObjToList(db.virtualTables, function (name) {
        return types_1.rec("internal.Relation", { type: types_1.str("virtual"), name: types_1.str(name) });
    }));
}
function virtualReferences(db) {
    return util_1.flatMapObjToList(db.rules, function (ruleName, rule) {
        return util_1.flatMap(rule.defn.opts, function (opt) {
            return util_1.flatMap(opt.clauses, function (clause) {
                return clause.type === "Record"
                    ? [
                        types_1.rec("internal.RelationReference", {
                            from: types_1.str(ruleName),
                            to: types_1.str(clause.relation)
                        }),
                    ]
                    : [];
            });
        });
    });
}
