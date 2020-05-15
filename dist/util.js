"use strict";
exports.__esModule = true;
exports.repeat = exports.flatMap = exports.flatMapObjToList = exports.mapObjToList = exports.mapObjMaybe = exports.filterMap = exports.mapObj = void 0;
function mapObj(obj, f) {
    var out = {};
    for (var _i = 0, _a = Object.keys(obj); _i < _a.length; _i++) {
        var key = _a[_i];
        out[key] = f(key, obj[key]);
    }
    return out;
}
exports.mapObj = mapObj;
function filterMap(arr, f) {
    var out = [];
    for (var _i = 0, arr_1 = arr; _i < arr_1.length; _i++) {
        var item = arr_1[_i];
        var res = f(item);
        if (!res) {
            continue;
        }
        out.push(res);
    }
    return out;
}
exports.filterMap = filterMap;
function mapObjMaybe(obj, f) {
    var out = {};
    for (var _i = 0, _a = Object.keys(obj); _i < _a.length; _i++) {
        var key = _a[_i];
        var res = f(key, obj[key]);
        if (res) {
            out[key] = res;
        }
    }
    return out;
}
exports.mapObjMaybe = mapObjMaybe;
function mapObjToList(obj, f) {
    return Object.keys(obj)
        .sort()
        .map(function (k) { return f(k, obj[k]); });
}
exports.mapObjToList = mapObjToList;
function flatMapObjToList(obj, f) {
    var out = [];
    for (var _i = 0, _a = Object.keys(obj).sort(); _i < _a.length; _i++) {
        var key = _a[_i];
        for (var _b = 0, _c = f(key, obj[key]); _b < _c.length; _b++) {
            var val = _c[_b];
            out.push(val);
        }
    }
    return out;
}
exports.flatMapObjToList = flatMapObjToList;
function flatMap(arr, f) {
    var out = [];
    for (var _i = 0, arr_2 = arr; _i < arr_2.length; _i++) {
        var input = arr_2[_i];
        for (var _a = 0, _b = f(input); _a < _b.length; _a++) {
            var output = _b[_a];
            out.push(output);
        }
    }
    return out;
}
exports.flatMap = flatMap;
function repeat(n, str) {
    var out = "";
    for (var i = 0; i < n; i++) {
        out += str;
    }
    return out;
}
exports.repeat = repeat;
