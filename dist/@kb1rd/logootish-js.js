(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("@kb1rd/logootish-js", [], factory);
	else if(typeof exports === 'object')
		exports["@kb1rd/logootish-js"] = factory();
	else
		root["@kb1rd/logootish-js"] = factory();
})(typeof self !== 'undefined' ? self : this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/index.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/bst.ts":
/*!********************!*\
  !*** ./src/bst.ts ***!
  \********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = __webpack_require__(/*! ./utils */ "./src/utils.ts");
class BstNode {
    constructor(data) {
        this.data = data;
    }
}
exports.BstNode = BstNode;
class RangeSearch {
    constructor(cf) {
        this.lesser_find_greatest = false;
        this.greater_find_least = false;
        this.points = [];
        this.cf = cf;
    }
    static lteq(cf, pd, bucket) {
        const search = new RangeSearch(cf);
        search.points.push([pd, true, bucket]);
        search.last_bucket = undefined;
        return search;
    }
    static lt(cf, pd, bucket) {
        const search = new RangeSearch(cf);
        search.points.push([pd, false, bucket]);
        search.last_bucket = undefined;
        return search;
    }
    static gteq(cf, pd, bucket) {
        const search = new RangeSearch(cf);
        search.points.push([pd, false, undefined]);
        search.last_bucket = bucket;
        return search;
    }
    static gt(cf, pd, bucket) {
        const search = new RangeSearch(cf);
        search.points.push([pd, true, undefined]);
        search.last_bucket = bucket;
        return search;
    }
    push_point(data, bucket, inclusive = false) {
        const point = [data, inclusive, bucket];
        for (let i = 0; i < this.points.length; i++) {
            if (this.cf(data, this.points[i][0]) < 0) {
                this.points.splice(i, 0, point);
                return;
            }
        }
        this.points.push(point);
    }
    all_greater(bucket) {
        this.last_bucket = bucket;
    }
    getBucketInfo(data, current, clear_buckets = false, traverse_left) {
        let left = false;
        let passed_bucket = false;
        let bucket = this.last_bucket;
        let right = Boolean(this.last_bucket);
        if (!this.points.length && this.last_bucket) {
            if (!left && traverse_left) {
                traverse_left();
            }
            left = true;
        }
        for (let i = 0; i < this.points.length; i++) {
            const [other, inclusive, b] = this.points[i];
            if (b && !passed_bucket) {
                if (!left && traverse_left) {
                    traverse_left();
                }
                left = true;
            }
            if (this.cf(data, other) < (inclusive ? 1 : 0)) {
                if (!passed_bucket) {
                    passed_bucket = true;
                    bucket = b;
                }
                if (i == 0 &&
                    this.lesser_find_greatest &&
                    clear_buckets &&
                    current[b] &&
                    current[b].length) {
                    if (this.cf(current[b][0], data) < 0) {
                        current[b] = [];
                    }
                    else if (this.cf(current[b][0], data) > 0) {
                        bucket = undefined;
                    }
                }
            }
            if (b && passed_bucket && this.cf(other, data) !== 0) {
                right = true;
            }
        }
        if (!passed_bucket && this.last_bucket) {
            const b = this.last_bucket;
            if (bucket && !left) {
                left = true;
                traverse_left();
            }
            if (this.greater_find_least &&
                clear_buckets &&
                current[b] &&
                current[b].length) {
                if (this.cf(current[b][0], data) > 0) {
                    current[b] = [];
                }
                else if (this.cf(current[b][0], data) < 0) {
                    bucket = undefined;
                }
            }
            right = true;
        }
        left =
            left &&
                (!this.lesser_find_greatest ||
                    !this.points.length ||
                    !current[this.points[0][2]] ||
                    !current[this.points[0][2]].length ||
                    this.cf(current[this.points[0][2]][0], data) <= 0);
        right =
            right &&
                (!this.greater_find_least ||
                    !current[this.last_bucket] ||
                    !current[this.last_bucket].length ||
                    this.cf(current[this.last_bucket][0], data) >= 0);
        return { left, bucket, right };
    }
    sort(data, range_buckets = {}) {
        let i;
        for (i = 0; i < this.points.length; i++) {
            const [other, inclusive, b] = this.points[i];
            if (this.cf(data, other) < (inclusive ? 1 : 0)) {
                if (!b) {
                    return range_buckets;
                }
                if (!range_buckets[b] ||
                    (i === 0 &&
                        this.lesser_find_greatest &&
                        range_buckets[b].length &&
                        this.cf(range_buckets[b][0], data) < 0)) {
                    range_buckets[b] = [];
                }
                range_buckets[b].push(data);
                return range_buckets;
            }
        }
        i = this.points.length;
        const b = this.last_bucket;
        if (!b) {
            return range_buckets;
        }
        if (!range_buckets[b] ||
            (this.greater_find_least &&
                range_buckets[b].length &&
                this.cf(range_buckets[b][0], data) > 0)) {
            range_buckets[b] = [];
        }
        range_buckets[b].push(data);
        return range_buckets;
    }
    search_array(array) {
        const range_buckets = {};
        array.forEach((el) => this.sort(el, range_buckets));
        return range_buckets;
    }
}
exports.RangeSearch = RangeSearch;
class Bst {
    constructor(cmp) {
        this.bst_root = undefined;
        this.cmp = cmp;
    }
    gteqcmp(a, b) {
        return this.cmp(a, b) >= 0;
    }
    gtcmp(a, b) {
        return this.cmp(a, b) > 0;
    }
    eqcmp(a, b) {
        return this.cmp(a, b) === 0;
    }
    add(object, node = new utils_1.MemberPtr(this, 'bst_root')) {
        if (!node.value) {
            node.value = new BstNode(object);
        }
        else if (this.gteqcmp(node.value.data, object)) {
            this.add(object, new utils_1.MemberPtr(node.value, 'left'));
        }
        else {
            this.add(object, new utils_1.MemberPtr(node.value, 'right'));
        }
    }
    create_range_search() {
        return new RangeSearch(this.cmp);
    }
    search(search, node = new utils_1.MemberPtr(this, 'bst_root'), map = {}) {
        if (!node.value) {
            return map;
        }
        const { bucket, right } = search.getBucketInfo(node.value.data, map, true, () => {
            this.search(search, new utils_1.MemberPtr(node.value, 'left'), map);
        });
        if (bucket) {
            if (!map[bucket]) {
                map[bucket] = [];
            }
            map[bucket].push(node.value.data);
        }
        if (right) {
            this.search(search, new utils_1.MemberPtr(node.value, 'right'), map);
        }
        return map;
    }
    _getInorderSuccessor(object, node = new utils_1.MemberPtr(this, 'bst_root')) {
        let successor;
        const setSuccessor = (s) => {
            if (!successor || (s && this.gtcmp(successor.data, s.data))) {
                successor = s;
            }
        };
        if (node.value) {
            if (this.gteqcmp(node.value.data, object)) {
                if (!this.eqcmp(node.value.data, object)) {
                    setSuccessor({ ptr: node, data: node.value.data });
                }
                setSuccessor(this._getInorderSuccessor(object, new utils_1.MemberPtr(node.value, 'left')));
            }
            setSuccessor(this._getInorderSuccessor(object, new utils_1.MemberPtr(node.value, 'right')));
        }
        return successor;
    }
    remove(object, filter = () => true, node = new utils_1.MemberPtr(this, 'bst_root')) {
        if (node.value) {
            const result = this.cmp(node.value.data, object);
            const should_remove = filter(node.value.data);
            if (result > 0) {
                this.remove(object, filter, new utils_1.MemberPtr(node.value, 'left'));
            }
            else if (result < 0) {
                this.remove(object, filter, new utils_1.MemberPtr(node.value, 'right'));
            }
            else if (node.value.left && node.value.right && should_remove) {
                const successor = this._getInorderSuccessor(node.value.data, node);
                this.remove(successor.data, undefined, successor.ptr);
                node.value.data = successor.data;
            }
            else if (should_remove) {
                node.value = node.value.left || node.value.right;
            }
        }
    }
    operateOnAllRange(start, endm1, operation, node = this.bst_root, undef = false) {
        if (node && !undef) {
            if (this.gteqcmp(node.data, start)) {
                if (this.gteqcmp(endm1, node.data)) {
                    this.operateOnAllRange(start, endm1, operation, node.left, !node.left);
                    this.operateOnAllRange(start, endm1, operation, node.right, !node.right);
                    operation(node);
                }
                else {
                    this.operateOnAllRange(start, endm1, operation, node.left, !node.left);
                }
            }
            else {
                this.operateOnAllRange(start, endm1, operation, node.right, !node.right);
            }
        }
    }
    operateOnAllGteq(value, operation, sequential = true, node = new utils_1.MemberPtr(this, 'bst_root')) {
        if (node.value) {
            if (this.gteqcmp(node.value.data, value)) {
                if (!sequential) {
                    operation(node.value);
                }
                this.operateOnAllGteq(value, operation, sequential, new utils_1.MemberPtr(node.value, 'left'));
                if (sequential) {
                    operation(node.value);
                }
            }
            this.operateOnAllGteq(value, operation, sequential, new utils_1.MemberPtr(node.value, 'right'));
        }
    }
    operateOnAllLteq(value, operation, sequential = true, node = new utils_1.MemberPtr(this, 'bst_root')) {
        if (node.value) {
            if (this.gteqcmp(value, node.value.data)) {
                if (!sequential) {
                    operation(node.value);
                }
                this.operateOnAllLteq(value, operation, sequential, new utils_1.MemberPtr(node.value, 'left'));
                if (sequential) {
                    operation(node.value);
                }
                this.operateOnAllLteq(value, operation, sequential, new utils_1.MemberPtr(node.value, 'right'));
            }
            else {
                this.operateOnAllLteq(value, operation, sequential, new utils_1.MemberPtr(node.value, 'left'));
            }
        }
    }
    operateOnAll(operation, sequential = true, node = new utils_1.MemberPtr(this, 'bst_root')) {
        if (node.value) {
            if (!sequential) {
                operation(node.value);
            }
            this.operateOnAll(operation, sequential, new utils_1.MemberPtr(node.value, 'left'));
            if (sequential) {
                operation(node.value);
            }
            this.operateOnAll(operation, sequential, new utils_1.MemberPtr(node.value, 'right'));
        }
    }
    getRange(start, endm1) {
        const nodes = [];
        this.operateOnAllRange(start, endm1, (n) => nodes.push(n));
        return nodes;
    }
    getGteq(value) {
        let nodes = [];
        this.operateOnAllGteq(value, (n) => {
            if (!nodes[0] || this.gtcmp(nodes[0].data, n.data)) {
                nodes = [n];
            }
            else if (this.eqcmp(nodes[0].data, n.data)) {
                nodes.push(n);
            }
        });
        return nodes;
    }
    getLteq(value) {
        let nodes = [];
        this.operateOnAllLteq(value, (n) => {
            if (!nodes[0] || this.gtcmp(n.data, nodes[0].data)) {
                nodes = [n];
            }
            else if (this.eqcmp(nodes[0].data, n.data)) {
                nodes.push(n);
            }
        });
        return nodes;
    }
    toString() {
        let str = 'BST [\n';
        this.operateOnAll(({ data }) => {
            str +=
                '  ' +
                    data
                        .toString()
                        .split('\n')
                        .join('\n  ') +
                    '\n';
        });
        str += ']';
        return str;
    }
}
exports.Bst = Bst;


