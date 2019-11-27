(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("logootish-js", [], factory);
	else if(typeof exports === 'object')
		exports["logootish-js"] = factory();
	else
		root["logootish-js"] = factory();
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
    var isIE = (typeof window !== undefinedType) && (
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
    remove(object, node = new utils_1.MemberPtr(this, 'bst_root')) {
        if (node.value) {
            const result = this.cmp(node.value.data, object);
            if (result > 0) {
                this.remove(object, new utils_1.MemberPtr(node.value, 'left'));
            }
            else if (result < 0) {
                this.remove(object, new utils_1.MemberPtr(node.value, 'right'));
            }
            else if (node.value.left && node.value.right) {
                const successor = this._getInorderSuccessor(node.value.data, node);
                this.remove(successor.data, successor.ptr);
                node.value.data = successor.data;
            }
            else {
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
    operateOnAllGteq(value, operation, node = new utils_1.MemberPtr(this, 'bst_root')) {
        if (node.value) {
            if (this.gteqcmp(node.value.data, value)) {
                operation(node.value);
                this.operateOnAllGteq(value, operation, new utils_1.MemberPtr(node.value, 'left'));
            }
            this.operateOnAllGteq(value, operation, new utils_1.MemberPtr(node.value, 'right'));
        }
    }
    operateOnAllLteq(value, operation, node = new utils_1.MemberPtr(this, 'bst_root')) {
        if (node.value) {
            if (this.gteqcmp(value, node.value.data)) {
                operation(node.value);
                this.operateOnAllLteq(value, operation, new utils_1.MemberPtr(node.value, 'right'));
            }
            this.operateOnAllLteq(value, operation, new utils_1.MemberPtr(node.value, 'left'));
        }
    }
    operateOnAll(operation, node = new utils_1.MemberPtr(this, 'bst_root')) {
        if (node.value) {
            this.operateOnAll(operation, new utils_1.MemberPtr(node.value, 'left'));
            operation(node.value);
            this.operateOnAll(operation, new utils_1.MemberPtr(node.value, 'right'));
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
            str += '  ' + data.toString() + '\n';
        });
        str += ']';
        return str;
    }
}
exports.Bst = Bst;


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
const debug_1 = __webpack_require__(/*! ./debug */ "./src/debug.ts");
const listmodel_1 = __webpack_require__(/*! ./listmodel */ "./src/listmodel/index.ts");
exports.ListDocumentModel = listmodel_1.ListDocumentModel;
exports.LogootInt = listmodel_1.LogootInt;
exports.LogootPosition = listmodel_1.LogootPosition;
var EventState;
(function (EventState) {
    EventState[EventState["PENDING"] = 0] = "PENDING";
    EventState[EventState["SENDING"] = 1] = "SENDING";
    EventState[EventState["COMPLETE"] = 2] = "COMPLETE";
})(EventState || (EventState = {}));
exports.EventState = EventState;
var EventType;
(function (EventType) {
    EventType[EventType["INSERTION"] = 0] = "INSERTION";
    EventType[EventType["REMOVAL"] = 1] = "REMOVAL";
})(EventType || (EventType = {}));
exports.EventType = EventType;
class InsertionEvent {
    constructor(body, start = new listmodel_1.LogootPosition(), rclk) {
        this.type = EventType.INSERTION;
        this.body = '';
        this.start = undefined;
        this.rclk = new listmodel_1.LogootInt();
        this.last = undefined;
        this.next = undefined;
        this.state = EventState.PENDING;
        Object.assign(this, {
            body,
            start,
            rclk: new listmodel_1.LogootInt(rclk)
        });
    }
    static fromJSON(eventnode) {
        return new InsertionEvent(eventnode.body, listmodel_1.LogootPosition.fromJSON(eventnode.start), listmodel_1.LogootInt.fromJSON(eventnode.rclk));
    }
    toJSON() {
        return {
            body: this.body,
            start: this.start.toJSON(),
            rclk: this.rclk.toJSON()
        };
    }
    get length() {
        return this.body.length;
    }
    get end() {
        return this.start.offsetLowest(this.length);
    }
}
exports.InsertionEvent = InsertionEvent;
(function (InsertionEvent) {
    let JSON;
    (function (JSON) {
        JSON.Schema = {
            type: 'object',
            properties: {
                body: { type: 'string' },
                start: listmodel_1.LogootPosition.JSON.Schema,
                rclk: listmodel_1.LogootInt.JSON.Schema
            }
        };
    })(JSON = InsertionEvent.JSON || (InsertionEvent.JSON = {}));
})(InsertionEvent || (InsertionEvent = {}));
exports.InsertionEvent = InsertionEvent;
class RemovalEvent {
    constructor(removals, rclk) {
        this.type = EventType.REMOVAL;
        this.removals = [];
        this.state = EventState.PENDING;
        this.removals = removals;
        this.rclk = new listmodel_1.LogootInt(rclk);
    }
    static fromJSON(eventnode) {
        return new RemovalEvent(eventnode.removals.map((r) => ({
            start: listmodel_1.LogootPosition.fromJSON(r.start),
            length: r.length
        })), listmodel_1.LogootInt.fromJSON(eventnode.rclk));
    }
    toJSON() {
        return {
            removals: this.removals.map((r) => ({
                start: r.start.toJSON(),
                length: r.length
            })),
            rclk: this.rclk.toJSON()
        };
    }
}
exports.RemovalEvent = RemovalEvent;
(function (RemovalEvent) {
    let JSON;
    (function (JSON) {
        JSON.Schema = {
            type: 'object',
            properties: {
                removals: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            start: listmodel_1.LogootPosition.JSON.Schema,
                            length: { type: 'number' }
                        }
                    }
                },
                rclk: listmodel_1.LogootInt.JSON.Schema
            }
        };
    })(JSON = RemovalEvent.JSON || (RemovalEvent.JSON = {}));
})(RemovalEvent || (RemovalEvent = {}));
exports.RemovalEvent = RemovalEvent;
class Document {
    constructor(send, insertLocal, removeLocal) {
        this.pending_events = [];
        this._active_listeners = [];
        this.last_insertion_event = undefined;
        this.doc = new listmodel_1.ListDocumentModel();
        this.send = send;
        this.insertLocal = insertLocal;
        this.removeLocal = removeLocal;
    }
    _removePendingEvent(event) {
        const index = this.pending_events.indexOf(event);
        if (index >= 0) {
            this.pending_events.splice(index, 1);
            return true;
        }
        return false;
    }
    _tryMergeEvents(event) {
        if (event.state !== EventState.PENDING) {
            return false;
        }
        if (event.last && event.last.state === EventState.PENDING) {
            let oldevent = event;
            while (oldevent.last && oldevent.last.state === EventState.PENDING) {
                oldevent.last.body += oldevent.body;
                oldevent.last.next = oldevent.next;
                if (oldevent.next) {
                    oldevent.next.last = oldevent.last;
                }
                this._removePendingEvent(oldevent);
                if (this.last_insertion_event === oldevent) {
                    this.last_insertion_event = oldevent.last;
                }
                oldevent = oldevent.last;
            }
            this._tryMergeEvents(oldevent);
            return true;
        }
        else if (event.next && event.next.state === EventState.PENDING) {
            let oldevent = event;
            while (oldevent.next && oldevent.next.state === EventState.PENDING) {
                oldevent.next.body = oldevent.body + oldevent.next.body;
                oldevent.next.start = oldevent.start;
                oldevent.next.last = oldevent.last;
                if (oldevent.last) {
                    oldevent.last.next = oldevent.next;
                }
                this._removePendingEvent(oldevent);
                if (this.last_insertion_event === oldevent) {
                    this.last_insertion_event = oldevent.next;
                }
                oldevent = oldevent.next;
            }
            return true;
        }
        return false;
    }
    _pushEvent(event) {
        this.pending_events.push(event);
        const queue_send = () => {
            event.state = EventState.SENDING;
            this.send(event)
                .then(() => {
                this._removePendingEvent(event);
                event.state = EventState.COMPLETE;
            })
                .catch((e) => {
                event.state = EventState.PENDING;
                if (e.event) {
                    e.event.flagCancelled();
                }
                if (e && e.data && e.data.retry_after_ms) {
                    if (event.type === EventType.INSERTION &&
                        this._tryMergeEvents(event)) {
                        debug_1.debug.warn(`Hitting the rate limit: Will resend in ${e.data.retry_after_ms} ms with multiple messages merged together`);
                        return {};
                    }
                    debug_1.debug.warn(`Hitting the rate limit: Will resend in ${e.data.retry_after_ms} ms`);
                    setTimeout(queue_send, e.data.retry_after_ms);
                }
                else {
                    debug_1.debug.error('Error sending event', e);
                    return e;
                }
            });
        };
        queue_send();
    }
    get ldoc_bst() {
        return this.ldoc_bst;
    }
    get logoot_bst() {
        return this.logoot_bst;
    }
    get removal_bst() {
        return this.removal_bst;
    }
    insert(position, text) {
        const ins = this.doc.insertLocal(position, text.length);
        this._pushEvent(new InsertionEvent(text, ins.position, ins.rclk));
    }
    remove(position, length) {
        const { removals, rclk } = this.doc.removeLocal(position, length);
        this._pushEvent(new RemovalEvent(removals, rclk));
    }
    remoteInsert(event_contents) {
        const { body, start, rclk } = InsertionEvent.fromJSON(event_contents);
        const { insertions } = this.doc.insertLogoot(start, body.length, rclk);
        insertions.forEach(({ offset, length, known_position }) => this.insertLocal(known_position, body.substr(offset, length)));
    }
    remoteRemove(event_contents) {
        const { rclk, removals } = RemovalEvent.fromJSON(event_contents);
        removals.forEach(({ start, length }) => {
            const { removals } = this.doc.removeLogoot(start, length, rclk);
            removals.forEach(({ known_position, length }) => this.removeLocal(known_position, length));
        });
    }
}
exports.Document = Document;


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
const debug_1 = __webpack_require__(/*! ../debug */ "./src/debug.ts");
const bst_1 = __webpack_require__(/*! ../bst */ "./src/bst.ts");
const logoot_1 = __webpack_require__(/*! ./logoot */ "./src/listmodel/logoot.ts");
exports.LogootInt = logoot_1.LogootInt;
exports.LogootPosition = logoot_1.LogootPosition;
function _mergeNode(bst, nstart, length, resolveConflict, addNode, informRemoval) {
    const level = nstart.levels;
    const nend = nstart.offsetLowest(length);
    let skip_ranges = bst
        .getRange({ start: nstart }, { start: nend })
        .map(({ data }) => data)
        .sort((a, b) => a.start.cmp(b.start));
    const nodes_lesser = bst.getLteq({ start: nstart });
    let lesser;
    if (nodes_lesser.length > 1) {
        throw new utils_1.FatalError('Corrupt BST. There are multiple nodes at a position.');
    }
    else if (nodes_lesser.length) {
        lesser = nodes_lesser[0].data;
    }
    if (lesser && !skip_ranges.includes(lesser)) {
        skip_ranges.unshift(lesser);
    }
    skip_ranges.push({
        start: nend,
        end: nend,
        length: 0,
        known_position: 0,
        known_end_position: 0,
        rclk: new logoot_1.LogootInt(0)
    });
    skip_ranges = skip_ranges.filter((n) => {
        if (n.length && n.start.levels === level) {
            const clip_nstart = nstart.cmp(n.start) > 0;
            const clip_nend = nend.cmp(n.end) < 0;
            const start = clip_nstart ? nstart : n.start;
            const end = clip_nend ? nend : n.end;
            if (start.cmp(end) === 0) {
                return true;
            }
            const conflict = {
                start,
                end,
                clip_nstart,
                clip_nend,
                whole_node: !(clip_nstart || clip_nend),
                level
            };
            const result = resolveConflict(n, conflict, lesser);
            if (result < 1) {
                if (result < 0) {
                    if (conflict.whole_node) {
                        informRemoval(n, n.known_position, n.length, true);
                        n.length = 0;
                    }
                    else {
                        const l = new logoot_1.LogootInt(end.l(level)).sub(start.l(level)).js_int;
                        const endnode = new logoot_1.LogootNode(n);
                        endnode.start = end;
                        const n_end_old = n.end.offsetLowest(0);
                        if (clip_nstart) {
                            n.length = new logoot_1.LogootInt(start.l(level)).sub(n.start.l(level)).js_int;
                            endnode.known_position += n.length;
                            endnode.start.offsetLowest(n.known_position + n.length + l);
                            informRemoval(n, n.known_position + n.length, l, n.length <= 0);
                        }
                        else {
                            informRemoval(n, n.known_position, l, true);
                            endnode.start.offsetLowest(n.known_position + l);
                        }
                        if (clip_nend) {
                            endnode.length = new logoot_1.LogootInt(n_end_old.l(level)).sub(end.l(level)).js_int;
                            if (endnode.length > 0) {
                                addNode(endnode);
                            }
                        }
                    }
                }
                return false;
            }
        }
        return true;
    });
    let known_start = 0;
    if (lesser) {
        const positions = [lesser.length];
        if (lesser.start.levels < nstart.levels) {
            positions.push(new logoot_1.LogootInt(nstart.l(lesser.start.levels)).sub(lesser.start.l(lesser.start.levels)).js_int);
        }
        const lesser_pos = Math.min(...positions);
        known_start = lesser.known_position + lesser_pos;
        if (lesser.length - lesser_pos) {
            const node = new logoot_1.LogootNode(lesser);
            node.start = node.start.offsetLowest(lesser_pos);
            node.length -= lesser_pos;
            node.known_position += lesser_pos;
            addNode(node);
            lesser.length = lesser_pos;
        }
    }
    const newnodes = [];
    let last_end = nstart;
    let last_known_position = known_start;
    skip_ranges.forEach((skip_range) => {
        const { start, end, length } = skip_range;
        const cstart = start.equivalentPositionAtLevel(level).clamp(nstart, nend);
        const cend = end.equivalentPositionAtLevel(level).clamp(nstart, nend);
        const offset = new logoot_1.LogootInt(last_end.l(level)).sub(nstart.l(level)).js_int;
        const node = Object.assign(new logoot_1.LogootNode(), {
            offset
        });
        node.length = new logoot_1.LogootInt(cstart.l(level)).sub(last_end.l(level)).js_int;
        if (node.length <= 0) {
            last_end = cend;
            if (skip_range !== lesser) {
                last_known_position += length;
            }
            return;
        }
        node.start = nstart.offsetLowest(offset);
        node.known_position = last_known_position;
        newnodes.push(node);
        last_end = cend;
        last_known_position += node.length;
        if (skip_range !== lesser) {
            last_known_position += length;
        }
    });
    return newnodes;
}
exports._mergeNode = _mergeNode;
class ListDocumentModel {
    constructor() {
        this.ldoc_bst = new bst_1.Bst((a, b) => (a.known_position - b.known_position));
        this.logoot_bst = new bst_1.Bst((a, b) => a.start.cmp(b.start));
        this.removal_bst = new bst_1.Bst((a, b) => a.start.cmp(b.start));
        this.vector_clock = new logoot_1.LogootInt();
    }
    insertLocal(position, len) {
        debug_1.debug.debug(`Insert into doc at ${position} + ${len}`);
        const nodes_lesser = this.ldoc_bst.getLteq({ known_position: position - 1 });
        const nodes_greater = this.ldoc_bst.getGteq({ known_position: position });
        let lesser;
        let greater;
        if (nodes_lesser.length > 1 || nodes_greater.length > 1) {
            throw new utils_1.FatalError('Corrupt BST. There are multiple nodes at a position.');
        }
        else {
            lesser = nodes_lesser[0] ? nodes_lesser[0].data : undefined;
            greater = nodes_greater[0] ? nodes_greater[0].data : undefined;
        }
        if (lesser && lesser.known_end_position < position) {
            throw new Error('Position cannot be added after the end of the document.');
        }
        if (lesser && lesser.length + lesser.known_position > position) {
            greater = new logoot_1.LogootNode();
            greater.length = lesser.known_end_position - position;
            lesser.length = position - lesser.known_position;
            greater.known_position = position;
            greater.start = lesser.start.offsetLowest(lesser.length);
            greater.rclk = new logoot_1.LogootInt(lesser.rclk);
            this.ldoc_bst.add(greater);
            this.logoot_bst.add(greater);
        }
        let left_position;
        let right_position;
        if (lesser) {
            left_position = lesser.end;
        }
        if (greater) {
            right_position = greater.start;
        }
        const node = new logoot_1.LogootNode();
        node.start = new logoot_1.LogootPosition(len, left_position, right_position);
        node.known_position = position;
        node.rclk = new logoot_1.LogootInt(this.vector_clock);
        node.length = len;
        this.ldoc_bst.operateOnAllGteq({ known_position: position }, (n) => {
            n.data.known_position += len;
        });
        this.ldoc_bst.add(node);
        this.logoot_bst.add(node);
        return {
            position: node.start,
            rclk: new logoot_1.LogootInt(this.vector_clock),
            length: len
        };
    }
    removeLocal(position, length) {
        debug_1.debug.debug(`Remove from doc at ${position} + ${length}`);
        const nodes = this.ldoc_bst
            .getRange({ known_position: position }, { known_position: position + length - 1 })
            .concat(this.ldoc_bst.getLteq({ known_position: position - 1 }))
            .sort((a, b) => a.data.known_position - b.data.known_position);
        const removals = [];
        let last_end;
        let cumulative_offset = 0;
        nodes.forEach(({ data }) => {
            let newlen = data.length;
            let newstart = data.start;
            if (data.known_position < position) {
                newlen -= position - data.known_position;
                newstart = newstart.offsetLowest(position - data.known_position);
            }
            if (data.known_position + data.length > position + length) {
                newlen -= data.known_position + data.length - (position + length);
            }
            if (newlen <= 0) {
                return;
            }
            if (last_end && last_end.cmp(newstart) === 0) {
                removals[removals.length - 1].length += newlen;
            }
            else {
                removals.push({
                    start: newstart,
                    length: newlen
                });
            }
            last_end = newstart.offsetLowest(newlen);
            if (data.known_position > position) {
                data.start = data.start.offsetLowest(data.known_position - position);
            }
            data.length -= newlen;
            data.known_position -= cumulative_offset;
            cumulative_offset += newlen;
            if (data.length <= 0) {
                this.logoot_bst.remove(data);
                this.ldoc_bst.remove(data);
            }
        });
        this.ldoc_bst.operateOnAllGteq({ known_position: position + length }, (n) => {
            n.data.known_position -= length;
        });
        const target_rclk = new logoot_1.LogootInt(this.vector_clock);
        this.vector_clock.add(1);
        return { removals, rclk: target_rclk };
    }
    insertLogoot(nstart, length, this_rclk) {
        debug_1.debug.debug(`Insert into doc at ${nstart.toString()} + ${length} @ ${this_rclk.toString()}`);
        if (this_rclk.cmp(this.vector_clock) > 0) {
            this.vector_clock = this_rclk;
            debug_1.debug.info(`Fast-forward vector clock to ${this_rclk.toString()}`);
        }
        const nodes = _mergeNode(this.logoot_bst, nstart, length, (node, conflict, lesser) => {
            if (node === lesser && lesser.start.levels < conflict.level) {
                return 0;
            }
            if (node.rclk.cmp(this_rclk) < 0) {
                return -1;
            }
            if (node.rclk.cmp(this_rclk) === 0) {
                debug_1.debug.info('Dropped conflicting node');
            }
            return 1;
        }, (node) => {
            this.ldoc_bst.add(node);
            this.logoot_bst.add(node);
        }, (node, pos, length, whole) => {
            if (whole) {
                this.ldoc_bst.remove(node);
                this.logoot_bst.remove(node);
            }
            this.removeLocal(pos, length);
            this.ldoc_bst.operateOnAllGteq({ known_position: pos }, (n) => {
                if (n.data === node) {
                    return;
                }
                n.data.known_position -= length;
            });
        });
        utils_1.arraymap(nodes, (node) => {
            let last_known_position = node.known_position;
            return _mergeNode(this.removal_bst, node.start, node.length, (node) => {
                if (node.rclk.cmp(this_rclk) < 0) {
                    return 0;
                }
                return 1;
            }, () => { }, () => { }).map((newnode) => {
                newnode.known_position = last_known_position;
                newnode.offset += node.offset;
                last_known_position += newnode.length;
                return newnode;
            });
        });
        const insertions = [];
        nodes.forEach((node) => {
            node.rclk = this_rclk;
            this.ldoc_bst.operateOnAllGteq(node, (n) => {
                if (n.data === node) {
                    return;
                }
                n.data.known_position += node.length;
            });
            const insertion = {
                known_position: node.known_position,
                offset: node.offset,
                length: node.length
            };
            insertions.push(insertion);
            this.ldoc_bst.add(node);
            this.logoot_bst.add(node);
        });
        return { insertions };
    }
    removeLogoot(start, length, rclk) {
        const new_rclk = new logoot_1.LogootInt(rclk).add(1);
        if (new_rclk.cmp(this.vector_clock) > 0) {
            this.vector_clock = new_rclk;
            debug_1.debug.info('Fast-forward vector clock to', JSON.stringify(new_rclk));
        }
        const end = start.offsetLowest(length);
        const level = start.levels;
        debug_1.debug.debug(`Remove from doc at ${start.toString()} + ${length} @ ${rclk.toString()}`);
        const removals = [];
        const nodes = _mergeNode(this.logoot_bst, start, length, (node) => {
            if (node.rclk.cmp(rclk) <= 0) {
                return -1;
            }
            return 1;
        }, (node) => {
            this.ldoc_bst.add(node);
            this.logoot_bst.add(node);
        }, (node, pos, length, whole) => {
            if (whole) {
                this.ldoc_bst.remove(node);
                this.logoot_bst.remove(node);
            }
            removals.push({ known_position: pos, length });
            this.ldoc_bst.operateOnAllGteq({ known_position: pos }, (n) => {
                if (n.data === node) {
                    return;
                }
                n.data.known_position -= length;
            });
        });
        nodes.push({
            start: end,
            end,
            length: 0,
            known_position: 0,
            known_end_position: 0,
            rclk: new logoot_1.LogootInt(),
            offset: 0
        });
        let last_end = start;
        nodes.forEach((n) => {
            const length = new logoot_1.LogootInt(n.end.l(level)).sub(last_end.l(level)).js_int;
            const nodes = _mergeNode(this.removal_bst, last_end, length, (node) => {
                if (node.rclk.cmp(rclk) < 0) {
                    return -1;
                }
                return 1;
            }, (node) => {
                this.removal_bst.add(node);
            }, (node, pos, length, whole) => {
                if (whole) {
                    this.removal_bst.remove(node);
                }
            });
            nodes.forEach((node) => {
                node.rclk = rclk;
                delete node.offset;
                this.removal_bst.add(node);
            });
            last_end = n.end;
        });
        return { removals };
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
class LogootNode {
    constructor(node) {
        this.known_position = 0;
        this.length = 0;
        this.start = new LogootPosition();
        this.rclk = new LogootInt(0);
        if (node) {
            Object.assign(this, {
                known_position: node.known_position,
                length: node.length,
                start: node.start.offsetLowest(new LogootInt()),
                rclk: new LogootInt(node.rclk)
            });
        }
    }
    get end() {
        return this.start.offsetLowest(this.length);
    }
    get known_end_position() {
        return this.known_position + this.length;
    }
    toString() {
        return (this.start.toString() +
            (typeof this.known_position === 'number'
                ? '(' + this.known_position + ')'
                : '') +
            ` + ${this.length} @ ${this.rclk}`);
    }
}
exports.LogootNode = LogootNode;


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


/***/ })

/******/ });
});
//# sourceMappingURL=logootish-js.js.map