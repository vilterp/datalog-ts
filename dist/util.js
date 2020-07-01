"use strict";
exports.__esModule = true;
exports.clamp = exports.pairsToObj = exports.groupBy = exports.lastItem = exports.getFirst = exports.arrayEq = exports.updateAtIdx = exports.uniqBy = exports.uniq = exports.repeatArr = exports.repeat = exports.flatMap = exports.flatMapObjToList = exports.mapObjToList = exports.mapObjMaybe = exports.intersperseIdx = exports.intersperse = exports.filterMap = exports.mapObj = void 0;
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
function intersperse(sep, arr) {
    var out = [];
    for (var i = 0; i < arr.length; i++) {
        out.push(arr[i]);
        if (i < arr.length - 1) {
            out.push(sep);
        }
    }
    return out;
}
exports.intersperse = intersperse;
function intersperseIdx(sep, arr) {
    var out = [];
    for (var i = 0; i < arr.length; i++) {
        out.push(arr[i]);
        if (i < arr.length - 1) {
            out.push(sep(i));
        }
    }
    return out;
}
exports.intersperseIdx = intersperseIdx;
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
    for (var i = 0; i < arr.length; i++) {
        var input = arr[i];
        for (var _i = 0, _a = f(input, i); _i < _a.length; _i++) {
            var output = _a[_i];
            out.push(output);
        }
    }
    return out;
}
exports.flatMap = flatMap;
function repeat(n, str) {
    return repeatArr(n, str).join("");
}
exports.repeat = repeat;
function repeatArr(n, item) {
    var out = [];
    for (var i = 0; i < n; i++) {
        out.push(item);
    }
    return out;
}
exports.repeatArr = repeatArr;
function uniq(l) {
    return uniqBy(l, function (x) { return x; });
}
exports.uniq = uniq;
function uniqBy(l, f) {
    var seen = new Set();
    var out = [];
    for (var _i = 0, l_1 = l; _i < l_1.length; _i++) {
        var item = l_1[_i];
        var key = f(item);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        out.push(item);
    }
    return out;
}
exports.uniqBy = uniqBy;
function updateAtIdx(arr, idx, update) {
    return arr.map(function (item, curIdx) { return (curIdx === idx ? update(item) : item); });
}
exports.updateAtIdx = updateAtIdx;
function arrayEq(a, b, cmp) {
    return (a.length === b.length &&
        a.reduce(function (accum, el, idx) { return accum && cmp(el, b[idx]); }, true));
}
exports.arrayEq = arrayEq;
function getFirst(arr, f) {
    for (var i = 0; i < arr.length; i++) {
        var res = f(arr[i]);
        if (res !== null) {
            return res;
        }
    }
    return null;
}
exports.getFirst = getFirst;
function lastItem(arr) {
    return arr[arr.length - 1];
}
exports.lastItem = lastItem;
function groupBy(arr) {
    var out = {};
    arr.forEach(function (_a) {
        var key = _a[0], item = _a[1];
        var items = out[key];
        if (!items) {
            items = [];
            out[key] = items;
        }
        items.push(item);
    });
    return out;
}
exports.groupBy = groupBy;
function pairsToObj(arr) {
    var out = {};
    arr.forEach(function (_a) {
        var key = _a.key, val = _a.val;
        out[key] = val;
    });
    return out;
}
exports.pairsToObj = pairsToObj;
function clamp(n, range) {
    var min = range[0], max = range[1];
    if (n < min) {
        return min;
    }
    if (n > max) {
        return max;
    }
    return n;
}
exports.clamp = clamp;