/***/ }),

/***/ "./src/index.ts":
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const listmodel_1 = __webpack_require__(/*! ./listmodel */ "./src/listmodel/index.ts");
exports.ListDocumentModel = listmodel_1.ListDocumentModel;
exports.LogootInt = listmodel_1.LogootInt;
exports.LogootPosition = listmodel_1.LogootPosition;
exports.NodeType = listmodel_1.NodeType;
var EventState;
(function (EventState) {
    EventState[EventState["PENDING"] = 0] = "PENDING";
    EventState[EventState["SENDING"] = 1] = "SENDING";
    EventState[EventState["COMPLETE"] = 2] = "COMPLETE";
})(EventState || (EventState = {}));
exports.EventState = EventState;


/***/ }),

/***/ "./src/ints.ts":
/*!*********************!*\
  !*** ./src/ints.ts ***!
  \*********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = __webpack_require__(/*! ./utils */ "./src/utils.ts");
class IntType extends utils_1.Comparable {
}
exports.IntType = IntType;
class Int32 extends IntType {
    constructor(n = 0) {
        super();
        this.int32 = new Int32Array([0]);
        if (n instanceof Int32) {
            this.int32[0] = n.int32[0];
        }
        else {
            this.int32[0] = n;
        }
    }
    static fromJSON(obj) {
        return new Int32(obj);
    }
    toJSON() {
        return this.int32[0];
    }
    add(n) {
        if (n instanceof Int32) {
            this.int32[0] += n.int32[0];
        }
        else {
            this.int32[0] += n;
        }
        return this;
    }
    sub(n) {
        if (n instanceof Int32) {
            this.int32[0] -= n.int32[0];
        }
        else {
            this.int32[0] -= n;
        }
        return this;
    }
    assign(n) {
        if (n instanceof Int32) {
            this.int32[0] = n.int32[0];
        }
        else {
            this.int32[0] = n;
        }
        return this;
    }
    cmp(n) {
        if (n instanceof Int32) {
            return ((this.int32[0] >= n.int32[0] ? 1 : 0) +
                (this.int32[0] <= n.int32[0] ? -1 : 0));
        }
        else {
            return ((this.int32[0] >= n ? 1 : 0) +
                (this.int32[0] <= n ? -1 : 0));
        }
    }
    copy() {
        return new Int32(this);
    }
    get js_int() {
        return this.int32[0];
    }
    toString() {
        return this.int32[0].toString();
    }
}
exports.Int32 = Int32;
(function (Int32) {
    let JSON;
    (function (JSON) {
        JSON.Schema = { type: 'number' };
    })(JSON = Int32.JSON || (Int32.JSON = {}));
})(Int32 || (Int32 = {}));
exports.Int32 = Int32;


