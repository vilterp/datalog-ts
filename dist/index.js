let __defineProperty = Object.defineProperty;
let __hasOwnProperty = Object.prototype.hasOwnProperty;
let __assign = Object.assign;
let __commonJS = (callback, module) => () => {
  if (!module) {
    module = {exports: {}};
    callback(module.exports, module);
  }
  return module.exports;
};
let __markAsModule = (target) => {
  return __defineProperty(target, "__esModule", {value: true});
};
let __exportStar = (target, module) => {
  __markAsModule(target);
  if (typeof module === "object" || typeof module === "function") {
    for (let key in module)
      if (__hasOwnProperty.call(module, key) && !__hasOwnProperty.call(target, key) && key !== "default")
        __defineProperty(target, key, {get: () => module[key], enumerable: true});
  }
  return target;
};
let __toModule = (module) => {
  if (module && module.__esModule)
    return module;
  return __exportStar(__defineProperty({}, "default", {value: module, enumerable: true}), module);
};

// node_modules/parsimmon/build/parsimmon.umd.min.js
var require_parsimmon_umd_min = __commonJS((exports, module) => {
  !function(n, t) {
    "object" == typeof exports && "object" == typeof module ? module.exports = t() : "function" == typeof define && define.amd ? define([], t) : "object" == typeof exports ? exports.Parsimmon = t() : n.Parsimmon = t();
  }("undefined" != typeof self ? self : exports, function() {
    return function(n) {
      var t = {};
      function r(e) {
        if (t[e])
          return t[e].exports;
        var u = t[e] = {i: e, l: false, exports: {}};
        return n[e].call(u.exports, u, u.exports, r), u.l = true, u.exports;
      }
      return r.m = n, r.c = t, r.d = function(n2, t2, e) {
        r.o(n2, t2) || Object.defineProperty(n2, t2, {configurable: false, enumerable: true, get: e});
      }, r.r = function(n2) {
        Object.defineProperty(n2, "__esModule", {value: true});
      }, r.n = function(n2) {
        var t2 = n2 && n2.__esModule ? function() {
          return n2.default;
        } : function() {
          return n2;
        };
        return r.d(t2, "a", t2), t2;
      }, r.o = function(n2, t2) {
        return Object.prototype.hasOwnProperty.call(n2, t2);
      }, r.p = "", r(r.s = 0);
    }([function(n, t, r) {
      "use strict";
      function e(n2) {
        if (!(this instanceof e))
          return new e(n2);
        this._ = n2;
      }
      var u = e.prototype;
      function o(n2, t2) {
        for (var r2 = 0; r2 < n2; r2++)
          t2(r2);
      }
      function i(n2, t2, r2) {
        return function(n3, t3) {
          o(t3.length, function(r3) {
            n3(t3[r3], r3, t3);
          });
        }(function(r3, e2, u2) {
          t2 = n2(t2, r3, e2, u2);
        }, r2), t2;
      }
      function f(n2, t2) {
        return i(function(t3, r2, e2, u2) {
          return t3.concat([n2(r2, e2, u2)]);
        }, [], t2);
      }
      function a(n2, t2) {
        var r2 = {v: 0, buf: t2};
        return o(n2, function() {
          var n3;
          r2 = {v: r2.v << 1 | (n3 = r2.buf, n3[0] >> 7), buf: function(n4) {
            var t3 = i(function(n5, t4, r3, e2) {
              return n5.concat(r3 === e2.length - 1 ? Buffer.from([t4, 0]).readUInt16BE(0) : e2.readUInt16BE(r3));
            }, [], n4);
            return Buffer.from(f(function(n5) {
              return (n5 << 1 & 65535) >> 8;
            }, t3));
          }(r2.buf)};
        }), r2;
      }
      function c() {
        return "undefined" != typeof Buffer;
      }
      function s() {
        if (!c())
          throw new Error("Buffer global does not exist; please use webpack if you need to parse Buffers in the browser.");
      }
      function l(n2) {
        s();
        var t2 = i(function(n3, t3) {
          return n3 + t3;
        }, 0, n2);
        if (t2 % 8 != 0)
          throw new Error("The bits [" + n2.join(", ") + "] add up to " + t2 + " which is not an even number of bytes; the total should be divisible by 8");
        var r2, u2 = t2 / 8, o2 = (r2 = function(n3) {
          return n3 > 48;
        }, i(function(n3, t3) {
          return n3 || (r2(t3) ? t3 : n3);
        }, null, n2));
        if (o2)
          throw new Error(o2 + " bit range requested exceeds 48 bit (6 byte) Number max.");
        return new e(function(t3, r3) {
          var e2 = u2 + r3;
          return e2 > t3.length ? x(r3, u2.toString() + " bytes") : b(e2, i(function(n3, t4) {
            var r4 = a(t4, n3.buf);
            return {coll: n3.coll.concat(r4.v), buf: r4.buf};
          }, {coll: [], buf: t3.slice(r3, e2)}, n2).coll);
        });
      }
      function h(n2, t2) {
        return new e(function(r2, e2) {
          return s(), e2 + t2 > r2.length ? x(e2, t2 + " bytes for " + n2) : b(e2 + t2, r2.slice(e2, e2 + t2));
        });
      }
      function p(n2, t2) {
        if ("number" != typeof (r2 = t2) || Math.floor(r2) !== r2 || t2 < 0 || t2 > 6)
          throw new Error(n2 + " requires integer length in range [0, 6].");
        var r2;
      }
      function d(n2) {
        return p("uintBE", n2), h("uintBE(" + n2 + ")", n2).map(function(t2) {
          return t2.readUIntBE(0, n2);
        });
      }
      function v(n2) {
        return p("uintLE", n2), h("uintLE(" + n2 + ")", n2).map(function(t2) {
          return t2.readUIntLE(0, n2);
        });
      }
      function g(n2) {
        return p("intBE", n2), h("intBE(" + n2 + ")", n2).map(function(t2) {
          return t2.readIntBE(0, n2);
        });
      }
      function m(n2) {
        return p("intLE", n2), h("intLE(" + n2 + ")", n2).map(function(t2) {
          return t2.readIntLE(0, n2);
        });
      }
      function y(n2) {
        return n2 instanceof e;
      }
      function E(n2) {
        return "[object Array]" === {}.toString.call(n2);
      }
      function w(n2) {
        return c() && Buffer.isBuffer(n2);
      }
      function b(n2, t2) {
        return {status: true, index: n2, value: t2, furthest: -1, expected: []};
      }
      function x(n2, t2) {
        return E(t2) || (t2 = [t2]), {status: false, index: -1, value: null, furthest: n2, expected: t2};
      }
      function B(n2, t2) {
        if (!t2)
          return n2;
        if (n2.furthest > t2.furthest)
          return n2;
        var r2 = n2.furthest === t2.furthest ? function(n3, t3) {
          for (var r3 = {}, e2 = 0; e2 < n3.length; e2++)
            r3[n3[e2]] = true;
          for (var u2 = 0; u2 < t3.length; u2++)
            r3[t3[u2]] = true;
          var o2 = [];
          for (var i2 in r3)
            ({}).hasOwnProperty.call(r3, i2) && o2.push(i2);
          return o2.sort(), o2;
        }(n2.expected, t2.expected) : t2.expected;
        return {status: n2.status, index: n2.index, value: n2.value, furthest: t2.furthest, expected: r2};
      }
      function j(n2, t2) {
        if (w(n2))
          return {offset: t2, line: -1, column: -1};
        var r2 = n2.slice(0, t2).split("\n");
        return {offset: t2, line: r2.length, column: r2[r2.length - 1].length + 1};
      }
      function O(n2) {
        if (!y(n2))
          throw new Error("not a parser: " + n2);
      }
      function L(n2, t2) {
        return "string" == typeof n2 ? n2.charAt(t2) : n2[t2];
      }
      function _(n2) {
        if ("number" != typeof n2)
          throw new Error("not a number: " + n2);
      }
      function S(n2) {
        if ("function" != typeof n2)
          throw new Error("not a function: " + n2);
      }
      function k(n2) {
        if ("string" != typeof n2)
          throw new Error("not a string: " + n2);
      }
      var P2 = 2, q = 3, I = 8, A = 5 * I, F = 4 * I, M = "  ";
      function z(n2, t2) {
        return new Array(t2 + 1).join(n2);
      }
      function R(n2, t2, r2) {
        var e2 = t2 - n2.length;
        return e2 <= 0 ? n2 : z(r2, e2) + n2;
      }
      function U(n2, t2, r2, e2) {
        return {from: n2 - t2 > 0 ? n2 - t2 : 0, to: n2 + r2 > e2 ? e2 : n2 + r2};
      }
      function W(n2, t2) {
        var r2, e2, u2, o2, a2, c2 = t2.index, s2 = c2.offset, l2 = 1;
        if (s2 === n2.length)
          return "Got the end of the input";
        if (w(n2)) {
          var h2 = s2 - s2 % I, p2 = s2 - h2, d2 = U(h2, A, F + I, n2.length), v2 = f(function(n3) {
            return f(function(n4) {
              return R(n4.toString(16), 2, "0");
            }, n3);
          }, function(n3, t3) {
            var r3 = n3.length, e3 = [], u3 = 0;
            if (r3 <= t3)
              return [n3.slice()];
            for (var o3 = 0; o3 < r3; o3++)
              e3[u3] || e3.push([]), e3[u3].push(n3[o3]), (o3 + 1) % t3 == 0 && u3++;
            return e3;
          }(n2.slice(d2.from, d2.to).toJSON().data, I));
          o2 = function(n3) {
            return 0 === n3.from && 1 === n3.to ? {from: n3.from, to: n3.to} : {from: n3.from / I, to: Math.floor(n3.to / I)};
          }(d2), e2 = h2 / I, r2 = 3 * p2, p2 >= 4 && (r2 += 1), l2 = 2, u2 = f(function(n3) {
            return n3.length <= 4 ? n3.join(" ") : n3.slice(0, 4).join(" ") + "  " + n3.slice(4).join(" ");
          }, v2), (a2 = (8 * (o2.to > 0 ? o2.to - 1 : o2.to)).toString(16).length) < 2 && (a2 = 2);
        } else {
          var g2 = n2.split(/\r\n|[\n\r\u2028\u2029]/);
          r2 = c2.column - 1, e2 = c2.line - 1, o2 = U(e2, P2, q, g2.length), u2 = g2.slice(o2.from, o2.to), a2 = o2.to.toString().length;
        }
        var m2 = e2 - o2.from;
        return w(n2) && (a2 = (8 * (o2.to > 0 ? o2.to - 1 : o2.to)).toString(16).length) < 2 && (a2 = 2), i(function(t3, e3, u3) {
          var i2, f2 = u3 === m2, c3 = f2 ? "> " : M;
          return i2 = w(n2) ? R((8 * (o2.from + u3)).toString(16), a2, "0") : R((o2.from + u3 + 1).toString(), a2, " "), [].concat(t3, [c3 + i2 + " | " + e3], f2 ? [M + z(" ", a2) + " | " + R("", r2, " ") + z("^", l2)] : []);
        }, [], u2).join("\n");
      }
      function D(n2, t2) {
        return ["\n", "-- PARSING FAILED " + z("-", 50), "\n\n", W(n2, t2), "\n\n", (r2 = t2.expected, 1 === r2.length ? "Expected:\n\n" + r2[0] : "Expected one of the following: \n\n" + r2.join(", ")), "\n"].join("");
        var r2;
      }
      function N(n2) {
        var t2 = "" + n2;
        return t2.slice(t2.lastIndexOf("/") + 1);
      }
      function G() {
        for (var n2 = [].slice.call(arguments), t2 = n2.length, r2 = 0; r2 < t2; r2 += 1)
          O(n2[r2]);
        return e(function(r3, e2) {
          for (var u2, o2 = new Array(t2), i2 = 0; i2 < t2; i2 += 1) {
            if (!(u2 = B(n2[i2]._(r3, e2), u2)).status)
              return u2;
            o2[i2] = u2.value, e2 = u2.index;
          }
          return B(b(e2, o2), u2);
        });
      }
      function J() {
        var n2 = [].slice.call(arguments);
        if (0 === n2.length)
          throw new Error("seqMap needs at least one argument");
        var t2 = n2.pop();
        return S(t2), G.apply(null, n2).map(function(n3) {
          return t2.apply(null, n3);
        });
      }
      function T() {
        var n2 = [].slice.call(arguments), t2 = n2.length;
        if (0 === t2)
          return X("zero alternates");
        for (var r2 = 0; r2 < t2; r2 += 1)
          O(n2[r2]);
        return e(function(t3, r3) {
          for (var e2, u2 = 0; u2 < n2.length; u2 += 1)
            if ((e2 = B(n2[u2]._(t3, r3), e2)).status)
              return e2;
          return e2;
        });
      }
      function V(n2, t2) {
        return C(n2, t2).or(Q([]));
      }
      function C(n2, t2) {
        return O(n2), O(t2), J(n2, t2.then(n2).many(), function(n3, t3) {
          return [n3].concat(t3);
        });
      }
      function H(n2) {
        k(n2);
        var t2 = "'" + n2 + "'";
        return e(function(r2, e2) {
          var u2 = e2 + n2.length, o2 = r2.slice(e2, u2);
          return o2 === n2 ? b(u2, o2) : x(e2, t2);
        });
      }
      function K(n2, t2) {
        !function(n3) {
          if (!(n3 instanceof RegExp))
            throw new Error("not a regexp: " + n3);
          for (var t3 = N(n3), r3 = 0; r3 < t3.length; r3++) {
            var e2 = t3.charAt(r3);
            if ("i" !== e2 && "m" !== e2 && "u" !== e2)
              throw new Error('unsupported regexp flag "' + e2 + '": ' + n3);
          }
        }(n2), arguments.length >= 2 ? _(t2) : t2 = 0;
        var r2 = function(n3) {
          return RegExp("^(?:" + n3.source + ")", N(n3));
        }(n2), u2 = "" + n2;
        return e(function(n3, e2) {
          var o2 = r2.exec(n3.slice(e2));
          if (o2) {
            if (0 <= t2 && t2 <= o2.length) {
              var i2 = o2[0], f2 = o2[t2];
              return b(e2 + i2.length, f2);
            }
            return x(e2, "valid match group (0 to " + o2.length + ") in " + u2);
          }
          return x(e2, u2);
        });
      }
      function Q(n2) {
        return e(function(t2, r2) {
          return b(r2, n2);
        });
      }
      function X(n2) {
        return e(function(t2, r2) {
          return x(r2, n2);
        });
      }
      function Y(n2) {
        if (y(n2))
          return e(function(t2, r2) {
            var e2 = n2._(t2, r2);
            return e2.index = r2, e2.value = "", e2;
          });
        if ("string" == typeof n2)
          return Y(H(n2));
        if (n2 instanceof RegExp)
          return Y(K(n2));
        throw new Error("not a string, regexp, or parser: " + n2);
      }
      function Z(n2) {
        return O(n2), e(function(t2, r2) {
          var e2 = n2._(t2, r2), u2 = t2.slice(r2, e2.index);
          return e2.status ? x(r2, 'not "' + u2 + '"') : b(r2, null);
        });
      }
      function $(n2) {
        return S(n2), e(function(t2, r2) {
          var e2 = L(t2, r2);
          return r2 < t2.length && n2(e2) ? b(r2 + 1, e2) : x(r2, "a character/byte matching " + n2);
        });
      }
      function nn(n2, t2) {
        arguments.length < 2 && (t2 = n2, n2 = void 0);
        var r2 = e(function(n3, e2) {
          return r2._ = t2()._, r2._(n3, e2);
        });
        return n2 ? r2.desc(n2) : r2;
      }
      function tn() {
        return X("fantasy-land/empty");
      }
      u.parse = function(n2) {
        if ("string" != typeof n2 && !w(n2))
          throw new Error(".parse must be called with a string or Buffer as its argument");
        var t2 = this.skip(on)._(n2, 0);
        return t2.status ? {status: true, value: t2.value} : {status: false, index: j(n2, t2.furthest), expected: t2.expected};
      }, u.tryParse = function(n2) {
        var t2 = this.parse(n2);
        if (t2.status)
          return t2.value;
        var r2 = D(n2, t2), e2 = new Error(r2);
        throw e2.type = "ParsimmonError", e2.result = t2, e2;
      }, u.assert = function(n2, t2) {
        return this.chain(function(r2) {
          return n2(r2) ? Q(r2) : X(t2);
        });
      }, u.or = function(n2) {
        return T(this, n2);
      }, u.trim = function(n2) {
        return this.wrap(n2, n2);
      }, u.wrap = function(n2, t2) {
        return J(n2, this, t2, function(n3, t3) {
          return t3;
        });
      }, u.thru = function(n2) {
        return n2(this);
      }, u.then = function(n2) {
        return O(n2), G(this, n2).map(function(n3) {
          return n3[1];
        });
      }, u.many = function() {
        var n2 = this;
        return e(function(t2, r2) {
          for (var e2 = [], u2 = void 0; ; ) {
            if (!(u2 = B(n2._(t2, r2), u2)).status)
              return B(b(r2, e2), u2);
            if (r2 === u2.index)
              throw new Error("infinite loop detected in .many() parser --- calling .many() on a parser which can accept zero characters is usually the cause");
            r2 = u2.index, e2.push(u2.value);
          }
        });
      }, u.tieWith = function(n2) {
        return k(n2), this.map(function(t2) {
          if (function(n3) {
            if (!E(n3))
              throw new Error("not an array: " + n3);
          }(t2), t2.length) {
            k(t2[0]);
            for (var r2 = t2[0], e2 = 1; e2 < t2.length; e2++)
              k(t2[e2]), r2 += n2 + t2[e2];
            return r2;
          }
          return "";
        });
      }, u.tie = function() {
        return this.tieWith("");
      }, u.times = function(n2, t2) {
        var r2 = this;
        return arguments.length < 2 && (t2 = n2), _(n2), _(t2), e(function(e2, u2) {
          for (var o2 = [], i2 = void 0, f2 = void 0, a2 = 0; a2 < n2; a2 += 1) {
            if (f2 = B(i2 = r2._(e2, u2), f2), !i2.status)
              return f2;
            u2 = i2.index, o2.push(i2.value);
          }
          for (; a2 < t2 && (f2 = B(i2 = r2._(e2, u2), f2), i2.status); a2 += 1)
            u2 = i2.index, o2.push(i2.value);
          return B(b(u2, o2), f2);
        });
      }, u.result = function(n2) {
        return this.map(function() {
          return n2;
        });
      }, u.atMost = function(n2) {
        return this.times(0, n2);
      }, u.atLeast = function(n2) {
        return J(this.times(n2), this.many(), function(n3, t2) {
          return n3.concat(t2);
        });
      }, u.map = function(n2) {
        S(n2);
        var t2 = this;
        return e(function(r2, e2) {
          var u2 = t2._(r2, e2);
          return u2.status ? B(b(u2.index, n2(u2.value)), u2) : u2;
        });
      }, u.contramap = function(n2) {
        S(n2);
        var t2 = this;
        return e(function(r2, e2) {
          var u2 = t2.parse(n2(r2.slice(e2)));
          return u2.status ? b(e2 + r2.length, u2.value) : u2;
        });
      }, u.promap = function(n2, t2) {
        return S(n2), S(t2), this.contramap(n2).map(t2);
      }, u.skip = function(n2) {
        return G(this, n2).map(function(n3) {
          return n3[0];
        });
      }, u.mark = function() {
        return J(rn, this, rn, function(n2, t2, r2) {
          return {start: n2, value: t2, end: r2};
        });
      }, u.node = function(n2) {
        return J(rn, this, rn, function(t2, r2, e2) {
          return {name: n2, value: r2, start: t2, end: e2};
        });
      }, u.sepBy = function(n2) {
        return V(this, n2);
      }, u.sepBy1 = function(n2) {
        return C(this, n2);
      }, u.lookahead = function(n2) {
        return this.skip(Y(n2));
      }, u.notFollowedBy = function(n2) {
        return this.skip(Z(n2));
      }, u.desc = function(n2) {
        E(n2) || (n2 = [n2]);
        var t2 = this;
        return e(function(r2, e2) {
          var u2 = t2._(r2, e2);
          return u2.status || (u2.expected = n2), u2;
        });
      }, u.fallback = function(n2) {
        return this.or(Q(n2));
      }, u.ap = function(n2) {
        return J(n2, this, function(n3, t2) {
          return n3(t2);
        });
      }, u.chain = function(n2) {
        var t2 = this;
        return e(function(r2, e2) {
          var u2 = t2._(r2, e2);
          return u2.status ? B(n2(u2.value)._(r2, u2.index), u2) : u2;
        });
      }, u.concat = u.or, u.empty = tn, u.of = Q, u["fantasy-land/ap"] = u.ap, u["fantasy-land/chain"] = u.chain, u["fantasy-land/concat"] = u.concat, u["fantasy-land/empty"] = u.empty, u["fantasy-land/of"] = u.of, u["fantasy-land/map"] = u.map;
      var rn = e(function(n2, t2) {
        return b(t2, j(n2, t2));
      }), en = e(function(n2, t2) {
        return t2 >= n2.length ? x(t2, "any character/byte") : b(t2 + 1, L(n2, t2));
      }), un = e(function(n2, t2) {
        return b(n2.length, n2.slice(t2));
      }), on = e(function(n2, t2) {
        return t2 < n2.length ? x(t2, "EOF") : b(t2, null);
      }), fn = K(/[0-9]/).desc("a digit"), an = K(/[0-9]*/).desc("optional digits"), cn = K(/[a-z]/i).desc("a letter"), sn = K(/[a-z]*/i).desc("optional letters"), ln = K(/\s*/).desc("optional whitespace"), hn = K(/\s+/).desc("whitespace"), pn = H("\r"), dn = H("\n"), vn = H("\r\n"), gn = T(vn, dn, pn).desc("newline"), mn = T(gn, on);
      e.all = un, e.alt = T, e.any = en, e.cr = pn, e.createLanguage = function(n2) {
        var t2 = {};
        for (var r2 in n2)
          ({}).hasOwnProperty.call(n2, r2) && function(r3) {
            t2[r3] = nn(function() {
              return n2[r3](t2);
            });
          }(r2);
        return t2;
      }, e.crlf = vn, e.custom = function(n2) {
        return e(n2(b, x));
      }, e.digit = fn, e.digits = an, e.empty = tn, e.end = mn, e.eof = on, e.fail = X, e.formatError = D, e.index = rn, e.isParser = y, e.lazy = nn, e.letter = cn, e.letters = sn, e.lf = dn, e.lookahead = Y, e.makeFailure = x, e.makeSuccess = b, e.newline = gn, e.noneOf = function(n2) {
        return $(function(t2) {
          return n2.indexOf(t2) < 0;
        }).desc("none of '" + n2 + "'");
      }, e.notFollowedBy = Z, e.of = Q, e.oneOf = function(n2) {
        for (var t2 = n2.split(""), r2 = 0; r2 < t2.length; r2++)
          t2[r2] = "'" + t2[r2] + "'";
        return $(function(t3) {
          return n2.indexOf(t3) >= 0;
        }).desc(t2);
      }, e.optWhitespace = ln, e.Parser = e, e.range = function(n2, t2) {
        return $(function(r2) {
          return n2 <= r2 && r2 <= t2;
        }).desc(n2 + "-" + t2);
      }, e.regex = K, e.regexp = K, e.sepBy = V, e.sepBy1 = C, e.seq = G, e.seqMap = J, e.seqObj = function() {
        for (var n2, t2 = {}, r2 = 0, u2 = (n2 = arguments, Array.prototype.slice.call(n2)), o2 = u2.length, i2 = 0; i2 < o2; i2 += 1) {
          var f2 = u2[i2];
          if (!y(f2)) {
            if (E(f2) && 2 === f2.length && "string" == typeof f2[0] && y(f2[1])) {
              var a2 = f2[0];
              if (Object.prototype.hasOwnProperty.call(t2, a2))
                throw new Error("seqObj: duplicate key " + a2);
              t2[a2] = true, r2++;
              continue;
            }
            throw new Error("seqObj arguments must be parsers or [string, parser] array pairs.");
          }
        }
        if (0 === r2)
          throw new Error("seqObj expects at least one named parser, found zero");
        return e(function(n3, t3) {
          for (var r3, e2 = {}, i3 = 0; i3 < o2; i3 += 1) {
            var f3, a3;
            if (E(u2[i3]) ? (f3 = u2[i3][0], a3 = u2[i3][1]) : (f3 = null, a3 = u2[i3]), !(r3 = B(a3._(n3, t3), r3)).status)
              return r3;
            f3 && (e2[f3] = r3.value), t3 = r3.index;
          }
          return B(b(t3, e2), r3);
        });
      }, e.string = H, e.succeed = Q, e.takeWhile = function(n2) {
        return S(n2), e(function(t2, r2) {
          for (var e2 = r2; e2 < t2.length && n2(L(t2, e2)); )
            e2++;
          return b(e2, t2.slice(r2, e2));
        });
      }, e.test = $, e.whitespace = hn, e["fantasy-land/empty"] = tn, e["fantasy-land/of"] = Q, e.Binary = {bitSeq: l, bitSeqObj: function(n2) {
        s();
        var t2 = {}, r2 = 0, e2 = f(function(n3) {
          if (E(n3)) {
            var e3 = n3;
            if (2 !== e3.length)
              throw new Error("[" + e3.join(", ") + "] should be length 2, got length " + e3.length);
            if (k(e3[0]), _(e3[1]), Object.prototype.hasOwnProperty.call(t2, e3[0]))
              throw new Error("duplicate key in bitSeqObj: " + e3[0]);
            return t2[e3[0]] = true, r2++, e3;
          }
          return _(n3), [null, n3];
        }, n2);
        if (r2 < 1)
          throw new Error("bitSeqObj expects at least one named pair, got [" + n2.join(", ") + "]");
        var u2 = f(function(n3) {
          return n3[0];
        }, e2);
        return l(f(function(n3) {
          return n3[1];
        }, e2)).map(function(n3) {
          return i(function(n4, t3) {
            return null !== t3[0] && (n4[t3[0]] = t3[1]), n4;
          }, {}, f(function(t3, r3) {
            return [t3, n3[r3]];
          }, u2));
        });
      }, byte: function(n2) {
        if (s(), _(n2), n2 > 255)
          throw new Error("Value specified to byte constructor (" + n2 + "=0x" + n2.toString(16) + ") is larger in value than a single byte.");
        var t2 = (n2 > 15 ? "0x" : "0x0") + n2.toString(16);
        return e(function(r2, e2) {
          var u2 = L(r2, e2);
          return u2 === n2 ? b(e2 + 1, u2) : x(e2, t2);
        });
      }, buffer: function(n2) {
        return h("buffer", n2).map(function(n3) {
          return Buffer.from(n3);
        });
      }, encodedString: function(n2, t2) {
        return h("string", t2).map(function(t3) {
          return t3.toString(n2);
        });
      }, uintBE: d, uint8BE: d(1), uint16BE: d(2), uint32BE: d(4), uintLE: v, uint8LE: v(1), uint16LE: v(2), uint32LE: v(4), intBE: g, int8BE: g(1), int16BE: g(2), int32BE: g(4), intLE: m, int8LE: m(1), int16LE: m(2), int32LE: m(4), floatBE: h("floatBE", 4).map(function(n2) {
        return n2.readFloatBE(0);
      }), floatLE: h("floatLE", 4).map(function(n2) {
        return n2.readFloatLE(0);
      }), doubleBE: h("doubleBE", 8).map(function(n2) {
        return n2.readDoubleBE(0);
      }), doubleLE: h("doubleLE", 8).map(function(n2) {
        return n2.readDoubleLE(0);
      })}, n.exports = e;
    }]);
  });
});

