"use strict";
exports.__esModule = true;
exports.fsLoader = exports.Repl = void 0;
var types_1 = require("./types");
var parser_1 = require("./parser");
var readline = require("readline");
var pretty_1 = require("./pretty");
var pp = require("prettier-printer");
var graphviz_1 = require("./graphviz");
var fs = require("fs");
var simpleEvaluate_1 = require("./simpleEvaluate");
var Repl = /** @class */ (function () {
    function Repl(input, out, mode, query, loader) {
        this.db = types_1.newDB();
        this["in"] = input;
        this.out = out;
        this.buffer = "";
        this.mode = mode;
        this.loader = loader;
        if (query) {
            this.query = query;
        }
        else {
            this.query = null;
        }
    }
    Repl.prototype.run = function () {
        var _this = this;
        var opts = this.mode === "repl"
            ? {
                input: this["in"],
                output: this.out,
                prompt: "> "
            }
            : { input: this["in"] };
        var rl = readline.createInterface(opts);
        rl.on("line", function (line) {
            _this.handleLine(line);
        });
        rl.prompt();
        rl.on("close", function () {
            if (_this.query) {
                _this.handleLine(_this.query);
            }
        });
        this.rl = rl;
    };
    Repl.prototype.handleLine = function (line) {
        var rl = this.rl;
        if (line.length === 0) {
            rl.prompt();
            return;
        }
        // special commands
        // TODO: parse these with parser
        if (line === ".dump") {
            this.println(pp.render(100, pretty_1.prettyPrintDB(this.db)));
            rl.prompt();
            return;
        }
        else if (line === ".resetFacts") {
            this.db.tables = {};
            rl.prompt();
            return;
        }
        else if (line === ".graphviz") {
            // TODO: remove dot...
            this.doGraphviz();
            rl.prompt();
            return;
        }
        this.buffer = this.buffer + line;
        if (!(line.endsWith(".") || line.startsWith(".") || line.startsWith("#"))) {
            return;
        }
        try {
            var stmt = parser_1.language.statement.tryParse(this.buffer);
            this.handleStmt(stmt);
        }
        catch (e) {
            // TODO: distinguish between parse errors and others
            this.println("error", e.toString(), e.stack);
            if (this.mode === "pipe") {
                process.exit(-1);
            }
        }
        finally {
            this.buffer = "";
        }
        rl.prompt();
    };
    Repl.prototype.handleStmt = function (stmt) {
        switch (stmt.type) {
            case "Insert": {
                var record = stmt.record;
                if (simpleEvaluate_1.hasVars(record)) {
                    this.printQuery(record);
                    break;
                }
                var tbl = this.db.tables[record.relation];
                if (!tbl) {
                    tbl = [];
                    this.db.tables[record.relation] = tbl;
                }
                tbl.push(record);
                break;
            }
            case "Rule": {
                var rule = stmt.rule;
                this.db.rules[rule.head.relation] = rule;
                break;
            }
            case "TableDecl":
                if (this.db.tables[stmt.name]) {
                    return;
                }
                this.db.tables[stmt.name] = [];
                break;
            case "LoadStmt":
                this.doLoad(stmt.path);
        }
    };
    Repl.prototype.printQuery = function (record) {
        var results = simpleEvaluate_1.evaluate(this.db, record);
        for (var _i = 0, results_1 = results; _i < results_1.length; _i++) {
            var res = results_1[_i];
            // console.log(util.inspect(res, { depth: null }));
            this.println(pp.render(100, [
                pretty_1.prettyPrintTerm(res.term),
                // "; ",
                // prettyPrintBindings(res.bindings),
                ".",
            ]));
        }
    };
    Repl.prototype.doGraphviz = function () {
        var edges = simpleEvaluate_1.evaluate(this.db, types_1.rec("edge", { from: types_1.varr("F"), to: types_1.varr("T"), label: types_1.varr("L") }));
        var nodes = simpleEvaluate_1.evaluate(this.db, types_1.rec("node", { id: types_1.varr("I"), label: types_1.varr("L") }));
        // TODO: oof, all this typecasting
        var g = {
            edges: edges.map(function (e) {
                var rec = e.term;
                return {
                    from: rec.attrs.from.val,
                    to: rec.attrs.to.val,
                    attrs: { label: rec.attrs.label.val }
                };
            }),
            nodes: nodes.map(function (n) {
                var rec = n.term;
                return {
                    id: rec.attrs.id.val,
                    attrs: { label: rec.attrs.label.val }
                };
            })
        };
        this.println(graphviz_1.prettyPrintGraph(g));
    };
    Repl.prototype.doLoad = function (path) {
        try {
            var contents = this.loader(path);
            var program = parser_1.language.program.tryParse(contents);
            for (var _i = 0, program_1 = program; _i < program_1.length; _i++) {
                var stmt = program_1[_i];
                this.handleStmt(stmt);
            }
        }
        catch (e) {
            this.println("error: ", e);
        }
        this.rl.prompt();
    };
    Repl.prototype.println = function () {
        var strings = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            strings[_i] = arguments[_i];
        }
        // console.log("printing", strings[0], strings[1], strings[2]);
        this.out.write(strings.join(" ") + "\n");
    };
    return Repl;
}());
exports.Repl = Repl;
exports.fsLoader = function (path) { return fs.readFileSync(path).toString(); };