/***/ }),

/***/ "./src/listmodel/index.ts":
/*!********************************!*\
  !*** ./src/listmodel/index.ts ***!
  \********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = __webpack_require__(/*! ../utils */ "./src/utils.ts");
const bst_1 = __webpack_require__(/*! ../bst */ "./src/bst.ts");
const logoot_1 = __webpack_require__(/*! ./logoot */ "./src/listmodel/logoot.ts");
exports.LogootInt = logoot_1.LogootInt;
exports.LogootPosition = logoot_1.LogootPosition;
exports.NodeType = logoot_1.NodeType;
class InsertionConflictError extends Error {
}
const MinimalJoinFunction = (a, b) => {
    if (a.branches.filter((br) => !b.br(br)).length) {
        return false;
    }
    if (b.branches.filter((br) => !a.br(br)).length) {
        return false;
    }
    return true;
};
class ListDocumentModel {
    constructor(branch, jf = MinimalJoinFunction) {
        this.ldoc_bst = new bst_1.Bst((a, b) => {
            if (a.known_position > b.known_position) {
                return 1;
            }
            else if (a.known_position < b.known_position) {
                return -1;
            }
            else {
                const astart = a.logoot_start;
                const bstart = b.logoot_start;
                if (astart && bstart) {
                    return astart.cmp(bstart);
                }
            }
            return 0;
        });
        this.logoot_bst = new bst_1.Bst((a, b) => a.start.cmp(b.start));
        this.clock = new logoot_1.LogootInt();
        this.branch = branch;
        this.canJoin = jf;
    }
    insertLocal(start, length) {
        const range_search = this.ldoc_bst.create_range_search();
        range_search.lesser_find_greatest = true;
        range_search.greater_find_least = true;
        range_search.push_point({ known_position: start }, '_lesser', false);
        range_search.all_greater('_greater');
        const { _lesser, _greater } = this.ldoc_bst.search(range_search);
        let lesser;
        let greater;
        if (_lesser && _lesser.length) {
            lesser = _lesser.sort((a, b) => a.logoot_start.cmp(b.logoot_start))[0];
        }
        if (_greater && _greater.length) {
            greater = _greater.sort((a, b) => b.logoot_start.cmp(a.logoot_start))[0];
        }
        let before_position;
        let after_position;
        const lesser_length = lesser ? lesser.ldoc_length : 0;
        if (lesser && lesser.known_position + lesser_length === start) {
            if (greater &&
                lesser.last_branch === greater.first_branch &&
                lesser.last_branch !== this.branch) {
                throw new InsertionConflictError();
            }
            before_position = lesser.logoot_end;
            after_position = greater ? greater.logoot_start : undefined;
        }
        else if (lesser) {
            ;
            (() => {
                let remaining_length = start - lesser.known_position;
                if (lesser.branch_order.indexOf(this.branch) < 0) {
                    remaining_length -= lesser.ldoc_length;
                }
                else {
                    remaining_length -= lesser.branchLength(lesser.branch_order.slice(0, lesser.branch_order.indexOf(this.branch)));
                }
                if (remaining_length < 0) {
                    throw new utils_1.FatalError('Search returned out of order nodes');
                }
                if (remaining_length === 0) {
                    const range_search = this.ldoc_bst.create_range_search();
                    range_search.lesser_find_greatest = true;
                    range_search.push_point({ known_position: lesser.known_position }, '_lesser', false);
                    const { _lesser } = this.ldoc_bst.search(range_search);
                    let most_lesser;
                    if (_lesser && _lesser.length) {
                        most_lesser = _lesser.sort((a, b) => a.logoot_start.cmp(b.logoot_start))[0];
                    }
                    before_position = most_lesser.logoot_end;
                    after_position = lesser.logoot_start;
                    return;
                }
                for (let i = 0; i < lesser.groups.length; i++) {
                    const { end } = lesser.groups[i];
                    remaining_length -= lesser.groups[i].branchLength([this.branch]);
                    if (remaining_length < 0) {
                        before_position = after_position = end.inverseOffsetLowest(-remaining_length);
                        return;
                    }
                    else if (remaining_length === 0) {
                        before_position = end;
                        after_position = lesser.groups[i + 1]
                            ? lesser.groups[i + 1].start
                            : greater
                                ? greater.logoot_start
                                : undefined;
                        return;
                    }
                }
                throw new InsertionConflictError();
            })();
        }
        else if (greater) {
            after_position = greater.logoot_start;
        }
        return {
            start: new logoot_1.LogootPosition(length, before_position, after_position),
            length,
            br: this.branch,
            rclk: this.clock
        };
    }
    removeLocal(start, length) {
        const range_search = this.ldoc_bst.create_range_search();
        range_search.lesser_find_greatest = true;
        range_search.greater_find_least = true;
        range_search.push_point({ known_position: start }, '_lesser', false);
        range_search.push_point({ known_position: start + length }, '_range', false);
        range_search.all_greater(undefined);
        const { _lesser, _range } = this.ldoc_bst.search(range_search);
        const nodes = _range || [];
        if (_lesser && _lesser.length) {
            const l = _lesser.sort((a, b) => a.logoot_start.cmp(b.logoot_start))[0];
            if (l.ldoc_end > start) {
                nodes.unshift(l);
            }
        }
        const removal_sets = {};
        function onRemoval(br, start, len, rclk) {
            if (len <= 0) {
                return;
            }
            if (!removal_sets[br]) {
                removal_sets[br] = {};
            }
            const branch_removals = removal_sets[br];
            if (!branch_removals[start.levels]) {
                branch_removals[start.levels] = [];
            }
            const depth_removals = branch_removals[start.levels];
            const last_removal = depth_removals[depth_removals.length - 1];
            if (last_removal &&
                last_removal.branch === br &&
                last_removal.start.offsetLowest(last_removal.length).cmp(start) === 0 &&
                last_removal.rclk.cmp(rclk) === 0) {
                last_removal.length += len;
            }
            else {
                depth_removals.push({ branch: br, start, length: len, rclk });
            }
        }
        let remaining_length = start + length - nodes[0].known_position;
        utils_1.catchBreak(() => nodes.forEach((cg) => {
            cg.branch_order.forEach((br) => {
                cg.groups.forEach((group) => {
                    if (!group.br(br)) {
                        return;
                    }
                    let { start, length: rlen } = group;
                    const { type, rclk } = group.br(br);
                    if (type === logoot_1.NodeType.DATA) {
                        if (remaining_length > length) {
                            start = start.offsetLowest(remaining_length - length);
                            rlen -= remaining_length - length;
                        }
                        onRemoval(br, start, Math.min(rlen, remaining_length), rclk);
                        remaining_length -= group.length;
                    }
                    if (remaining_length <= 0) {
                        throw utils_1.BreakException;
                    }
                });
            });
        }));
        const removals = [];
        utils_1.allValues(removal_sets).forEach((branch_set) => {
            Object.entries(branch_set).forEach(([, depth_set]) => {
                depth_set.forEach((o) => removals.push(o));
            });
        });
        return { removals };
    }
    _mergeNode(br, nstart, length, nrclk, type, canJoin) {
        const level = nstart.levels;
        const nend = nstart.offsetLowest(length);
        if (this.clock.cmp(nrclk) < 0) {
            this.clock.assign(nrclk);
        }
        const range_search = this.logoot_bst.create_range_search();
        range_search.lesser_find_greatest = true;
        range_search.greater_find_least = true;
        range_search.push_point({ start: nstart }, '_lesser', false);
        range_search.push_point({ start: nend }, '_skip_ranges', false);
        range_search.all_greater('_greater');
        const { _lesser, _skip_ranges, _greater } = this.logoot_bst.search(range_search);
        let lesser;
        let greater;
        if (_lesser && _lesser.length > 1) {
            throw new utils_1.FatalError('Corrupt BST. There are multiple nodes at a position.');
        }
        else if (_lesser && _lesser.length) {
            lesser = _lesser[0];
        }
        if (_greater && _greater.length > 1) {
            throw new utils_1.FatalError('Corrupt BST. There are multiple nodes at a position.');
        }
        else if (_greater && _greater.length) {
            greater = _greater[0];
        }
        let skip_ranges = _skip_ranges
            ? _skip_ranges.sort((a, b) => a.start.cmp(b.start))
            : [];
        if (lesser && skip_ranges.includes(lesser)) {
            skip_ranges.splice(skip_ranges.indexOf(lesser), 1);
        }
        if (greater && skip_ranges.includes(greater)) {
            skip_ranges.splice(skip_ranges.indexOf(greater), 1);
        }
        if (lesser) {
            skip_ranges.unshift(lesser);
        }
        if (lesser &&
            lesser.start.levels < level &&
            lesser.start.cmp(nstart) < 0 &&
            lesser.end.cmp(nend) > 0) {
            const split_pos = nstart
                .copy()
                .level(lesser.start.levels)
                .sub(lesser.start.level(lesser.start.levels)).js_int;
            if (split_pos > 0 && split_pos < lesser.length) {
                const lesser_end = lesser.splitAround(split_pos);
                skip_ranges.push(lesser_end);
                this.logoot_bst.add(lesser_end);
            }
        }
        if (greater && !skip_ranges.includes(greater)) {
            skip_ranges.push(greater);
        }
        let conflict_order = [];
        skip_ranges.forEach(({ group }) => {
            if (group &&
                !conflict_order.includes(group) &&
                group.branch_order.length) {
                conflict_order.push(group);
            }
        });
        conflict_order = conflict_order.sort((a, b) => a.known_position - b.known_position);
        skip_ranges = skip_ranges.filter(({ start }) => start.levels >= level || start.cmp(nend) >= 0);
        if (!skip_ranges.length ||
            skip_ranges[skip_ranges.length - 1].start.cmp(nend) < 0) {
            const vgroup = new logoot_1.LogootNodeGroup();
            vgroup.start = nend;
            skip_ranges.push(vgroup);
        }
        const original_known_end = conflict_order.length
            ? conflict_order[conflict_order.length - 1].ldoc_end
            : 0;
        const operations = [];
        let known_position_shift = 0;
        const applyShift = (cg, start, length, ic) => {
            known_position_shift += length;
            const lstart = cg.logoot_start;
            for (let i = conflict_order.length - 1; i > 0; i--) {
                const n = conflict_order[i];
                if (ic) {
                    if (n.known_position < start || n.logoot_start.cmp(lstart) < 0) {
                        return;
                    }
                }
                else {
                    if (n.known_position <= start || n.logoot_start.cmp(lstart) <= 0) {
                        return;
                    }
                }
                if (n !== cg) {
                    conflict_order[i].known_position += length;
                }
            }
        };
        const remove = (cg, start, length) => {
            if (length === 0) {
                return;
            }
            operations.push({
                type: 'r',
                start,
                length
            });
            applyShift(cg, start, -length, true);
        };
        const insert = (cg, start, offset, length) => {
            if (length === 0) {
                return;
            }
            operations.push({
                type: 'i',
                start,
                offset,
                length
            });
            applyShift(cg, start, length, true);
        };
        const translate = (source, length, dest) => {
            if (length === 0) {
                return;
            }
            if (source === dest) {
                return;
            }
            operations.push({ type: 't', source, length, dest });
        };
        const mark = (start, length, conflicting) => {
            if (length === 0) {
                return;
            }
            operations.push({ type: 'm', start, length, conflicting });
        };
        const splitCg = (cg, ng, postprocess = () => undefined) => {
            if (!cg.groups.includes(ng)) {
                throw new utils_1.FatalError('Node group not in conflict group.');
            }
            if (!conflict_order.includes(cg)) {
                throw new utils_1.FatalError('Conflict group not in conflict_order');
            }
            const ncg = new logoot_1.ConflictGroup(cg.ldoc_end);
            let known_position = cg.known_position;
            const known_end = ncg.known_position;
            cg.branch_order.forEach((br) => {
                const excerpt_length = (() => {
                    let origin = 0;
                    for (let i = 0; i < cg.groups.length; i++) {
                        origin += cg.groups[i].branchLength([br]);
                        if (cg.groups[i] === ng) {
                            return origin;
                        }
                    }
                    throw new utils_1.FatalError();
                })();
                ncg.branch_order.push(br);
                const moved_length = cg.branchLength([br]) - excerpt_length;
                ncg.known_position -= moved_length;
                known_position += excerpt_length;
                translate(known_position, moved_length, known_end - moved_length);
            });
            ncg.groups = cg.groups.splice(cg.groups.indexOf(ng) + 1, cg.groups.length);
            ncg.groups.forEach((group) => (group.group = ncg));
            postprocess(ncg);
            this.ldoc_bst.add(ncg);
            conflict_order.splice(conflict_order.indexOf(cg) + 1, 0, ncg);
            return ncg;
        };
        const joinCg = (lcg, ncg) => {
            ncg.branch_order.forEach((br) => {
                if (!lcg.branch_order.includes(br)) {
                    lcg.branch_order.push(br);
                }
            });
            ncg.groups.forEach((group) => (group.group = lcg));
            lcg.groups.splice(lcg.groups.length, 0, ...ncg.groups);
            let fetch_position = ncg.known_position;
            let known_position = lcg.known_position;
            ncg.branch_order.forEach((br) => {
                known_position += lcg.branchLength([br]);
                const next_length = ncg.branchLength([br]);
                translate(fetch_position, next_length, known_position - next_length);
                fetch_position += next_length;
            });
            ncg.branch_order.length = 0;
            ncg.groups = [];
            this.ldoc_bst.remove(ncg, (other) => other === ncg);
            conflict_order.splice(conflict_order.indexOf(ncg), 1);
        };
        let last_start = nstart.level(level);
        let last_group = lesser;
        skip_ranges.forEach((group, i) => {
            let next_group = skip_ranges[i + 1];
            const group_level_start = group.start.clamp(nstart, nend, level).l(level);
            const group_level_end = group.end.clamp(nstart, nend, level).l(level);
            const empty_length = group_level_start.copy().sub(last_start).js_int;
            const empty_offset = last_start.copy().sub(nstart.l(level)).js_int;
            if (empty_length > 0 ||
                (group.start.levels < level &&
                    length - empty_offset > 0 &&
                    group.start.cmp(nstart) > 0 &&
                    last_start.cmp(nstart.l(level)) < 0)) {
                const newgroup = new logoot_1.LogootNodeGroup();
                newgroup.start = nstart.copy();
                newgroup.start.l(level).assign(last_start);
                newgroup.length = empty_length || length - empty_offset;
                newgroup.br(br, { type, rclk: nrclk });
                const last_join = last_group && canJoin(last_group, newgroup);
                const next_join = group && canJoin(newgroup, group);
                const already_joined = last_group && group && last_group.group === group.group;
                if (!already_joined && last_join && next_join) {
                    joinCg(last_group.group, group.group);
                }
                else if (already_joined && !(last_join && next_join)) {
                    splitCg(last_group.group, last_group);
                }
                if (!last_join && !next_join) {
                    newgroup.group = new logoot_1.ConflictGroup(last_group ? last_group.group.ldoc_end : 0);
                    newgroup.group.branch_order.push(br);
                    conflict_order.splice(last_group ? conflict_order.indexOf(last_group.group) + 1 : 0, 0, newgroup.group);
                }
                else {
                    newgroup.group = last_join ? last_group.group : group.group;
                }
                if (type === logoot_1.NodeType.DATA) {
                    insert(newgroup.group, newgroup.group.insertSingleBranchGroup(newgroup), empty_offset, newgroup.length);
                }
                else {
                    newgroup.group.insertSingleBranchGroup(newgroup);
                }
                last_group = newgroup;
                this.logoot_bst.add(newgroup);
                if (!last_join && !next_join) {
                    this.ldoc_bst.add(newgroup.group);
                }
            }
            const group_length = group_level_end.copy().sub(group_level_start).js_int;
            const group_offset = group_level_start.copy().sub(nstart.l(level)).js_int;
            if (group.start.levels === level &&
                group_length > 0 &&
                (!group.br(br) ||
                    nrclk.cmp(group.br(br).rclk) > (type === logoot_1.NodeType.DATA ? 0 : -1))) {
                if (group.start.cmp(nstart) < 0) {
                    last_group = group;
                    group = group.splitAround(nstart.l(level).sub(group.start.l(level)).js_int);
                    this.logoot_bst.add(group);
                }
                if (group.end.cmp(nend) > 0) {
                    const newgroup = group.splitAround(group.length - group.end.l(level).sub(nend.l(level)).js_int);
                    this.logoot_bst.add(newgroup);
                    next_group = newgroup;
                }
                if (!group.group.branch_order.includes(br)) {
                    group.group.branch_order.push(br);
                }
                const known_position = group.group.insertPos(br, group);
                if (group.br(br) && group.br(br).type === logoot_1.NodeType.DATA) {
                    remove(group.group, known_position, group.length);
                }
                group.br(br, { type, rclk: nrclk });
                if (type === logoot_1.NodeType.DATA) {
                    insert(group.group, known_position, group_offset, group.length);
                }
                const fixJoined = (a, b, post = false) => {
                    if (!a || !b) {
                        return;
                    }
                    const joined = a.group === b.group;
                    const should_join = canJoin(a, b);
                    if (!joined && should_join) {
                        joinCg(a.group, b.group);
                    }
                    else if (joined && !should_join) {
                        const ncg = splitCg(a.group, a, (ncg) => {
                            if (type === logoot_1.NodeType.DATA && post) {
                                ncg.known_position -= group.length;
                            }
                        });
                        if (type === logoot_1.NodeType.DATA && post) {
                            ncg.known_position += group.length;
                        }
                    }
                };
                fixJoined(last_group, group, false);
                fixJoined(group, next_group, true);
            }
            last_start = group.end.clamp(nstart, nend, level).level(level);
            last_group = group;
        });
        conflict_order.forEach(({ known_position, ldoc_length, conflicted }) => {
            mark(known_position, ldoc_length, conflicted);
        });
        this.ldoc_bst.operateOnAllGteq({ known_position: original_known_end }, ({ data }) => {
            if (!data.groups.length) {
                throw new utils_1.FatalError('An empty conflict group was found in the BST');
            }
            if (data.logoot_start.cmp(nend) < 0) {
                return;
            }
            if (!conflict_order.includes(data)) {
                data.known_position += known_position_shift;
            }
        }, false);
        return operations;
    }
    insertLogoot(br, start, length, rclk) {
        return this._mergeNode(br, start, length, rclk, logoot_1.NodeType.DATA, this.canJoin);
    }
    removeLogoot(br, start, length, rclk) {
        return this._mergeNode(br, start, length, rclk, logoot_1.NodeType.REMOVAL, this.canJoin);
    }
    selfTest() {
        let last_pos;
        let last_kp = 0;
        this.ldoc_bst.operateOnAll(({ data }) => {
            if (!data.groups.length) {
                throw new utils_1.FatalError('Node with no groups detected.');
            }
            if (data.known_position !== last_kp) {
                throw new Error(`Ldoc is out of order. Found known position ${data.known_position} after ${last_kp}`);
            }
            last_kp = data.ldoc_end;
            data.groups.forEach(({ start }) => {
                if (last_pos && last_pos.cmp(start) >= 0) {
                    throw new utils_1.FatalError(`Ldoc is out of order. Found ${start.toString()} after ${last_pos.toString()}.`);
                }
                last_pos = start;
            });
        });
    }
}
exports.ListDocumentModel = ListDocumentModel;