// types.ts
const literalTrace = {type: "LiteralTrace"};
const varTrace = {type: "VarTrace"};
const baseFactTrace = {type: "BaseFactTrace"};
const binExprTrace = {type: "BinExprTrace"};
function str(s) {
  return {type: "StringLit", val: s};
}
function rec(relation, attrs) {
  return {type: "Record", relation, attrs};
}
const trueTerm = {type: "Bool", val: true};
const falseTerm = {type: "Bool", val: false};

// parser.ts
const P = __toModule(require_parsimmon_umd_min());
const language = P.createLanguage({
  program: (r) => P.sepBy(r.statement, P.optWhitespace).trim(P.optWhitespace),
  statement: (r) => P.alt(r.insert, r.rule, r.comment, r.tableDecl, r.loadStmt, r.traceStmt),
  loadStmt: (r) => P.seq(word(".load"), r.filePath).map(([_, path]) => ({
    type: "LoadStmt",
    path
  })),
  traceStmt: (r) => P.seq(word(".trace"), r.insert).map(([_, insert]) => ({
    type: "TraceStmt",
    record: insert.record
  })),
  tableDecl: (r) => P.seq(word(".table"), r.recordIdentifier).map(([_, name]) => ({
    type: "TableDecl",
    name
  })),
  comment: () => P.regex(/#[^\n]*/).map((comment) => ({type: "Comment", comment})),
  insert: (r) => r.record.skip(r.period).map((rec2) => ({type: "Insert", record: rec2})),
  rule: (r) => P.seq(r.record, word(":-"), r.ruleOptions, r.period).map(([head, _, options, __]) => ({
    type: "Rule",
    rule: {head, defn: options}
  })),
  ruleOptions: (r) => P.sepBy(r.andClauses, r.or).map((xs) => ({type: "Or", opts: xs})),
  andClauses: (r) => P.sepBy(r.clause, r.and).map((xs) => ({type: "And", clauses: xs})),
  clause: (r) => P.alt(r.record, r.binExpr),
  term: (r) => P.alt(r.arrayLit, r.var, r.boolLit, r.record, r.stringLit, r.intLit),
  record: (r) => P.seq(r.recordIdentifier, r.lbrace, r.pair.sepBy(r.comma), r.rbrace).map(([ident, _, pairs, __]) => ({
    type: "Record",
    relation: ident,
    attrs: pairsToObj(pairs)
  })),
  arrayLit: (r) => P.seq(r.lsquare, P.sepBy(r.term, r.comma), r.rsquare).map(([_1, items, _2]) => ({type: "Array", items})),
  binExpr: (r) => P.seq(r.term.skip(P.optWhitespace), r.binOp, r.term.skip(P.optWhitespace)).map(([left, op, right]) => ({
    type: "BinExpr",
    left,
    right,
    op
  })),
  stringLit: () => P.regexp(/"((?:\\.|.)*?)"/, 1).map(interpretEscapes).desc("string").map((s) => ({type: "StringLit", val: s})),
  intLit: () => P.regex(/-?[0-9]+(\.[0-9]+)?/).map((digits) => ({
    type: "IntLit",
    val: Number.parseInt(digits)
  })),
  boolLit: () => P.alt(P.string("true").map(() => trueTerm), P.string("false").map(() => falseTerm)),
  var: () => P.regex(/([A-Z][a-zA-Z0-9_]*)/, 1).map((id) => ({type: "Var", name: id})),
  pair: (r) => P.seq(r.recordIdentifier.skip(r.colon), r.term),
  recordIdentifier: () => P.regex(/([a-zA-Z][a-zA-Z0-9_\.]*)/, 1).desc("record identifier"),
  filePath: () => P.regex(/[^\n]+/).desc("file path"),
  binOp: () => P.alt(word("=="), word("!="), word("<="), word(">=")),
  lbrace: () => word("{"),
  rbrace: () => word("}"),
  lsquare: () => word("["),
  rsquare: () => word("]"),
  colon: () => word(":"),
  comma: () => word(","),
  period: () => word("."),
  and: () => word("&"),
  or: () => word("|")
});
function word(str2) {
  return P.string(str2).skip(P.optWhitespace);
}
function interpretEscapes(str2) {
  let escapes = {
    b: "\b",
    f: "\f",
    n: "\n",
    r: "\r",
    t: "	"
  };
  return str2.replace(/\\(u[0-9a-fA-F]{4}|[^u])/, (_, escape) => {
    let type = escape.charAt(0);
    let hex = escape.slice(1);
    if (type === "u") {
      return String.fromCharCode(parseInt(hex, 16));
    }
    if (escapes.hasOwnProperty(type)) {
      return escapes[type];
    }
    return type;
  });
}
function pairsToObj(pairs) {
  const out = {};
  pairs.forEach(([k, v]) => {
    out[k] = v;
  });
  return out;
}

// util.ts
function mapObj2(obj, f) {
  const out = {};
  for (const key of Object.keys(obj)) {
    out[key] = f(key, obj[key]);
  }
  return out;
}
function filterMap(arr, f) {
  const out = [];
  for (const item of arr) {
    const res = f(item);
    if (!res) {
      continue;
    }
    out.push(res);
  }
  return out;
}
function mapObjToList(obj, f) {
  return Object.keys(obj).sort().map((k) => f(k, obj[k]));
}
function flatMapObjToList(obj, f) {
  const out = [];
  for (const key of Object.keys(obj).sort()) {
    for (const val of f(key, obj[key])) {
      out.push(val);
    }
  }
  return out;
}
function flatMap(arr, f) {
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const input = arr[i];
    for (const output of f(input, i)) {
      out.push(output);
    }
  }
  return out;
}

