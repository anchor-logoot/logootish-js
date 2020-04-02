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

/***/ "./node_modules/loglevel/lib/loglevel.js":
/*!***********************************************!*\
  !*** ./node_modules/loglevel/lib/loglevel.js ***!
  \***********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_RESULT__;/*
* loglevel - https://github.com/pimterry/loglevel
*
* Copyright (c) 2013 Tim Perry
* Licensed under the MIT license.
*/
(function (root, definition) {
    "use strict";
    if (true) {
        !(__WEBPACK_AMD_DEFINE_FACTORY__ = (definition),
				__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
				(__WEBPACK_AMD_DEFINE_FACTORY__.call(exports, __webpack_require__, exports, module)) :
				__WEBPACK_AMD_DEFINE_FACTORY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
    } else {}
}(this, function () {
    "use strict";

    // Slightly dubious tricks to cut down minimized file size
    var noop = function() {};
    var undefinedType = "undefined";
    var isIE = (typeof window !== undefinedType) && (typeof window.navigator !== undefinedType) && (
        /Trident\/|MSIE /.test(window.navigator.userAgent)
    );

    var logMethods = [
        "trace",
        "debug",
        "info",
        "warn",
        "error"
    ];

    // Cross-browser bind equivalent that works at least back to IE6
    function bindMethod(obj, methodName) {
        var method = obj[methodName];
        if (typeof method.bind === 'function') {
            return method.bind(obj);
        } else {
            try {
                return Function.prototype.bind.call(method, obj);
            } catch (e) {
                // Missing bind shim or IE8 + Modernizr, fallback to wrapping
                return function() {
                    return Function.prototype.apply.apply(method, [obj, arguments]);
                };
            }
        }
    }

    // Trace() doesn't print the message in IE, so for that case we need to wrap it
    function traceForIE() {
        if (console.log) {
            if (console.log.apply) {
                console.log.apply(console, arguments);
            } else {
                // In old IE, native console methods themselves don't have apply().
                Function.prototype.apply.apply(console.log, [console, arguments]);
            }
        }
        if (console.trace) console.trace();
    }

    // Build the best logging method possible for this env
    // Wherever possible we want to bind, not wrap, to preserve stack traces
    function realMethod(methodName) {
        if (methodName === 'debug') {
            methodName = 'log';
        }

        if (typeof console === undefinedType) {
            return false; // No method possible, for now - fixed later by enableLoggingWhenConsoleArrives
        } else if (methodName === 'trace' && isIE) {
            return traceForIE;
        } else if (console[methodName] !== undefined) {
            return bindMethod(console, methodName);
        } else if (console.log !== undefined) {
            return bindMethod(console, 'log');
        } else {
            return noop;
        }
    }

    // These private functions always need `this` to be set properly

    function replaceLoggingMethods(level, loggerName) {
        /*jshint validthis:true */
        for (var i = 0; i < logMethods.length; i++) {
            var methodName = logMethods[i];
            this[methodName] = (i < level) ?
                noop :
                this.methodFactory(methodName, level, loggerName);
        }

        // Define log.log as an alias for log.debug
        this.log = this.debug;
    }

    // In old IE versions, the console isn't present until you first open it.
    // We build realMethod() replacements here that regenerate logging methods
    function enableLoggingWhenConsoleArrives(methodName, level, loggerName) {
        return function () {
            if (typeof console !== undefinedType) {
                replaceLoggingMethods.call(this, level, loggerName);
                this[methodName].apply(this, arguments);
            }
        };
    }

    // By default, we use closely bound real methods wherever possible, and
    // otherwise we wait for a console to appear, and then try again.
    function defaultMethodFactory(methodName, level, loggerName) {
        /*jshint validthis:true */
        return realMethod(methodName) ||
               enableLoggingWhenConsoleArrives.apply(this, arguments);
    }

    function Logger(name, defaultLevel, factory) {
      var self = this;
      var currentLevel;
      var storageKey = "loglevel";
      if (name) {
        storageKey += ":" + name;
      }

      function persistLevelIfPossible(levelNum) {
          var levelName = (logMethods[levelNum] || 'silent').toUpperCase();

          if (typeof window === undefinedType) return;

          // Use localStorage if available
          try {
              window.localStorage[storageKey] = levelName;
              return;
          } catch (ignore) {}

          // Use session cookie as fallback
          try {
              window.document.cookie =
                encodeURIComponent(storageKey) + "=" + levelName + ";";
          } catch (ignore) {}
      }

      function getPersistedLevel() {
          var storedLevel;

          if (typeof window === undefinedType) return;

          try {
              storedLevel = window.localStorage[storageKey];
          } catch (ignore) {}

          // Fallback to cookies if local storage gives us nothing
          if (typeof storedLevel === undefinedType) {
              try {
                  var cookie = window.document.cookie;
                  var location = cookie.indexOf(
                      encodeURIComponent(storageKey) + "=");
                  if (location !== -1) {
                      storedLevel = /^([^;]+)/.exec(cookie.slice(location))[1];
                  }
              } catch (ignore) {}
          }

          // If the stored level is not valid, treat it as if nothing was stored.
          if (self.levels[storedLevel] === undefined) {
              storedLevel = undefined;
          }

          return storedLevel;
      }

      /*
       *
       * Public logger API - see https://github.com/pimterry/loglevel for details
       *
       */

      self.name = name;

      self.levels = { "TRACE": 0, "DEBUG": 1, "INFO": 2, "WARN": 3,
          "ERROR": 4, "SILENT": 5};

      self.methodFactory = factory || defaultMethodFactory;

      self.getLevel = function () {
          return currentLevel;
      };

      self.setLevel = function (level, persist) {
          if (typeof level === "string" && self.levels[level.toUpperCase()] !== undefined) {
              level = self.levels[level.toUpperCase()];
          }
          if (typeof level === "number" && level >= 0 && level <= self.levels.SILENT) {
              currentLevel = level;
              if (persist !== false) {  // defaults to true
                  persistLevelIfPossible(level);
              }
              replaceLoggingMethods.call(self, level, name);
              if (typeof console === undefinedType && level < self.levels.SILENT) {
                  return "No console available for logging";
              }
          } else {
              throw "log.setLevel() called with invalid level: " + level;
          }
      };

      self.setDefaultLevel = function (level) {
          if (!getPersistedLevel()) {
              self.setLevel(level, false);
          }
      };

      self.enableAll = function(persist) {
          self.setLevel(self.levels.TRACE, persist);
      };

      self.disableAll = function(persist) {
          self.setLevel(self.levels.SILENT, persist);
      };

      // Initialize with the right level
      var initialLevel = getPersistedLevel();
      if (initialLevel == null) {
          initialLevel = defaultLevel == null ? "WARN" : defaultLevel;
      }
      self.setLevel(initialLevel, false);
    }

    /*
     *
     * Top-level API
     *
     */

    var defaultLogger = new Logger();

    var _loggersByName = {};
    defaultLogger.getLogger = function getLogger(name) {
        if (typeof name !== "string" || name === "") {
          throw new TypeError("You must supply a name when creating a logger.");
        }

        var logger = _loggersByName[name];
        if (!logger) {
          logger = _loggersByName[name] = new Logger(
            name, defaultLogger.getLevel(), defaultLogger.methodFactory);
        }
        return logger;
    };

    // Grab the current global log variable in case of overwrite
    var _log = (typeof window !== undefinedType) ? window.log : undefined;
    defaultLogger.noConflict = function() {
        if (typeof window !== undefinedType &&
               window.log === defaultLogger) {
            window.log = _log;
        }

        return defaultLogger;
    };

    defaultLogger.getLoggers = function getLoggers() {
        return _loggersByName;
    };

    return defaultLogger;
}));


/***/ }),

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
class TypeRangeSearch {
    constructor(range) {
        this.range = range;
        this.buckets = { lesser: [], range: [], greater: [] };
    }
    addToBucket(bucket, val, obj) {
        this.buckets[bucket].push([val, obj]);
    }
    setBucket(bucket, val, obj) {
        let cval;
        if (!this.buckets[bucket].length ||
            (cval = this.range.cf(val, this.buckets[bucket][0][0])) === 0) {
            this.buckets[bucket].push([val, obj]);
            return;
        }
        if (bucket === 'lesser' && cval > 0) {
            this.buckets.lesser = [[val, obj]];
        }
        else if (bucket === 'greater' && cval < 0) {
            this.buckets.greater = [[val, obj]];
        }
    }
}
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
                if (node.value.data !== object) {
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
            else {
                this.remove(object, filter, new utils_1.MemberPtr(node.value, 'left'));
                this.remove(object, filter, new utils_1.MemberPtr(node.value, 'right'));
            }
            if (result === 0 && should_remove) {
                if (node.value.left && node.value.right) {
                    const successor = this._getInorderSuccessor(node.value.data, node);
                    this.remove(successor.data, undefined, successor.ptr);
                    node.value.data = successor.data;
                }
                else {
                    node.value = node.value.left || node.value.right;
                }
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
class DBstNode {
    constructor(value = 0) {
        this.value = value;
    }
    get absolute_value() {
        return this.value + (this.parent_node ? this.parent_node.absolute_value : 0);
    }
    addChild(node) {
        node.value -= this.value;
        if (node.value > 0 || this.preferential_cmp(node) < 0) {
            if (this.right_node) {
                this.right_node.addChild(node);
            }
            else {
                this.right_node = node;
                node.parent_node = this;
            }
        }
        else {
            if (this.left_node) {
                this.left_node.addChild(node);
            }
            else {
                this.left_node = node;
                node.parent_node = this;
            }
        }
    }
    get smallest_child() {
        if (this.left_node) {
            return this.left_node.smallest_child || this.left_node;
        }
        else if (this.right_node) {
            return this.right_node.smallest_child || this.right_node;
        }
        return undefined;
    }
    get smallest_smaller_child() {
        if (this.left_node) {
            return this.left_node.smallest_smaller_child || this.left_node;
        }
        return undefined;
    }
    get largest_child() {
        if (this.right_node) {
            return this.right_node.largest_child || this.right_node;
        }
        else if (this.left_node) {
            return this.left_node.largest_child || this.left_node;
        }
        return undefined;
    }
    get largest_larger_child() {
        if (this.right_node) {
            return this.right_node.largest_larger_child || this.right_node;
        }
        return undefined;
    }
    get inorder_successor() {
        if (this.right_node) {
            return this.right_node.smallest_smaller_child || this.right_node;
        }
        let node = this;
        while (node) {
            if (node.value <= 0 &&
                node.parent_node &&
                node.parent_node.left_node === node) {
                return node.parent_node;
            }
            node = node.parent_node;
        }
        return undefined;
    }
    replaceWith(data) {
        if (data) {
            data.value = data.value - this.absolute_value + this.value;
        }
        if (this.parent_node) {
            if (this.value <= 0) {
                this.parent_node.left_node = data;
            }
            else {
                this.parent_node.right_node = data;
            }
            if (data) {
                if (data.parent_node) {
                    if (data.parent_node.left_node === data) {
                        delete data.parent_node.left_node;
                    }
                    else if (data.parent_node.right_node === data) {
                        delete data.parent_node.right_node;
                    }
                    delete data.parent_node;
                }
                data.parent_node = this.parent_node;
            }
        }
        if (data && this.left_node && this.left_node !== data) {
            data.left_node = this.left_node;
            data.left_node.parent_node = data;
            data.left_node.value += this.value - data.value;
        }
        if (data && this.right_node && this.right_node !== data) {
            data.right_node = this.right_node;
            data.right_node.parent_node = data;
            data.right_node.value += this.value - data.value;
        }
        delete this.parent_node;
        delete this.right_node;
        delete this.left_node;
        return this;
    }
    removeChild(value, filter = () => true, vals = [], parentUpdate = () => undefined) {
        const tryRmLeft = () => {
            if (this.left_node) {
                this.left_node.removeChild(value - this.left_node.value, filter, vals);
            }
        };
        const tryRmRight = () => {
            if (this.right_node) {
                this.right_node.removeChild(value - this.right_node.value, filter, vals);
            }
        };
        if (value <= 0) {
            tryRmLeft();
        }
        else if (value > 0) {
            tryRmRight();
        }
        if (value === 0 && filter(this)) {
            vals.push(this);
            let cnode;
            if (this.right_node && this.left_node) {
                cnode = this.inorder_successor;
                const absval = cnode.absolute_value;
                cnode.parent_node.removeChild(cnode.value, (n) => n === cnode);
                cnode.value = absval;
            }
            else if (this.right_node) {
                cnode = this.right_node;
                cnode.value = cnode.absolute_value;
            }
            else if (this.left_node) {
                cnode = this.left_node;
                cnode.value = cnode.absolute_value;
            }
            else {
                cnode = undefined;
            }
            this.replaceWith(cnode);
            parentUpdate(cnode);
        }
        return vals;
    }
    addSpaceBefore(s) {
        let next = this;
        let cumulative = 0;
        while (next) {
            if (cumulative >= 0 && this.preferential_cmp(next) <= 0) {
                cumulative -= next.value;
                next.value += s;
                if (next.left_node) {
                    next.left_node.value -= s;
                }
            }
            else {
                cumulative -= next.value;
            }
            next = next.parent_node;
        }
    }
    search(s, cval) {
        cval += this.value;
        s.range.push_offset(-this.value);
        const traverse_left = () => {
            this.left_node.search(s, cval);
        };
        const traverse_right = () => {
            this.right_node.search(s, cval);
        };
        const sec = s.range.getRangeSection(0);
        if (sec < 0) {
            s.setBucket('lesser', cval, this);
            if (this.right_node) {
                traverse_right();
            }
            if (this.left_node && this.left_node.value === 0) {
                traverse_left();
            }
        }
        else if (sec > 0) {
            s.setBucket('greater', cval, this);
            if (this.left_node) {
                traverse_left();
            }
        }
        else {
            s.addToBucket('range', cval, this);
            if (this.left_node) {
                traverse_left();
            }
            if (this.right_node) {
                traverse_right();
            }
        }
        ;
        s.range.pop_offset(-this.value);
    }
    operateOnAll(cb) {
        if (this.left_node) {
            this.left_node.operateOnAll(cb);
        }
        cb(this);
        if (this.right_node) {
            this.right_node.operateOnAll(cb);
        }
    }
}
exports.DBstNode = DBstNode;
class DBst {
    constructor() {
        this.bst_root = undefined;
    }
    add(node) {
        if (!this.bst_root) {
            this.bst_root = node;
        }
        else {
            this.bst_root.addChild(node);
        }
        return node;
    }
    remove(value, filter = () => true) {
        const vals = [];
        if (this.bst_root) {
            this.bst_root.removeChild(value - this.bst_root.value, filter, vals, (p) => {
                this.bst_root = p;
            });
        }
        return vals;
    }
    search(range) {
        const search = new TypeRangeSearch(range);
        if (this.bst_root) {
            this.bst_root.search(search, 0);
        }
        return search;
    }
    operateOnAll(cb) {
        if (this.bst_root) {
            this.bst_root.operateOnAll(cb);
        }
    }
    toString() {
        let str = 'DBST [\n';
        this.operateOnAll((data) => {
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
exports.DBst = DBst;


/***/ }),

/***/ "./src/compare.ts":
/*!************************!*\
  !*** ./src/compare.ts ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
function cmpResult(n) {
    if (isNaN(n) || n === undefined || n === null) {
        throw new TypeError(`Invalid compare result '${n}.'`);
    }
    return n > 0 ? 1 : n < 0 ? -1 : 0;
}
exports.cmpResult = cmpResult;
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
class RangeBounds {
    constructor(a, b) {
        if (a === true || a === false) {
            this.closed_left = a;
            this.closed_right = Boolean(b);
        }
        else if (a[0] && a[1]) {
            this.closed_left = a[0] === '[';
            this.closed_right = a[1] === ']';
        }
        else {
            this.closed_left = true;
            this.closed_right = true;
        }
    }
    get left_str() {
        return this.closed_left ? '[' : '(';
    }
    get right_str() {
        return this.closed_right ? ']' : ')';
    }
    toString() {
        return this.left_str + this.right_str;
    }
}
exports.RangeBounds = RangeBounds;
RangeBounds.LCGC = new RangeBounds(true, true);
RangeBounds.LOGO = new RangeBounds(false, false);
RangeBounds.LCGO = new RangeBounds(true, false);
RangeBounds.LOGC = new RangeBounds(false, true);
class TypeRange {
    constructor(cf, min, max, bounds = RangeBounds.LCGC) {
        this.cf = cf;
        this.min = min;
        this.max = max;
        this.bounds = bounds;
    }
    static gt(cf, t) {
        return new TypeRange(cf, t, undefined, new RangeBounds(false, false));
    }
    static gteq(cf, t) {
        return new TypeRange(cf, t, undefined, new RangeBounds(true, false));
    }
    static lt(cf, t) {
        return new TypeRange(cf, undefined, t, new RangeBounds(false, false));
    }
    static lteq(cf, t) {
        return new TypeRange(cf, undefined, t, new RangeBounds(false, true));
    }
    static all(cf) {
        return new TypeRange(cf, undefined, undefined, new RangeBounds(false, false));
    }
    get undef_min() {
        return (this.min === undefined ||
            this.min === null ||
            this.min === NaN ||
            this.min === -Infinity);
    }
    get def_min() {
        return !this.undef_min;
    }
    get undef_max() {
        return (this.max === undefined ||
            this.max === null ||
            this.max === NaN ||
            this.max === Infinity);
    }
    get def_max() {
        return !this.undef_max;
    }
    bound_def(b) {
        return b === 'min' ? this.def_min : this.def_max;
    }
    bound_undef(b) {
        return b === 'min' ? this.undef_min : this.undef_max;
    }
    contains(t) {
        return ((!this.min ||
            this.cf(t, this.min) >= (this.bounds.closed_left ? 0 : 1)) &&
            (!this.max || this.cf(this.max, t) >= (this.bounds.closed_right ? 0 : 1)));
    }
    getRangeSection(t) {
        if (this.def_max &&
            this.cf(this.max, t) < (this.bounds.closed_right ? 0 : 1)) {
            return 1;
        }
        if (this.def_min &&
            this.cf(t, this.min) < (this.bounds.closed_left ? 0 : 1)) {
            return -1;
        }
        return 0;
    }
    compareEndpoints(local, r, other) {
        if (this.bound_def(local) && r.bound_undef(other)) {
            return other === 'min' ? 1 : -1;
        }
        if (this.bound_undef(local) && r.bound_undef(other)) {
            return local !== other ? (local === 'max' ? 1 : -1) : 0;
        }
        if (this.bound_undef(local) && r.bound_def(other)) {
            return local === 'max' ? 1 : -1;
        }
        const rval = this.cf(this[local], r[other]);
        if (rval === 0) {
            const local_closed = local === 'min' ? !this.bounds.closed_left : this.bounds.closed_right;
            const other_closed = other === 'min' ? !r.bounds.closed_left : r.bounds.closed_right;
            if (local_closed && !other_closed) {
                return 1;
            }
            else if (!local_closed && other_closed) {
                return -1;
            }
        }
        return rval;
    }
    doesContainInRange(r) {
        return (this.compareEndpoints('min', r, 'min') <= 0 &&
            this.compareEndpoints('max', r, 'max') >= 0);
    }
    mayContainInRange(r) {
        return (this.compareEndpoints('min', r, 'max') < 0 &&
            this.compareEndpoints('max', r, 'min') > 0);
    }
    toString() {
        return `${this.bounds.left_str}${this.min},${this.max}${this.bounds.right_str}`;
    }
}
exports.TypeRange = TypeRange;
class ComparableTypeRange extends TypeRange {
    constructor(min, max, bounds) {
        super((a, b) => a.cmp(b), min, max, bounds);
    }
}
exports.ComparableTypeRange = ComparableTypeRange;
class NumberRange extends TypeRange {
    constructor(min, max, bounds) {
        super((a, b) => cmpResult(a - b), min, max, bounds);
    }
    push_offset(o) {
        this.min += o;
        this.max += o;
    }
    pop_offset(o) {
        this.min -= o;
        this.max -= o;
    }
}
exports.NumberRange = NumberRange;


/***/ }),

/***/ "./src/debug.ts":
/*!**********************!*\
  !*** ./src/debug.ts ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const loglevel_1 = __importDefault(__webpack_require__(/*! loglevel */ "./node_modules/loglevel/lib/loglevel.js"));