/***/ }),

/***/ "./src/listmodel/logoot.ts":
/*!*********************************!*\
  !*** ./src/listmodel/logoot.ts ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const ints_1 = __webpack_require__(/*! ../ints */ "./src/ints.ts");
const utils_1 = __webpack_require__(/*! ../utils */ "./src/utils.ts");
var LogootInt = ints_1.Int32;
exports.LogootInt = LogootInt;
class LogootPosition {
    constructor(len = 0, start, end) {
        this.start = start;
        this.end = end;
        this.array = [new LogootInt(0)];
        if (!start && end) {
            this.array = end.inverseOffsetLowest(len).array;
        }
        else if (!end && start) {
            this.array = start.copy().array;
        }
        else if (start && end) {
            let done = false;
            const itstart = start.array.values();
            const itend = end.array.values();
            let nstart;
            let nend;
            this.array.length = 0;
            while (!done) {
                if (!nstart || !nstart.done) {
                    nstart = itstart.next();
                }
                if (!nend || !nend.done) {
                    nend = itend.next();
                }
                if (!nstart.done && !nend.done) {
                    if (nend.value.gteq(new LogootInt(nstart.value).add(len))) {
                        done = true;
                    }
                    this.array.push(new LogootInt(nstart.value));
                }
                else if (!nstart.done) {
                    this.array.push(new LogootInt(nstart.value));
                    done = true;
                }
                else if (!nend.done) {
                    this.array.push(new LogootInt(nend.value).sub(len));
                    done = true;
                }
                else {
                    this.array.push(new LogootInt());
                    done = true;
                }
            }
        }
    }
    static fromJSON(eventnode) {
        const pos = new LogootPosition();
        pos.array.length = 0;
        eventnode.forEach((n) => {
            pos.array.push(LogootInt.fromJSON(n));
        });
        return pos;
    }
    static fromInts(...ints) {
        const pos = new LogootPosition();
        pos.array.length = 0;
        ints.forEach((n) => {
            pos.array.push(new LogootInt(n));
        });
        return pos;
    }
    toJSON() {
        return this.array.map((n) => n.toJSON());
    }
    get length() {
        return this.array.length;
    }
    get levels() {
        return this.length - 1;
    }
    level(n) {
        return this.array[n];
    }
    l(n) {
        return this.level(n);
    }
    offsetLowest(offset) {
        return Object.assign(new LogootPosition(), {
            array: this.array.map((current, i, array) => {
                return i < array.length - 1
                    ? current
                    : new LogootInt(current).add(offset);
            })
        });
    }
    inverseOffsetLowest(offset) {
        return Object.assign(new LogootPosition(), {
            array: this.array.map((current, i, array) => {
                return i < array.length - 1
                    ? current
                    : new LogootInt(current).sub(offset);
            })
        });
    }
    copy() {
        return Object.assign(new LogootPosition(), {
            array: this.array.map((e) => new LogootInt(e))
        });
    }
    equivalentPositionAtLevel(level) {
        return Object.assign(new LogootPosition(), {
            array: new Array(level + 1).fill(0, 0, level + 1).map((el, i) => {
                return new LogootInt(this.array[i]);
            })
        });
    }
    cmp(pos, level = 0) {
        if (level >= this.length) {
            if (this.length === pos.length) {
                return 0;
            }
            return 1;
        }
        if (level >= pos.length) {
            return -1;
        }
        switch (this.level(level).cmp(pos.level(level))) {
            case 1:
                return 1;
            case -1:
                return -1;
            case 0:
                return this.cmp(pos, level + 1);
            default:
                return 0;
        }
    }
    clamp(min, max, preserve_levels) {
        const clamped = this.cmp(min) < 0 ? min : this.cmp(max) > 0 ? max : this;
        if (preserve_levels !== undefined) {
            return clamped.equivalentPositionAtLevel(preserve_levels);
        }
        else {
            return clamped.copy();
        }
    }
    toString() {
        let str = '[';
        this.array.forEach((el, i, a) => {
            str += el.toString() + (i >= a.length - 1 ? '' : ',');
        });
        str += ']';
        return str;
    }
}
exports.LogootPosition = LogootPosition;
(function (LogootPosition) {
    let JSON;
    (function (JSON) {
        JSON.Schema = { type: 'array', items: LogootInt.JSON.Schema };
    })(JSON = LogootPosition.JSON || (LogootPosition.JSON = {}));
})(LogootPosition || (LogootPosition = {}));
exports.LogootPosition = LogootPosition;
var NodeType;
(function (NodeType) {
    NodeType[NodeType["DATA"] = 0] = "DATA";
    NodeType[NodeType["REMOVAL"] = 1] = "REMOVAL";
})(NodeType || (NodeType = {}));
exports.NodeType = NodeType;
const nt_string = {
    [NodeType.DATA]: 'DATA',
    [NodeType.REMOVAL]: 'REMOVAL'
};
class ConflictGroup {
    constructor(position) {
        this.known_position = 0;
        this.branch_order = [];
        this.groups = [];
        this.known_position = position;
    }
    get ldoc_length() {
        return this.groups.reduce((n, group) => {
            return n + group.ldoc_length;
        }, 0);
    }
    get ldoc_end() {
        return this.known_position + this.ldoc_length;
    }
    get logoot_start() {
        return this.groups[0] ? this.groups[0].start : undefined;
    }
    get logoot_end() {
        return this.groups.length
            ? this.groups[this.groups.length - 1].end
            : undefined;
    }
    get first_branch() {
        return this.branch_order[0];
    }
    get last_branch() {
        return this.branch_order.length
            ? this.branch_order[this.branch_order.length - 1]
            : undefined;
    }
    get conflicted() {
        return this.groups.some((g) => g.conflicted);
    }
    branchLength(branches) {
        return this.groups.reduce((n, group) => {
            return n + group.branchLength(branches);
        }, 0);
    }
    insertPos(br, at) {
        let offset = this.known_position +
            this.branchLength(this.branch_order.slice(0, this.branch_order.indexOf(br) + (at ? 0 : 1)));
        if (!at) {
            return offset;
        }
        for (let i = 0; i < this.groups.length; i++) {
            if (this.groups[i] === at) {
                return offset;
            }
            offset += this.groups[i].branchLength([br]);
        }
        throw new utils_1.FatalError('Tried to insert after a LogootNodeGroup that is not in this conflict group');
    }
    getNeighbors({ start }) {
        let left;
        for (let i = 0; i < this.groups.length; i++) {
            if (this.groups[i].start.cmp(start) <= 0) {
                left = this.groups[i];
            }
            if (this.groups[i].start.cmp(start) > 0) {
                return { left, right: this.groups[i], pos: i };
            }
        }
        return { left, right: undefined, pos: this.groups.length };
    }
    insertSingleBranchGroup(group) {
        if (group.n_branches !== 1) {
            throw new TypeError('Passed group with no or more than one branch');
        }
        if (group.group !== this) {
            throw new TypeError('Conflict group not assigned to node group');
        }
        const br = group.branches[0];
        if (!this.branch_order.includes(br)) {
            this.branch_order.push(br);
        }
        const { right, pos } = this.getNeighbors(group);
        const known_position = this.insertPos(br, right);
        this.groups.splice(pos, 0, group);
        return known_position;
    }
    toString() {
        let str = `Conflict @ ${this.known_position} (`;
        str += this.branch_order.map((br) => br.toString()).join(' ');
        str += `) {`;
        str += this.groups.map((gr) => {
            return ('\n  ' +
                gr
                    .toString()
                    .split('\n')
                    .join('\n  '));
        });
        str += '\n}';
        return str;
    }
}
exports.ConflictGroup = ConflictGroup;
class LogootNodeGroup {
    constructor(old) {
        this.length = 0;
        this.start = new LogootPosition();
        this.nodes = {};
        if (old) {
            Object.assign(this, {
                length: old.length,
                start: old.start.copy(),
                group: old.group
            });
            old.eachNode(({ type, rclk }, k) => {
                this.br(k, { type, rclk: new LogootInt(rclk) });
            });
        }
    }
    get ldoc_length() {
        return this.branches.reduce((n, br) => {
            return this.br(br).type === NodeType.DATA ? n + this.length : n;
        }, 0);
    }
    branchLength(branches) {
        return this.branches
            .filter((k) => branches.includes(k))
            .reduce((n, br) => {
            return this.br(br).type === NodeType.DATA ? n + this.length : n;
        }, 0);
    }
    get end() {
        return this.start.offsetLowest(this.length);
    }
    get branches() {
        return utils_1.allKeys(this.nodes);
    }
    get n_branches() {
        return this.branches.length;
    }
    get conflicted() {
        return this.n_branches > 1;
    }
    eachNode(cb) {
        this.branches.forEach((k) => {
            cb(this.br(k), k);
        });
    }
    mapNodes(cb) {
        const rval = {};
        this.branches.forEach((k) => {
            rval[k] = cb(this.br(k), k);
        });
        return rval;
    }
    br(key, node) {
        if (node) {
            this.nodes[key] = node;
        }
        return this.nodes[key];
    }
    delBr(key) {
        delete this.nodes[key];
    }
    splitAround(pos) {
        const newgroup = new LogootNodeGroup(this);
        newgroup.start = this.start.offsetLowest(pos);
        newgroup.length = this.length - pos;
        const groups = newgroup.group.groups;
        groups.splice(groups.indexOf(this) + 1, 0, newgroup);
        this.length = pos;
        return newgroup;
    }
    toString() {
        let str = `Group ${this.start.toString()} + ${this.length} {`;
        str += this.branches.map((k) => {
            const br = this.br(k);
            return `\n  ${String(k)}: ${nt_string[br.type]} @ ${br.rclk.toString()}`;
        });
        str += '\n}';
        return str;
    }
}
exports.LogootNodeGroup = LogootNodeGroup;