// unify.ts
function unify2(prior, left, right) {
  const res = doUnify(prior, left, right);
  return res;
}
function doUnify(prior, left, right) {
  switch (left.type) {
    case "StringLit":
    case "IntLit":
    case "Bool":
      if (right.type === left.type) {
        return left.val === right.val ? {} : null;
      } else if (right.type === "Var") {
        return {[right.name]: left};
      } else {
        return null;
      }
    case "Var":
      const priorBinding = prior[left.name];
      if (priorBinding) {
        if (priorBinding.type === "Var") {
          return {[left.name]: right};
        }
        if (unify2({}, priorBinding, right)) {
          return {[left.name]: right};
        }
        return null;
      }
      return {[left.name]: right};
    case "Record": {
      switch (right.type) {
        case "Record":
          let accum = {};
          for (const key of Object.keys(left.attrs)) {
            const leftVal = left.attrs[key];
            const rightVal = right.attrs[key];
            if (!rightVal) {
              continue;
            }
            const res = unify2(prior, leftVal, rightVal);
            if (res === null) {
              return null;
            }
            accum = __assign(__assign({}, accum), res);
          }
          return accum;
        case "Var":
          return {[right.name]: left};
        default:
          return null;
      }
    }
    case "Array":
      switch (right.type) {
        case "Array":
          if (left.items.length != right.items.length) {
            return null;
          }
          let accum = {};
          for (let i = 0; i < left.items.length; i++) {
            const leftItem = left.items[i];
            const rightItem = right.items[i];
            const res = unify2(prior, leftItem, rightItem);
            if (res === null) {
              return null;
            }
            accum = __assign(__assign({}, accum), res);
          }
          return accum;
        default:
          return null;
      }
    default:
      return null;
  }
}
function termSameType(left, right) {
  return left.type === right.type;
}
function termEq(left, right) {
  if (!left || !right) {
    return false;
  }
  switch (left.type) {
    case "StringLit":
    case "IntLit":
    case "Bool":
      return left.type === right.type && left.val === right.val;
    case "Var":
      switch (right.type) {
        case "Var":
          return left.name === right.name;
        default:
          return false;
      }
    case "Record":
      switch (right.type) {
        case "Record":
          for (const key of Object.keys(left.attrs)) {
            const rightVal = right.attrs[key];
            const leftVal = left.attrs[key];
            if (!termEq(leftVal, rightVal)) {
              return false;
            }
          }
          return Object.keys(left).length === Object.keys(right).length;
        default:
          return null;
      }
  }
}
function termLT(left, right) {
  switch (left.type) {
    case "IntLit":
      switch (right.type) {
        case "IntLit":
          return left.val < right.val;
        default:
          return false;
      }
    case "StringLit":
      switch (right.type) {
        case "StringLit":
          return left.val < right.val;
        default:
          return false;
      }
    default:
      return false;
  }
}
function unifyVars(left, right) {
  const res = {};
  for (const leftKey of Object.keys(left)) {
    const leftVal = left[leftKey];
    const rightVal = right[leftKey];
    if (rightVal) {
      if (!unify2({}, rightVal, leftVal)) {
        return null;
      }
    }
    res[leftKey] = leftVal;
  }
  const onlyInRight = Object.keys(right).filter((key) => !left[key]);
  for (const key of onlyInRight) {
    res[key] = right[key];
  }
  return res;
}
function substitute(term, bindings) {
  switch (term.type) {
    case "Record":
      return rec(term.relation, mapObj2(term.attrs, (k, t) => substitute(t, bindings)));
    case "Var":
      return bindings[term.name] ? bindings[term.name] : term;
    default:
      return term;
  }
}

