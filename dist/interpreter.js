"use strict";
exports.__esModule = true;
exports.Interpreter = void 0;
var parser_1 = require("./parser");
var simpleEvaluate_1 = require("./simpleEvaluate");
var Interpreter = /** @class */ (function () {
    function Interpreter(cwd, loader) {
        this.db = {
            tables: {},
            rules: {}
        };
        this.cwd = cwd;
        this.loader = loader;
    }
    Interpreter.prototype.evalStr = function (line) {
        var stmt = parser_1.language.statement.tryParse(line);
        return this.evalStmt(stmt);
    };
    Interpreter.prototype.evalStmt = function (stmt) {
        switch (stmt.type) {
            case "Insert": {
                var record = stmt.record;
                if (simpleEvaluate_1.hasVars(record)) {
                    return noTrace(this.evalQuery(record));
                }
                var tbl = this.db.tables[record.relation];
                if (!tbl) {
                    tbl = [];
                    this.db.tables[record.relation] = tbl;
                }
                tbl.push(record);
                return noTrace([]);
            }
            case "Rule": {
                var rule = stmt.rule;
                this.db.rules[rule.head.relation] = rule;
                return noTrace([]);
            }
            case "TableDecl":
                if (this.db.tables[stmt.name]) {
                    return noTrace([]);
                }
                this.db.tables[stmt.name] = [];
                return noTrace([]);
            case "LoadStmt":
                this.doLoad(stmt.path);
                return noTrace([]);
            case "TraceStmt":
                var inner = this.evalStmt({ type: "Insert", record: stmt.record });
                return yesTrace(inner.results);
            case "Comment":
                return noTrace([]);
        }
    };
    Interpreter.prototype.evalQuery = function (record) {
        return simpleEvaluate_1.evaluate(this.db, record);
    };
    Interpreter.prototype.doLoad = function (path) {
        var contents = this.loader(this.cwd + "/" + path);
        var program = parser_1.language.program.tryParse(contents);
        for (var _i = 0, program_1 = program; _i < program_1.length; _i++) {
            var stmt = program_1[_i];
            this.evalStmt(stmt);
        }
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