/***/ }),

/***/ "./src/utils.ts":
/*!**********************!*\
  !*** ./src/utils.ts ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
function arraymap(array, fn) {
    for (let i = 0; i < array.length;) {
        const newarray = fn(array[i]);
        array.splice(i, 1, ...newarray);
        i += newarray.length ? newarray.length : 1;
    }
    return array;
}
exports.arraymap = arraymap;
class FatalError extends Error {
    constructor() {
        super(...arguments);
        this.fatal = true;
    }
}
exports.FatalError = FatalError;
class Comparable {
    gt(n) {
        return this.cmp(n) === 1;
    }
    gteq(n) {
        return this.cmp(n) >= 0;
    }
    eq(n) {
        return this.cmp(n) === 0;
    }
    lteq(n) {
        return this.cmp(n) <= 0;
    }
    lt(n) {
        return this.cmp(n) === -1;
    }
}
exports.Comparable = Comparable;
class MemberPtr {
    constructor(obj, key) {
        this.obj = obj;
        this.key = key;
    }
    get value() {
        return this.obj[this.key];
    }
    set value(val) {
        this.obj[this.key] = val;
    }
}
exports.MemberPtr = MemberPtr;
function allKeys(obj) {
    return Object.keys(obj).concat(Object.getOwnPropertySymbols(obj));
}
exports.allKeys = allKeys;
function allValues(obj) {
    return allKeys(obj).map((k) => obj[k]);
}
exports.allValues = allValues;
const BreakException = {};
exports.BreakException = BreakException;
function catchBreak(fn) {
    try {
        fn();
    }
    catch (e) {
        if (e !== BreakException) {
            throw e;
        }
    }
}
exports.catchBreak = catchBreak;


/***/ })

/******/ });
});
//# sourceMappingURL=logootish-js.js.map