// simpleEvaluate.ts
function evaluate(db, term) {
  return doEvaluate(0, [], db, {}, term);
}
function doJoin(depth, invokeLoc, db, scope, clauses) {
  if (clauses.length === 1) {
    return doEvaluate(depth + 1, [...invokeLoc, {type: "AndClause", idx: 0}], db, scope, clauses[0]);
  }
  const leftResults = doEvaluate(depth + 1, [...invokeLoc, {type: "AndClause", idx: 0}], db, scope, clauses[0]);
  const out = [];
  for (const leftRes of leftResults) {
    const nextScope = unifyVars(scope, leftRes.bindings);
    const rightResults = doJoin(depth, [...invokeLoc, {type: "AndClause", idx: 1}], db, nextScope, clauses.slice(1));
    for (const rightRes of rightResults) {
      const unifyRes = unifyVars(leftRes.bindings, rightRes.bindings);
      if (unifyRes === null) {
        continue;
      }
      out.push({
        term: leftRes.term,
        bindings: unifyRes,
        trace: {
          type: "AndTrace",
          sources: [leftRes, rightRes]
        }
      });
    }
  }
  return out;
}
function applyFilter(binExpr2, res) {
  return res.filter((res2) => evalBinExpr(binExpr2, res2.bindings));
}
function applyFilters(exprs, recResults) {
  if (exprs.length === 0) {
    return recResults;
  }
  return applyFilter(exprs[0], applyFilters(exprs.slice(1), recResults));
}
function doEvaluate(depth, path, db, scope, term) {
  const bigRes = (() => {
    switch (term.type) {
      case "Record": {
        const table = db.tables[term.relation];
        const virtual = db.virtualTables[term.relation];
        const records = table ? table : virtual ? virtual(db) : null;
        if (records) {
          const out = [];
          for (const rec2 of records) {
            const unifyRes = unify2(scope, term, rec2);
            if (unifyRes === null) {
              continue;
            }
            out.push({
              term: rec2,
              bindings: unifyRes,
              trace: {
                type: "MatchTrace",
                match: term,
                fact: {term: rec2, trace: baseFactTrace, bindings: {}}
              }
            });
          }
          return out;
        }
        const rule = db.rules[term.relation];
        if (rule) {
          const substTerm = substitute(term, scope);
          const newScope = unify2({}, substTerm, rule.head);
          if (newScope === null) {
            return [];
          }
          const mappings = getMappings(rule.head.attrs, term.attrs);
          const rawResults = flatMap(rule.defn.opts, (andExpr, optIdx) => {
            const {recs: clauses, exprs} = extractBinExprs(andExpr);
            const recResults = doJoin(depth, [{type: "OrOpt", idx: optIdx}], db, newScope, clauses);
            return applyFilters(exprs, recResults);
          });
          return filterMap(rawResults, (res) => {
            const mappedBindings = applyMappings(mappings, res.bindings);
            const nextTerm = substitute(rule.head, res.bindings);
            const unif = unify2(mappedBindings, term, nextTerm);
            if (unif === null) {
              return null;
            }
            const outerRes = {
              bindings: unif,
              term: nextTerm,
              trace: {
                type: "RefTrace",
                refTerm: term,
                invokeLoc: path,
                innerRes: res,
                mappings
              }
            };
            return outerRes;
          });
        }
        throw new Error(`not found: ${term.relation}`);
      }
      case "Var":
        return [{term: scope[term.name], bindings: scope, trace: varTrace}];
      case "BinExpr":
        return [
          {
            term: evalBinExpr(term, scope) ? trueTerm : falseTerm,
            bindings: scope,
            trace: binExprTrace
          }
        ];
      case "Bool":
      case "StringLit":
        return [{term, bindings: scope, trace: literalTrace}];
    }
  })();
  return bigRes;
}
function evalBinExpr(expr, scope) {
  const left = substitute(expr.left, scope);
  const right = substitute(expr.right, scope);
  switch (expr.op) {
    case "==":
      return termEq(left, right);
    case "!=":
      return !termEq(left, right);
    case "<=":
      return termSameType(left, right) && (termLT(left, right) || termEq(left, right));
    case ">=":
      return termSameType(left, right) && !termLT(left, right);
  }
}
function getMappings(head, call) {
  const out = {};
  for (const callKey of Object.keys(call)) {
    const callTerm = call[callKey];
    const headTerm = head[callKey];
    if ((headTerm == null ? void 0 : headTerm.type) === "Var" && (callTerm == null ? void 0 : callTerm.type) === "Var") {
      out[headTerm.name] = callTerm.name;
    }
  }
  return out;
}
function applyMappings(headToCaller, bindings) {
  const out = {};
  for (const key of Object.keys(bindings)) {
    const callerKey = headToCaller[key];
    if (!callerKey) {
      continue;
    }
    out[callerKey] = bindings[key];
  }
  return out;
}
function extractBinExprs(term) {
  const recs = [];
  const exprs = [];
  term.clauses.forEach((clause) => {
    switch (clause.type) {
      case "BinExpr":
        exprs.push(clause);
        break;
      case "Record":
        recs.push(clause);
        break;
    }
  });
  return {
    recs,
    exprs
  };
}
function hasVars(t) {
  switch (t.type) {
    case "StringLit":
      return false;
    case "Var":
      return true;
    case "Record":
      return Object.keys(t.attrs).some((k) => hasVars(t.attrs[k]));
    case "BinExpr":
      return hasVars(t.left) || hasVars(t.right);
    case "Bool":
      return false;
  }
}