const debug = loglevel_1.default.getLogger('logootish-js');
exports.debug = debug;


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
const compare_1 = __webpack_require__(/*! ../compare */ "./src/compare.ts");
const utils_1 = __webpack_require__(/*! ../utils */ "./src/utils.ts");
const bst_1 = __webpack_require__(/*! ../bst */ "./src/bst.ts");
const logoot_1 = __webpack_require__(/*! ./logoot */ "./src/listmodel/logoot.ts");
exports.LogootInt = logoot_1.LogootInt;
exports.LogootPosition = logoot_1.LogootPosition;
exports.NodeType = logoot_1.NodeType;
const debug_1 = __webpack_require__(/*! ../debug */ "./src/debug.ts");
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
        this.ldoc_bst = new bst_1.DBst();
        this.logoot_bst = new bst_1.Bst((a, b) => a.start.cmp(b.start));
        this.clock = new logoot_1.LogootInt();
        this.branch = branch;
        this.canJoin = jf;
    }
    insertLocal(start, length) {
        const { buckets } = this.ldoc_bst.search(new compare_1.NumberRange(start, start, compare_1.RangeBounds.LOGO));
        let lesser;
        let greater;
        if (buckets.lesser && buckets.lesser.length) {
            lesser = buckets.lesser
                .map(([, cg]) => cg)
                .sort((a, b) => a.logoot_start.cmp(b.logoot_start))[0];
        }
        if (buckets.greater && buckets.greater.length) {
            greater = buckets.greater
                .map(([, cg]) => cg)
                .sort((a, b) => b.logoot_start.cmp(a.logoot_start))[0];
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
                    const { buckets } = this.ldoc_bst.search(new compare_1.NumberRange(lesser.known_position, lesser.known_position, compare_1.RangeBounds.LOGC));
                    let most_lesser;
                    if (buckets.lesser && buckets.lesser.length) {
                        most_lesser = buckets.lesser
                            .map(([, cg]) => cg)
                            .sort((a, b) => a.logoot_start.cmp(b.logoot_start))[0];
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
        const { buckets } = this.ldoc_bst.search(new compare_1.NumberRange(start, start + length, compare_1.RangeBounds.LOGC));
        const nodes = buckets.range.map(([, cg]) => cg);
        if (buckets.lesser && buckets.lesser.length) {
            const l = buckets.lesser
                .map(([, cg]) => cg)
                .sort((a, b) => a.logoot_start.cmp(b.logoot_start))[0];
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
        if (this.debug_logger) {
            this.debug_logger.log({
                br,
                start: nstart,
                length,
                rclk: nrclk,
                type
            });
        }
        debug_1.debug.info(`Merging ${type} ${String(br)} ${nstart} + ${length} @ ${nrclk}`);
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
        if (skip_ranges.length) {
            const ke = skip_ranges[skip_ranges.length - 1].group.ldoc_end;
            conflict_order = this.ldoc_bst
                .search(new compare_1.NumberRange(skip_ranges[0].group.known_position, ke))
                .buckets.range.sort((a, b) => a[0] - b[0])
                .map(([, cg]) => cg);
        }
        skip_ranges = skip_ranges.filter(({ start }) => start.levels >= level || start.cmp(nend) >= 0);
        if (!skip_ranges.length ||
            skip_ranges[skip_ranges.length - 1].start.cmp(nend) < 0) {
            const vgroup = new logoot_1.LogootNodeGroup();
            vgroup.start = nend;
            skip_ranges.push(vgroup);
        }
        const operations = [];
        const remove = (cg, start, length) => {
            if (length === 0) {
                return;
            }
            operations.push({
                type: 'r',
                start,
                length
            });
            const successor = cg.inorder_successor;
            if (successor) {
                successor.addSpaceBefore(-length);
            }
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
            const successor = cg.inorder_successor;
            if (successor) {
                successor.addSpaceBefore(length);
            }
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
        const splitCg = (cg, ng) => {
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
                ncg.value -= moved_length;
                known_position += excerpt_length;
                translate(known_position, moved_length, known_end - moved_length);
            });
            ncg.groups = cg.groups.splice(cg.groups.indexOf(ng) + 1, cg.groups.length);
            ncg.groups.forEach((group) => (group.group = ncg));
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
            this.ldoc_bst.remove(ncg.known_position, (other) => other === ncg);
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
                debug_1.debug.info(`Creating new group at ${newgroup.start.toString()}`);
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
                    const ipos = newgroup.group.insertSingleBranchGroup(newgroup);
                    if (!last_join && !next_join) {
                        this.ldoc_bst.add(newgroup.group);
                    }
                    insert(newgroup.group, ipos, empty_offset, newgroup.length);
                }
                else {
                    newgroup.group.insertSingleBranchGroup(newgroup);
                    if (!last_join && !next_join) {
                        this.ldoc_bst.add(newgroup.group);
                    }
                }
                last_group = newgroup;
                this.logoot_bst.add(newgroup);
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
                debug_1.debug.info(`Adding to existing group at ${group.start.toString()}`);
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
                const fixJoined = (a, b) => {
                    if (!a || !b) {
                        return;
                    }
                    const joined = a.group === b.group;
                    const should_join = canJoin(a, b);
                    if (!joined && should_join) {
                        joinCg(a.group, b.group);
                    }
                    else if (joined && !should_join) {
                        splitCg(a.group, a);
                    }
                };
                fixJoined(last_group, group);
                fixJoined(group, next_group);
            }
            last_start = group.end.clamp(nstart, nend, level).level(level);
            last_group = group;
        });
        conflict_order.forEach(({ known_position, ldoc_length, conflicted }) => {
            mark(known_position, ldoc_length, conflicted);
        });
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
        this.ldoc_bst.operateOnAll((data) => {
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
(function (ListDocumentModel) {
    class JsonableLogger {
        constructor() {
            this.ops = [];
        }
        log(op) {
            this.ops.push(op);
        }
        replayAll(ldm, post = () => undefined) {
            let ops = [];
            let newops;
            this.ops.forEach((o) => {
                newops = ldm._mergeNode(o.br, o.start, o.length, o.rclk, o.type, ldm.canJoin);
                ops = ops.concat(newops);
                post(ldm, o, newops);
            });
            return ops;
        }
        restoreFromJSON(j) {
            this.ops = j.map((o) => ({
                br: `BR[${o.b.toString(16)}]`,
                start: logoot_1.LogootPosition.fromJSON(o.s),
                length: o.l,
                rclk: logoot_1.LogootInt.fromJSON(o.r),
                type: o.t === 'D'
                    ? logoot_1.NodeType.DATA
                    : o.t === 'R'
                        ? logoot_1.NodeType.REMOVAL
                        : (() => {
                            throw new TypeError('Node type was not one of DATA or REMOVAL');
                        })()
            }));
            return this;
        }
        toJSON() {
            const brk_tbl = {};
            let _brk_i = 0;
            const map_brk = (k) => {
                if (brk_tbl[k] === undefined) {
                    brk_tbl[k] = _brk_i++;
                }
                return brk_tbl[k];
            };
            return this.ops.map((o) => ({
                b: map_brk(o.br),
                s: o.start.toJSON(),
                l: o.length,
                r: o.rclk.toJSON(),
                t: o.type === logoot_1.NodeType.DATA
                    ? 'D'
                    : logoot_1.NodeType.REMOVAL
                        ? 'R'
                        : (() => {
                            throw new TypeError('Node type was not one of DATA or REMOVAL');
                        })()
            }));
        }
    }
    ListDocumentModel.JsonableLogger = JsonableLogger;
})(ListDocumentModel || (ListDocumentModel = {}));
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
const bst_1 = __webpack_require__(/*! ../bst */ "./src/bst.ts");
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
class ConflictGroup extends bst_1.DBstNode {
    constructor(position) {
        super(position);
        this.branch_order = [];
        this.groups = [];
    }
    get known_position() {
        return this.absolute_value;
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
    preferential_cmp(other) {
        if (other.logoot_start) {
            return this.logoot_start.cmp(other.logoot_start);
        }
        return 0;
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
const compare_1 = __webpack_require__(/*! ./compare */ "./src/compare.ts");
exports.Comparable = compare_1.Comparable;
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