// interpreter.ts
class Interpreter {
  constructor(cwd, loader) {
    this.db = {
      tables: {},
      rules: {},
      virtualTables: {
        "internal.Relation": virtualRelations,
        "internal.RelationReference": virtualReferences
      }
    };
    this.cwd = cwd;
    this.loader = loader;
  }
  evalStr(line) {
    const stmt = language.statement.tryParse(line);
    return this.evalStmt(stmt);
  }
  evalStmt(stmt) {
    switch (stmt.type) {
      case "Insert": {
        const record = stmt.record;
        if (hasVars(record)) {
          return noTrace(this.evalQuery(record));
        }
        let tbl = this.db.tables[record.relation];
        if (!tbl) {
          tbl = [];
          this.db.tables[record.relation] = tbl;
        }
        tbl.push(record);
        return noTrace([]);
      }
      case "Rule": {
        const rule = stmt.rule;
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
        const inner = this.evalStmt({type: "Insert", record: stmt.record});
        return yesTrace(inner.results);
      case "Comment":
        return noTrace([]);
    }
  }
  evalQuery(record) {
    return evaluate(this.db, record);
  }
  doLoad(path) {
    const contents = this.loader(this.cwd + "/" + path);
    const program = language.program.tryParse(contents);
    for (const stmt of program) {
      this.evalStmt(stmt);
    }
  }
}
function noTrace(results) {
  return {results, trace: false};
}
function yesTrace(results) {
  return {results, trace: true};
}
function virtualRelations(db) {
  return [
    ...mapObjToList(db.rules, (name) => rec("internal.Relation", {type: str("rule"), name: str(name)})),
    ...mapObjToList(db.tables, (name) => rec("internal.Relation", {type: str("table"), name: str(name)})),
    ...mapObjToList(db.virtualTables, (name) => rec("internal.Relation", {type: str("virtual"), name: str(name)}))
  ];
}
function virtualReferences(db) {
  return flatMapObjToList(db.rules, (ruleName, rule) => flatMap(rule.defn.opts, (opt) => flatMap(opt.clauses, (clause) => clause.type === "Record" ? [
    rec("internal.RelationReference", {
      from: str(ruleName),
      to: str(clause.relation)
    })
  ] : [])));
}
export {
  Interpreter
};
