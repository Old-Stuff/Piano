/*!
 * Fluid Infusion v1.5
 *
 * Infusion is distributed under the Educational Community License 2.0 and new BSD licenses: 
 * http://wiki.fluidproject.org/display/fluid/Fluid+Licensing
 *
 * For information on copyright, see the individual Infusion source code files: 
 * https://github.com/fluid-project/infusion/
 */

/*
Copyright 2007-2010 University of Cambridge
Copyright 2007-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley
Copyright 2010-2011 Lucendo Development Ltd.
Copyright 2010 OCAD University
Copyright 2011 Charly Molter

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

// Declare dependencies
/*global console, window, fluid:true, fluid_1_5:true, jQuery, opera, YAHOO*/

// JSLint options 
/*jslint white: true, funcinvoke: true, continue: true, jslintok: true, undef: true, newcap: true, nomen: true, regexp: true, bitwise: true, browser: true, forin: true, maxerr: 100, indent: 4 */

var fluid_1_5 = fluid_1_5 || {};
var fluid = fluid || fluid_1_5;

(function ($, fluid) {
    
    fluid.version = "Infusion 1.5";
    
    // Export this for use in environments like node.js, where it is useful for
    // configuring stack trace behaviour
    fluid.Error = Error;
    
    fluid.environment = {
        fluid: fluid
    };
    
    var globalObject = window || {};
    
    fluid.singleThreadLocal = function(initFunc) {
        var value = initFunc();
        return function() {
            return value;
        };
    };
    
    // Return to the old strategy of monkey-patching this, since this is a most frequently used function within IoC    
    fluid.threadLocal = fluid.singleThreadLocal;
    
    var softFailure = [false];
    
    // This function will be patched from FluidIoC.js in order to describe complex activities
    fluid.describeActivity = function () {
        return [];
    };
    
    /**
     * Causes an error message to be logged to the console and a real runtime error to be thrown.
     * 
     * @param {String|Error} message the error message to log
     * @param ... Additional arguments
     */
    fluid.fail = function (message /*, ... */) { // jslint:ok - whitespace in arg list
        fluid.setLogging(true);
        fluid.log.apply(null, ["ASSERTION FAILED: "].concat(fluid.makeArray(arguments)).concat(fluid.describeActivity()));
        if (softFailure[0]) {
            throw new Error(message);
        } else {
            message.fail(); // Intentionally cause a browser error by invoking a nonexistent function.
        }
    };
    
    fluid.pushSoftFailure = function (condition) {
        if (typeof (condition) === "boolean") {
            softFailure.unshift(condition);
        } else if (condition === -1) {
            softFailure.shift();
        }
    };
    
    fluid.notrycatch = false;
    
    // A wrapper for the try/catch/finally language feature, to aid debugging on environments
    // such as IE, where any try will destroy stack information for errors
    fluid.tryCatch = function (tryfun, catchfun, finallyfun) {
        finallyfun = finallyfun || fluid.identity;
        if (fluid.notrycatch) {
            var togo = tryfun();
            finallyfun();
            return togo;
        } else {
            try {
                return tryfun();  
            } catch (e) {
                if (catchfun) {
                    catchfun(e);
                } else { 
                    throw (e);
                }
            } finally {
                finallyfun();
            }
        }
    };
    
    // TODO: rescued from kettleCouchDB.js - clean up in time
    fluid.expect = function (name, members, target) {
        fluid.transform(fluid.makeArray(members), function (key) {
            if (typeof target[key] === "undefined") {
                fluid.fail(name + " missing required parameter " + key);
            }
        });
    };

    // Logging

    var logging;
        
    /** Returns whether logging is enabled **/
    fluid.isLogging = function () {
        return logging;
    };

    /** method to allow user to enable logging (off by default) */
    fluid.setLogging = function (enabled) {
        if (typeof enabled === "boolean") {
            logging = enabled;
        } else {
            logging = false;
        }
    };

    // On some dodgy environments (notably IE9 and recent alphas of Firebug 1.8), 
    // console.log/debug are incomplete function objects and need to be operated via
    // this trick: http://stackoverflow.com/questions/5472938/does-ie9-support-console-log-and-is-it-a-real-function
    fluid.applyHostFunction = function (obj, func, args) {
        if (func.apply) {
            func.apply(obj, args);
        } else {
            var applier = Function.prototype.bind.call(func, obj);
            applier.apply(obj, args);
        }
    };

    /** Log a message to a suitable environmental console. If the standard "console" 
     * stream is available, the message will be sent there - otherwise either the
     * YAHOO logger or the Opera "postError" stream will be used. Logging must first
     * be enabled with a call to the fluid.setLogging(true) function.
     */
    fluid.log = function (message /*, ... */) { // jslint:ok - whitespace in arg list
        if (logging) {
            var arg0 = fluid.renderTimestamp(new Date()) + ":  "; 
            var args = [arg0].concat(fluid.makeArray(arguments));
            var str = args.join("");
            if (typeof (console) !== "undefined") {
                if (console.debug) {
                    fluid.applyHostFunction(console, console.debug, args);
                } else if (typeof (console.log) === "function") {
                    fluid.applyHostFunction(console, console.log, args);
                } else {
                    console.log(str); // this branch executes on old IE, fully synthetic console.log
                }
            } else if (typeof (YAHOO) !== "undefined") {
                YAHOO.log(str);
            } else if (typeof (opera) !== "undefined") {
                opera.postError(str);
            }
        }
    };
     
    // Functional programming utilities.
               
    /** A basic utility that returns its argument unchanged */
    
    fluid.identity = function (arg) {
        return arg;
    };
    
    // Framework and instantiation functions.

    
    /** Returns true if the argument is a value other than null or undefined **/
    fluid.isValue = function (value) {
        return value !== undefined && value !== null;
    };
    
    /** Returns true if the argument is a primitive type **/
    fluid.isPrimitive = function (value) {
        var valueType = typeof (value);
        return !value || valueType === "string" || valueType === "boolean" || valueType === "number" || valueType === "function";
    };
    
    /** Determines whether the supplied object is an array. The strategy used is an optimised
     * approach taken from an earlier version of jQuery - detecting whether the toString() version
     * of the object agrees with the textual form [object Array], or else whether the object is a 
     * jQuery object (the most common source of "fake arrays").
     */
    fluid.isArrayable = function (totest) {
        return totest && (totest.jquery || Object.prototype.toString.call(totest) === "[object Array]");
    };
    
    fluid.isDOMNode = function (obj) {
      // This could be more sound, but messy: 
      // http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
        return obj && typeof (obj.nodeType) === "number";  
    };
    
    /** Return an empty container as the same type as the argument (either an
     * array or hash */
    fluid.freshContainer = function (tocopy) {
        return fluid.isArrayable(tocopy) ? [] : {};   
    };
    
    /** Performs a deep copy (clone) of its argument **/
    
    fluid.copy = function (tocopy) {
        if (fluid.isPrimitive(tocopy)) {
            return tocopy;
        }
        return $.extend(true, fluid.freshContainer(tocopy), tocopy);
    };
            
    /** Corrected version of jQuery makeArray that returns an empty array on undefined rather than crashing.
      * We don't deal with as many pathological cases as jQuery **/
    fluid.makeArray = function (arg) {
        var togo = [];
        if (arg !== null && arg !== undefined) {
            if (fluid.isPrimitive(arg) || typeof(arg.length) !== "number") {
                togo.push(arg); 
            }
            else {
                for (var i = 0; i < arg.length; ++ i) {
                    togo[i] = arg[i];
                }
            }
        }
        return togo;
    };
    
    function transformInternal(source, togo, key, args) {
        var transit = source[key];
        for (var j = 0; j < args.length - 1; ++j) {
            transit = args[j + 1](transit, key);
        }
        togo[key] = transit; 
    }
    
    /** Return a list or hash of objects, transformed by one or more functions. Similar to
     * jQuery.map, only will accept an arbitrary list of transformation functions and also
     * works on non-arrays.
     * @param source {Array or Object} The initial container of objects to be transformed.
     * @param fn1, fn2, etc. {Function} An arbitrary number of optional further arguments,
     * all of type Function, accepting the signature (object, index), where object is the
     * list member to be transformed, and index is its list index. Each function will be
     * applied in turn to each list member, which will be replaced by the return value
     * from the function.
     * @return The finally transformed list, where each member has been replaced by the
     * original member acted on by the function or functions.
     */
    fluid.transform = function (source) {
        var togo = fluid.freshContainer(source);
        if (fluid.isArrayable(source)) {
            for (var i = 0; i < source.length; ++i) {
                transformInternal(source, togo, i, arguments);
            }
        } else {
            for (var key in source) {
                transformInternal(source, togo, key, arguments);
            }
        }  
        return togo;
    };
    
    /** Better jQuery.each which works on hashes as well as having the arguments
     * the right way round. 
     * @param source {Arrayable or Object} The container to be iterated over
     * @param func {Function} A function accepting (value, key) for each iterated
     * object. This function may return a value to terminate the iteration
     */
    fluid.each = function (source, func) {
        if (fluid.isArrayable(source)) {
            for (var i = 0; i < source.length; ++i) {
                func(source[i], i);
            }
        } else {
            for (var key in source) {
                func(source[key], key);
            }
        }
    };
    
    /** Scan through a list or hash of objects, terminating on the first member which
     * matches a predicate function.
     * @param source {Arrayable or Object} The list or hash of objects to be searched.
     * @param func {Function} A predicate function, acting on a member. A predicate which
     * returns any value which is not <code>undefined</code> will terminate
     * the search. The function accepts (object, index).
     * @param deflt {Object} A value to be returned in the case no predicate function matches
     * a list member. The default will be the natural value of <code>undefined</code>
     * @return The first return value from the predicate function which is not <code>undefined</code>
     */
    fluid.find = function (source, func, deflt) {
        var disp;
        if (fluid.isArrayable(source)) {
            for (var i = 0; i < source.length; ++i) {
                disp = func(source[i], i);
                if (disp !== undefined) {
                    return disp;
                }
            }
        } else {
            for (var key in source) {
                disp = func(source[key], key);
                if (disp !== undefined) {
                    return disp;
                }
            }
        }
        return deflt;
    };
    
    /** Scan through a list of objects, "accumulating" a value over them 
     * (may be a straightforward "sum" or some other chained computation).
     * @param list {Array} The list of objects to be accumulated over.
     * @param fn {Function} An "accumulation function" accepting the signature (object, total, index) where
     * object is the list member, total is the "running total" object (which is the return value from the previous function),
     * and index is the index number.
     * @param arg {Object} The initial value for the "running total" object.
     * @return {Object} the final running total object as returned from the final invocation of the function on the last list member.
     */
    fluid.accumulate = function (list, fn, arg) {
        for (var i = 0; i < list.length; ++i) {
            arg = fn(list[i], arg, i);
        }
        return arg;
    };
    
    /** Can through a list of objects, removing those which match a predicate. Similar to
     * jQuery.grep, only acts on the list in-place by removal, rather than by creating
     * a new list by inclusion.
     * @param source {Array|Object} The list of objects to be scanned over.
     * @param fn {Function} A predicate function determining whether an element should be
     * removed. This accepts the standard signature (object, index) and returns a "truthy"
     * result in order to determine that the supplied object should be removed from the list.
     * @return The list, transformed by the operation of removing the matched elements. The
     * supplied list is modified by this operation.
     */
    fluid.remove_if = function (source, fn) {
        if (fluid.isArrayable(source)) {
            for (var i = 0; i < source.length; ++i) {
                if (fn(source[i], i)) {
                    source.splice(i, 1);
                    --i;
                }
            }
        } else {
            for (var key in source) {
                if (fn(source[key], key)) {
                    delete source[key];
                }
            }
        }
        return source;
    };
    
    /** Accepts an object to be filtered, and a list of keys. Either all keys not present in
     * the list are removed, or only keys present in the list are returned.
     * @param toFilter {Array|Object} The object to be filtered - this will be modified by the operation
     * @param keys {Array of String} The list of keys to operate with
     * @param exclude {boolean} If <code>true</code>, the keys listed are removed rather than included
     * @return the filtered object (the same object that was supplied as <code>toFilter</code>
     */
    
    fluid.filterKeys = function (toFilter, keys, exclude) {
        return fluid.remove_if($.extend({}, toFilter), function (value, key) {
            return exclude ^ ($.inArray(key, keys) === -1);
        });
    };
    
    /** A convenience wrapper for <code>fluid.filterKeys</code> with the parameter <code>exclude</code> set to <code>true</code>
     *  Returns the supplied object with listed keys removed */

    fluid.censorKeys = function (toCensor, keys) {
        return fluid.filterKeys(toCensor, keys, true);
    };
    
    fluid.makeFlatten = function (index) {
        return function (obj) {
            var togo = [];
            fluid.each(obj, function (value, key) {
                togo.push(arguments[index]);
            });
            return togo;
        }; 
    };
    
    /** Return the keys in the supplied object as an array **/
    fluid.keys = fluid.makeFlatten(1); 
    
    /** Return the values in the supplied object as an array **/
    fluid.values = fluid.makeFlatten(0);
    
    /** 
     * Searches through the supplied object, and returns <code>true</code> if the supplied value
     * can be found 
     */
    fluid.contains = function (obj, value) {
        return obj ? fluid.find(obj, function (thisValue, key) {
            if (value === thisValue) {
                return true;
            }
        }) : undefined;
    };
    
    /** 
     * Searches through the supplied object for the first value which matches the one supplied.
     * @param obj {Object} the Object to be searched through
     * @param value {Object} the value to be found. This will be compared against the object's
     * member using === equality.
     * @return {String} The first key whose value matches the one supplied, or <code>null</code> if no
     * such key is found.
     */
    fluid.keyForValue = function (obj, value) {
        return fluid.find(obj, function (thisValue, key) {
            if (value === thisValue) {
                return key;
            }
        });
    };
    
    /**
     * This method is now deprecated and will be removed in a future release of Infusion. 
     * See fluid.keyForValue instead.
     */
    fluid.findKeyInObject = fluid.keyForValue;
    
    /** Converts an array into an object whose keys are the elements of the array, each with the value "true"
     */ 
    
    fluid.arrayToHash = function (array) {
        var togo = {};
        fluid.each(array, function (el) {
            togo[el] = true;
        });
        return togo;
    };
    
    /** 
     * Clears an object or array of its contents. For objects, each property is deleted.
     * 
     * @param {Object|Array} target the target to be cleared
     */
    fluid.clear = function (target) {
        if (fluid.isArrayable(target)) {
            target.length = 0;
        } else {
            for (var i in target) {
                delete target[i];
            }
        }
    };
    
   /**
    * @param boolean ascending <code>true</code> if a comparator is to be returned which 
    * sorts strings in descending order of length
    */
    fluid.compareStringLength = function (ascending) {
        return ascending ? function (a, b) {
            return a.length - b.length;
        } : function (a, b) {
            return b.length - a.length;
        };
    };
        
    // Model functions
    fluid.model = {}; // cannot call registerNamespace yet since it depends on fluid.model
       
    /** Another special "marker object" representing that a distinguished 
     * (probably context-dependent) value should be substituted.
     */
    fluid.VALUE = {type: "fluid.marker", value: "VALUE"};
    
    /** Another special "marker object" representing that no value is present (where
     * signalling using the value "undefined" is not possible) */
    fluid.NO_VALUE = {type: "fluid.marker", value: "NO_VALUE"};
    
    /** A marker indicating that a value requires to be expanded after component construction begins **/
    fluid.EXPAND = {type: "fluid.marker", value: "EXPAND"};
    /** A marker indicating that a value requires to be expanded immediately**/
    fluid.EXPAND_NOW = {type: "fluid.marker", value: "EXPAND_NOW"};
    
    /** Determine whether an object is any marker, or a particular marker - omit the
     * 2nd argument to detect any marker
     */
    fluid.isMarker = function (totest, type) {
        if (!totest || typeof (totest) !== 'object' || totest.type !== "fluid.marker") {
            return false;
        }
        if (!type) {
            return true;
        }
        return totest === type;
    };
   
    /** Copy a source "model" onto a target **/
    fluid.model.copyModel = function (target, source) {
        fluid.clear(target);
        $.extend(true, target, source);
    };
    
    /** Parse an EL expression separated by periods (.) into its component segments.
     * @param {String} EL The EL expression to be split
     * @return {Array of String} the component path expressions.
     * TODO: This needs to be upgraded to handle (the same) escaping rules (as RSF), so that
     * path segments containing periods and backslashes etc. can be processed, and be harmonised
     * with the more complex implementations in fluid.pathUtil(data binding).
     */
    fluid.model.parseEL = function (EL) {
        return EL === "" ? [] : String(EL).split('.');
    };
    
    /** Compose an EL expression from two separate EL expressions. The returned 
     * expression will be the one that will navigate the first expression, and then
     * the second, from the value reached by the first. Either prefix or suffix may be
     * the empty string **/
    
    fluid.model.composePath = function (prefix, suffix) {
        return prefix === "" ? suffix : (suffix === "" ? prefix : prefix + "." + suffix);
    };
    
    /** Compose any number of path segments, none of which may be empty **/
    fluid.model.composeSegments = function () {
        return fluid.makeArray(arguments).join(".");
    };
    
    /** Helpful alias for old-style API **/
    fluid.path = fluid.model.composeSegments;
    fluid.composePath = fluid.model.composePath;


    // unsupported, NON-API function
    fluid.requireDataBinding = function () {
        fluid.fail("Please include DataBinding.js in order to operate complex model accessor configuration");  
    };
    
    fluid.model.trundle = fluid.model.getPenultimate = fluid.requireDataBinding;
    
    // unsupported, NON-API function
    fluid.model.resolvePathSegment = function (root, segment, create, origEnv) {
        if (!origEnv && root.resolvePathSegment) {
            return root.resolvePathSegment(segment);
        }
        if (create && root[segment] === undefined) {
            // This optimisation in this heavily used function has a fair effect
            return root[segment] = {};
        }
        return root[segment];
    };
    
    // unsupported, NON-API function
    fluid.model.getPenultimateSimple = function (root, EL, environment, create) {
        var origEnv = environment;
        var segs = fluid.model.parseEL(EL);
        for (var i = 0; i < segs.length - 1; ++i) {
            if (!root) {
                return {root: root };
            }
            var segment = segs[i];
            if (environment && environment[segment]) {
                root = environment[segment];
                environment = null;
            } else {
                root = fluid.model.resolvePathSegment(root, segment, create, origEnv);
            }
        }
        return {root: root, last: segs[segs.length - 1]};
    };
    
    fluid.model.setSimple = function (root, EL, newValue, environment) {
        var pen = fluid.model.getPenultimateSimple(root, EL, environment, true);
        pen.root[pen.last] = newValue;
    };
    
    /** Evaluates an EL expression by fetching a dot-separated list of members
     * recursively from a provided root.
     * @param root The root data structure in which the EL expression is to be evaluated
     * @param {string} EL The EL expression to be evaluated
     * @param environment An optional "environment" which, if it contains any members
     * at top level, will take priority over the root data structure.
     * @return The fetched data value.
     */
    
    fluid.model.getSimple = function (root, EL, environment) {
        if (EL === "" || EL === null || EL === undefined) {
            return root;
        }
        var pen = fluid.model.getPenultimateSimple(root, EL, environment);
        return pen.root ? pen.root[pen.last] : pen.root;
    };
    
    // unsupported, NON-API function
    // Returns undefined to signal complex configuration which needs to be farmed out to DataBinding.js
    // any other return represents an environment value AND a simple configuration we can handle here
    fluid.decodeAccessorArg = function (arg3) {
        return (!arg3 || arg3 === fluid.model.defaultGetConfig || arg3 === fluid.model.defaultSetConfig) ? 
            null : (arg3.type === "environment" ? arg3.value : undefined);
    };
    
    fluid.set = function (root, EL, newValue, config) {
        var env = fluid.decodeAccessorArg(config);
        if (env === undefined) {
            var trundler = fluid.model.getPenultimate(root, EL, config);
            trundler.root[trundler.last] = newValue;
        } else {
            fluid.model.setSimple(root, EL, newValue, env);
        }
    };
    
    /** Evaluates an EL expression by fetching a dot-separated list of members
     * recursively from a provided root.
     * @param root The root data structure in which the EL expression is to be evaluated
     * @param {string} EL The EL expression to be evaluated
     * @param environment An optional "environment" which, if it contains any members
     * at top level, will take priority over the root data structure.
     * @return The fetched data value.
     */
    
    fluid.get = function (root, EL, config) {
        var env = fluid.decodeAccessorArg(config);
        return env === undefined ? 
            fluid.model.trundle(root, EL, config).root 
            : fluid.model.getSimple(root, EL, env);
    };

    // This backward compatibility will be maintained for a number of releases, probably until Fluid 2.0
    fluid.model.setBeanValue = fluid.set;
    fluid.model.getBeanValue = fluid.get;
    
    fluid.getGlobalValue = function (path, env) {
        if (path) {
            env = env || fluid.environment;
            return fluid.get(globalObject, path, {type: "environment", value: env});
        }
    };
    
    /**
     * Allows for the calling of a function from an EL expression "functionPath", with the arguments "args", scoped to an framework version "environment".
     * @param {Object} functionPath - An EL expression
     * @param {Object} args - An array of arguments to be applied to the function, specified in functionPath
     * @param {Object} environment - (optional) The object to scope the functionPath to  (typically the framework root for version control)
     */
    fluid.invokeGlobalFunction = function (functionPath, args, environment) {
        var func = fluid.getGlobalValue(functionPath, environment);
        if (!func) {
            fluid.fail("Error invoking global function: " + functionPath + " could not be located");
        } else {
            return func.apply(null, args);
        }
    };
    
    /** Registers a new global function at a given path (currently assumes that
     * it lies within the fluid namespace)
     */
    
    fluid.registerGlobalFunction = function (functionPath, func, env) {
        env = env || fluid.environment;
        fluid.set(globalObject, functionPath, func, {type: "environment", value: env});
    };
    
    fluid.setGlobalValue = fluid.registerGlobalFunction;
    
    /** Ensures that an entry in the global namespace exists **/
    fluid.registerNamespace = function (naimspace, env) {
        env = env || fluid.environment;
        var existing = fluid.getGlobalValue(naimspace, env);
        if (!existing) {
            existing = {};
            fluid.setGlobalValue(naimspace, existing, env);
        }
        return existing;
    };
    
    // stubs for two functions in FluidDebugging.js
    fluid.dumpEl = fluid.identity;
    fluid.renderTimestamp = fluid.identity;
    
    
    /*** The Model Events system. ***/
    
    fluid.registerNamespace("fluid.event");
    
    fluid.generateUniquePrefix = function () {
        return (Math.floor(Math.random() * 1e12)).toString(36) + "-";
    };
    
    var fluid_prefix = fluid.generateUniquePrefix(); 
    
    var fluid_guid = 1;
    
    /** Allocate an string value that will be very likely unique within this Fluid scope (frame or process) **/
    
    fluid.allocateGuid = function () {
        return fluid_prefix + (fluid_guid++);
    };
    
    fluid.event.identifyListener = function (listener) {
        if (typeof (listener) === "string") {
            return listener; 
        }
        if (!listener.$$guid) {
            listener.$$guid = fluid.allocateGuid();
        }
        return listener.$$guid;
    };
    
    // unsupported, NON-API function
    fluid.event.mapPriority = function (priority, count) {
        return (priority === null || priority === undefined ? -count : 
           (priority === "last" ? -Number.MAX_VALUE :
              (priority === "first" ? Number.MAX_VALUE : priority)));
    };
    
    // unsupported, NON-API function
    fluid.event.listenerComparator = function (recA, recB) {
        return recB.priority - recA.priority;
    };
    
    // unsupported, NON-API function
    fluid.event.sortListeners = function (listeners) {
        var togo = [];
        fluid.each(listeners, function (listener) {
            togo.push(listener);
        });
        return togo.sort(fluid.event.listenerComparator);
    };
    
    // unsupported, NON-API function
    fluid.event.resolveListener = function (listener) {
        if (typeof (listener) === "string") {
            var listenerFunc = fluid.getGlobalValue(listener);
            if (!listenerFunc) {
                fluid.fail("Unable to look up name " + listener + " as a global function"); 
            } else {
                listener = listenerFunc;
            }
        }
        return listener;
    };
    
    fluid.event.nameEvent = function (that, eventName) {
        return eventName + " of " + fluid.nameComponent(that);
    };
    
    /** Construct an "event firer" object which can be used to register and deregister 
     * listeners, to which "events" can be fired. These events consist of an arbitrary
     * function signature. General documentation on the Fluid events system is at
     * http://wiki.fluidproject.org/display/fluid/The+Fluid+Event+System .
     * @param {Boolean} unicast If <code>true</code>, this is a "unicast" event which may only accept
     * a single listener.
     * @param {Boolean} preventable If <code>true</code> the return value of each handler will 
     * be checked for <code>false</code> in which case further listeners will be shortcircuited, and this
     * will be the return value of fire()
     */
    // This name will be deprecated in Fluid 2.0 for fluid.makeEventFirer (or fluid.eventFirer)
    fluid.event.getEventFirer = function (unicast, preventable, name) {
        var listeners = {};
        var sortedListeners = [];
        
        function fireToListeners(listeners, args, wrapper) {
            fluid.log("Firing event " + name + " to list of " + listeners.length + " listeners");
            for (var i = 0; i < listeners.length; ++i) {
                var lisrec = listeners[i];
                lisrec.listener = fluid.event.resolveListener(lisrec.listener);
                var listener = lisrec.listener;

                if (lisrec.predicate && !lisrec.predicate(listener, args)) {
                    continue;
                }
                var value = fluid.tryCatch(function () {
                    var ret = (wrapper ? wrapper(listener) : listener).apply(null, args);
                    if (preventable && ret === false) {
                        return false;
                    }
                    if (unicast) {
                        return ret;
                    }
                }, function (e) { // jslint:ok - function within a loop, only invoked synchronously
                    fluid.log("FireEvent received exception " + e.message + " e " + e + " firing to listener " + i);
                    throw (e);       
                }); // jslint:ok - function within loop
                if (value !== undefined) {
                    return value;
                }
            }
        }
        
        return {
            name: name,
            typeName: "fluid.event.firer", 
            addListener: function (listener, namespace, predicate, priority) {
                if (!listener) {
                    return;
                }
                if (unicast) {
                    namespace = "unicast";
                }
                if (!namespace) {
                    namespace = fluid.event.identifyListener(listener);
                }

                listeners[namespace] = {listener: listener, predicate: predicate, priority: 
                    fluid.event.mapPriority(priority, sortedListeners.length)};
                sortedListeners = fluid.event.sortListeners(listeners);
            },

            removeListener: function (listener) {
                if (typeof (listener) === 'string') {
                    delete listeners[listener];
                } else if (listener.$$guid) {
                    delete listeners[listener.$$guid];
                }
                sortedListeners = fluid.event.sortListeners(listeners);
            },
            // NB - this method exists currently solely for the convenience of the new,
            // transactional changeApplier. As it exists it is hard to imagine the function
            // being helpful to any other client. We need to get more experience on the kinds
            // of listeners that are useful, and ultimately factor this method away.
            fireToListeners: function (listeners, args, wrapper) {
                return fireToListeners(listeners, args, wrapper);
            },
            fire: function () {
                return fireToListeners(sortedListeners, arguments);
            }
        };
    };
    
    fluid.makeEventFirer = fluid.event.getEventFirer;
    
    /** Fire the specified event with supplied arguments. This call is an optimisation utility
     * which handles the case where the firer has not been instantiated (presumably as a result
     * of having no listeners registered 
     */
     
    fluid.fireEvent = function (firer, args) {
        if (firer) {
            firer.fire.apply(null, fluid.makeArray(args));
        }  
    };
    
    // unsupported, NON-API function
    fluid.event.addListenerToFirer = function (firer, value, namespace) {
        if (fluid.isArrayable(value)) {
            for (var i = 0; i < value.length; ++i) {
                fluid.event.addListenerToFirer(firer, value[i], namespace); 
            }
        } else if (typeof (value) === "function" || typeof (value) === "string") {
            firer.addListener(value, namespace);
        } else if (value && typeof (value) === "object") {
            firer.addListener(value.listener, namespace || value.namespace, value.predicate, value.priority);
        }
    };
    
    fluid.event.resolveListenerRecord = fluid.identity; // non-IOC passthrough
    
    // unsupported, NON-API function
    fluid.mergeListeners = function (that, events, listeners) {
        fluid.each(listeners, function (value, key) {
            var firer, namespace;
            if (key.charAt(0) === "{") {
                if (!fluid.expandOptions) {
                    fluid.fail("fluid.expandOptions could not be loaded - please include FluidIoC.js in order to operate IoC-driven event with descriptor " + 
                        key);
                }
                firer = fluid.expandOptions(key, that);
            } else {
                var keydot = key.indexOf(".");
            
                if (keydot !== -1) {
                    namespace = key.substring(keydot + 1);
                    key = key.substring(0, keydot);
                }
                if (!events[key]) {
                    fluid.fail("Listener registered for event " + key + " which is not defined for this component");
                    events[key] = fluid.makeEventFirer(null, null, fluid.event.nameEvent(that, key));
                }
                firer = events[key];
            }
            value = fluid.event.resolveListenerRecord(value, that, key);
            fluid.event.addListenerToFirer(firer, value, namespace);
        });
    };
    
    function initEvents(that, events, pass) {
        fluid.each(events, function (eventSpec, eventKey) { 
            var isIoCEvent = eventSpec && (typeof (eventSpec) !== "string" || eventSpec.charAt(0) === "{");
            var event;
            if (isIoCEvent && pass === "IoC") {
                if (!fluid.event.resolveEvent) {
                    fluid.fail("fluid.event.resolveEvent could not be loaded - please include FluidIoC.js in order to operate IoC-driven event with descriptor ", 
                        eventSpec);
                } else {
                    event = fluid.event.resolveEvent(that, eventKey, eventSpec);
                }
            } else if (pass === "flat") {
                event = fluid.makeEventFirer(eventSpec === "unicast", eventSpec === "preventable", fluid.event.nameEvent(that, eventKey));
            }
            if (event) {
                that.events[eventKey] = event;
            } 
        });
    }
    
    // unsupported, NON-API function
    fluid.instantiateFirers = function (that, options) {
        that.events = {};
        // TODO: manual 2-phase instantiation since we have no GINGER WORLD
        initEvents(that, options.events, "flat"); 
        initEvents(that, options.events, "IoC");
        // TODO: manually expand these late so that members attached to ourselves with preInitFunction can be detected
        //var listeners = fluid.expandOptions ? fluid.expandOptions(options.listeners, that) : options.listeners;
        fluid.mergeListeners(that, that.events, options.listeners);
    };
    
    fluid.mergeListenerPolicy = function (target, source, key) {
        // cf. triage in mergeListeners
        var hasNamespace = key.charAt(0) !== "{" && key.indexOf(".") !== -1; 
        return hasNamespace ? (source ? source : target) 
            : fluid.makeArray(target).concat(fluid.makeArray(source));
    };
    
    fluid.mergeListenersPolicy = function (target, source) {
        target = target || {};
        fluid.each(source, function (listeners, key) {
            target[key] = fluid.mergeListenerPolicy(target[key], listeners, key);
        });
        return target;
    };
    
    /*** DEFAULTS AND OPTIONS MERGING SYSTEM ***/
    
    var defaultsStore = {};
        
    var resolveGradesImpl = function (gs, gradeNames) {
        gradeNames = fluid.makeArray(gradeNames);
        fluid.each(gradeNames, function (gradeName) {
            var options = fluid.rawDefaults(gradeName) || {};
            gs.gradeHash[gradeName] = true;
            gs.gradeChain.push(gradeName);
            gs.optionsChain.push(options);
            var oGradeNames = fluid.makeArray(options.gradeNames);
            fluid.each(oGradeNames, function (parent) {
                if (!gs.gradeHash[parent]) {
                    resolveGradesImpl(gs, parent);
                }
            });
        });
        return gs;
    };
    
    // unsupported, NON-API function
    fluid.resolveGradeStructure = function (gradeNames) {
        var gradeStruct = {
            gradeChain: [],
            gradeHash: {},
            optionsChain: []
        };
        return resolveGradesImpl(gradeStruct, gradeNames);
    };
        
    var mergedDefaultsCache = {};
    
    fluid.gradeNamesToKey = function (gradeNames, defaultName) {
        return defaultName + "|" + fluid.makeArray(gradeNames).sort().join("|");
    };
    
    // unsupported, NON-API function
    fluid.resolveGrade = function (defaults, defaultName, gradeNames) {
        var mergeArgs = [defaults];
        if (gradeNames) {
            var gradeStruct = fluid.resolveGradeStructure(gradeNames);
            mergeArgs = gradeStruct.optionsChain.reverse().concat(mergeArgs).concat({gradeNames: gradeStruct.gradeChain});
        }
        var mergePolicy = {};
        for (var i = 0; i < mergeArgs.length; ++ i) {
            mergePolicy = $.extend(true, mergePolicy, mergeArgs[i].mergePolicy);
        }
        mergeArgs = [mergePolicy, {}].concat(mergeArgs);
        var mergedDefaults = fluid.merge.apply(null, mergeArgs);
        return mergedDefaults;  
    };
    
    fluid.getGradedDefaults = function (defaults, defaultName, gradeNames) {
        var key = fluid.gradeNamesToKey(gradeNames, defaultName);
        var mergedDefaults = mergedDefaultsCache[key];
        if (!mergedDefaults) {
            mergedDefaults = mergedDefaultsCache[key] = fluid.resolveGrade(defaults, defaultName, gradeNames);
        }
        return mergedDefaults;
    };

    // unsupported, NON-API function
    fluid.resolveGradedOptions = function (componentName) {
        var defaults = fluid.rawDefaults(componentName);
        if (!defaults) {
            return defaults;
        } else {
            return fluid.getGradedDefaults(defaults, componentName, defaults.gradeNames);
        }
    };
    
    // unsupported, NON-API function
    fluid.rawDefaults = function (componentName, options) {
        if (options === undefined) {
            return defaultsStore[componentName];
        } else {
            defaultsStore[componentName] = options;
        }
    };
    
        
    fluid.hasGrade = function (options, gradeName) {
        return !options || !options.gradeNames ? false : fluid.contains(options.gradeNames, gradeName);
    };
    
     /**
     * Retrieves and stores a component's default settings centrally.
     * @param {boolean} (options) if true, manipulate a global option (for the head
     *   component) rather than instance options. NB - the use of "global options" 
     *   is deprecated and will be removed from the framework in release 1.5 
     * @param {String} componentName the name of the component
     * @param {Object} (optional) an container of key/value pairs to set
     */
     
    fluid.defaults = function () {
        var offset = 0;
        if (typeof arguments[0] === "boolean") {
            offset = 1;
        }
        var componentName = (offset === 0 ? "" : "*.global-") + arguments[offset];
        var options = arguments[offset + 1];
        if (options === undefined) {
            return fluid.resolveGradedOptions(componentName);
        } else {
            if (options && options.options) {
                fluid.fail("Probable error in options structure for " + componentName + " with option named \"options\" - perhaps you meant to write these options at top level in fluid.defaults? - ", options);  
            }
            fluid.rawDefaults(componentName, options);
            if (fluid.hasGrade(options, "autoInit")) {
                fluid.makeComponent(componentName, fluid.resolveGradedOptions(componentName));
            }
        }
    };
    
    fluid.makeComponent = function (componentName, options) {
        if (!options.initFunction || !options.gradeNames) {
            fluid.fail("Cannot autoInit component " + componentName + " which does not have an initFunction and gradeName defined");
        }
        var creator = function () {
            return fluid.initComponent(componentName, arguments);
        };
        var existing = fluid.getGlobalValue(componentName);
        if (existing) {
            $.extend(creator, existing);
        }
        fluid.setGlobalValue(componentName, creator);
    };
        
    fluid.makeComponents = function (components, env) {
        fluid.each(components, function (value, key) {
            var options = {
                gradeNames: fluid.makeArray(value).concat(["autoInit"])
            };
            fluid.defaults(key, options);
        });
    };
    
    // The base system grade definitions
    
    fluid.defaults("fluid.function", {});
    
    fluid.lifecycleFunctions = {
        preInitFunction: true,
        postInitFunction: true,
        finalInitFunction: true
    };
    
    fluid.rootMergePolicy = fluid.transform(fluid.lifecycleFunctions, function () {
        return fluid.mergeListenerPolicy;
    });
    
    fluid.defaults("fluid.littleComponent", {
        initFunction: "fluid.initLittleComponent",
        mergePolicy: fluid.rootMergePolicy,
        argumentMap: {
            options: 0
        }
    });
    
    fluid.defaults("fluid.eventedComponent", {
        gradeNames: ["fluid.littleComponent"],
        mergePolicy: {
            listeners: fluid.mergeListenersPolicy
        }
    });
    
        
    fluid.preInitModelComponent = function (that) {
        that.model = that.options.model || {};
        that.applier = that.options.applier || (fluid.makeChangeApplier ? fluid.makeChangeApplier(that.model, that.options.changeApplierOptions) : null);
    };
    
    fluid.defaults("fluid.modelComponent", {
        gradeNames: ["fluid.littleComponent"],
        preInitFunction: {
            namespace: "preInitModelComponent",
            listener: "fluid.preInitModelComponent"
        },
        mergePolicy: {
            model: "preserve",
            applier: "nomerge"
        }
    });

    /** Generate a name for a component for debugging purposes */    
    fluid.nameComponent = function (that) {
        return that ? "component with typename " + that.typeName + " and id " + that.id : "[unknown component]";
    };
    
    // unsupported, NON-API function
    fluid.guardCircularity = function (seenIds, source, message1, message2) {
        if (source && source.id) {
            if (!seenIds[source.id]) {
                seenIds[source.id] = source;
            } else if (seenIds[source.id] === source) {
                fluid.fail("Circularity in options " + message1 + " - " + fluid.nameComponent(source)
                    + " has already been seen" + message2);  
            }
        }      
    };

    // TODO: so far, profiling does not suggest that this implementation is a performance risk, but we really should start
    // "precompiling" these.
    // unsupported, NON-API function                
    fluid.mergePolicyIs = function (policy, test) {
        return typeof (policy) === "string" && $.inArray(test, policy.split(/\s*,\s*/)) !== -1;
    };

    // Cheapskate implementation which avoids dependency on DataBinding.js    
    fluid.model.mergeModel = function (target, source, applier) {
        if (!fluid.isPrimitive(target)) {
            var copySource = fluid.copy(source);
            $.extend(true, source, target);
            $.extend(true, source, copySource);
        }
        return source; 
    };

    function mergeImpl(policy, basePath, target, source, thisPolicy, rec) {
        if (fluid.isTracing) {
            fluid.tracing.pathCount.push(basePath);
        }
        if (fluid.mergePolicyIs(thisPolicy, "replace")) {
            fluid.clear(target);
        }
        fluid.guardCircularity(rec.seenIds, source, "merging", " when evaluating path " + basePath + " - please protect components from merging using the \"nomerge\" merge policy");
      
        for (var name in source) {
            var path = (basePath ? basePath + "." : "") + name;
            var newPolicy = policy && typeof (policy) !== "string" ? policy[path] : policy;
            var funcPolicy = typeof (newPolicy) === "function";
            var thisTarget = target[name];
            var thisSource = source[name];
            var primitiveTarget = fluid.isPrimitive(thisTarget);
    
            if (thisSource !== undefined) {
                if (!funcPolicy && thisSource !== null && typeof (thisSource) === "object" &&
                        !fluid.isDOMNode(thisSource) && !thisSource.jquery && thisSource !== fluid.VALUE &&
                        !fluid.mergePolicyIs(newPolicy, "preserve") && !fluid.mergePolicyIs(newPolicy, "nomerge")) {
                    if (primitiveTarget) {
                        target[name] = thisTarget = fluid.freshContainer(thisSource);
                    }
                    mergeImpl(policy, path, thisTarget, thisSource, newPolicy, rec);
                } else {
                    if (funcPolicy) {
                        target[name] = newPolicy.call(null, thisTarget, thisSource, name);
                    } else if (!fluid.isValue(thisTarget) || !fluid.mergePolicyIs(newPolicy, "reverse")) {
                        // TODO: When "grades" are implemented, grandfather in any paired applier to perform these operations
                        // NB: mergePolicy of "preserve" now creates dependency on DataBinding.js
                        target[name] = fluid.isValue(thisTarget) && fluid.mergePolicyIs(newPolicy, "preserve") ? fluid.model.mergeModel(thisTarget, thisSource) : thisSource;
                    }
                }
            }
        }
        return target;
    }

    // TODO: deprecate this method of detecting default value merge policies before 1.5 in favour of 
    // explicit typed records a la ModelTransformations
    // unsupported, NON-API function
    fluid.isDefaultValueMergePolicy = function (policy) {
        return typeof(policy) === "string"
            && (policy.indexOf(",") === -1 && !/replace|preserve|nomerge|noexpand|reverse/.test(policy));
    };
    
    // unsupported, NON-API function
    fluid.applyDefaultValueMergePolicy = function (defaults, merged) {
        var policy = merged.mergePolicy;
        if (policy && typeof (policy) !== "string") {
            for (var key in policy) {
                var elrh = policy[key];
                if (fluid.isDefaultValueMergePolicy(elrh)) {
                    var defaultTarget = fluid.get(defaults, key);
                    var mergedTarget = fluid.get(merged, key);
                 // TODO: this implementation is faulty since it will trigger if a user modifies a source value to its default value
                 // - and also will still copy over a target if user modifies it to its default value
                 // probably needs FLUID-4392 for a proper fix since the algorithm will need a fundamental change to progress from
                 // R2L rather than L2R (is that even possible!)
                    if (defaultTarget === mergedTarget) {
                        var defaultSource = fluid.get(defaults, elrh);
                        var mergedSource = fluid.get(merged, elrh);
                        // NB: This line represents a change in policy - will not apply default value policy to defaults themselves
                        if (defaultSource !== mergedSource) {
                            fluid.set(merged, key, mergedSource);
                        }
                    }
                }
            }
        }
        return merged;
    };
    
    /** Merge a collection of options structures onto a target, following an optional policy.
     * This function is typically called automatically, as a result of an invocation of
     * <code>fluid.initLittleComponent</code>. The behaviour of this function is explained more fully on
     * the page http://wiki.fluidproject.org/display/fluid/Options+Merging+for+Fluid+Components .
     * @param policy {Object/String} A "policy object" specifiying the type of merge to be performed.
     * If policy is of type {String} it should take on the value "reverse" or "replace" representing
     * a static policy. If it is an
     * Object, it should contain a mapping of EL paths onto these String values, representing a
     * fine-grained policy. If it is an Object, the values may also themselves be EL paths 
     * representing that a default value is to be taken from that path.
     * @param target {Object} The options structure which is to be modified by receiving the merge results.
     * @param options1, options2, .... {Object} an arbitrary list of options structure which are to
     * be merged "on top of" the <code>target</code>. These will not be modified.    
     */
    
    fluid.merge = function (policy, target) {
        var path = "";
        
        for (var i = 2; i < arguments.length; ++i) {
            var source = arguments[i];
            if (source !== null && source !== undefined) {
                mergeImpl(policy, path, target, source, policy ? policy[""] : null, {seenIds: {}});
            }
        }
        return target;     
    };

    // unsupported, NON-API function
    fluid.transformOptions = function (mergeArgs, transRec) {
        fluid.expect("Options transformation record", ["transformer", "config"], transRec);
        var transFunc = fluid.getGlobalValue(transRec.transformer);
        var togo = fluid.transform(mergeArgs, function (value, key) {
            return key === 0 ? value : transFunc.call(null, value, transRec.config);
        });
        return togo;
    };
    
    // unsupporter, NON-API function
    fluid.lastTransformationRecord = function (extraArgs) {
        for (var i = extraArgs.length - 1; i >= 0; --i) {
            if (extraArgs[i] && extraArgs[i].transformOptions) {
                return extraArgs[i].transformOptions;
            } 
        }
    };

    /**
     * Merges the component's declared defaults, as obtained from fluid.defaults(),
     * with the user's specified overrides.
     * 
     * @param {Object} that the instance to attach the options to
     * @param {String} componentName the unique "name" of the component, which will be used
     * to fetch the default options from store. By recommendation, this should be the global
     * name of the component's creator function.
     * @param {Object} userOptions the user-specified configuration options for this component
     */
    // unsupported, NON-API function
    fluid.mergeComponentOptions = function (that, componentName, userOptions, localOptions) {
        var defaults = fluid.defaults(componentName) || {};
        var mergePolicy = $.extend({}, fluid.rootMergePolicy, defaults.mergePolicy);
        var defaultGrades = defaults.gradeNames;

        localOptions = defaultGrades ? {} : fluid.copy(fluid.getGradedDefaults({}, "", localOptions.gradeNames));
        var mergeArgs = [mergePolicy, localOptions];
        
        var extraArgs;
        if (fluid.expandComponentOptions) {
            extraArgs = fluid.expandComponentOptions(defaults, userOptions, that);
        } else {
            extraArgs = [defaults, userOptions];
        }
        var transRec = fluid.lastTransformationRecord(extraArgs);
        if (transRec) {
            extraArgs = fluid.transformOptions(extraArgs, transRec);
        }
        mergeArgs = mergeArgs.concat(extraArgs);
        var merged = fluid.merge.apply(null, mergeArgs);
        merged = fluid.applyDefaultValueMergePolicy(defaults, merged);
        that.options = merged;
    };
    
    // The Fluid Component System proper   
            
    /** A special "marker object" which is recognised as one of the arguments to 
     * fluid.initSubcomponents. This object is recognised by reference equality - 
     * where it is found, it is replaced in the actual argument position supplied
     * to the specific subcomponent instance, with the particular options block
     * for that instance attached to the overall "that" object.
     * NOTE: The use of this marker has been deprecated as of the Fluid 1.4 release in 
     * favour of the contextual EL path "{options}" - it will be removed in a future
     * release of the framework.
     */
    fluid.COMPONENT_OPTIONS = {type: "fluid.marker", value: "COMPONENT_OPTIONS"};
    
    /** Construct a dummy or "placeholder" subcomponent, that optionally provides empty
     * implementations for a set of methods.
     */
    fluid.emptySubcomponent = function (options) {
        var that = {};
        options = $.makeArray(options);
        var empty = function () {};
        for (var i = 0; i < options.length; ++i) {
            that[options[i]] = empty;
        }
        return that;
    };
    
    /** Compute a "nickname" given a fully qualified typename, by returning the last path
     * segment.
     */
    
    fluid.computeNickName = function (typeName) {
        var segs = fluid.model.parseEL(typeName);
        return segs[segs.length - 1];
    };
        
    /** Create a "type tag" component with no state but simply a type name and id. The most 
     *  minimal form of Fluid component */
       
    fluid.typeTag = function (name) {
        return name ? {
            typeName: name,
            id: fluid.allocateGuid()
        } : null;
    };
    
    /** A combined "component and grade name" which allows type tags to be declaratively constructed
     * from options material */
    
    fluid.typeFount = function (options) {
        var that = fluid.initLittleComponent("fluid.typeFount", options);
        return fluid.typeTag(that.options.targetTypeName);
    };
    
    /**
     * Creates a new "little component": a that-ist object with options merged into it by the framework.
     * This method is a convenience for creating small objects that have options but don't require full
     * View-like features such as the DOM Binder or events
     * 
     * @param {Object} name the name of the little component to create
     * @param {Object} options user-supplied options to merge with the defaults
     */
    // NOTE: the 3rd argument localOptions is NOT to be advertised as part of the stable API, it is present
    // just to allow backward compatibility whilst grade specifications are not mandatory
    fluid.initLittleComponent = function (name, options, localOptions) {
        var that = fluid.typeTag(name);
        // TODO: nickName must be available earlier than other merged options so that component may resolve to itself
        that.nickName = options && options.nickName ? options.nickName : fluid.computeNickName(that.typeName);
        localOptions = localOptions || {gradeNames: "fluid.littleComponent"};
        
        fluid.mergeComponentOptions(that, name, options, localOptions);
        fluid.initLifecycleFunctions(that);
        fluid.fireEvent(that.options.preInitFunction, that);

        if (fluid.hasGrade(that.options, "fluid.eventedComponent")) {
            fluid.instantiateFirers(that, that.options);
        }
        if (!fluid.hasGrade(that.options, "autoInit")) {
            fluid.clearLifecycleFunctions(that.options);
        }
        return that;
    };
    
    fluid.initLifecycleFunctions = function (that) {
        fluid.each(fluid.lifecycleFunctions, function (func, key) {
            var value = that.options[key];
            if (value) {
                that.options[key] = fluid.makeEventFirer(null, null, key);
                fluid.event.addListenerToFirer(that.options[key], value);
            }  
        }); 
    };
    
    fluid.clearLifecycleFunctions = function (options) {
        fluid.each(fluid.lifecycleFunctions, function (value, key) {
            delete options[key];
        });
        delete options.initFunction; 
    };

    fluid.diagnoseFailedView = fluid.identity;    
    
    fluid.initComponent = function (componentName, initArgs) {
        var options = fluid.defaults(componentName);
        if (!options.gradeNames) {
            fluid.fail("Cannot initialise component " + componentName + " which has no gradeName registered");
        }
        var args = [componentName].concat(fluid.makeArray(initArgs)); // TODO: support different initFunction variants
        var that = fluid.invokeGlobalFunction(options.initFunction, args);
        fluid.diagnoseFailedView(componentName, that, options, args);
        fluid.fireEvent(that.options.postInitFunction, that);
        if (fluid.initDependents) {
            fluid.initDependents(that);
        }
        fluid.fireEvent(that.options.finalInitFunction, that);
        fluid.clearLifecycleFunctions(that.options);
        return that.options.returnedPath ? fluid.get(that, that.options.returnedPath) : that;
    };

    // unsupported, NON-API function
    fluid.initSubcomponentImpl = function (that, entry, args) {
        var togo;
        if (typeof (entry) !== "function") {
            var entryType = typeof (entry) === "string" ? entry : entry.type;
            var globDef = fluid.defaults(true, entryType);
            fluid.merge("reverse", that.options, globDef);
            togo = entryType === "fluid.emptySubcomponent" ?
                fluid.emptySubcomponent(entry.options) : 
                fluid.invokeGlobalFunction(entryType, args);
        } else {
            togo = entry.apply(null, args);
        }

        // TODO: deprecate "returnedOptions" and incorporate into regular ginger world system
        var returnedOptions = togo ? togo.returnedOptions : null;
        if (returnedOptions) {
            fluid.merge(that.options.mergePolicy, that.options, returnedOptions);
            if (returnedOptions.listeners) {
                fluid.mergeListeners(that, that.events, returnedOptions.listeners);
            }
        }
        return togo;
    };
    
    /** Initialise all the "subcomponents" which are configured to be attached to 
     * the supplied top-level component, which share a particular "class name".
     * @param {Component} that The top-level component for which sub-components are
     * to be instantiated. It contains specifications for these subcomponents in its
     * <code>options</code> structure.
     * @param {String} className The "class name" or "category" for the subcomponents to
     * be instantiated. A class name specifies an overall "function" for a class of 
     * subcomponents and represents a category which accept the same signature of
     * instantiation arguments.
     * @param {Array of Object} args The instantiation arguments to be passed to each 
     * constructed subcomponent. These will typically be members derived from the
     * top-level <code>that</code> or perhaps globally discovered from elsewhere. One
     * of these arguments may be <code>fluid.COMPONENT_OPTIONS</code> in which case this
     * placeholder argument will be replaced by instance-specific options configured
     * into the member of the top-level <code>options</code> structure named for the
     * <code>className</code>
     * @return {Array of Object} The instantiated subcomponents, one for each member
     * of <code>that.options[className]</code>.
     */
    
    fluid.initSubcomponents = function (that, className, args) {
        var entry = that.options[className];
        if (!entry) {
            return;
        }
        var entries = $.makeArray(entry);
        var optindex = -1;
        var togo = [];
        args = $.makeArray(args);
        for (var i = 0; i < args.length; ++i) {
            if (args[i] === fluid.COMPONENT_OPTIONS) {
                optindex = i;
            }
        }
        for (i = 0; i < entries.length; ++i) {
            entry = entries[i];
            if (optindex !== -1) {
                args[optindex] = entry.options;
            }
            togo[i] = fluid.initSubcomponentImpl(that, entry, args);
        }
        return togo;
    };
        
    fluid.initSubcomponent = function (that, className, args) {
        return fluid.initSubcomponents(that, className, args)[0];
    };


    // Message resolution and templating
   
   
   /**
    * Converts a string to a regexp with the specified flags given in parameters
    * @param {String} a string that has to be turned into a regular expression
    * @param {String} the flags to provide to the reg exp 
    */
    fluid.stringToRegExp = function (str, flags) {
        return new RegExp(str.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&"), flags);
    };
    
    /**
     * Simple string template system. 
     * Takes a template string containing tokens in the form of "%value".
     * Returns a new string with the tokens replaced by the specified values.
     * Keys and values can be of any data type that can be coerced into a string. Arrays will work here as well.
     * 
     * @param {String}    template    a string (can be HTML) that contains tokens embedded into it
     * @param {object}    values      a collection of token keys and values
     */
    fluid.stringTemplate = function (template, values) {
        var keys = fluid.keys(values);
        keys = keys.sort(fluid.compareStringLength());
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            var re = fluid.stringToRegExp("%" + key, "g");
            template = template.replace(re, values[key]);
        }
        return template;
    };
    

    fluid.messageResolver = function (options) {
        var that = fluid.initLittleComponent("fluid.messageResolver", options);
        that.messageBase = that.options.parseFunc(that.options.messageBase);
        
        that.lookup = function (messagecodes) {
            var resolved = fluid.messageResolver.resolveOne(that.messageBase, messagecodes);
            if (resolved === undefined) {
                return fluid.find(that.options.parents, function (parent) {
                    return parent.lookup(messagecodes);
                });
            } else {
                return {template: resolved, resolveFunc: that.options.resolveFunc};
            }
        };
        that.resolve = function (messagecodes, args) {
            if (!messagecodes) {
                return "[No messagecodes provided]";
            }
            messagecodes = fluid.makeArray(messagecodes);
            var looked = that.lookup(messagecodes);
            return looked ? looked.resolveFunc(looked.template, args) :
                "[Message string for key " + messagecodes[0] + " not found]";
        };
        
        return that;  
    };
    
    fluid.defaults("fluid.messageResolver", {
        mergePolicy: {
            messageBase: "preserve",
            parents: "nomerge"
        },
        resolveFunc: fluid.stringTemplate,
        parseFunc: fluid.identity,
        messageBase: {},
        parents: []
    });
    
    fluid.messageResolver.resolveOne = function (messageBase, messagecodes) {
        for (var i = 0; i < messagecodes.length; ++i) {
            var code = messagecodes[i];
            var message = messageBase[code];
            if (message !== undefined) {
                return message;
            }
        }
    };
          
    /** Converts a data structure consisting of a mapping of keys to message strings,
     * into a "messageLocator" function which maps an array of message codes, to be 
     * tried in sequence until a key is found, and an array of substitution arguments,
     * into a substituted message string.
     */
    fluid.messageLocator = function (messageBase, resolveFunc) {
        var resolver = fluid.messageResolver({messageBase: messageBase, resolveFunc: resolveFunc});
        return function (messagecodes, args) {
            return resolver.resolve(messagecodes, args);
        };
    };

})(jQuery, fluid_1_5);
/*
Copyright 2007-2010 University of Cambridge
Copyright 2007-2009 University of Toronto
Copyright 2010-2011 Lucendo Development Ltd.
Copyright 2010 OCAD University

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

/** This file contains functions which depend on the presence of a DOM document
 * but which do not depend on the contents of Fluid.js **/

// Declare dependencies
/*global fluid_1_5:true, jQuery*/

// JSLint options 
/*jslint white: true, funcinvoke: true, undef: true, newcap: true, nomen: true, regexp: true, bitwise: true, browser: true, forin: true, maxerr: 100, indent: 4 */

var fluid_1_5 = fluid_1_5 || {};

(function ($, fluid) {

    // Private constants.
    var NAMESPACE_KEY = "fluid-scoped-data";

    /**
     * Gets stored state from the jQuery instance's data map.
     * This function is unsupported: It is not really intended for use by implementors.
     */
    fluid.getScopedData = function(target, key) {
        var data = $(target).data(NAMESPACE_KEY);
        return data ? data[key] : undefined;
    };

    /**
     * Stores state in the jQuery instance's data map. Unlike jQuery's version,
     * accepts multiple-element jQueries.
     * This function is unsupported: It is not really intended for use by implementors.
     */
    fluid.setScopedData = function(target, key, value) {
        $(target).each(function() {
            var data = $.data(this, NAMESPACE_KEY) || {};
            data[key] = value;

            $.data(this, NAMESPACE_KEY, data);
        });
    };

    /** Global focus manager - makes use of "focusin" event supported in jquery 1.4.2 or later.
     */

    var lastFocusedElement = null;
    
    $(document).bind("focusin", function(event){
        lastFocusedElement = event.target;
    });
    
    fluid.getLastFocusedElement = function() {
        return lastFocusedElement;
    }


    var ENABLEMENT_KEY = "enablement";

    /** Queries or sets the enabled status of a control. An activatable node
     * may be "disabled" in which case its keyboard bindings will be inoperable
     * (but still stored) until it is reenabled again.
     * This function is unsupported: It is not really intended for use by implementors.
     */
     
    fluid.enabled = function(target, state) {
        target = $(target);
        if (state === undefined) {
            return fluid.getScopedData(target, ENABLEMENT_KEY) !== false;
        }
        else {
            $("*", target).add(target).each(function() {
                if (fluid.getScopedData(this, ENABLEMENT_KEY) !== undefined) {
                    fluid.setScopedData(this, ENABLEMENT_KEY, state);
                }
                else if (/select|textarea|input/i.test(this.nodeName)) {
                    $(this).prop("disabled", !state);
                }
            });
            fluid.setScopedData(target, ENABLEMENT_KEY, state);
        }
    };
    
    fluid.initEnablement = function(target) {
        fluid.setScopedData(target, ENABLEMENT_KEY, true);
    };
    
    // This function is necessary since simulation of focus events by jQuery under IE
    // is not sufficiently good to intercept the "focusin" binding. Any code which triggers
    // focus or blur synthetically throughout the framework and client code must use this function,
    // especially if correct cross-platform interaction is required with the "deadMansBlur" function.
    
    function applyOp(node, func) {
        node = $(node);
        node.trigger("fluid-"+func);
        node[func]();
    }
    
    $.each(["focus", "blur"], function(i, name) {
        fluid[name] = function(elem) {
            applyOp(elem, name);
        }
    });
    
})(jQuery, fluid_1_5);
/*
Copyright 2008-2010 University of Cambridge
Copyright 2008-2009 University of Toronto

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

// Declare dependencies
/*global fluid_1_5:true, jQuery */

// JSLint options 
/*jslint white: true, funcinvoke: true, undef: true, newcap: true, nomen: true, regexp: true, bitwise: true, browser: true, forin: true, maxerr: 100, indent: 4 */

var fluid_1_5 = fluid_1_5 || {};

(function ($, fluid) {
    
    fluid.dom = fluid.dom || {};
    
    // Node walker function for iterateDom.
    var getNextNode = function (iterator) {
        if (iterator.node.firstChild) {
            iterator.node = iterator.node.firstChild;
            iterator.depth += 1;
            return iterator;
        }
        while (iterator.node) {
            if (iterator.node.nextSibling) {
                iterator.node = iterator.node.nextSibling;
                return iterator;
            }
            iterator.node = iterator.node.parentNode;
            iterator.depth -= 1;
        }
        return iterator;
    };
    
    /**
     * Walks the DOM, applying the specified acceptor function to each element.
     * There is a special case for the acceptor, allowing for quick deletion of elements and their children.
     * Return "delete" from your acceptor function if you want to delete the element in question.
     * Return "stop" to terminate iteration. 
     
     * Implementation note - this utility exists mainly for performance reasons. It was last tested
     * carefully some time ago (around jQuery 1.2) but at that time was around 3-4x faster at raw DOM
     * filtration tasks than the jQuery equivalents, which was an important source of performance loss in the
     * Reorderer component. General clients of the framework should use this method with caution if at all, and
     * the performance issues should be reassessed when we have time. 
     * 
     * @param {Element} node the node to start walking from
     * @param {Function} acceptor the function to invoke with each DOM element
     * @param {Boolean} allnodes Use <code>true</code> to call acceptor on all nodes, 
     * rather than just element nodes (type 1)
     */
    fluid.dom.iterateDom = function (node, acceptor, allNodes) {
        var currentNode = {node: node, depth: 0};
        var prevNode = node;
        var condition;
        while (currentNode.node !== null && currentNode.depth >= 0 && currentNode.depth < fluid.dom.iterateDom.DOM_BAIL_DEPTH) {
            condition = null;
            if (currentNode.node.nodeType === 1 || allNodes) {
                condition = acceptor(currentNode.node, currentNode.depth);
            }
            if (condition) {
                if (condition === "delete") {
                    currentNode.node.parentNode.removeChild(currentNode.node);
                    currentNode.node = prevNode;
                }
                else if (condition === "stop") {
                    return currentNode.node;
                }
            }
            prevNode = currentNode.node;
            currentNode = getNextNode(currentNode);
        }
    };
    
    // Work around IE circular DOM issue. This is the default max DOM depth on IE.
    // http://msdn2.microsoft.com/en-us/library/ms761392(VS.85).aspx
    fluid.dom.iterateDom.DOM_BAIL_DEPTH = 256;
    
    /**
     * Checks if the specified container is actually the parent of containee.
     * 
     * @param {Element} container the potential parent
     * @param {Element} containee the child in question
     */
    fluid.dom.isContainer = function (container, containee) {
        for (; containee; containee = containee.parentNode) {
            if (container === containee) {
                return true;
            }
        }
        return false;
    };
       
    /** Return the element text from the supplied DOM node as a single String.
     * Implementation note - this is a special-purpose utility used in the framework in just one
     * position in the Reorderer. It only performs a "shallow" traversal of the text and was intended
     * as a quick and dirty means of extracting element labels where the user had not explicitly provided one.
     * It should not be used by general users of the framework and its presence here needs to be 
     * reassessed.
     */
    fluid.dom.getElementText = function (element) {
        var nodes = element.childNodes;
        var text = "";
        for (var i = 0; i < nodes.length; ++i) {
            var child = nodes[i];
            if (child.nodeType === 3) {
                text = text + child.nodeValue;
            }
        }
        return text; 
    };
    
})(jQuery, fluid_1_5);
/*
Copyright 2008-2010 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2010 Lucendo Development Ltd.

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

// Declare dependencies
/*global fluid_1_5:true, jQuery*/

// JSLint options 
/*jslint white: true, funcinvoke: true, undef: true, newcap: true, nomen: true, regexp: true, bitwise: true, browser: true, forin: true, maxerr: 100, indent: 4 */

fluid_1_5 = fluid_1_5 || {};

(function ($, fluid) {
      
  var unUnicode = /(\\u[\dabcdef]{4}|\\x[\dabcdef]{2})/g;
  
  fluid.unescapeProperties = function (string) {
    string = string.replace(unUnicode, function(match) {
      var code = match.substring(2);
      var parsed = parseInt(code, 16);
      return String.fromCharCode(parsed);
      }
    );
    var pos = 0;
    while (true) {
        var backpos = string.indexOf("\\", pos);
        if (backpos === -1) {
            break;
        }
        if (backpos === string.length - 1) {
          return [string.substring(0, string.length - 1), true];
        }
        var replace = string.charAt(backpos + 1);
        if (replace === "n") replace = "\n";
        if (replace === "r") replace = "\r";
        if (replace === "t") replace = "\t";
        string = string.substring(0, backpos) + replace + string.substring(backpos + 2);
        pos = backpos + 1;
    }
    return [string, false];
  };
  
  var breakPos = /[^\\][\s:=]/;
  
  fluid.parseJavaProperties = function(text) {
    // File format described at http://java.sun.com/javase/6/docs/api/java/util/Properties.html#load(java.io.Reader)
    var togo = {};
    text = text.replace(/\r\n/g, "\n");
    text = text.replace(/\r/g, "\n");
    lines = text.split("\n");
    var contin, key, valueComp, valueRaw, valueEsc;
    for (var i = 0; i < lines.length; ++ i) {
      var line = $.trim(lines[i]);
      if (!line || line.charAt(0) === "#" || line.charAt(0) === '!') {
          continue;
      }
      if (!contin) {
        valueComp = "";
        var breakpos = line.search(breakPos);
        if (breakpos === -1) {
          key = line;
          valueRaw = "";
          }
        else {
          key = $.trim(line.substring(0, breakpos + 1)); // +1 since first char is escape exclusion
          valueRaw = $.trim(line.substring(breakpos + 2));
          if (valueRaw.charAt(0) === ":" || valueRaw.charAt(0) === "=") {
            valueRaw = $.trim(valueRaw.substring(1));
          }
        }
      
        key = fluid.unescapeProperties(key)[0];
        valueEsc = fluid.unescapeProperties(valueRaw);
      }
      else {
        valueEsc = fluid.unescapeProperties(line);
      }

      contin = valueEsc[1];
      if (!valueEsc[1]) { // this line was not a continuation line - store the value
        togo[key] = valueComp + valueEsc[0];
      }
      else {
        valueComp += valueEsc[0];
      }
    }
    return togo;
  };
      
    /** 
     * Expand a message string with respect to a set of arguments, following a basic
     * subset of the Java MessageFormat rules. 
     * http://java.sun.com/j2se/1.4.2/docs/api/java/text/MessageFormat.html
     * 
     * The message string is expected to contain replacement specifications such
     * as {0}, {1}, {2}, etc.
     * @param messageString {String} The message key to be expanded
     * @param args {String/Array of String} An array of arguments to be substituted into the message.
     * @return The expanded message string. 
     */
    fluid.formatMessage = function (messageString, args) {
        if (!args) {
            return messageString;
        } 
        if (typeof(args) === "string") {
            args = [args];
        }
        for (var i = 0; i < args.length; ++ i) {
            messageString = messageString.replace("{" + i + "}", args[i]);
        }
        return messageString;
    };
      
})(jQuery, fluid_1_5);
/*
Copyright 2007-2010 University of Cambridge
Copyright 2007-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley
Copyright 2010 OCAD University
Copyright 2010-2011 Lucendo Development Ltd.

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

// Declare dependencies
/*global fluid:true, fluid_1_5:true, jQuery*/

// JSLint options 
/*jslint white: true, funcinvoke: true, undef: true, newcap: true, nomen: true, regexp: true, bitwise: true, browser: true, forin: true, maxerr: 100, indent: 4 */

var fluid_1_5 = fluid_1_5 || {};
var fluid = fluid || fluid_1_5;

(function ($, fluid) {
       
    fluid.renderTimestamp = function (date) {
        var zeropad = function (num, width) {
             if (!width) width = 2;
             var numstr = (num == undefined? "" : num.toString());
             return "00000".substring(5 - width + numstr.length) + numstr;
             }
        return zeropad(date.getHours()) + ":" + zeropad(date.getMinutes()) + ":" + zeropad(date.getSeconds()) + "." + zeropad(date.getMilliseconds(), 3);
    };

    fluid.isTracing = true;

    fluid.registerNamespace("fluid.tracing");

    fluid.tracing.pathCount = [];
    
    fluid.tracing.summarisePathCount = function (pathCount) {
        pathCount = pathCount || fluid.tracing.pathCount;
        var togo = {};
        for (var i = 0; i < pathCount.length; ++ i) {
            var path = pathCount[i];
            if (!togo[path]) {
                togo[path] = 1;
            }
            else {
                ++togo[path];
            }
        }
        var toReallyGo = [];
        fluid.each(togo, function(el, path) {
            toReallyGo.push({path: path, count: el});
        });
        toReallyGo.sort(function(a, b) {return b.count - a.count});
        return toReallyGo;
    };
    
    fluid.tracing.condensePathCount = function (prefixes, pathCount) {
        prefixes = fluid.makeArray(prefixes);
        var prefixCount = {};
        fluid.each(prefixes, function(prefix) {
            prefixCount[prefix] = 0;
        });
        var togo = [];
        fluid.each(pathCount, function(el) {
            var path = el.path;
            if (!fluid.find(prefixes, function(prefix) {
                if (path.indexOf(prefix) === 0) {
                    prefixCount[prefix] += el.count;
                    return true;
                }
            })) {
            togo.push(el);
            }
        });
        fluid.each(prefixCount, function(count, path) {
            togo.unshift({path: path, count: count});
        });
        return togo;
    };

    // Exception stripping code taken from https://github.com/emwendelin/javascript-stacktrace/blob/master/stacktrace.js
    // BSD licence, see header
    
    fluid.detectStackStyle = function (e) {
        var style = "other";
        var stackStyle = {
            offset: 0  
        };
        if (e["arguments"]) {
            style = "chrome";
        } else if (typeof window !== "undefined" && window.opera && e.stacktrace) {
            style = "opera10";
        } else if (e.stack) {
            style = "firefox";
            // Detect FireFox 4-style stacks which are 1 level less deep
            stackStyle.offset = e.stack.indexOf("Trace exception") === -1? 1 : 0;
        } else if (typeof window !== 'undefined' && window.opera && !('stacktrace' in e)) { //Opera 9-
            style = "opera";
        }
        stackStyle.style = style;
        return stackStyle;
    };
    
    fluid.obtainException = function() {
        try {
            throw new Error("Trace exception");
        }
        catch (e) {
            return e;
        }
    };
    
    var stackStyle = fluid.detectStackStyle(fluid.obtainException());

    fluid.registerNamespace("fluid.exceptionDecoders");
    
    fluid.decodeStack = function() {
        if (stackStyle.style !== "firefox") {
            return null;
        }
        var e = fluid.obtainException();
        return fluid.exceptionDecoders[stackStyle.style](e);
    };

    fluid.exceptionDecoders.firefox = function(e) {
        var lines = e.stack.replace(/(?:\n@:0)?\s+$/m, '').replace(/^\(/gm, '{anonymous}(').split('\n');
        return fluid.transform(lines, function(line) {
            var atind = line.indexOf("@");
            return atind === -1? [line] : [line.substring(atind + 1), line.substring(0, atind)];  
        });
    };
    
    fluid.getCallerInfo = function(atDepth) {
        atDepth = (atDepth || 3) - stackStyle.offset;
        var stack = fluid.decodeStack();
        return stack? stack[atDepth][0] : null;
    };
    
    function generate(c, count) {
        var togo = "";
        for (var i = 0; i < count; ++ i) {
            togo += c;
        }
        return togo;
    }
    
    function printImpl(obj, small, options) {
        var big = small + options.indentChars;
        if (obj === null) {
            return "null";
        }
        else if (fluid.isPrimitive(obj)) {
            return JSON.stringify(obj);
        }
        else {
            var j = [];
            if (fluid.isArrayable(obj)) {
                if (obj.length === 0) {
                    return "[]";
                }
                for (var i = 0; i < obj.length; ++ i) {
                    j[i] = printImpl(obj[i], big, options);
                }
                return "[\n" + big + j.join(",\n" + big) + "\n" + small + "]";
                }
            else {
                var i = 0;
                fluid.each(obj, function(value, key) {
                    j[i++] = JSON.stringify(key) + ": " + printImpl(value, big, options);
                });
                return "{\n" + big + j.join(",\n" + big) + "\n" + small + "}"; 
            }
        }
    }
    
    fluid.prettyPrintJSON = function(obj, options) {
        options = $.extend({indent: 4}, options);
        options.indentChars = generate(" ", options.indent);
        return printImpl(obj, "", options);
    }
        
    /** 
     * Dumps a DOM element into a readily recognisable form for debugging - produces a
     * "semi-selector" summarising its tag name, class and id, whichever are set.
     * 
     * @param {jQueryable} element The element to be dumped
     * @return A string representing the element.
     */
    fluid.dumpEl = function (element) {
        var togo;
        
        if (!element) {
            return "null";
        }
        if (element.nodeType === 3 || element.nodeType === 8) {
            return "[data: " + element.data + "]";
        } 
        if (element.nodeType === 9) {
            return "[document: location " + element.location + "]";
        }
        if (!element.nodeType && fluid.isArrayable(element)) {
            togo = "[";
            for (var i = 0; i < element.length; ++ i) {
                togo += fluid.dumpEl(element[i]);
                if (i < element.length - 1) {
                    togo += ", ";
                }
            }
            return togo + "]";
        }
        element = $(element);
        togo = element.get(0).tagName;
        if (element.id) {
            togo += "#" + element.id;
        }
        if (element.attr("class")) {
            togo += "." + element.attr("class");
        }
        return togo;
    };
        
})(jQuery, fluid_1_5);
    /*
Copyright 2008-2010 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2010-2011 Lucendo Development Ltd.
Copyright 2010 OCAD University

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

// Declare dependencies
/*global fluid_1_5:true, jQuery*/

// JSLint options 
/*jslint white: true, funcinvoke: true, continue: true, elsecatch: true, operator: true, jslintok:true, undef: true, newcap: true, regexp: true, bitwise: true, browser: true, forin: true, maxerr: 100, indent: 4 */

var fluid_1_5 = fluid_1_5 || {};

(function ($, fluid) {
    
    fluid.BINDING_ROOT_KEY = "fluid-binding-root";
    
    /** Recursively find any data stored under a given name from a node upwards
     * in its DOM hierarchy **/
     
    fluid.findData = function (elem, name) {
        while (elem) {
            var data = $.data(elem, name);
            if (data) {
                return data;
            }
            elem = elem.parentNode;
        }
    };
  
    fluid.bindFossils = function (node, data, fossils) {
        $.data(node, fluid.BINDING_ROOT_KEY, {data: data, fossils: fossils});
    };
        
    fluid.boundPathForNode = function (node, fossils) {
        node = fluid.unwrap(node);
        var key = node.name || node.id;
        var record = fossils[key];
        return record ? record.EL : null;
    };
      
   /** "Automatically" apply to whatever part of the data model is
     * relevant, the changed value received at the given DOM node*/
    fluid.applyBoundChange = function (node, newValue, applier) {
        node = fluid.unwrap(node);
        if (newValue === undefined) {
            newValue = fluid.value(node);
        }
        if (node.nodeType === undefined && node.length > 0) {
            node = node[0];
        } // assume here that they share name and parent
        var root = fluid.findData(node, fluid.BINDING_ROOT_KEY);
        if (!root) {
            fluid.fail("Bound data could not be discovered in any node above " + fluid.dumpEl(node));
        }
        var name = node.name;
        var fossil = root.fossils[name];
        if (!fossil) {
            fluid.fail("No fossil discovered for name " + name + " in fossil record above " + fluid.dumpEl(node));
        }
        if (typeof(fossil.oldvalue) === "boolean") { // deal with the case of an "isolated checkbox"
            newValue = newValue[0] ? true : false;
        }
        var EL = root.fossils[name].EL;
        if (applier) {
            applier.fireChangeRequest({path: EL, value: newValue, source: node.id});
        } else {
            fluid.set(root.data, EL, newValue);
        }    
    };
    
    /** MODEL ACCESSOR ENGINE (trundler) **/
    
    /** Standard strategies for resolving path segments **/
    fluid.model.environmentStrategy = function (initEnvironment) {
        return {
            init: function () {
                var environment = initEnvironment;
                return function (root, segment, index) {
                    var togo;
                    if (environment && environment[segment]) {
                        togo = environment[segment];
                    }
                    environment = null;
                    return togo; 
                };
            }
        };
    };

    fluid.model.defaultCreatorStrategy = function (root, segment) {
        if (root[segment] === undefined) {
            root[segment] = {};
            return root[segment];
        }
    };
    
    fluid.model.defaultFetchStrategy = function (root, segment) {
        return segment === "" ? root : root[segment];
    };
        
    fluid.model.funcResolverStrategy = function (root, segment) {
        if (root.resolvePathSegment) {
            return root.resolvePathSegment(segment);
        }
    };
    
        
    fluid.model.defaultGetConfig = {
        strategies: [fluid.model.funcResolverStrategy, fluid.model.defaultFetchStrategy]
    };

    fluid.model.defaultSetConfig = {
        strategies: [fluid.model.funcResolverStrategy, fluid.model.defaultFetchStrategy, fluid.model.defaultCreatorStrategy]
    };
    
    
    // unsupported, NON-API function
    fluid.model.applyStrategy = function (strategy, root, segment, path) {
        if (typeof (strategy) === "function") { 
            return strategy(root, segment, path);
        } else if (strategy && strategy.next) {
            return strategy.next(root, segment, path);
        }
    };
    
    // unsupported, NON-API function
    fluid.model.initStrategy = function (baseStrategy, index, oldStrategies) {
        return baseStrategy.init ? baseStrategy.init(oldStrategies ? oldStrategies[index] : undefined) : baseStrategy;
    };
    
    // unsupported, NON-API function
    fluid.model.makeTrundler = function (root, config, oldStrategies) {
        var that = {
            root: root,
            strategies: fluid.isArrayable(config) ? config : 
                fluid.transform(config.strategies, function (strategy, index) {
                    return fluid.model.initStrategy(strategy, index, oldStrategies); 
                })
        };
        that.trundle = function (EL, uncess) {
            uncess = uncess || 0;
            var newThat = fluid.model.makeTrundler(that.root, config, that.strategies);
            newThat.segs = config.parser? config.parser.parse(EL) : fluid.model.parseEL(EL);
            newThat.index = 0;
            newThat.path = "";
            newThat.step(newThat.segs.length - uncess);
            return newThat;
        };
        that.next = function () {
            if (!that.root) {
                return;
            }
            var accepted;
            // TODO: Temporary adjustment before trundlers are destroyed by FLUID-4705
            // In the final system "new strategies" should be able to declare whether any of them
            // require this path computed or not
            that.path = (config.parser? config.parser.compose : fluid.model.composePath)(that.path, that.segs[that.index]);
            for (var i = 0; i < that.strategies.length; ++i) {
                var value = fluid.model.applyStrategy(that.strategies[i], that.root, that.segs[that.index], that.path);
                if (accepted === undefined) {
                    accepted = value;
                }
            }
            if (accepted === fluid.NO_VALUE) {
                accepted = undefined;
            }
            that.root = accepted;
            ++that.index;
        };
        that.step = function (limit) {
            for (var i = 0; i < limit; ++i) {
                that.next();
            }
            that.last = that.segs[that.index];
        };
        return that;
    };
    
    // unsupported, NON-API function
    // core trundling recursion point
    fluid.model.trundleImpl = function (trundler, EL, config, uncess) {
        if (typeof (EL) === "string") {
            trundler = trundler.trundle(EL, uncess);
        } else {
            var key = EL.type || "default";
            var resolver = config.resolvers[key];
            if (!resolver) {
                fluid.fail("Unable to find resolver of type " + key);
            }
            trundler = resolver(EL, trundler) || {};
            if (EL.path && trundler.trundle && trundler.root !== undefined) {
                trundler = fluid.model.trundleImpl(trundler, EL.path, config, uncess);
            }
        }
        return trundler;  
    };
        
    // unsupported, NON-API function
    // entry point for initially unbased trundling
    fluid.model.trundle = function (root, EL, config, uncess) {
        EL = EL || "";
        config = config || fluid.model.defaultGetConfig;
        var trundler = fluid.model.makeTrundler(root, config);
        return fluid.model.trundleImpl(trundler, EL, config, uncess);
    };
    
    fluid.model.getPenultimate = function (root, EL, config) {
        return fluid.model.trundle(root, EL, config, 1);
    };  
   
    // Implementation notes: The EL path manipulation utilities here are somewhat more thorough
    // and expensive versions of those provided in Fluid.js - there is some duplication of 
    // functionality. This is a tradeoff between stability and performance - the versions in
    // Fluid.js are the most frequently used and do not implement escaping of characters .
    // as \. and \ as \\ as the versions here. The implementations here are not 
    // performant and are left here partially as an implementation note. Problems will
    // arise if clients manipulate JSON structures containing "." characters in keys as if they
    // are models. The basic  utilities fluid.path(), fluid.parseEL and fluid.composePath are 
    // the ones recommended for general users and the following implementations will
    // be upgraded to use regexes in future to make them better alternatives
   
    fluid.pathUtil = {};
   
    var getPathSegmentImpl = function (accept, path, i) {
        var segment = null; // TODO: rewrite this with regexes and replaces
        if (accept) {
            segment = "";
        }
        var escaped = false;
        var limit = path.length;
        for (; i < limit; ++i) {
            var c = path.charAt(i);
            if (!escaped) {
                if (c === '.') {
                    break;
                }
                else if (c === '\\') {
                    escaped = true;
                }
                else if (segment !== null) {
                    segment += c;
                }
            }
            else {
                escaped = false;
                if (segment !== null) {
                    segment += c;
                }
            }
        }
        if (segment !== null) {
            accept[0] = segment;
        }
        return i;
    };
    
    var globalAccept = []; // TODO: serious reentrancy risk here, why is this impl like this?
    
    /** Parses a path segment, following escaping rules, starting from character index i in the supplied path */
    fluid.pathUtil.getPathSegment = function (path, i) {
        getPathSegmentImpl(globalAccept, path, i);
        return globalAccept[0];
    }; 
  
    /** Returns just the head segment of an EL path */
    fluid.pathUtil.getHeadPath = function (path) {
        return fluid.pathUtil.getPathSegment(path, 0);
    };
  
    /** Returns all of an EL path minus its first segment - if the path consists of just one segment, returns "" */  
    fluid.pathUtil.getFromHeadPath = function (path) {
        var firstdot = getPathSegmentImpl(null, path, 0);
        return firstdot === path.length ? "" : path.substring(firstdot + 1);
    };
    
    function lastDotIndex(path) {
        // TODO: proper escaping rules
        return path.lastIndexOf(".");
    }

    /** Returns all of an EL path minus its final segment - if the path consists of just one segment, returns "" - 
     * WARNING - this method does not follow escaping rules */    
    fluid.pathUtil.getToTailPath = function (path) {
        var lastdot = lastDotIndex(path);
        return lastdot === -1 ? "" : path.substring(0, lastdot);
    };

    /** Returns the very last path component of an EL path 
     * WARNING - this method does not follow escaping rules */
    fluid.pathUtil.getTailPath = function (path) {
        var lastdot = lastDotIndex(path);
        return fluid.pathUtil.getPathSegment(path, lastdot + 1);
    };

    /** A version of fluid.model.parseEL that apples escaping rules - this allows path segments
     * to contain period characters . - characters "\" and "}" will also be escaped. WARNING - 
     * this current implementation is EXTREMELY slow compared to fluid.model.parseEL and should
     * not be used in performance-sensitive applications */
     
    fluid.pathUtil.parseEL = function (path) {
        var togo = [];
        var index = 0;
        var limit = path.length;
        while (index < limit) {
            var firstdot = getPathSegmentImpl(globalAccept, path, index);
            togo.push(globalAccept[0]);
            index = firstdot + 1;
        }
        return togo;
    };
    
    var composeSegment = function (prefix, toappend) {
        for (var i = 0; i < toappend.length; ++i) {
            var c = toappend.charAt(i);
            if (c === '.' || c === '\\' || c === '}') {
                prefix += '\\';
            }
            prefix += c;
        }
        return prefix;
    };
    
    /** Escapes a single path segment by replacing any character ".", "\" or "}" with
     * itself prepended by \
     */
    fluid.pathUtil.escapeSegment = function (segment) {
        return composeSegment("", segment);  
    };
    
    /**
     * Compose a prefix and suffix EL path, where the prefix is already escaped.
     * Prefix may be empty, but not null. The suffix will become escaped.
     */
    fluid.pathUtil.composePath = function (prefix, suffix) {
        if (prefix.length !== 0) {
            prefix += '.';
        }
        return composeSegment(prefix, suffix);
    };
    
    /** Determines whether a particular EL path matches a given path specification.
     * The specification consists of a path with optional wildcard segments represented by "*".
     * @param spec (string) The specification to be matched
     * @param path (string) The path to be tested
     * @param exact (boolean) Whether the path must exactly match the length of the specification in
     * terms of path segments in order to count as match. If exact is falsy, short specifications will
     * match all longer paths as if they were padded out with "*" segments 
     * @return (string) The path which matched the specification, or <code>null</code> if there was no match
     */
   
    fluid.pathUtil.matchPath = function (spec, path, exact) {
        var togo = "";
        while (true) {
            if (((path === "") ^ (spec === "")) && exact) {
                return null;
            }
            // FLUID-4625 - symmetry on spec and path is actually undesirable, but this
            // quickly avoids at least missed notifications - improved (but slower) 
            // implementation should explode composite changes
            if (!spec || !path) {
                break;
            }
            var spechead = fluid.pathUtil.getHeadPath(spec);
            var pathhead = fluid.pathUtil.getHeadPath(path);
            // if we fail to match on a specific component, fail.
            if (spechead !== "*" && spechead !== pathhead) {
                return null;
            }
            togo = fluid.pathUtil.composePath(togo, pathhead);
            spec = fluid.pathUtil.getFromHeadPath(spec);
            path = fluid.pathUtil.getFromHeadPath(path);
        }
        return togo;
    };
        
    /** CHANGE APPLIER **/    
      
    fluid.model.isNullChange = function (model, request, resolverGetConfig) {
        if (request.type === "ADD") {
            var existing = fluid.get(model, request.path, resolverGetConfig);
            if (existing === request.value) {
                return true;
            }
        }
    };
    /** Applies the supplied ChangeRequest object directly to the supplied model.
     */
    fluid.model.applyChangeRequest = function (model, request, resolverSetConfig) {
        var pen = fluid.model.getPenultimate(model, request.path, resolverSetConfig || fluid.model.defaultSetConfig);
        
        if (request.type === "ADD" || request.type === "MERGE") {
            if (request.path === "" || request.type === "MERGE") {
                if (request.type === "ADD") {
                    fluid.clear(pen.root);
                }
                $.extend(true, request.path === "" ? pen.root : pen.root[pen.last], request.value);
            }
            else {
                pen.root[pen.last] = request.value;
            }
        }
        else if (request.type === "DELETE") {
            if (request.path === "") {
                fluid.clear(pen.root);
            }
            else {
                delete pen.root[pen.last];
            }
        }
    };
          
    /** Add a listener to a ChangeApplier event that only acts in the case the event
     * has not come from the specified source (typically ourself)
     * @param modelEvent An model event held by a changeApplier (typically applier.modelChanged)
     * @param path The path specification to listen to
     * @param source The source value to exclude (direct equality used)
     * @param func The listener to be notified of a change
     * @param [eventName] - optional - the event name to be listened to - defaults to "modelChanged" 
     */
    fluid.addSourceGuardedListener = function(applier, path, source, func, eventName) {
        eventName = eventName || "modelChanged";
        applier[eventName].addListener(path, 
            function() {
                if (!applier.hasChangeSource(source)) {
                    func.apply(null, arguments);
                }
            });
    };

    /** Convenience method to fire a change event to a specified applier, including
     * a supplied "source" identified (perhaps for use with addSourceGuardedListener)
     */ 
    fluid.fireSourcedChange = function (applier, path, value, source) {
        applier.fireChangeRequest({
            path: path,
            value: value,
            source: source
        });         
    };
    
    /** Dispatches a list of changes to the supplied applier */
    fluid.requestChanges = function (applier, changes) {
        for (var i = 0; i < changes.length; ++i) {
            applier.fireChangeRequest(changes[i]);
        }  
    };
    
  
    // Utility shared between changeApplier and superApplier
    
    function bindRequestChange(that) {
        that.requestChange = function (path, value, type) {
            var changeRequest = {
                path: path,
                value: value,
                type: type
            };
            that.fireChangeRequest(changeRequest);
        };
    }
    
    // Utility used for source tracking in changeApplier
    
    function sourceWrapModelChanged(modelChanged, threadLocal) {
        return function(changeRequest) {
            var sources = threadLocal().sources;
            var args = arguments;
            var source = changeRequest.source || "";
            fluid.tryCatch(function() {
                if (sources[source] === undefined) {
                    sources[source] = 0;
                }
                ++sources[source];
                modelChanged.apply(null, args);
            }, null, function() {
                --sources[source];
            });
        };
    }
  
    /** The core creator function constructing ChangeAppliers. See API documentation
     * at http://wiki.fluidproject.org/display/fluid/ChangeApplier+API for the various
     * options supported in the options structure */
     
    fluid.makeChangeApplier = function (model, options) {
        options = options || {};
        var baseEvents = {
            guards: fluid.event.getEventFirer(false, true, "guard event"),
            postGuards: fluid.event.getEventFirer(false, true, "postGuard event"),
            modelChanged: fluid.event.getEventFirer(false, false, "modelChanged event")
        };
        var threadLocal = fluid.threadLocal(function() { return {sources: {}};});
        var that = {
        // For now, we don't use "id" to avoid confusing component detection which uses
        // a simple algorithm looking for that field
            changeid: fluid.allocateGuid(),
            model: model
        };
        
        function makeGuardWrapper(cullUnchanged) {
            if (!cullUnchanged) {
                return null;
            }
            var togo = function (guard) {
                return function (model, changeRequest, internalApplier) {
                    var oldRet = guard(model, changeRequest, internalApplier);
                    if (oldRet === false) {
                        return false;
                    }
                    else {
                        if (fluid.model.isNullChange(model, changeRequest)) {
                            togo.culled = true;
                            return false;
                        }
                    }
                };
            };
            return togo;
        }

        function wrapListener(listener, spec) {
            var pathSpec = spec;
            var transactional = false;
            var priority = Number.MAX_VALUE;
            if (typeof (spec) !== "string") {
                pathSpec = spec.path;
                transactional = spec.transactional;
                if (spec.priority !== undefined) {
                    priority = spec.priority;
                }
            }
            else {
                if (pathSpec.charAt(0) === "!") {
                    transactional = true;
                    pathSpec = pathSpec.substring(1);
                }
            }
            return function (changePath, fireSpec, accum) {
                var guid = fluid.event.identifyListener(listener);
                var exist = fireSpec.guids[guid];
                if (!exist) {
                    var match = fluid.pathUtil.matchPath(pathSpec, changePath);
                    if (match !== null) {
                        var record = {
                            changePath: changePath,
                            pathSpec: pathSpec,
                            listener: listener,
                            priority: priority,
                            transactional: transactional
                        };
                        if (accum) {
                            record.accumulate = [accum];
                        }
                        fireSpec.guids[guid] = record;
                        var collection = transactional ? "transListeners" : "listeners";
                        fireSpec[collection].push(record);
                        fireSpec.all.push(record);
                    }
                }
                else if (accum) {
                    if (!exist.accumulate) {
                        exist.accumulate = [];
                    }
                    exist.accumulate.push(accum);
                }
            };
        }
        
        function fireFromSpec(name, fireSpec, args, category, wrapper) {
            return baseEvents[name].fireToListeners(fireSpec[category], args, wrapper);
        }
        
        function fireComparator(recA, recB) {
            return recA.priority - recB.priority;
        }

        function prepareFireEvent(name, changePath, fireSpec, accum) {
            baseEvents[name].fire(changePath, fireSpec, accum);
            fireSpec.all.sort(fireComparator);
            fireSpec.listeners.sort(fireComparator);
            fireSpec.transListeners.sort(fireComparator);
        }
        
        function makeFireSpec() {
            return {guids: {}, all: [], listeners: [], transListeners: []};
        }
        
        function getFireSpec(name, changePath) {
            var fireSpec = makeFireSpec();
            prepareFireEvent(name, changePath, fireSpec);
            return fireSpec;
        }
        
        function fireEvent(name, changePath, args, wrapper) {
            var fireSpec = getFireSpec(name, changePath);
            return fireFromSpec(name, fireSpec, args, "all", wrapper);
        }
        
        function adaptListener(that, name) {
            that[name] = {
                addListener: function (spec, listener, namespace) {
                    baseEvents[name].addListener(wrapListener(listener, spec), namespace);
                },
                removeListener: function (listener) {
                    baseEvents[name].removeListener(listener);
                }
            };
        }
        adaptListener(that, "guards");
        adaptListener(that, "postGuards");
        adaptListener(that, "modelChanged");
        
        function preFireChangeRequest(changeRequest) {
            if (!changeRequest.type) {
                changeRequest.type = "ADD";
            }
        }

        var bareApplier = {
            fireChangeRequest: function (changeRequest) {
                that.fireChangeRequest(changeRequest, true);
            }
        };
        bindRequestChange(bareApplier);

        that.fireChangeRequest = function (changeRequest, defeatGuards) {
            preFireChangeRequest(changeRequest);
            var guardFireSpec = defeatGuards ? null : getFireSpec("guards", changeRequest.path);
            if (guardFireSpec && guardFireSpec.transListeners.length > 0) {
                var ation = that.initiate();
                ation.fireChangeRequest(changeRequest, guardFireSpec);
                ation.commit();
            }
            else {
                if (!defeatGuards) {
                    // TODO: this use of "listeners" seems pointless since we have just verified that there are no transactional listeners
                    var prevent = fireFromSpec("guards", guardFireSpec, [model, changeRequest, bareApplier], "listeners");
                    if (prevent === false) {
                        return false;
                    }
                }
                var oldModel = model;
                if (!options.thin) {
                    oldModel = {};
                    fluid.model.copyModel(oldModel, model);                    
                }
                fluid.model.applyChangeRequest(model, changeRequest, options.resolverSetConfig);
                fireEvent("modelChanged", changeRequest.path, [model, oldModel, [changeRequest]]);
            }
        };
        
        that.fireChangeRequest = sourceWrapModelChanged(that.fireChangeRequest, threadLocal);
        bindRequestChange(that);

        function fireAgglomerated(eventName, formName, changes, args, accpos) {
            var fireSpec = makeFireSpec();
            for (var i = 0; i < changes.length; ++i) {
                prepareFireEvent(eventName, changes[i].path, fireSpec, changes[i]);
            }
            for (var j = 0; j < fireSpec[formName].length; ++j) {
                var spec = fireSpec[formName][j];
                if (accpos) {
                    args[accpos] = spec.accumulate;
                }
                var ret = spec.listener.apply(null, args);
                if (ret === false) {
                    return false;
                }
            }
        }

        that.initiate = function (newModel) {
            var cancelled = false;
            var changes = [];
            if (options.thin) {
                newModel = model;
            }
            else {
                newModel = newModel || {};
                fluid.model.copyModel(newModel, model);
            }
            // the guard in the inner world is given a private applier to "fast track"
            // and glob collateral changes it requires
            var internalApplier = {
                fireChangeRequest: function (changeRequest) {
                    preFireChangeRequest(changeRequest);
                    fluid.model.applyChangeRequest(newModel, changeRequest, options.resolverSetConfig);
                    changes.push(changeRequest);
                }
            };
            bindRequestChange(internalApplier);
            var ation = {
                commit: function () {
                    var oldModel;
                    if (cancelled) {
                        return false;
                    }
                    var ret = fireAgglomerated("postGuards", "transListeners", changes, [newModel, null, internalApplier], 1);
                    if (ret === false) {
                        return false;
                    }
                    if (options.thin) {
                        oldModel = model;
                    }
                    else {
                        oldModel = {};
                        fluid.model.copyModel(oldModel, model);
                        fluid.clear(model);
                        fluid.model.copyModel(model, newModel);
                    }
                    fireAgglomerated("modelChanged", "all", changes, [model, oldModel, null], 2);
                },
                fireChangeRequest: function (changeRequest) {
                    preFireChangeRequest(changeRequest);
                    if (options.cullUnchanged && fluid.model.isNullChange(model, changeRequest, options.resolverGetConfig)) {
                        return;
                    } 
                    var wrapper = makeGuardWrapper(options.cullUnchanged);
                    var prevent = fireEvent("guards", changeRequest.path, [newModel, changeRequest, internalApplier], wrapper);
                    if (prevent === false && !(wrapper && wrapper.culled)) {
                        cancelled = true;
                    }
                    if (!cancelled) {
                        if (!(wrapper && wrapper.culled)) {
                            fluid.model.applyChangeRequest(newModel, changeRequest, options.resolverSetConfig);
                            changes.push(changeRequest);
                        }
                    }
                }
            };
            
            ation.fireChangeRequest = sourceWrapModelChanged(ation.fireChangeRequest, threadLocal);
            bindRequestChange(ation);

            return ation;
        };
        
        that.hasChangeSource = function (source) {
            return threadLocal().sources[source] > 0;
        };
        
        return that;
    };
    
    fluid.makeSuperApplier = function () {
        var subAppliers = [];
        var that = {};
        that.addSubApplier = function (path, subApplier) {
            subAppliers.push({path: path, subApplier: subApplier});
        };
        that.fireChangeRequest = function (request) {
            for (var i = 0; i < subAppliers.length; ++i) {
                var path = subAppliers[i].path;
                if (request.path.indexOf(path) === 0) {
                    var subpath = request.path.substring(path.length + 1);
                    var subRequest = fluid.copy(request);
                    subRequest.path = subpath;
                    // TODO: Deal with the as yet unsupported case of an EL rvalue DAR
                    subAppliers[i].subApplier.fireChangeRequest(subRequest);
                }
            }
        };
        bindRequestChange(that);
        return that;
    };
    
    fluid.attachModel = function (baseModel, path, model) {
        var segs = fluid.model.parseEL(path);
        for (var i = 0; i < segs.length - 1; ++i) {
            var seg = segs[i];
            var subModel = baseModel[seg];
            if (!subModel) {
                baseModel[seg] = subModel = {};
            }
            baseModel = subModel;
        }
        baseModel[segs[segs.length - 1]] = model;
    };
    
    fluid.assembleModel = function (modelSpec) {
        var model = {};
        var superApplier = fluid.makeSuperApplier();
        var togo = {model: model, applier: superApplier};
        for (var path in modelSpec) {
            var rec = modelSpec[path];
            fluid.attachModel(model, path, rec.model);
            if (rec.applier) {
                superApplier.addSubApplier(path, rec.applier);
            }
        }
        return togo;
    };

})(jQuery, fluid_1_5);
/*
Copyright 2010 University of Toronto
Copyright 2010-2011 OCAD University

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

// Declare dependencies
/*global fluid:true, fluid_1_5:true, jQuery*/

// JSLint options 
/*jslint white: true, elsecatch: true, jslintok: true, funcinvoke: true, undef: true, newcap: true, nomen: true, regexp: true, bitwise: true, browser: true, forin: true, maxerr: 100, indent: 4 */

var fluid_1_5 = fluid_1_5 || {};
var fluid = fluid || fluid_1_5;

(function ($) {

    fluid.registerNamespace("fluid.model.transform");
    
    /** Grade definitions for standard transformation function hierarchy **/
    
    fluid.defaults("fluid.transformFunction", {
        gradeNames: "fluid.function"
    });
    
    // uses standard layout and workflow involving inputPath
    fluid.defaults("fluid.standardInputTransformFunction", {
        gradeNames: "fluid.transformFunction"  
    });
    
    fluid.defaults("fluid.standardOutputTransformFunction", {
        gradeNames: "fluid.transformFunction"  
    });
    
    // uses the standard layout and workflow involving inputPath and outputPath
    fluid.defaults("fluid.standardTransformFunction", {
        gradeNames: ["fluid.standardInputTransformFunction", "fluid.standardOutputTransformFunction"]  
    });
    
    fluid.defaults("fluid.lens", {
        gradeNames: "fluid.transformFunction",
        invertConfiguration: null
        // this function method returns "inverted configuration" rather than actually performing inversion
        // TODO: harmonise with strategy used in VideoPlayer_framework.js
    });
    
    /***********************************
     * Base utilities for transformers *
     ***********************************/

    // unsupported, NON-API function
    fluid.model.transform.pathToRule = function (inputPath) {
        return {
            expander: {
                type: "fluid.model.transform.value",
                inputPath: inputPath
            }
        };
    };
    
    // unsupported, NON-API function    
    fluid.model.transform.valueToRule = function (value) {
        return {
            expander: {
                type: "fluid.model.transform.literalValue",
                value: value
            }
        };
    };
        
    /** Accepts two fully escaped paths, either of which may be empty or null **/
    fluid.model.composePaths = function (prefix, suffix) {
        prefix = prefix || "";
        suffix = suffix || "";
        return !prefix ? suffix : (!suffix ? prefix : prefix + "." + suffix);
    };

    fluid.model.transform.accumulateInputPath = function (inputPath, expander, paths) {
        if (inputPath !== undefined) {
            paths.push(fluid.model.composePaths(expander.inputPrefix, inputPath));
        }
    };

    fluid.model.transform.getValue = function (inputPath, value, expander) {
        var togo;
        if (inputPath !== undefined) { // NB: We may one day want to reverse the crazy jQuery-like convention that "no path means root path"
            togo = fluid.get(expander.source, fluid.model.composePaths(expander.inputPrefix, inputPath), expander.resolverGetConfig);
        }
        if (togo === undefined) {
            togo = fluid.isPrimitive(value) ? value : expander.expand(value);
        }
        return togo;
    };
    
    // distinguished value which indicates that a transformation rule supplied a 
    // non-default output path, and so the user should be prevented from making use of it
    // in a compound expander definition
    fluid.model.transform.NONDEFAULT_OUTPUT_PATH_RETURN = {};
    
    fluid.model.transform.setValue = function (userOutputPath, value, expander) {
        // avoid crosslinking to input object - this might be controlled by a "nocopy" option in future
        var toset = fluid.copy(value); 
        var outputPath = fluid.model.composePaths(expander.outputPrefix, userOutputPath);
        // TODO: custom resolver config here to create non-hash output model structure
        if (toset !== undefined) {
            expander.applier.requestChange(outputPath, toset);
        }
        return userOutputPath ? fluid.model.transform.NONDEFAULT_OUTPUT_PATH_RETURN : toset;
    };
    
    /**********************************
     * Standard transformer functions *
     **********************************/
        
    fluid.model.transform.value = fluid.identity;
    
    fluid.defaults("fluid.model.transform.value", { 
        gradeNames: "fluid.standardTransformFunction",
        invertConfiguration: "fluid.model.transform.invertValue"
    });
    
    fluid.model.transform.invertValue = function (expandSpec, expander) {
        var togo = fluid.copy(expandSpec);
        // TODO: this will not behave correctly in the face of compound "value" which contains
        // further expanders
        togo.inputPath = fluid.model.composePaths(expander.outputPrefix, expandSpec.outputPath);
        togo.outputPath = fluid.model.composePaths(expander.inputPrefix, expandSpec.inputPath);
        return togo;
    };
    
    fluid.model.transform.literalValue = function (expanderSpec) {
        return expanderSpec.value;  
    };
    
    fluid.defaults("fluid.model.transform.literalValue", { 
        gradeNames: "fluid.standardOutputTransformFunction"
    });
    
    fluid.model.transform.arrayValue = fluid.makeArray;
        
    fluid.defaults("fluid.model.transform.arrayValue", { 
        gradeNames: "fluid.standardTransformFunction"
    });
     
    fluid.model.transform.count = function (value) {
        return fluid.makeArray(value).length;
    };
    
    fluid.defaults("fluid.model.transform.count", { 
        gradeNames: "fluid.standardTransformFunction"
    });
     
    fluid.model.transform.firstValue = function (expandSpec, expander) {
        if (!expandSpec.values || !expandSpec.values.length) {
            fluid.fail("firstValue transformer requires an array of values at path named \"values\", supplied", expandSpec);
        }
        for (var i = 0; i < expandSpec.values.length; i++) {
            var value = expandSpec.values[i];
            var expanded = expander.expand(value);
            if (expanded !== undefined) {
                return expanded;
            }
        }
    };
    
    fluid.defaults("fluid.model.transform.firstValue", { 
        gradeNames: "fluid.transformFunction"
    });
    
    // TODO: Incomplete implementation which only checks expected paths
    fluid.deepEquals = function (expected, actual, stats) {
        if (fluid.isPrimitive(expected)) {
            if (expected === actual) {
                ++stats.matchCount;
            } else {
                ++stats.mismatchCount;
                stats.messages.push("Value mismatch at path " + stats.path + ": expected " + expected + " actual " + actual);
            }
        }
        else {
            if (typeof(expected) !== typeof(actual)) {
                ++stats.mismatchCount;
                stats.messages.push("Type mismatch at path " + stats.path + ": expected " + typeof(expected) + " actual " + typeof(actual)); 
            } else {
                fluid.each(expected, function (value, key) {
                    stats.pathOps.push(key);
                    fluid.deepEquals(expected[key], actual[key], stats);
                    stats.pathOps.pop(key);
                });
            }
        }
    };
    
    fluid.model.transform.matchValue = function (expected, actual) {
        if (fluid.isPrimitive(expected)) {
            return expected === actual ? 1 : 0;
        } else {
            var stats = {
                matchCount: 0,
                mismatchCount: 0,
                messages: []
            };
            fluid.model.makePathStack(stats, "path");
            fluid.deepEquals(expected, actual, stats);
            return stats.matchCount;
        }
    };
    
    // unsupported, NON-API function    
    fluid.model.transform.compareMatches = function (speca, specb) {
        return specb.matchCount - speca.matchCount;
    };
    
    fluid.firstDefined = function (a, b) {
        return a === undefined ? b : a;
    };

    // unsupported, NON-API function    
    fluid.model.transform.matchValueMapperFull = function (outerValue, expander, expandSpec) {
        var o = expandSpec.options;
        if (o.length === 0) {
            fluid.fail("valueMapper supplied empty list of options: ", expandSpec);
        }
        if (o.length === 1) {
            return 0;
        }
        var matchPower = []; 
        for (var i = 0; i < o.length; ++i) {
            var option = o[i];
            var value = fluid.firstDefined(fluid.model.transform.getValue(option.inputPath, undefined, expander),
                outerValue);
            var matchCount = fluid.model.transform.matchValue(option.undefinedInputValue ? undefined : option.inputValue, value);
            matchPower[i] = {index: i, matchCount: matchCount};
        }
        matchPower.sort(fluid.model.transform.compareMatches);
        return matchPower[0].matchCount === matchPower[1].matchCount ? -1 : matchPower[0].index; 
    };

    fluid.model.transform.valueMapper = function (expandSpec, expander) {
        if (!expandSpec.options) {
            fluid.fail("demultiplexValue requires a list or hash of options at path named \"options\", supplied ", expandSpec);
        }
        var value = fluid.model.transform.getValue(expandSpec.inputPath, undefined, expander);
        var deref = fluid.isArrayable(expandSpec.options) ? // long form with list of records    
            function (testVal) {
                var index = fluid.model.transform.matchValueMapperFull(testVal, expander, expandSpec);
                return index === -1 ? null : expandSpec.options[index];
            } : 
            function (testVal) {
                return expandSpec.options[testVal];
            };
      
        var indexed = deref(value);
        if (!indexed) {
            // if no branch matches, try again using this value - WARNING, this seriously
            // threatens invertibility
            indexed = deref(expandSpec.defaultInputValue);
        }
        if (!indexed) {
            return;
        }
        var outputValue = fluid.isPrimitive(indexed) ? indexed : 
            (indexed.undefinedOutputValue ? undefined : 
                (indexed.outputValue === undefined ? expandSpec.defaultOutputValue : indexed.outputValue));
        var outputPath = indexed.outputPath === undefined ? expandSpec.outputPath : indexed.outputPath;
        return fluid.model.transform.setValue(outputPath, outputValue, expander); 
    };
    
    fluid.model.transform.valueMapper.invert = function (expandSpec, expander) {
        var options = [];
        var togo = {
            type: "fluid.model.transform.valueMapper",
            options: options
        };
        var isArray = fluid.isArrayable(expandSpec.options);
        var findCustom = function (name) {
            return fluid.find(expandSpec.options, function (option) {
                if (option[name]) {
                    return true;
                }
            });
        };
        var anyCustomOutput = findCustom("outputPath");
        var anyCustomInput = findCustom("inputPath");
        if (!anyCustomOutput) {
            togo.inputPath = fluid.model.composePaths(expander.outputPrefix, expandSpec.outputPath);
        }
        if (!anyCustomInput) {
            togo.outputPath = fluid.model.composePaths(expander.inputPrefix, expandSpec.inputPath);
        }
        var def = fluid.firstDefined;
        fluid.each(expandSpec.options, function (option, key) {
            var outOption = {};
            var origInputValue = def(isArray ? option.inputValue : key, expandSpec.defaultInputValue);
            if (origInputValue === undefined) {
                fluid.fail("Failure inverting configuration for valueMapper - inputValue could not be resolved for record " + key + ": ", expandSpec);
            }
            outOption.outputValue = origInputValue;
            var origOutputValue = def(option.outputValue, expandSpec.defaultOutputValue);
            outOption.inputValue = origOutputValue;
            if (anyCustomOutput) {
                outOption.inputPath = fluid.model.composePaths(expander.outputPrefix, def(option.outputPath, expandSpec.outputPath));
            }
            if (anyCustomInput) {
                outOption.outputPath = fluid.model.composePaths(expander.inputPrefix, def(option.inputPath, expandSpec.inputPath));
            }
            options.push(outOption);
        });
        return togo;
    };
    
    fluid.model.transform.valueMapper.collect = function (expandSpec, expander) {
        var togo = [];
        fluid.model.transform.accumulateInputPath(expandSpec.inputPath, expander, togo);
        fluid.each(expandSpec.options, function (option) {
            fluid.model.transform.accumulateInputPath(option.inputPath, expander, togo);
        });
        return togo;
    };

    fluid.defaults("fluid.model.transform.valueMapper", { 
        gradeNames: ["fluid.transformFunction", "fluid.lens"],
        invertConfiguration: "fluid.model.transform.valueMapper.invert",
        collectInputPaths: "fluid.model.transform.valueMapper.collect"
    });
    
    // TODO: prefixApplier is an expander which is currently unused and untested
    fluid.model.transform.prefixApplier = function (expandSpec, expander) {
        if (expandSpec.inputPrefix) {
            expander.inputPrefixOp.push(expandSpec.inputPrefix);
        }
        if (expandSpec.outputPrefix) {
            expander.outputPrefixOp.push(expandSpec.outputPrefix);
        }
        expander.expand(expandSpec.value);
        if (expandSpec.inputPrefix) {
            expander.inputPrefixOp.pop();
        }
        if (expandSpec.outputPrefix) {
            expander.outputPrefixOp.pop();
        }
    };
    
    fluid.defaults("fluid.model.transform.prefixApplier", {
        gradeNames: ["fluid.transformFunction"]
    });
    
    // unsupported, NON-API function
    fluid.model.makePathStack = function (expander, prefixName) {
        var stack = expander[prefixName + "Stack"] = [];
        expander[prefixName] = "";
        return {
            push: function (prefix) {
                var newPath = fluid.model.composePaths(expander[prefixName], prefix);
                stack.push(expander[prefixName]);
                expander[prefixName] = newPath;
            },
            pop: function () {
                expander[prefixName] = stack.pop();
            }
        };
    };
    
    // unsupported, NON-API function
    fluid.model.transform.expandExpander = function (expandSpec, expander) {
        var typeName = expandSpec.type;
        if (!typeName) {
            fluid.fail("Transformation record is missing a type name: ", expandSpec);
        }
        if (typeName.indexOf(".") === -1) {
            typeName = "fluid.model.transform." + typeName;
        }
        var expanderFn = fluid.getGlobalValue(typeName);
        var expdef = fluid.defaults(typeName);
        if (typeof(expanderFn) !== "function") {
            fluid.fail("Transformation record specifies transformation function with name " + 
                expandSpec.type + " which is not a function - ", expanderFn);
        }
        if (!fluid.hasGrade(expdef, "fluid.transformFunction")) {
            // If no suitable grade is set up, assume that it is intended to be used as a standardTransformFunction
            expdef = fluid.defaults("fluid.standardTransformFunction");
        }
        var expanderArgs = [expandSpec, expander];
        if (fluid.hasGrade(expdef, "fluid.standardInputTransformFunction")) {
            var expanded = fluid.model.transform.getValue(expandSpec.inputPath, expandSpec.value, expander);
            expanderArgs[0] = expanded;
            expanderArgs[2] = expandSpec;
        }
        var transformed = expanderFn.apply(null, expanderArgs);
        if (fluid.hasGrade(expdef, "fluid.standardOutputTransformFunction")) {
            transformed = fluid.model.transform.setValue(expandSpec.outputPath, transformed, expander);
        }
        return transformed;
    };
    
    // unsupported, NON-API function    
    fluid.model.transform.expandWildcards = function (expander, source) {
        fluid.each(source, function (value, key) {
            var q = expander.queued;
            expander.pathOp.push(fluid.pathUtil.escapeSegment(key.toString()));
            for (var i = 0; i < q.length; ++i) {
                if (fluid.pathUtil.matchPath(q[i].matchPath, expander.path, true)) {
                    var esCopy = fluid.copy(q[i].expandSpec);
                    if (esCopy.inputPath === undefined || fluid.model.transform.hasWildcard(esCopy.inputPath)) {
                        esCopy.inputPath = "";
                    }
                    // TODO: allow some kind of interpolation for output path
                    expander.inputPrefixOp.push(expander.path);
                    expander.outputPrefixOp.push(expander.path);
                    fluid.model.transform.expandExpander(esCopy, expander);
                    expander.outputPrefixOp.pop();
                    expander.inputPrefixOp.pop();
                }
            }
            if (!fluid.isPrimitive(value)) {
                fluid.model.transform.expandWildcards(expander, value);
            }
            expander.pathOp.pop();
        });
    };
    
    // unsupported, NON-API function   
    fluid.model.transform.hasWildcard = function (path) {
        return typeof(path) === "string" && path.indexOf("*") !== -1;
    };
    
    // unsupported, NON-API function
    fluid.model.transform.maybePushWildcard = function (expander, expandSpec) {
        var hw = fluid.model.transform.hasWildcard;
        var matchPath;
        if (hw(expandSpec.inputPath)) {
            matchPath = fluid.model.composePaths(expander.inputPrefix, expandSpec.inputPath);
        }
        else if (hw(expander.outputPrefix) || hw(expandSpec.outputPath)) {
            matchPath = fluid.model.composePaths(expander.outputPrefix, expandSpec.outputPath);
        }
                         
        if (matchPath) {
            expander.queued.push({expandSpec: expandSpec, outputPrefix: expander.outputPrefix, inputPrefix: expander.inputPrefix, matchPath: matchPath});
            return true;
        }
        return false;
    };
    
    // From UIOptions utility fluid.uiOptions.sortByKeyLength!
    fluid.model.sortByKeyLength = function (inObject) {
        var keys = fluid.keys(inObject);
        return keys.sort(fluid.compareStringLength(true));
    };
    
    // Three handler functions operating the (currently) three different processing modes
    // unsupported, NON-API function
    fluid.model.transform.handleExpandExpander = function (expander, expandSpec) {
        if (fluid.model.transform.maybePushWildcard(expander, expandSpec)) {
            return;
        }
        else {
            return fluid.model.transform.expandExpander(expandSpec, expander);
        }
    };
    // unsupported, NON-API function
    fluid.model.transform.handleInvertExpander = function (expander, expandSpec, expdef) {
        var invertor = expdef.invertConfiguration;
        if (invertor) {
            var inverted = fluid.invokeGlobalFunction(invertor, [expandSpec, expander]);
            expander.inverted.push(inverted);
        }
    };
    
    // unsupported, NON-API function
    fluid.model.transform.handlerCollectExpander = function (expander, expandSpec, expdef) {
        var standardInput = fluid.hasGrade(expdef, "fluid.standardInputTransformFunction");
        if (standardInput) {
            fluid.model.transform.accumulateInputPath(expandSpec.inputPath, expander, expander.inputPaths);
        }
        else {
            var collector = expdef.collectInputPaths;
            if (collector) {
                var collected = fluid.makeArray(fluid.invokeGlobalFunction(collector, [expandSpec, expander]));
                expander.inputPaths = expander.inputPaths.concat(collected);
            }
        }
    };
    
    // unsupported, NON-API function
    fluid.model.transform.expandValue = function (rule, expander) {
        if (typeof(rule) === "string") {
            rule = fluid.model.transform.pathToRule(rule);
        }
        // special dispensation to allow "value" at top level
        // TODO: Proper escaping rules
        else if (rule.value && expander.outputPrefix !== "") {
            rule = fluid.model.transform.valueToRule(rule.value);
        }
        var togo;
        if (rule.expander) {
            var expanders = fluid.makeArray(rule.expander);
            for (var i = 0; i < expanders.length; ++i) {
                var expandSpec = expanders[i];
                var expdef = fluid.defaults(expandSpec.type);
                var returned = expander.expanderHandler(expander, expandSpec, expdef);
                if (returned !== undefined) {
                    togo = returned;
                }
            }
        }
        // always apply rules with shortest keys first
        var keys = fluid.model.sortByKeyLength(rule);
        for (var i = 0; i < keys.length; ++i) { // jslint:ok - already defined
            var key = keys[i];
            if (key !== "expander") {
                var value = rule[key];
                expander.outputPrefixOp.push(key);
                expander.expand(value, expander);
                expander.outputPrefixOp.pop();
            }
        }
        togo = fluid.get(expander.target, expander.outputPrefix);
        return togo;
    };
    
    // unsupported, NON-API function
    fluid.model.transform.makeExpander = function (expander, handleFn, expandFn) {
        expandFn = expandFn || fluid.model.transform.expandValue;
        expander.expand = function (rules) {
            return expandFn(rules, expander);
        };
        expander.outputPrefixOp = fluid.model.makePathStack(expander, "outputPrefix");
        expander.inputPrefixOp = fluid.model.makePathStack(expander, "inputPrefix");
        expander.expanderHandler = handleFn;
    };
    
    fluid.model.transform.invertConfiguration = function (rules) {
        var expander = {
            inverted: []
        };
        fluid.model.transform.makeExpander(expander, fluid.model.transform.handleInvertExpander);
        expander.expand(rules);
        return {
            expander: expander.inverted
        };
    };
    
    fluid.model.transform.collectInputPaths = function (rules) {
        var expander = {
            inputPaths: []
        };
        fluid.model.transform.makeExpander(expander, fluid.model.transform.handlerCollectExpander);
        expander.expand(rules);
        return expander.inputPaths;        
    };
    
    // unsupported, NON-API function
    fluid.model.transform.flatSchemaStrategy = function (flatSchema) {
        var keys = fluid.model.sortByKeyLength(flatSchema);
        return function (root, segment, path) {
          // TODO: clearly this implementation could be much more efficient
            for (var i = 0; i < keys.length; ++i) {
                var key = keys[i];
                if (fluid.pathUtil.matchPath(key, path, true) !== null) {
                    return flatSchema[key];
                }
            }
        };
    };
    
    // unsupported, NON-API function
    fluid.model.transform.defaultSchemaValue = function (schemaValue) {
        var type = fluid.isPrimitive(schemaValue) ? schemaValue : schemaValue.type;
        return type === "array" ? [] : {};
    };
    
    // unsupported, NON-API function
    fluid.model.transform.isomorphicSchemaStrategy = function (source, getConfig) { 
        return function (root, segment, path) {
            var existing = fluid.get(source, path, getConfig);
            return fluid.isArrayable(existing) ? "array" : "object";
        };
    };
    
    // unsupported, NON-API function
    fluid.model.transform.decodeStrategy = function (source, options, getConfig) {
        if (options.isomorphic) {
            return fluid.model.transform.isomorphicSchemaStrategy(source, getConfig);
        }
        else if (options.flatSchema) {
            return fluid.model.transform.flatSchemaStrategy(options.flatSchema, getConfig);
        }
    };
    
    // unsupported, NON-API function
    fluid.model.transform.schemaToCreatorStrategy = function (strategy) {
        return function (root, segment, path) {
            if (root[segment] === undefined) {
                var schemaValue = strategy(root, segment, path); 
                return root[segment] = fluid.model.transform.defaultSchemaValue(schemaValue);
            }
        };  
    };
    
    /** Transforms a model by a sequence of rules. Parameters as for fluid.model.transform,
     * only with an array accepted for "rules"
     */
    fluid.model.transform.sequence = function (source, rules, options) {
        for (var i = 0; i < rules.length; ++i) {
            source = fluid.model.transform(source, rules[i], options);
        }
        return source;
    };
    
    /**
     * Transforms a model based on a specified expansion rules objects.
     * Rules objects take the form of:
     *   {
     *       "target.path": "value.el.path" || {
     *          expander: {
     *              type: "expander.function.path",
     *               ...
     *           }
     *       }
     *   }
     *
     * @param {Object} source the model to transform
     * @param {Object} rules a rules object containing instructions on how to transform the model
     * @param {Object} options a set of rules governing the transformations. At present this may contain
     * the values <code>isomorphic: true</code> indicating that the output model is to be governed by the
     * same schema found in the input model, or <code>flatSchema</code> holding a flat schema object which 
     * consists of a hash of EL path specifications with wildcards, to the values "array"/"object" defining
     * the schema to be used to construct missing trunk values.
     */
    fluid.model.transformWithRules = function (source, rules, options) {
        options = options || {};
        var parser = {
            parse: fluid.pathUtil.parseEL,
            compose: fluid.pathUtil.composePath
        };
        var getConfig = {
            parser: parser,
            strategies: [fluid.model.defaultFetchStrategy]
        };
        var schemaStrategy = fluid.model.transform.decodeStrategy(source, options, getConfig);
        var setConfig = {
            parser: parser,
            strategies: [fluid.model.defaultFetchStrategy, schemaStrategy ? fluid.model.transform.schemaToCreatorStrategy(schemaStrategy)
                : fluid.model.defaultCreatorStrategy]
        };
        var expander = {
            source: source,
            target: schemaStrategy ? fluid.model.transform.defaultSchemaValue(schemaStrategy(null, "", "")) : {},
            resolverGetConfig: getConfig,
            queued: []
        };
        fluid.model.transform.makeExpander(expander, fluid.model.transform.handleExpandExpander);
        expander.applier = fluid.makeChangeApplier(expander.target, {resolverSetConfig: setConfig});
        
        expander.expand(rules);
        if (expander.queued.length > 0) {
            expander.typeStack = [];
            expander.pathOp = fluid.model.makePathStack(expander, "path");
            fluid.model.transform.expandWildcards(expander, source);
        }
        return expander.target;
        
    };
    
    $.extend(fluid.model.transformWithRules, fluid.model.transform);
    fluid.model.transform = fluid.model.transformWithRules;
    
})(jQuery, fluid_1_5);
/*
Copyright 2008-2010 University of Cambridge
Copyright 2008-2010 University of Toronto
Copyright 2010-2011 Lucendo Development Ltd.
Copyright 2010-2011 OCAD University

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

// Declare dependencies
/*global fluid:true, fluid_1_5:true, jQuery*/

// JSLint options 
/*jslint white: true, funcinvoke: true, elsecatch: true, operator: true, undef: true, newcap: true, nomen: true, regexp: true, bitwise: true, browser: true, forin: true, maxerr: 100, indent: 4 */

var fluid_1_5 = fluid_1_5 || {};
var fluid = fluid || fluid_1_5;

(function ($, fluid) {

    // $().fluid("selectable", args)
    // $().fluid("selectable".that()
    // $().fluid("pager.pagerBar", args)
    // $().fluid("reorderer", options)

/** Create a "bridge" from code written in the Fluid standard "that-ist" style,
 *  to the standard JQuery UI plugin architecture specified at http://docs.jquery.com/UI/Guidelines .
 *  Every Fluid component corresponding to the top-level standard signature (JQueryable, options)
 *  will automatically convert idiomatically to the JQuery UI standard via this adapter. 
 *  Any return value which is a primitive or array type will become the return value
 *  of the "bridged" function - however, where this function returns a general hash
 *  (object) this is interpreted as forming part of the Fluid "return that" pattern,
 *  and the function will instead be bridged to "return this" as per JQuery standard,
 *  permitting chaining to occur. However, as a courtesy, the particular "this" returned
 *  will be augmented with a function that() which will allow the original return
 *  value to be retrieved if desired.
 *  @param {String} name The name under which the "plugin space" is to be injected into
 *  JQuery
 *  @param {Object} peer The root of the namespace corresponding to the peer object.
 */

    fluid.thatistBridge = function (name, peer) {

        var togo = function (funcname) {
            var segs = funcname.split(".");
            var move = peer;
            for (var i = 0; i < segs.length; ++i) {
                move = move[segs[i]];
            }
            var args = [this];
            if (arguments.length === 2) {
                args = args.concat($.makeArray(arguments[1]));
            }
            var ret = move.apply(null, args);
            this.that = function () {
                return ret;
            };
            var type = typeof(ret);
            return !ret || type === "string" || type === "number" || type === "boolean"
                || (ret && ret.length !== undefined) ? ret : this;
        };
        $.fn[name] = togo;
        return togo;
    };

    fluid.thatistBridge("fluid", fluid);
    fluid.thatistBridge("fluid_1_5", fluid_1_5);

/*************************************************************************
 * Tabindex normalization - compensate for browser differences in naming
 * and function of "tabindex" attribute and tabbing order.
 */

    // -- Private functions --
    
    
    var normalizeTabindexName = function () {
        return $.browser.msie ? "tabIndex" : "tabindex";
    };

    var canHaveDefaultTabindex = function (elements) {
        if (elements.length <= 0) {
            return false;
        }

        return $(elements[0]).is("a, input, button, select, area, textarea, object");
    };
    
    var getValue = function (elements) {
        if (elements.length <= 0) {
            return undefined;
        }

        if (!fluid.tabindex.hasAttr(elements)) {
            return canHaveDefaultTabindex(elements) ? Number(0) : undefined;
        }

        // Get the attribute and return it as a number value.
        var value = elements.attr(normalizeTabindexName());
        return Number(value);
    };

    var setValue = function (elements, toIndex) {
        return elements.each(function (i, item) {
            $(item).attr(normalizeTabindexName(), toIndex);
        });
    };
    
    // -- Public API --
    
    /**
     * Gets the value of the tabindex attribute for the first item, or sets the tabindex value of all elements
     * if toIndex is specified.
     * 
     * @param {String|Number} toIndex
     */
    fluid.tabindex = function (target, toIndex) {
        target = $(target);
        if (toIndex !== null && toIndex !== undefined) {
            return setValue(target, toIndex);
        } else {
            return getValue(target);
        }
    };

    /**
     * Removes the tabindex attribute altogether from each element.
     */
    fluid.tabindex.remove = function (target) {
        target = $(target);
        return target.each(function (i, item) {
            $(item).removeAttr(normalizeTabindexName());
        });
    };

    /**
     * Determines if an element actually has a tabindex attribute present.
     */
    fluid.tabindex.hasAttr = function (target) {
        target = $(target);
        if (target.length <= 0) {
            return false;
        }
        var togo = target.map(
            function () {
                var attributeNode = this.getAttributeNode(normalizeTabindexName());
                return attributeNode ? attributeNode.specified : false;
            }
        );
        return togo.length === 1 ? togo[0] : togo;
    };

    /**
     * Determines if an element either has a tabindex attribute or is naturally tab-focussable.
     */
    fluid.tabindex.has = function (target) {
        target = $(target);
        return fluid.tabindex.hasAttr(target) || canHaveDefaultTabindex(target);
    };

    // Keyboard navigation
    // Public, static constants needed by the rest of the library.
    fluid.a11y = $.a11y || {};

    fluid.a11y.orientation = {
        HORIZONTAL: 0,
        VERTICAL: 1,
        BOTH: 2
    };

    var UP_DOWN_KEYMAP = {
        next: $.ui.keyCode.DOWN,
        previous: $.ui.keyCode.UP
    };

    var LEFT_RIGHT_KEYMAP = {
        next: $.ui.keyCode.RIGHT,
        previous: $.ui.keyCode.LEFT
    };

    // Private functions.
    var unwrap = function (element) {
        return element.jquery ? element[0] : element; // Unwrap the element if it's a jQuery.
    };


    var makeElementsTabFocussable = function (elements) {
        // If each element doesn't have a tabindex, or has one set to a negative value, set it to 0.
        elements.each(function (idx, item) {
            item = $(item);
            if (!item.fluid("tabindex.has") || item.fluid("tabindex") < 0) {
                item.fluid("tabindex", 0);
            }
        });
    };

    // Public API.
    /**
     * Makes all matched elements available in the tab order by setting their tabindices to "0".
     */
    fluid.tabbable = function (target) {
        target = $(target);
        makeElementsTabFocussable(target);
    };

    /*********************************************************************** 
     * Selectable functionality - geometrising a set of nodes such that they
     * can be navigated (by setting focus) using a set of directional keys
     */

    var CONTEXT_KEY = "selectionContext";
    var NO_SELECTION = -32768;

    var cleanUpWhenLeavingContainer = function (selectionContext) {
        if (selectionContext.activeItemIndex !== NO_SELECTION) {
            if (selectionContext.options.onLeaveContainer) {
                selectionContext.options.onLeaveContainer(
                    selectionContext.selectables[selectionContext.activeItemIndex]
                );
            } else if (selectionContext.options.onUnselect) {
                selectionContext.options.onUnselect(
                    selectionContext.selectables[selectionContext.activeItemIndex]
                );
            }
        }

        if (!selectionContext.options.rememberSelectionState) {
            selectionContext.activeItemIndex = NO_SELECTION;
        }
    };

    /**
     * Does the work of selecting an element and delegating to the client handler.
     */
    var drawSelection = function (elementToSelect, handler) {
        if (handler) {
            handler(elementToSelect);
        }
    };

    /**
     * Does does the work of unselecting an element and delegating to the client handler.
     */
    var eraseSelection = function (selectedElement, handler) {
        if (handler && selectedElement) {
            handler(selectedElement);
        }
    };

    var unselectElement = function (selectedElement, selectionContext) {
        eraseSelection(selectedElement, selectionContext.options.onUnselect);
    };

    var selectElement = function (elementToSelect, selectionContext) {
        // It's possible that we're being called programmatically, in which case we should clear any previous selection.
        unselectElement(selectionContext.selectedElement(), selectionContext);

        elementToSelect = unwrap(elementToSelect);
        var newIndex = selectionContext.selectables.index(elementToSelect);

        // Next check if the element is a known selectable. If not, do nothing.
        if (newIndex === -1) {
            return;
        }

        // Select the new element.
        selectionContext.activeItemIndex = newIndex;
        drawSelection(elementToSelect, selectionContext.options.onSelect);
    };

    var selectableFocusHandler = function (selectionContext) {
        return function (evt) {
            // FLUID-3590: newer browsers (FF 3.6, Webkit 4) have a form of "bug" in that they will go bananas
            // on attempting to move focus off an element which has tabindex dynamically set to -1.
            $(evt.target).fluid("tabindex", 0);
            selectElement(evt.target, selectionContext);

            // Force focus not to bubble on some browsers.
            return evt.stopPropagation();
        };
    };

    var selectableBlurHandler = function (selectionContext) {
        return function (evt) {
            $(evt.target).fluid("tabindex", selectionContext.options.selectablesTabindex);
            unselectElement(evt.target, selectionContext);

            // Force blur not to bubble on some browsers.
            return evt.stopPropagation();
        };
    };

    var reifyIndex = function (sc_that) {
        var elements = sc_that.selectables;
        if (sc_that.activeItemIndex >= elements.length) {
            sc_that.activeItemIndex = (sc_that.options.noWrap ? elements.length - 1 : 0);
        }
        if (sc_that.activeItemIndex < 0 && sc_that.activeItemIndex !== NO_SELECTION) {
            sc_that.activeItemIndex = (sc_that.options.noWrap ? 0 : elements.length - 1);
        }
        if (sc_that.activeItemIndex >= 0) {
            fluid.focus(elements[sc_that.activeItemIndex]);
        }
    };

    var prepareShift = function (selectionContext) {
        // FLUID-3590: FF 3.6 and Safari 4.x won't fire blur() when programmatically moving focus.
        var selElm = selectionContext.selectedElement();
        if (selElm) {
            fluid.blur(selElm);
        }

        unselectElement(selectionContext.selectedElement(), selectionContext);
        if (selectionContext.activeItemIndex === NO_SELECTION) {
            selectionContext.activeItemIndex = -1;
        }
    };

    var focusNextElement = function (selectionContext) {
        prepareShift(selectionContext);
        ++selectionContext.activeItemIndex;
        reifyIndex(selectionContext);
    };

    var focusPreviousElement = function (selectionContext) {
        prepareShift(selectionContext);
        --selectionContext.activeItemIndex;
        reifyIndex(selectionContext);
    };

    var arrowKeyHandler = function (selectionContext, keyMap, userHandlers) {
        return function (evt) {
            if (evt.which === keyMap.next) {
                focusNextElement(selectionContext);
                evt.preventDefault();
            } else if (evt.which === keyMap.previous) {
                focusPreviousElement(selectionContext);
                evt.preventDefault();
            }
        };
    };

    var getKeyMapForDirection = function (direction) {
        // Determine the appropriate mapping for next and previous based on the specified direction.
        var keyMap;
        if (direction === fluid.a11y.orientation.HORIZONTAL) {
            keyMap = LEFT_RIGHT_KEYMAP;
        } 
        else if (direction === fluid.a11y.orientation.VERTICAL) {
            // Assume vertical in any other case.
            keyMap = UP_DOWN_KEYMAP;
        }

        return keyMap;
    };

    var tabKeyHandler = function (selectionContext) {
        return function (evt) {
            if (evt.which !== $.ui.keyCode.TAB) {
                return;
            }
            cleanUpWhenLeavingContainer(selectionContext);

            // Catch Shift-Tab and note that focus is on its way out of the container.
            if (evt.shiftKey) {
                selectionContext.focusIsLeavingContainer = true;
            }
        };
    };

    var containerFocusHandler = function (selectionContext) {
        return function (evt) {
            var shouldOrig = selectionContext.options.autoSelectFirstItem;
            var shouldSelect = typeof(shouldOrig) === "function" ? shouldOrig() : shouldOrig;

            // Override the autoselection if we're on the way out of the container.
            if (selectionContext.focusIsLeavingContainer) {
                shouldSelect = false;
            }

            // This target check works around the fact that sometimes focus bubbles, even though it shouldn't.
            if (shouldSelect && evt.target === selectionContext.container.get(0)) {
                if (selectionContext.activeItemIndex === NO_SELECTION) {
                    selectionContext.activeItemIndex = 0;
                }
                fluid.focus(selectionContext.selectables[selectionContext.activeItemIndex]);
            }

            // Force focus not to bubble on some browsers.
            return evt.stopPropagation();
        };
    };

    var containerBlurHandler = function (selectionContext) {
        return function (evt) {
            selectionContext.focusIsLeavingContainer = false;

            // Force blur not to bubble on some browsers.
            return evt.stopPropagation();
        };
    };

    var makeElementsSelectable = function (container, defaults, userOptions) {

        var options = $.extend(true, {}, defaults, userOptions);

        var keyMap = getKeyMapForDirection(options.direction);

        var selectableElements = options.selectableElements ? options.selectableElements :
            container.find(options.selectableSelector);
          
        // Context stores the currently active item(undefined to start) and list of selectables.
        var that = {
            container: container,
            activeItemIndex: NO_SELECTION,
            selectables: selectableElements,
            focusIsLeavingContainer: false,
            options: options
        };

        that.selectablesUpdated = function (focusedItem) {
          // Remove selectables from the tab order and add focus/blur handlers
            if (typeof(that.options.selectablesTabindex) === "number") {
                that.selectables.fluid("tabindex", that.options.selectablesTabindex);
            }
            that.selectables.unbind("focus." + CONTEXT_KEY);
            that.selectables.unbind("blur." + CONTEXT_KEY);
            that.selectables.bind("focus." + CONTEXT_KEY, selectableFocusHandler(that));
            that.selectables.bind("blur."  + CONTEXT_KEY, selectableBlurHandler(that));
            if (keyMap && that.options.noBubbleListeners) {
                that.selectables.unbind("keydown." + CONTEXT_KEY);
                that.selectables.bind("keydown." + CONTEXT_KEY, arrowKeyHandler(that, keyMap));
            }
            if (focusedItem) {
                selectElement(focusedItem, that);
            }
            else {
                reifyIndex(that);
            }
        };

        that.refresh = function () {
            if (!that.options.selectableSelector) {
                fluid.fail("Cannot refresh selectable context which was not initialised by a selector");
            }
            that.selectables = container.find(options.selectableSelector);
            that.selectablesUpdated();
        };
        
        that.selectedElement = function () {
            return that.activeItemIndex < 0 ? null : that.selectables[that.activeItemIndex];
        };
        
        // Add various handlers to the container.
        if (keyMap && !that.options.noBubbleListeners) {
            container.keydown(arrowKeyHandler(that, keyMap));
        }
        container.keydown(tabKeyHandler(that));
        container.focus(containerFocusHandler(that));
        container.blur(containerBlurHandler(that));
        
        that.selectablesUpdated();

        return that;
    };

    /**
     * Makes all matched elements selectable with the arrow keys.
     * Supply your own handlers object with onSelect: and onUnselect: properties for custom behaviour.
     * Options provide configurability, including direction: and autoSelectFirstItem:
     * Currently supported directions are jQuery.a11y.directions.HORIZONTAL and VERTICAL.
     */
    fluid.selectable = function (target, options) {
        target = $(target);
        var that = makeElementsSelectable(target, fluid.selectable.defaults, options);
        fluid.setScopedData(target, CONTEXT_KEY, that);
        return that;
    };

    /**
     * Selects the specified element.
     */
    fluid.selectable.select = function (target, toSelect) {
        fluid.focus(toSelect);
    };

    /**
     * Selects the next matched element.
     */
    fluid.selectable.selectNext = function (target) {
        target = $(target);
        focusNextElement(fluid.getScopedData(target, CONTEXT_KEY));
    };

    /**
     * Selects the previous matched element.
     */
    fluid.selectable.selectPrevious = function (target) {
        target = $(target);
        focusPreviousElement(fluid.getScopedData(target, CONTEXT_KEY));
    };

    /**
     * Returns the currently selected item wrapped as a jQuery object.
     */
    fluid.selectable.currentSelection = function (target) {
        target = $(target);
        var that = fluid.getScopedData(target, CONTEXT_KEY);
        return $(that.selectedElement());
    };

    fluid.selectable.defaults = {
        direction: fluid.a11y.orientation.VERTICAL,
        selectablesTabindex: -1,
        autoSelectFirstItem: true,
        rememberSelectionState: true,
        selectableSelector: ".selectable",
        selectableElements: null,
        onSelect: null,
        onUnselect: null,
        onLeaveContainer: null,
        noWrap: false
    };

    /********************************************************************
     *  Activation functionality - declaratively associating actions with 
     * a set of keyboard bindings.
     */

    var checkForModifier = function (binding, evt) {
        // If no modifier was specified, just return true.
        if (!binding.modifier) {
            return true;
        }

        var modifierKey = binding.modifier;
        var isCtrlKeyPresent = modifierKey && evt.ctrlKey;
        var isAltKeyPresent = modifierKey && evt.altKey;
        var isShiftKeyPresent = modifierKey && evt.shiftKey;

        return isCtrlKeyPresent || isAltKeyPresent || isShiftKeyPresent;
    };

    /** Constructs a raw "keydown"-facing handler, given a binding entry. This
     *  checks whether the key event genuinely triggers the event and forwards it
     *  to any "activateHandler" registered in the binding. 
     */
    var makeActivationHandler = function (binding) {
        return function (evt) {
            var target = evt.target;
            if (!fluid.enabled(target)) {
                return;
            }
// The following 'if' clause works in the real world, but there's a bug in the jQuery simulation
// that causes keyboard simulation to fail in Safari, causing our tests to fail:
//     http://ui.jquery.com/bugs/ticket/3229
// The replacement 'if' clause works around this bug.
// When this issue is resolved, we should revert to the original clause.
//            if (evt.which === binding.key && binding.activateHandler && checkForModifier(binding, evt)) {
            var code = evt.which ? evt.which : evt.keyCode;
            if (code === binding.key && binding.activateHandler && checkForModifier(binding, evt)) {
                var event = $.Event("fluid-activate");
                $(target).trigger(event, [binding.activateHandler]);
                if (event.isDefaultPrevented()) {
                    evt.preventDefault();
                }
            }
        };
    };

    var makeElementsActivatable = function (elements, onActivateHandler, defaultKeys, options) {
        // Create bindings for each default key.
        var bindings = [];
        $(defaultKeys).each(function (index, key) {
            bindings.push({
                modifier: null,
                key: key,
                activateHandler: onActivateHandler
            });
        });

        // Merge with any additional key bindings.
        if (options && options.additionalBindings) {
            bindings = bindings.concat(options.additionalBindings);
        }

        fluid.initEnablement(elements);

        // Add listeners for each key binding.
        for (var i = 0; i < bindings.length; ++i) {
            var binding = bindings[i];
            elements.keydown(makeActivationHandler(binding));
        }
        elements.bind("fluid-activate", function (evt, handler) {
            handler = handler || onActivateHandler;
            return handler ? handler(evt) : null;
        });
    };

    /**
     * Makes all matched elements activatable with the Space and Enter keys.
     * Provide your own handler function for custom behaviour.
     * Options allow you to provide a list of additionalActivationKeys.
     */
    fluid.activatable = function (target, fn, options) {
        target = $(target);
        makeElementsActivatable(target, fn, fluid.activatable.defaults.keys, options);
    };

    /**
     * Activates the specified element.
     */
    fluid.activate = function (target) {
        $(target).trigger("fluid-activate");
    };

    // Public Defaults.
    fluid.activatable.defaults = {
        keys: [$.ui.keyCode.ENTER, $.ui.keyCode.SPACE]
    };

  
})(jQuery, fluid_1_5);
/*
Copyright 2010-2011 Lucendo Development Ltd.
Copyright 2010-2011 OCAD University

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

/** This file contains functions which depend on the presence of a DOM document
 *  and which depend on the contents of Fluid.js **/

// Declare dependencies
/*global fluid_1_5:true, jQuery*/

// JSLint options 
/*jslint white: true, funcinvoke: true, undef: true, newcap: true, nomen: true, regexp: true, bitwise: true, browser: true, forin: true, maxerr: 100, indent: 4 */

var fluid_1_5 = fluid_1_5 || {};

(function ($, fluid) {
    
    fluid.defaults("fluid.viewComponent", {
        gradeNames: ["fluid.littleComponent", "fluid.modelComponent", "fluid.eventedComponent"],
        initFunction: "fluid.initView",
        argumentMap: {
            container: 0,
            options: 1
        }
    });


    // unsupported, NON-API function
    // NOTE: this function represents a temporary strategy until we have more integrated IoC debugging.
    // It preserves the current framework behaviour for the 1.4 release, but provides a more informative
    // diagnostic - in fact, it is perfectly acceptable for a component's creator to return no value and
    // the failure is really in assumptions in fluid.initComponent. Revisit this issue for 1.5
    fluid.diagnoseFailedView = function (componentName, that, options, args) {
        if (!that && fluid.hasGrade(options, "fluid.viewComponent")) {
            var container = fluid.wrap(args[1]);
            var message1 = "Instantiation of autoInit component with type " + componentName + " failed, since ";
            if (container.length === 0) {
                fluid.fail(message1 + "selector \"", args[1], "\" did not match any markup in the document");
            } else {
                fluid.fail(message1 + " component creator function did not return a value");
            }  
        }  
    };
    
    fluid.checkTryCatchParameter = function () {
        var location = window.location || { search: "", protocol: "file:" };
        var GETParams = location.search.slice(1).split('&');
        return fluid.contains(GETParams, "notrycatch");
    };
    
    fluid.notrycatch = fluid.checkTryCatchParameter();

   
    /**
     * Wraps an object in a jQuery if it isn't already one. This function is useful since
     * it ensures to wrap a null or otherwise falsy argument to itself, rather than the
     * often unhelpful jQuery default of returning the overall document node.
     * 
     * @param {Object} obj the object to wrap in a jQuery
     * @param {jQuery} userJQuery the jQuery object to use for the wrapping, optional - use the current jQuery if absent
     */
    fluid.wrap = function (obj, userJQuery) {
        userJQuery = userJQuery || $;
        return ((!obj || obj.jquery) ? obj : userJQuery(obj)); 
    };
    
    /**
     * If obj is a jQuery, this function will return the first DOM element within it.
     * 
     * @param {jQuery} obj the jQuery instance to unwrap into a pure DOM element
     */
    fluid.unwrap = function (obj) {
        return obj && obj.jquery && obj.length === 1 ? obj[0] : obj; // Unwrap the element if it's a jQuery.
    };
    
    /**
     * Fetches a single container element and returns it as a jQuery.
     * 
     * @param {String||jQuery||element} containerSpec an id string, a single-element jQuery, or a DOM element specifying a unique container
     * @param {Boolean} fallible <code>true</code> if an empty container is to be reported as a valid condition
     * @return a single-element jQuery of container
     */
    fluid.container = function (containerSpec, fallible, userJQuery) {
        if (userJQuery) {
            containerSpec = fluid.unwrap(containerSpec);
        }
        var container = fluid.wrap(containerSpec, userJQuery);
        if (fallible && (!container || container.length === 0)) {
            return null;
        }
        
        // Throw an exception if we've got more or less than one element.
        if (!container || !container.jquery || container.length !== 1) {
            if (typeof (containerSpec) !== "string") {
                containerSpec = container.selector;
            }
            var count = container.length !== undefined ? container.length : 0;
            fluid.fail((count > 1 ? "More than one (" + count + ") container elements were"
                    : "No container element was") + " found for selector " + containerSpec);
        }
        if (!fluid.isDOMNode(container[0])) {
            fluid.fail("fluid.container was supplied a non-jQueryable element");  
        }
        
        return container;
    };
    
    /**
     * Creates a new DOM Binder instance, used to locate elements in the DOM by name.
     * 
     * @param {Object} container the root element in which to locate named elements
     * @param {Object} selectors a collection of named jQuery selectors
     */
    fluid.createDomBinder = function (container, selectors) {
        var cache = {}, that = {};
        var userJQuery = container.constructor;
        
        function cacheKey(name, thisContainer) {
            return fluid.allocateSimpleId(thisContainer) + "-" + name;
        }

        function record(name, thisContainer, result) {
            cache[cacheKey(name, thisContainer)] = result;
        }

        that.locate = function (name, localContainer) {
            var selector, thisContainer, togo;
            
            selector = selectors[name];
            thisContainer = localContainer ? localContainer : container;
            if (!thisContainer) {
                fluid.fail("DOM binder invoked for selector " + name + " without container");
            }

            if (!selector) {
                return thisContainer;
            }

            if (typeof (selector) === "function") {
                togo = userJQuery(selector.call(null, fluid.unwrap(thisContainer)));
            } else {
                togo = userJQuery(selector, thisContainer);
            }
            if (togo.get(0) === document) {
                togo = [];
            }
            if (!togo.selector) {
                togo.selector = selector;
                togo.context = thisContainer;
            }
            togo.selectorName = name;
            record(name, thisContainer, togo);
            return togo;
        };
        that.fastLocate = function (name, localContainer) {
            var thisContainer = localContainer ? localContainer : container;
            var key = cacheKey(name, thisContainer);
            var togo = cache[key];
            return togo ? togo : that.locate(name, localContainer);
        };
        that.clear = function () {
            cache = {};
        };
        that.refresh = function (names, localContainer) {
            var thisContainer = localContainer ? localContainer : container;
            if (typeof names === "string") {
                names = [names];
            }
            if (thisContainer.length === undefined) {
                thisContainer = [thisContainer];
            }
            for (var i = 0; i < names.length; ++i) {
                for (var j = 0; j < thisContainer.length; ++j) {
                    that.locate(names[i], thisContainer[j]);
                }
            }
        };
        that.resolvePathSegment = that.locate;
        
        return that;
    };
    
    /** Expect that jQuery selector query has resulted in a non-empty set of 
     * results. If none are found, this function will fail with a diagnostic message, 
     * with the supplied message prepended.
     */
    fluid.expectFilledSelector = function (result, message) {
        if (result && result.length === 0 && result.jquery) {
            fluid.fail(message + ": selector \"" + result.selector + "\" with name " + result.selectorName +
                       " returned no results in context " + fluid.dumpEl(result.context));
        }
    };
    
    /** 
     * The central initialiation method called as the first act of every Fluid
     * component. This function automatically merges user options with defaults,
     * attaches a DOM Binder to the instance, and configures events.
     * 
     * @param {String} componentName The unique "name" of the component, which will be used
     * to fetch the default options from store. By recommendation, this should be the global
     * name of the component's creator function.
     * @param {jQueryable} container A specifier for the single root "container node" in the
     * DOM which will house all the markup for this component.
     * @param {Object} userOptions The configuration options for this component.
     */
     // 4th argument is NOT SUPPORTED, see comments for initLittleComponent
    fluid.initView = function (componentName, containerSpec, userOptions, localOptions) {
        var container = fluid.container(containerSpec, true);
        fluid.expectFilledSelector(container, "Error instantiating component with name \"" + componentName);
        if (!container) {
            return null;
        }
        var that = fluid.initLittleComponent(componentName, userOptions, localOptions || {gradeNames: ["fluid.viewComponent"]});
        var userJQuery = that.options.jQuery; // Do it a second time to correct for jQuery injection
        if (userJQuery) {
            container = fluid.container(containerSpec, true, userJQuery);
        }
        fluid.log("Constructing view component " + componentName + " with container " + container.constructor.expando + 
            (userJQuery ? " user jQuery " + userJQuery.expando : "") + " env: " + $.expando);
        that.container = container;
        fluid.initDomBinder(that);

        return that;
    };
    
    /**
     * Creates a new DOM Binder instance for the specified component and mixes it in.
     * 
     * @param {Object} that the component instance to attach the new DOM Binder to
     */
    fluid.initDomBinder = function (that) {
        that.dom = fluid.createDomBinder(that.container, that.options.selectors);
        that.locate = that.dom.locate;      
    };

    // DOM Utilities.
    
    /**
     * Finds the nearest ancestor of the element that passes the test
     * @param {Element} element DOM element
     * @param {Function} test A function which takes an element as a parameter and return true or false for some test
     */
    fluid.findAncestor = function (element, test) {
        element = fluid.unwrap(element);
        while (element) {
            if (test(element)) {
                return element;
            }
            element = element.parentNode;
        }
    };
    
    fluid.findForm = function (node) {
        return fluid.findAncestor(node, function (element) {
            return element.nodeName.toLowerCase() === "form";
        });
    };
    
    /** A utility with the same signature as jQuery.text and jQuery.html, but without the API irregularity
     * that treats a single argument of undefined as different to no arguments */
    // in jQuery 1.7.1, jQuery pulled the same dumb trick with $.text() that they did with $.val() previously,
    // see comment in fluid.value below
    fluid.each(["text", "html"], function (method) {
        fluid[method] = function (node, newValue) {
            node = $(node);
            return newValue === undefined ? node[method]() : node[method](newValue);
        };   
    });
    
    /** A generalisation of jQuery.val to correctly handle the case of acquiring and
     * setting the value of clustered radio button/checkbox sets, potentially, given
     * a node corresponding to just one element.
     */
    fluid.value = function (nodeIn, newValue) {
        var node = fluid.unwrap(nodeIn);
        var multiple = false;
        if (node.nodeType === undefined && node.length > 1) {
            node = node[0];
            multiple = true;
        }
        if ("input" !== node.nodeName.toLowerCase() || !/radio|checkbox/.test(node.type)) {
            // resist changes to contract of jQuery.val() in jQuery 1.5.1 (see FLUID-4113)
            return newValue === undefined ? $(node).val() : $(node).val(newValue);
        }
        var name = node.name;
        if (name === undefined) {
            fluid.fail("Cannot acquire value from node " + fluid.dumpEl(node) + " which does not have name attribute set");
        }
        var elements;
        if (multiple) {
            elements = nodeIn;
        } else {
            elements = node.ownerDocument.getElementsByName(name);
            var scope = fluid.findForm(node);
            elements = $.grep(elements, function (element) {
                if (element.name !== name) {
                    return false;
                }
                return !scope || fluid.dom.isContainer(scope, element);
            });
        }
        if (newValue !== undefined) {
            if (typeof(newValue) === "boolean") {
                newValue = (newValue ? "true" : "false");
            }
          // jQuery gets this partially right, but when dealing with radio button array will
          // set all of their values to "newValue" rather than setting the checked property
          // of the corresponding control. 
            $.each(elements, function () {
                this.checked = (newValue instanceof Array ? 
                    $.inArray(this.value, newValue) !== -1 : newValue === this.value);
            });
        } else { // this part jQuery will not do - extracting value from <input> array
            var checked = $.map(elements, function (element) {
                return element.checked ? element.value : null;
            });
            return node.type === "radio" ? checked[0] : checked;
        }
    };
    
    /**
     * Returns a jQuery object given the id of a DOM node. In the case the element
     * is not found, will return an empty list.
     */
    fluid.jById = function (id, dokkument) {
        dokkument = dokkument && dokkument.nodeType === 9 ? dokkument : document;
        var element = fluid.byId(id, dokkument);
        var togo = element ? $(element) : [];
        togo.selector = "#" + id;
        togo.context = dokkument;
        return togo;
    };
    
    /**
     * Returns an DOM element quickly, given an id
     * 
     * @param {Object} id the id of the DOM node to find
     * @param {Document} dokkument the document in which it is to be found (if left empty, use the current document)
     * @return The DOM element with this id, or null, if none exists in the document.
     */
    fluid.byId = function (id, dokkument) {
        dokkument = dokkument && dokkument.nodeType === 9 ? dokkument : document;
        var el = dokkument.getElementById(id);
        if (el) {
        // Use element id property here rather than attribute, to work around FLUID-3953
            if (el.id !== id) {
                fluid.fail("Problem in document structure - picked up element " +
                    fluid.dumpEl(el) + " for id " + id +
                    " without this id - most likely the element has a name which conflicts with this id");
            }
            return el;
        } else {
            return null;
        }
    };
    
    /**
     * Returns the id attribute from a jQuery or pure DOM element.
     * 
     * @param {jQuery||Element} element the element to return the id attribute for
     */
    fluid.getId = function (element) {
        return fluid.unwrap(element).id;
    };
    
    /** 
     * Allocate an id to the supplied element if it has none already, by a simple
     * scheme resulting in ids "fluid-id-nnnn" where nnnn is an increasing integer.
     */
    
    fluid.allocateSimpleId = function (element) {
        var simpleId = "fluid-id-" + fluid.allocateGuid();
        if (!element) {
            return simpleId;
        }
        element = fluid.unwrap(element);
        if (!element.id) {
            element.id = simpleId;
        }
        return element.id;
    };

    fluid.defaults("fluid.ariaLabeller", {
        labelAttribute: "aria-label",
        liveRegionMarkup: "<div class=\"liveRegion fl-offScreen-hidden\" aria-live=\"polite\"></div>",
        liveRegionId: "fluid-ariaLabeller-liveRegion",
        events: {
            generateLiveElement: "unicast"
        },
        listeners: {
            generateLiveElement: "fluid.ariaLabeller.generateLiveElement"
        }
    });
 
    fluid.ariaLabeller = function (element, options) {
        var that = fluid.initView("fluid.ariaLabeller", element, options);

        that.update = function (newOptions) {
            newOptions = newOptions || that.options;
            that.container.attr(that.options.labelAttribute, newOptions.text);
            if (newOptions.dynamicLabel) {
                var live = fluid.jById(that.options.liveRegionId); 
                if (live.length === 0) {
                    live = that.events.generateLiveElement.fire(that);
                }
                live.text(newOptions.text);
            }
        };
        
        that.update();
        return that;
    };
    
    fluid.ariaLabeller.generateLiveElement = function (that) {
        var liveEl = $(that.options.liveRegionMarkup);
        liveEl.prop("id", that.options.liveRegionId);
        $("body").append(liveEl);
        return liveEl;
    };
    
    var LABEL_KEY = "aria-labelling";
    
    fluid.getAriaLabeller = function (element) {
        element = $(element);
        var that = fluid.getScopedData(element, LABEL_KEY);
        return that;      
    };
    
    /** Manages an ARIA-mediated label attached to a given DOM element. An
     * aria-labelledby attribute and target node is fabricated in the document
     * if they do not exist already, and a "little component" is returned exposing a method
     * "update" that allows the text to be updated. */
    
    fluid.updateAriaLabel = function (element, text, options) {
        options = $.extend({}, options || {}, {text: text});
        var that = fluid.getAriaLabeller(element);
        if (!that) {
            that = fluid.ariaLabeller(element, options);
            fluid.setScopedData(element, LABEL_KEY, that);
        } else {
            that.update(options);
        }
        return that;
    };
    
    /** "Global Dismissal Handler" for the entire page. Attaches a click handler to the 
     * document root that will cause dismissal of any elements (typically dialogs) which 
     * have registered themselves. Dismissal through this route will automatically clean up 
     * the record - however, the dismisser themselves must take care to deregister in the case 
     * dismissal is triggered through the dialog interface itself. This component can also be 
     * automatically configured by fluid.deadMansBlur by means of the "cancelByDefault" option */ 
     
    var dismissList = {}; 
     
    $(document).click(function (event) { 
        var target = event.target; 
        while (target) { 
            if (dismissList[target.id]) { 
                return; 
            } 
            target = target.parentNode; 
        } 
        fluid.each(dismissList, function (dismissFunc, key) { 
            dismissFunc(event); 
            delete dismissList[key]; 
        }); 
    });
    // TODO: extend a configurable equivalent of the above dealing with "focusin" events
     
    /** Accepts a free hash of nodes and an optional "dismissal function".
     * If dismissFunc is set, this "arms" the dismissal system, such that when a click
     * is received OUTSIDE any of the hierarchy covered by "nodes", the dismissal function
     * will be executed.
     */ 
    fluid.globalDismissal = function (nodes, dismissFunc) { 
        fluid.each(nodes, function (node) {
          // Don't bother to use the real id if it is from a foreign document - we will never receive events
          // from it directly in any case - and foreign documents may be under the control of malign fiends
          // such as tinyMCE who allocate the same id to everything
            var id = fluid.unwrap(node).ownerDocument === document? fluid.allocateSimpleId(node) : fluid.allocateGuid();
            if (dismissFunc) { 
                dismissList[id] = dismissFunc; 
            } 
            else { 
                delete dismissList[id]; 
            } 
        }); 
    }; 
    
    /** Sets an interation on a target control, which morally manages a "blur" for
     * a possibly composite region.
     * A timed blur listener is set on the control, which waits for a short period of
     * time (options.delay, defaults to 150ms) to discover whether the reason for the 
     * blur interaction is that either a focus or click is being serviced on a nominated
     * set of "exclusions" (options.exclusions, a free hash of elements or jQueries). 
     * If no such event is received within the window, options.handler will be called
     * with the argument "control", to service whatever interaction is required of the
     * blur.
     */
    
    fluid.deadMansBlur = function (control, options) {
        var that = fluid.initLittleComponent("fluid.deadMansBlur", options);
        that.blurPending = false;
        that.lastCancel = 0;
        that.canceller = function (event) {
            fluid.log("Cancellation through " + event.type + " on " + fluid.dumpEl(event.target)); 
            that.lastCancel = Date.now();
            that.blurPending = false;
        };
        that.noteProceeded = function () {
            fluid.globalDismissal(that.options.exclusions);
        };
        that.reArm = function () {
            fluid.globalDismissal(that.options.exclusions, that.proceed);
        };
        that.addExclusion = function (exclusions) {
            fluid.globalDismissal(exclusions, that.proceed);
        };
        that.proceed = function (event) {
            fluid.log("Direct proceed through " + event.type + " on " + fluid.dumpEl(event.target));
            that.blurPending = false;
            that.options.handler(control);
        };
        fluid.each(that.options.exclusions, function (exclusion) {
            exclusion = $(exclusion);
            fluid.each(exclusion, function (excludeEl) {
                $(excludeEl).bind("focusin", that.canceller).
                    bind("fluid-focus", that.canceller).
                    click(that.canceller).mousedown(that.canceller);
    // Mousedown is added for FLUID-4212, as a result of Chrome bug 6759, 14204
            });
        });
        if (!that.options.cancelByDefault) {
            $(control).bind("focusout", function (event) {
                fluid.log("Starting blur timer for element " + fluid.dumpEl(event.target));
                var now = Date.now();
                fluid.log("back delay: " + (now - that.lastCancel));
                if (now - that.lastCancel > that.options.backDelay) {
                    that.blurPending = true;
                }
                setTimeout(function () {
                    if (that.blurPending) {
                        that.options.handler(control);
                    }
                }, that.options.delay);
            });
        }
        else {
            that.reArm();
        }
        return that;
    };

    fluid.defaults("fluid.deadMansBlur", {
        delay: 150,
        backDelay: 100
    });
    
})(jQuery, fluid_1_5);
/*
Copyright 2011 OCAD University
Copyright 2010-2011 Lucendo Development Ltd.

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

// Declare dependencies
/*global fluid_1_5:true, jQuery*/

// JSLint options 
/*jslint white: true, funcinvoke: true, continue: true, elsecatch: true, operator: true, jslintok:true, undef: true, newcap: true, regexp: true, bitwise: true, browser: true, forin: true, maxerr: 100, indent: 4 */

var fluid_1_5 = fluid_1_5 || {};

(function ($, fluid) {

    /** The Fluid "IoC System proper" - resolution of references and 
     * completely automated instantiation of declaratively defined
     * component trees */ 
    
    var inCreationMarker = "__CURRENTLY_IN_CREATION__";
    
    // unsupported, non-API function
    fluid.isFireBreak = function(component) {
        return component.options && component.options["fluid.visitComponents.fireBreak"];
    };
    
    // unsupported, non-API function
    // Currently still uses manual traversal - once we ban manually instantiated components,
    // it will use the instantiator's records instead. In that day, "fireBreak" will bite the dust too
    fluid.visitComponentChildren = function(that, visitor, options, path) {
        for (var name in that) {
            var newPath = options.instantiator.composePath(path, name);
            var component = that[name];
            //Every component *should* have an id, but some clients may not yet be compliant
            //if (component && component.typeName && !component.id) {
            //    fluid.fail("No id");
            //}
            if (!component || !component.typeName || (component.id && options.visited && options.visited[component.id])) {continue; }
            if (options.visited) {
                options.visited[component.id] = true;
            }
            if (visitor(component, name, newPath, path)) {
                return true;
            }
            if (!fluid.isFireBreak(component) && !options.flat) {
                fluid.visitComponentChildren(component, visitor, options, newPath);
            }
        }
    };
    
    // thatStack contains an increasing list of MORE SPECIFIC thats.
    // this visits all components starting from the current location (end of stack)
    // in visibility order up the tree.
    var visitComponents = function(instantiator, thatStack, visitor, options) {
        options = options || {
            visited: {},
            flat: true,
            instantiator: instantiator
        };
        for (var i = thatStack.length - 1; i >= 0; --i) {
            var that = thatStack[i];
            if (fluid.isFireBreak(that)) {
                return;
            }
            var path = instantiator.idToPath[that.id] || ""; // This resolves FLUID-4338
            if (that.typeName) {
                options.visited[that.id] = true;
                var memberName = fluid.pathUtil.getTailPath(path);
                if (visitor(that, memberName, path)) {
                    return;
                }
            }
            if (fluid.visitComponentChildren(that, visitor, options, path)) {
                return;
            }
        }
    };
    
    // An EL segment resolver strategy that will attempt to trigger creation of
    // components that it discovers along the EL path, if they have been defined but not yet
    // constructed. Spring, eat your heart out! Wot no SPR-2048?
    
    function makeGingerStrategy(instantiator, that, thatStack) {
        return function(component, thisSeg) {
            var atval = component[thisSeg];
            if (atval === undefined) {
                var parentPath = instantiator.idToPath[component.id];
                var childPath = fluid.composePath(parentPath, thisSeg);
                atval = instantiator.pathToComponent[childPath]; 
                // if it was not attached to the component, but it is in the instantiator, it MUST be in creation - prepare to fail
                if (atval) {
                    atval[inCreationMarker] = true;
                } 
            }
            if (atval !== undefined) {
                if (atval[inCreationMarker]) {
                    fluid.fail("Component " + fluid.dumpThat(atval) + " at path \"" + thisSeg 
                        + "\" of parent " + fluid.dumpThat(component) + " cannot be used for lookup" 
                        + " since it is still in creation. Please reorganise your dependencies so that they no longer contain circular references");
                }
            }
            else {
                if (fluid.get(component, fluid.path("options", "components", thisSeg, "type"))) {
                    fluid.initDependent(component, thisSeg);
                    atval = component[thisSeg];
                }
            }
            return atval;
        };
    }
    
    // unsupported, non-API function
    fluid.dumpThat = function(that) {
        return "{ typeName: \"" + that.typeName + "\" id: " + that.id + "}";
    };
    
        // unsupported, non-API function
    fluid.dumpThatStack = function(thatStack, instantiator) {
        var togo = fluid.transform(thatStack, function(that) {
            var path = instantiator.idToPath[that.id];
            return fluid.dumpThat(that) + (path? (" - path: " + path) : "");
        });
        return togo.join("\n");
    };

    // Return an array of objects describing the current activity
    // unsupported, non-API function
    fluid.describeActivity = function() {
        return fluid.globalThreadLocal().activityStack || [];
    };
    
    // Execute the supplied function with the specified activity description pushed onto the stack
    // unsupported, non-API function
    fluid.pushActivity = function(func, message) {
        if (!message || fluid.notrycatch) {
            return func();
        }
        var root = fluid.globalThreadLocal();
        if (!root.activityStack) {
            root.activityStack = [];
        }
        var frames = fluid.makeArray(message);
        frames.push("\n");
        frames.unshift("\n");
        root.activityStack = frames.concat(root.activityStack);
        return fluid.tryCatch(func, null, function() {
            root.activityStack = root.activityStack.slice(frames.length);
        });
    };
    
    // Return a function wrapped by the activity of describing its activity
    // unsupported, non-API function
    fluid.wrapActivity = fluid.notrycatch? fluid.identity : function(func, messageSpec) {
        return function() {
            var args = fluid.makeArray(arguments);
            var message = fluid.transform(fluid.makeArray(messageSpec), function(specEl) {
                if (typeof(specEl) === "string" && specEl.indexOf("arguments.") === 0) {
                    var el = specEl.substring("arguments.".length);
                    return fluid.get(args, el);
                }
                else {
                    return specEl;
                }
            });
            return fluid.pushActivity(function() {
                return func.apply(null, args);
            }, message);
        };
    };

    var localRecordExpected = /arguments|options|container/;

    function makeStackFetcher(instantiator, parentThat, localRecord, expandOptions) {
        expandOptions = expandOptions || {};
        var thatStack = instantiator.getFullStack(parentThat);
        var fetchStrategies = [fluid.model.funcResolverStrategy, makeGingerStrategy(instantiator, parentThat, thatStack)]; 
        var fetcher = function(parsed) {
            var context = parsed.context;
            var foundComponent;
            if (context === "instantiator") {
                // special treatment for the current instantiator which used to be discovered as unique in threadLocal
                return instantiator;
            }
            else if (context === "that") {
                foundComponent = parentThat; 
            }
            else if (localRecord && localRecordExpected.test(context)) {
                var fetched = fluid.get(localRecord[context], parsed.path);
                return (context === "arguments" || expandOptions.direct)? fetched : {
                    marker: context === "options"? fluid.EXPAND : fluid.EXPAND_NOW,
                    value: fetched
                };
            }
            if (!foundComponent) {
                visitComponents(instantiator, thatStack, function(component, name) {
                    if (context === name || context === component.typeName || context === component.nickName) {
                        foundComponent = component;
                        return true; // YOUR VISIT IS AT AN END!!
                    }
                    if (fluid.get(component, fluid.path("options", "components", context, "type")) && !component[context]) {
                        foundComponent = fluid.get(component, context, {strategies: fetchStrategies});
                        return true;
                    }
                });
            }
            if (!foundComponent && parsed.path !== "") {
                var ref = fluid.renderContextReference(parsed);
                fluid.log("Failed to resolve reference " + ref + ": thatStack contains\n" + fluid.dumpThatStack(thatStack, instantiator));
                fluid.fail("Failed to resolve reference " + ref + " - could not match context with name " 
                    + context + " from component leaf of type " + parentThat.typeName, "\ninstantiator contents: ", instantiator);
            }
            return fluid.get(foundComponent, parsed.path, fetchStrategies);
        };
        return fetcher;
    }
     
    function makeStackResolverOptions(instantiator, parentThat, localRecord, expandOptions) {
        return $.extend(true, {}, fluid.defaults("fluid.resolveEnvironment"), {
            fetcher: makeStackFetcher(instantiator, parentThat, localRecord, expandOptions)
        }); 
    }
    
    // unsupported, non-API function
    fluid.instantiator = function(freeInstantiator) {
        // NB: We may not use the options merging framework itself here, since "withInstantiator" below
        // will blow up, as it tries to resolve the instantiator which we are instantiating *NOW*
        var preThat = {
            options: {
                "fluid.visitComponents.fireBreak": true         
            },
            idToPath: {},
            pathToComponent: {},
            nickName: "instantiator",
            composePath: fluid.composePath // For speed, we declare that no component's name may contain a period
        };
        var that = fluid.typeTag("fluid.instantiator");
        that = $.extend(that, preThat);

        that.getThatStack = function(component) {
            var path = that.idToPath[component.id] || "";
            var parsed = fluid.model.parseEL(path);
            var togo = fluid.transform(parsed, function(value, i) {
                var parentPath = fluid.model.composeSegments.apply(null, parsed.slice(0, i + 1));
                return that.pathToComponent[parentPath];
            });
            var root = that.pathToComponent[""];
            if (root) {
                togo.unshift(root);
            }
            return togo;
        };
        that.getEnvironmentalStack = function() {
            var togo = [fluid.staticEnvironment];
            if (!freeInstantiator) {
                togo.push(fluid.globalThreadLocal());
            }
            return togo;
        };
        that.getFullStack = function(component) {
            var thatStack = component? that.getThatStack(component) : [];
            return that.getEnvironmentalStack().concat(thatStack);
        };
        function recordComponent(component, path, created) {
            if (created) {
                that.idToPath[component.id] = path;
            }
            if (that.pathToComponent[path]) {
                fluid.fail("Error during instantiation - path " + path + " which has just created component " + fluid.dumpThat(component) 
                    + " has already been used for component " + fluid.dumpThat(that.pathToComponent[path]) + " - this is a circular instantiation or other oversight."
                    + " Please clear the component using instantiator.clearComponent() before reusing the path.");
            }
            that.pathToComponent[path] = component;
        }
        that.recordRoot = function(component) {
            if (component && component.id && !that.pathToComponent[""]) {
                recordComponent(component, "", true);
            }  
        };
        that.pushUpcomingInstantiation = function(parent, name) {
            that.expectedParent = parent;
            that.expectedName = name;
        };
        that.recordComponent = function(component) {
            if (that.expectedName) {
                that.recordKnownComponent(that.expectedParent, component, that.expectedName, true);
                delete that.expectedName;
                delete that.expectedParent;
            }
            else {
                that.recordRoot(component);
            }
        };
        that.clearComponent = function(component, name, child, options, noModTree, path) {
            var record = that.idToPath[component.id];
            // use flat recursion since we want to use our own recursion rather than rely on "visited" records
            options = options || {flat: true, instantiator: that};
            child = child || component[name];
            path = path || record;
            if (path === undefined) {
                fluid.fail("Cannot clear component " + name + " from component ", component, 
                    " which was not created by this instantiator"); 
            }

            var childPath = that.composePath(path, name);

            // only recurse on components which were created in place - if the id record disagrees with the
            // recurse path, it must have been injected
            if (record === path) { 
                fluid.visitComponentChildren(child, function(gchild, gchildname, newPath, parentPath) {
                    that.clearComponent(child, gchildname, null, options, true, parentPath);
                }, options, childPath);
            }
            delete that.idToPath[child.id];         // there may be no entry - if injected
            delete that.pathToComponent[childPath]; // there may be no entry - if created informally
            if (!noModTree) {
                delete component[name]; // there may be no entry - if creation is not concluded
            }
        };
        that.recordKnownComponent = function(parent, component, name, created) {
            var parentPath = that.idToPath[parent.id] || "";
            var path = that.composePath(parentPath, name);
            recordComponent(component, path, created);
        };
        return that;
    };
    
    fluid.freeInstantiator = fluid.instantiator(true);
    
    // unsupported, non-API function
    fluid.argMapToDemands = function(argMap) {
        var togo = [];
        fluid.each(argMap, function(value, key) {
            togo[value] = "{" + key + "}";  
        });
        return togo;
    };
    
    // unsupported, non-API function
    fluid.makePassArgsSpec = function(initArgs) {
        return fluid.transform(initArgs, function(arg, index) {
            return "{arguments}." + index;
        });
    };
    
    function mergeToMergeAll(options) {
        if (options && options.mergeOptions) {
            options.mergeAllOptions = ["{options}"].concat(fluid.makeArray(options.mergeOptions));
        }
    }
    
    function upgradeMergeOptions(demandspec) {
        mergeToMergeAll(demandspec);
        if (demandspec.mergeAllOptions) {
            if (demandspec.options) {
                fluid.fail("demandspec ", demandspec, 
                    " is invalid - cannot specify literal options together with mergeOptions or mergeAllOptions"); 
            }
            demandspec.options = {
                mergeAllOptions: demandspec.mergeAllOptions
            };
        }
        if (demandspec.options) {
            delete demandspec.options.mergeOptions;
        }
    }
    
    /** Given a concrete argument list and/or options, determine the final concrete
     * "invocation specification" which is coded by the supplied demandspec in the 
     * environment "thatStack" - the return is a package of concrete global function name
     * and argument list which is suitable to be executed directly by fluid.invokeGlobalFunction.
     */
    // unsupported, non-API function
    fluid.embodyDemands = function(instantiator, parentThat, demandspec, initArgs, options) {
        options = options || {};
        
        upgradeMergeOptions(demandspec);
        var oldOptions = fluid.get(options, "componentRecord.options");
        options.componentRecord = $.extend(true, {}, options.componentRecord, 
            fluid.censorKeys(demandspec, ["args", "funcName", "registeredFrom"]));
        var mergeAllZero = fluid.get(options, "componentRecord.options.mergeAllOptions.0");
        if (mergeAllZero === "{options}") {
            fluid.set(options, "componentRecord.options.mergeAllOptions.0", oldOptions);
        }
        
        var demands = fluid.makeArray(demandspec.args);
        var upDefaults = fluid.defaults(demandspec.funcName); // I can SEE into TIME!!
        var argMap = upDefaults? upDefaults.argumentMap : null;
        var inferMap = false;
        if (!argMap && (upDefaults || (options && options.componentRecord)) && !options.passArgs) {
            inferMap = true;
            // infer that it must be a little component if we have any reason to believe it is a component
            if (demands.length < 2) {
                argMap = fluid.rawDefaults("fluid.littleComponent").argumentMap;
            }
            else {
                argMap = {options: demands.length - 1}; // wild guess in the old style
            }
        }
        options = options || {};
        if (demands.length === 0) {
            if (options.componentRecord && argMap) {
                demands = fluid.argMapToDemands(argMap);
            }
            else if (options.passArgs) {
                demands = fluid.makePassArgsSpec(initArgs);
            }
        }
        var localRecord = $.extend({"arguments": initArgs}, fluid.censorKeys(options.componentRecord, ["type"]));
        fluid.each(argMap, function(index, name) {
            if (initArgs.length > 0) {
                localRecord[name] = localRecord["arguments"][index];
            }
            if (demandspec[name] !== undefined && localRecord[name] === undefined) {
                localRecord[name] = demandspec[name];
            }
        });
        mergeToMergeAll(localRecord.options);
        mergeToMergeAll(argMap && demands[argMap.options]);
        var upstreamLocalRecord = $.extend({}, localRecord);
        if (options.componentRecord.options !== undefined) {
            upstreamLocalRecord.options = options.componentRecord.options;
        }
        var expandOptions = makeStackResolverOptions(instantiator, parentThat, localRecord);
        var args = [];
        if (demands) {
            for (var i = 0; i < demands.length; ++i) {
                var arg = demands[i];
                // Weak detection since we cannot guarantee this material has not been copied
                if (fluid.isMarker(arg) && arg.value === fluid.COMPONENT_OPTIONS.value) {
                    arg = "{options}";
                    // Backwards compatibility for non-users of GRADES - last-ditch chance to correct the inference
                    if (inferMap) {
                        argMap = {options: i};
                    } 
                }
                if (typeof(arg) === "string") {
                    if (arg.charAt(0) === "@") {
                        var argpos = arg.substring(1);
                        arg = "{arguments}." + argpos;
                    }
                }
                if (!argMap || argMap.options !== i) {
                    // defer expansion required if it is non-pseudoarguments demands and this argument *is* the options
                    args[i] = fluid.expander.expandLight(arg, expandOptions);
                }
                else { // It is the component options
                    if (arg && typeof(arg) === "object" && !arg.targetTypeName) {
                        arg.targetTypeName = demandspec.funcName;
                    }
                    // ensure to copy the arg since it is an alias of the demand block material (FLUID-4223)
                    // and will be destructively expanded
                    args[i] = {marker: fluid.EXPAND, value: fluid.copy(arg), localRecord: upstreamLocalRecord};
                }
                if (args[i] && fluid.isMarker(args[i].marker, fluid.EXPAND_NOW)) {
                    args[i] = fluid.expander.expandLight(args[i].value, expandOptions);
                }
            }
        }
        else {
            args = initArgs? initArgs : [];
        }

        var togo = {
            args: args,
            funcName: demandspec.funcName
        };
        return togo;
    };
    
    var aliasTable = {};
    
    fluid.alias = function(demandingName, aliasName) {
        if (aliasName) {
            aliasTable[demandingName] = aliasName;
        }
        else {
            return aliasTable[demandingName];
        }
    };
   
    var dependentStore = {};
    
    function searchDemands(demandingName, contextNames) {
        var exist = dependentStore[demandingName] || [];
outer:  for (var i = 0; i < exist.length; ++i) {
            var rec = exist[i];
            for (var j = 0; j < contextNames.length; ++j) {
                if (rec.contexts[j] !== contextNames[j]) {
                    continue outer;
                }
            }
            return rec.spec; // jslint:ok
        }
    }
    
    var isDemandLogging = false;
    fluid.setDemandLogging = function(set) {
        isDemandLogging = set;  
    };
    
    // unsupported, non-API function
    fluid.isDemandLogging = function(demandingNames) {
        return isDemandLogging && fluid.isLogging();
    };
    
    fluid.demands = function(demandingName, contextName, spec) {
        var contextNames = fluid.makeArray(contextName).sort(); 
        if (!spec) {
            return searchDemands(demandingName, contextNames);
        }
        else if (spec.length) {
            spec = {args: spec};
        }
        if (fluid.getCallerInfo && fluid.isDemandLogging()) {
            var callerInfo = fluid.getCallerInfo(5);
            if (callerInfo) {
                spec.registeredFrom = callerInfo;
            }
        }
        var exist = dependentStore[demandingName];
        if (!exist) {
            exist = [];
            dependentStore[demandingName] = exist;
        }
        exist.push({contexts: contextNames, spec: spec});
    };

    // unsupported, non-API function
    fluid.compareDemands = function(speca, specb) {
        var p1 = speca.uncess - specb.uncess;
        return p1 === 0? specb.intersect - speca.intersect : p1;
    };
    
    // unsupported, non-API function
    fluid.locateAllDemands = function(instantiator, parentThat, demandingNames) {
        var demandLogging = fluid.isDemandLogging(demandingNames);
        if (demandLogging) {
            fluid.log("Resolving demands for function names ", demandingNames, " in context of " +
                (parentThat? "component " + parentThat.typeName : "no component"));
        }
        
        var contextNames = {};
        var visited = [];
        var thatStack = instantiator.getFullStack(parentThat);
        visitComponents(instantiator, thatStack, function(component, xname, path) {
            contextNames[component.typeName] = true;
            visited.push(component);
        });
        if (demandLogging) {
            fluid.log("Components in scope for resolution:\n" + fluid.dumpThatStack(visited, instantiator));  
        }
        var matches = [];
        for (var i = 0; i < demandingNames.length; ++i) {
            var rec = dependentStore[demandingNames[i]] || [];
            for (var j = 0; j < rec.length; ++j) {
                var spec = rec[j];
                var record = {spec: spec, intersect: 0, uncess: 0};
                for (var k = 0; k < spec.contexts.length; ++k) {
                    record[contextNames[spec.contexts[k]]? "intersect" : "uncess"] += 2;
                }
                if (spec.contexts.length === 0) { // allow weak priority for contextless matches
                    record.intersect++;
                }
                // TODO: Potentially more subtle algorithm here - also ambiguity reports  
                matches.push(record); 
            }
        }
        matches.sort(fluid.compareDemands);
        return matches;   
    };

    // unsupported, non-API function
    fluid.locateDemands = function(instantiator, parentThat, demandingNames) {
        var matches = fluid.locateAllDemands(instantiator, parentThat, demandingNames);
        var demandspec = matches.length === 0 || matches[0].intersect === 0? null : matches[0].spec.spec;
        if (fluid.isDemandLogging(demandingNames)) {
            if (demandspec) {
                fluid.log("Located " + matches.length + " potential match" + (matches.length === 1? "" : "es") + ", selected best match with " + matches[0].intersect 
                    + " matched context names: ", demandspec);
            }
            else {
                fluid.log("No matches found for demands, using direct implementation");
            }
        }  
        return demandspec;
    };
    
    /** Determine the appropriate demand specification held in the fluid.demands environment 
     * relative to "thatStack" for the function name(s) funcNames.
     */
    // unsupported, non-API function
    fluid.determineDemands = function (instantiator, parentThat, funcNames) {
        funcNames = fluid.makeArray(funcNames);
        var newFuncName = funcNames[0];
        var demandspec = fluid.locateDemands(instantiator, parentThat, funcNames) || {};
        if (demandspec.funcName) {
            newFuncName = demandspec.funcName;
        }
        
        var aliasTo = fluid.alias(newFuncName);
        
        if (aliasTo) {
            newFuncName = aliasTo;
            fluid.log("Following redirect from function name " + newFuncName + " to " + aliasTo);
            var demandspec2 = fluid.locateDemands(instantiator, parentThat, [aliasTo]);
            if (demandspec2) {
                fluid.each(demandspec2, function(value, key) {
                    if (localRecordExpected.test(key)) {
                        fluid.fail("Error in demands block ", demandspec2, " - content with key \"" + key 
                            + "\" is not supported since this demands block was resolved via an alias from \"" + newFuncName + "\"");
                    }  
                });
                if (demandspec2.funcName) {
                    newFuncName = demandspec2.funcName;
                    fluid.log("Followed final inner demands to function name \"" + newFuncName + "\"");
                }
            }
        }
        
        return fluid.merge(null, {funcName: newFuncName, args: fluid.makeArray(demandspec.args)}, fluid.censorKeys(demandspec, ["funcName", "args"]));
    };
    
    // unsupported, non-API function
    fluid.resolveDemands = function(instantiator, parentThat, funcNames, initArgs, options) {
        var demandspec = fluid.determineDemands(instantiator, parentThat, funcNames);
        return fluid.embodyDemands(instantiator, parentThat, demandspec, initArgs, options);
    };
    
    // TODO: make a *slightly* more performant version of fluid.invoke that perhaps caches the demands
    // after the first successful invocation
    fluid.invoke = function(functionName, args, that, environment) {
        args = fluid.makeArray(args);
        return fluid.withInstantiator(that, function(instantiator) {
            var invokeSpec = fluid.resolveDemands(instantiator, that, functionName, args, {passArgs: true});
            return fluid.invokeGlobalFunction(invokeSpec.funcName, invokeSpec.args, environment);
        });
    };
    
    fluid.invoke = fluid.wrapActivity(fluid.invoke, ["    while invoking function with name \"", "arguments.0", "\" from component", "arguments.2"]); 
    
    /** Make a function which performs only "static redispatch" of the supplied function name - 
     * that is, taking only account of the contents of the "static environment". Since the static
     * environment is assumed to be constant, the dispatch of the call will be evaluated at the
     * time this call is made, as an optimisation.
     */
    
    fluid.makeFreeInvoker = function(functionName, environment) {
        var demandSpec = fluid.determineDemands(fluid.freeInstantiator, null, functionName);
        return function() {
            var invokeSpec = fluid.embodyDemands(fluid.freeInstantiator, null, demandSpec, fluid.makeArray(arguments), {passArgs: true});
            return fluid.invokeGlobalFunction(invokeSpec.funcName, invokeSpec.args, environment);
        };
    };
    
    fluid.makeInvoker = function(instantiator, that, demandspec, functionName, environment) {
        demandspec = demandspec || fluid.determineDemands(instantiator, that, functionName);
        return function() {
            var args = fluid.makeArray(arguments);
            return fluid.pushActivity(function() {
                var invokeSpec = fluid.embodyDemands(instantiator, that, demandspec, args, {passArgs: true});
                return fluid.invokeGlobalFunction(invokeSpec.funcName, invokeSpec.args, environment);
            }, ["    while invoking invoker with name " + functionName + " on component", that]);
        };
    };

    // unsupported, non-API function    
    fluid.event.listenerEngine = function(eventSpec, callback) {
        var argstruc = {};
        function checkFire() {
            var notall = fluid.find(eventSpec, function(value, key) {
                if (argstruc[key] === undefined) {
                    return true;
                }  
            });
            if (!notall) {
                callback(argstruc);
                fluid.clear(argstruc);
            }
        }
        fluid.each(eventSpec, function(event, eventName) {
            event.addListener(function() {
                argstruc[eventName] = fluid.makeArray(arguments);
                checkFire();
            });
        });
    };
    
    // unsupported, non-API function
    fluid.event.dispatchListener = function(instantiator, that, listener, eventName, eventSpec, indirectArgs) {
        return fluid.wrapActivity(function() {
            listener = fluid.event.resolveListener(listener); // just resolves globals
            var args = indirectArgs? arguments[0] : fluid.makeArray(arguments);
            var demandspec = fluid.determineDemands(instantiator, that, eventName);
            if (demandspec.args.length === 0 && eventSpec.args) {
                demandspec.args = eventSpec.args;
            }
            var resolved = fluid.embodyDemands(instantiator, that, demandspec, args, {passArgs: true, componentOptions: eventSpec}); 
            return listener.apply(null, resolved.args);
        }, [" firing to listener to event named " + eventName + " of component ", that]);
    };
    
    // unsupported, non-API function
    fluid.event.resolveListenerRecord = function(lisrec, that, eventName) {
        return fluid.withInstantiator(that, function(instantiator) {
            var records = fluid.makeArray(lisrec);
            return fluid.transform(records, function(record) {
                if (fluid.isPrimitive(record)) {
                    record = {listener: record};
                }
                var listener = fluid.expandOptions(record.listener, that);
                if (!listener) {
                    fluid.fail("Error in listener record - could not resolve reference " + record.listener + " to a listener or firer. "
                        + "Did you miss out \"events.\" when referring to an event firer?");
                }
                if (listener.typeName === "fluid.event.firer") {
                    listener = listener.fire;
                }
                record.listener = fluid.event.dispatchListener(instantiator, that, listener, eventName, record);
                return record;
            });
        }, [ "    while resolving listener record for event named " + eventName + " for component ", that]); 
    };
    
    // unsupported, non-API function
    fluid.event.expandOneEvent = function(event, that) {
        var origin;
        if (typeof(event) === "string" && event.charAt(0) !== "{") {
            // Special dispensation so we can resolve onto our own events without GINGER WORLD
            origin = that.events[event];
        }
        else {
            origin = fluid.expandOptions(event, that);
        }
        if (!origin || origin.typeName !== "fluid.event.firer") {
            fluid.fail("Error in event specification - could not resolve base event reference ", event, " to an event firer: got ", origin);
        }
        return origin;
    };

    // unsupported, non-API function    
    fluid.event.expandEvents = function(event, that) {
        return typeof(event) === "string"?
            fluid.event.expandOneEvent(event, that) :
            fluid.transform(event, function(oneEvent) {
                return fluid.event.expandOneEvent(oneEvent, that);
            });
    };
    
    // unsupported, non-API function
    fluid.event.resolveEvent = function(that, eventName, eventSpec) {
        return fluid.withInstantiator(that, function(instantiator) {
            if (typeof(eventSpec) === "string") {
                eventSpec = {event: eventSpec};
            }
            var event = eventSpec.event || eventSpec.events;
            if (!event) {
                fluid.fail("Event specification for event with name " + eventName + " does not include a base event specification: ", eventSpec);
            }
            
            var origin = fluid.event.expandEvents(event, that);

            var isMultiple = origin.typeName !== "fluid.event.firer";
            var isComposite = eventSpec.args || isMultiple;
            // If "event" is not composite, we want to share the listener list and FIRE method with the original
            // If "event" is composite, we need to create a new firer. "composite" includes case where any boiling
            // occurred - this was implemented wrongly in 1.4.
            var firer;
            if (isComposite) {
                firer = fluid.event.getEventFirer(null, null, " [composite] " + fluid.event.nameEvent(that, eventName));
                var dispatcher = fluid.event.dispatchListener(instantiator, that, firer.fire, eventName, eventSpec, isMultiple);
                if (isMultiple) {
                    fluid.event.listenerEngine(origin, dispatcher);
                }
                else {
                    origin.addListener(dispatcher);
                }
            }
            else {
                firer = {typeName: "fluid.event.firer"}; // jslint:ok - already defined
                firer.fire = function () {
                    var outerArgs = fluid.makeArray(arguments);
                    // TODO: this resolution should really be supplied for ALL events!
                    return fluid.withInstantiator(that, function () {
                        return origin.fire.apply(null, outerArgs);
                    }, " firing synthetic event " + eventName, instantiator);
                };
                firer.addListener = function (listener, namespace, predicate, priority) {
                    var dispatcher = fluid.event.dispatchListener(instantiator, that, listener, eventName, eventSpec);
                    origin.addListener(dispatcher, namespace, predicate, priority);
                };
                firer.removeListener = function (listener) {
                    origin.removeListener(listener);
                };
            }
            return firer;
        }, ["    while resolving event with name " + eventName + " attached to component ", that]); 
    };
    
        
    fluid.registerNamespace("fluid.expander");
    
    /** rescue that part of a component's options which should not be subject to
     * options expansion via IoC - this initially consists of "components" and "mergePolicy" 
     * but will be expanded by the set of paths specified as "noexpand" within "mergePolicy" 
     */
    // unsupported, non-API function
    fluid.expander.preserveFromExpansion = function(options) {
        var preserve = {};
        var preserveList = fluid.arrayToHash(["mergePolicy", "mergeAllOptions", "components", "invokers", "events", "listeners", "transformOptions"]);
        fluid.each(options.mergePolicy, function(value, key) {
            if (fluid.mergePolicyIs(value, "noexpand")) {
                preserveList[key] = true;
            }
        });
        fluid.each(preserveList, function(xvalue, path) {
            var pen = fluid.model.getPenultimate(options, path);
            var value = pen.root[pen.last];
            delete pen.root[pen.last];
            fluid.set(preserve, path, value);  
        });
        return {
            restore: function(target) {
                fluid.each(preserveList, function(xvalue, path) {
                    var preserved = fluid.get(preserve, path);
                    if (preserved !== undefined) {
                        fluid.set(target, path, preserved);
                    }
                });
            }
        };
    };
    
    /** Expand a set of component options with respect to a set of "expanders" (essentially only
     *  deferredCall) -  This substitution is destructive since it is assumed that the options are already "live" as the
     *  result of environmental substitutions. Note that options contained inside "components" will not be expanded
     *  by this call directly to avoid linearly increasing expansion depth if this call is occuring as a result of
     *  "initDependents" */
     // TODO: This needs to be integrated with "embodyDemands" above which makes a call to "resolveEnvironment" directly
     // but with very similarly derived options (makeStackResolverOptions)
    fluid.expandOptions = function(args, that, localRecord, outerExpandOptions) {
        if (!args) {
            return args;
        }
        return fluid.withInstantiator(that, function(instantiator) {
            //fluid.log("expandOptions for " + that.typeName + " executing with instantiator " + instantiator.id);
            var expandOptions = makeStackResolverOptions(instantiator, that, localRecord, outerExpandOptions);
            expandOptions.noCopy = true; // It is still possible a model may be fetched even though it is preserved
            var pres;
            if (!fluid.isArrayable(args) && !fluid.isPrimitive(args)) {
                pres = fluid.expander.preserveFromExpansion(args);
            }
            var expanded = fluid.expander.expandLight(args, expandOptions);
            if (pres) {
                pres.restore(expanded);
            }
            return expanded;
        }, ["    while expanding options for component of type " + (that? that.typeName : "null") + ": ", that]);
    };
    
    // unsupported, non-API function    
    fluid.locateTransformationRecord = function(that) {
        return fluid.withInstantiator(that, function(instantiator) {
            var matches = fluid.locateAllDemands(instantiator, that, ["fluid.transformOptions"]);
            return fluid.find(matches, function(match) {
                return match.uncess === 0 && fluid.contains(match.spec.contexts, that.typeName)? match.spec.spec : undefined;
            });
        });
    };
    
    // 
    fluid.hashToArray = function(hash) {
        var togo = [];
        fluid.each(hash, function(value, key) {
            togo.push(key);
        });
        return togo;
    };
    
    // unsupported, non-API function    
    fluid.localRecordExpected = ["type", "options", "arguments", "mergeOptions",
        "mergeAllOptions", "createOnEvent", "priority"];
    // unsupported, non-API function    
    fluid.checkComponentRecord = function(defaults, localRecord) {
        var expected = fluid.arrayToHash(fluid.localRecordExpected);
        fluid.each(defaults.argumentMap, function(value, key) {
            expected[key] = true;
        });
        fluid.each(localRecord, function(value, key) {
            if (!expected[key]) {
                fluid.fail("Probable error in subcomponent record - key \"" + key + 
                    "\" found, where the only legal options are " + 
                    fluid.hashToArray(expected).join(", "));
            }  
        });
    };
    
    // unsupported, non-API function
    fluid.expandComponentOptions = function(defaults, userOptions, that) {
        if (userOptions && userOptions.localRecord) {
            fluid.checkComponentRecord(defaults, userOptions.localRecord);
        }
        defaults = fluid.expandOptions(fluid.copy(defaults), that);
        var localRecord = {};
        if (userOptions && userOptions.marker === fluid.EXPAND) {
            // TODO: Somewhat perplexing... the local record itself, by any route we could get here, consists of unexpanded
            // material taken from "componentOptions"
            var localOptions = fluid.get(userOptions, "localRecord.options");
            if (localOptions) {
                if (defaults && defaults.mergePolicy) {
                    localOptions.mergePolicy = defaults.mergePolicy;
                }
                localRecord.options = fluid.expandOptions(localOptions, that);
            }
            localRecord["arguments"] = fluid.get(userOptions, "localRecord.arguments");
            var toExpand = userOptions.value;
            userOptions = fluid.expandOptions(toExpand, that, localRecord, {direct: true});
        }
        localRecord.directOptions = userOptions;
        if (!localRecord.options) {
            // Catch the case where there is no demands block and everything is in the subcomponent record - 
            // in this case, embodyDemands will not construct a localRecord and what the user refers to by "options"
            // is really what we properly call "directOptions".
            localRecord.options = userOptions;
        }
        var mergeOptions = (userOptions && userOptions.mergeAllOptions) || ["{directOptions}"];
        var togo = fluid.transform(mergeOptions, function(path) {
            // Avoid use of expandOptions in simple case to avoid infinite recursion when constructing instantiator
            return path === "{directOptions}"? localRecord.directOptions : fluid.expandOptions(path, that, localRecord, {direct: true}); 
        });
        var transRec = fluid.locateTransformationRecord(that);
        if (transRec) {
            togo[0].transformOptions = transRec.options;
        }
        return [defaults].concat(togo);
    };
    
    fluid.expandComponentOptions = fluid.wrapActivity(fluid.expandComponentOptions, 
        ["    while expanding component options ", "arguments.1.value", " with record ", "arguments.1", " for component ", "arguments.2"]);

   
    // NON-API function 
    fluid.getInstantiators = function() {
        var root = fluid.globalThreadLocal();
        var ins = root["fluid.instantiator"];
        if (!ins) {
            ins = root["fluid.instantiator"] = [];
        }
        return ins;    
    };
    
    // These two are the only functions which touch the instantiator stack
    // NON-API function
    // This function is stateful and MUST NOT be called by client code
    fluid.withInstantiator = function(that, func, message, userInstantiator) {
        var ins = fluid.getInstantiators();
        var oldLength;
        var instantiator = userInstantiator;

        return fluid.pushActivity(function() {
            return fluid.tryCatch(function() {
                if (!instantiator) {
                    if (ins.length === 0) {
                        instantiator = fluid.instantiator();
                        fluid.log("Created new instantiator with id " + instantiator.id + " in order to operate on component " + (that? that.typeName : "[none]"));
                        }
                    else {
                        instantiator = ins[ins.length - 1];
                    }
                }
                ins.push(instantiator);
                oldLength = ins.length;
              
                if (that) {
                    instantiator.recordComponent(that);
                }
                //fluid.log("Instantiator stack +1 to " + instantiator.stackCount + " for " + typeName);
                return func(instantiator);
            }, null, function() {
                if (ins.length !== oldLength) {
                    fluid.fail("Instantiator stack corrupted - old length " + oldLength + " new length " + ins.length);
                }
                if (ins[ins.length - 1] != instantiator) {
                    fluid.fail("Instantiator stack corrupted at stack top - old id " + instantiator.id + " new id " + ins[ins.length-1].id); 
                }
                ins.length--;
                //fluid.log("Instantiator stack -1 to " + instantiator.stackCount + " for " + typeName);
                if (ins.length === 0) {
                    fluid.log("Cleared instantiators (last id " + instantiator.id + ") from threadLocal for end of " + (that? that.typeName : "[none]"));
                }
            });
        }, message);
    };
    
    // The case without the instantiator is from the ginger strategy - this logic is still a little ragged
    fluid.initDependent = function(that, name, userInstantiator, directArgs) {
        if (!that || that[name]) { return; }
        fluid.log("Beginning instantiation of component with name \"" + name + "\" as child of " + fluid.dumpThat(that));
        directArgs = directArgs || [];
        var component = that.options.components[name];
        var instance; // escape to here for debugging purposes
        
        fluid.withInstantiator(that, function(instantiator) {
            if (typeof(component) === "string") {
                var instance = fluid.expandOptions([component], that)[0]; // TODO: expose more sensible semantic for expandOptions
                instantiator.recordKnownComponent(that, instance, name, false); 
                that[name] = instance;
            }
            else if (component.type) {
                var invokeSpec = fluid.resolveDemands(instantiator, that, [component.type, name], directArgs, {componentRecord: component});
                instantiator.pushUpcomingInstantiation(that, name);
                fluid.tryCatch(function() {
                    that[inCreationMarker] = true;
                    instance = fluid.initSubcomponentImpl(that, {type: invokeSpec.funcName}, invokeSpec.args);
                    // The existing instantiator record will be provisional, adjust it to take account of the true return
                    // TODO: Instantiator contents are generally extremely incomplete
                    var path = instantiator.composePath(instantiator.idToPath[that.id] || "", name);
                    var existing = instantiator.pathToComponent[path];
                    // This branch deals with the case where the component creator registered a component into "pathToComponent"
                    // that does not agree with the component which was the return value. We need to clear out "pathToComponent" but
                    // not shred the component since most of it is probably still valid
                    if (existing && existing !== instance) {
                        instantiator.clearComponent(that, name, existing);
                    }
                    if (instance && instance.typeName && instance.id && instance !== existing) {
                        instantiator.recordKnownComponent(that, instance, name, true);
                    }
                    that[name] = instance;
                }, null, function() {
                    delete that[inCreationMarker];
                    instantiator.pushUpcomingInstantiation();
                });
            }
            else { 
                that[name] = component;
            }
        }, ["    while instantiating dependent component with name \"" + name + "\" with record ", component, " as child of ", that],
        userInstantiator);
        if (instance) {
            fluid.log("Finished instantiation of component with name \"" + name + "\" and id " + instance.id + " as child of " + fluid.dumpThat(that));
        }
    };
    
    // unsupported, non-API function
    fluid.bindDeferredComponent = function(that, componentName, component, instantiator) {
        var events = fluid.makeArray(component.createOnEvent);
        fluid.each(events, function(eventName) {
            that.events[eventName].addListener(function() {
                fluid.log("Beginning instantiation of deferred component " + componentName + " due to event " + eventName);
                if (that[componentName]) {
                    instantiator.clearComponent(that, componentName);
                }
                fluid.initDependent(that, componentName, instantiator);
            }, null, null, component.priority);
        });
    };
    
    // unsupported, non-API function
    fluid.priorityForComponent = function(component) {
        return component.priority? component.priority : 
            (component.type === "fluid.typeFount" || fluid.hasGrade(fluid.defaults(component.type), "fluid.typeFount"))?
            "first" : undefined;  
    };
    
    fluid.initDependents = function(that) {
        var options = that.options;
        var components = options.components || {};
        var componentSort = {};
        fluid.withInstantiator(that, function(instantiator) {
            fluid.each(components, function(component, name) {
                if (!component.createOnEvent) {
                    var priority = fluid.priorityForComponent(component);
                    componentSort[name] = {key: name, priority: fluid.event.mapPriority(priority, 0)};
                }
                else {
                    fluid.bindDeferredComponent(that, name, component, instantiator);
                }
            });
            var componentList = fluid.event.sortListeners(componentSort);
            fluid.each(componentList, function(entry) {
                fluid.initDependent(that, entry.key);  
            });
            var invokers = options.invokers || {};
            for (var name in invokers) {
                var invokerec = invokers[name];
                var funcName = typeof(invokerec) === "string"? invokerec : null;
                that[name] = fluid.withInstantiator(that, function(instantiator) {
                    fluid.log("Beginning instantiation of invoker with name \"" + name + "\" as child of " + fluid.dumpThat(that));
                    return fluid.makeInvoker(instantiator, that, funcName? null : invokerec, funcName);
                }, ["    while instantiating invoker with name \"" + name + "\" with record ", invokerec, " as child of ", that]); // jslint:ok
                fluid.log("Finished instantiation of invoker with name \"" + name + "\" as child of " + fluid.dumpThat(that)); 
            }
        }, ["    while instantiating dependent components for component " + that.typeName]);
    };   
        
    fluid.staticEnvironment = fluid.typeTag("fluid.staticEnvironment");
    
    fluid.staticEnvironment.environmentClass = fluid.typeTag("fluid.browser");
    
    fluid.globalThreadLocal = fluid.threadLocal(function() {
        return fluid.typeTag("fluid.dynamicEnvironment");
    });
    
    // Although the following two functions are unsupported and not part of the IoC
    // implementation proper, they are still used in the renderer
    // expander as well as in some old-style tests and various places in CSpace.
    
    // unsupported, non-API function
    fluid.withEnvironment = function(envAdd, func, root) {
        root = root || fluid.globalThreadLocal();
        return fluid.tryCatch(function() {
            for (var key in envAdd) {
                root[key] = envAdd[key];
            }
            $.extend(root, envAdd);
            return func();
        }, null, function() {
            for (var key in envAdd) { // jslint:ok duplicate "value"
                delete root[key]; // TODO: users may want a recursive "scoping" model
            }
        });
    };
    
    // unsupported, non-API function  
    fluid.makeEnvironmentFetcher = function(directModel, elResolver, envGetter) {
        envGetter = envGetter || fluid.globalThreadLocal;
        return function(parsed) {
            var env = envGetter();
            return fluid.fetchContextReference(parsed, directModel, env, elResolver);
        };
    };

    // unsupported, non-API function  
    fluid.extractEL = function(string, options) {
        if (options.ELstyle === "ALL") {
            return string;
        }
        else if (options.ELstyle.length === 1) {
            if (string.charAt(0) === options.ELstyle) {
                return string.substring(1);
            }
        }
        else if (options.ELstyle === "${}") {
            var i1 = string.indexOf("${");
            var i2 = string.lastIndexOf("}");
            if (i1 === 0 && i2 !== -1) {
                return string.substring(2, i2);
            }
        }
    };
    
    // unsupported, non-API function
    fluid.extractELWithContext = function(string, options) {
        var EL = fluid.extractEL(string, options);
        if (EL && EL.charAt(0) === "{") {
            return fluid.parseContextReference(EL, 0);
        }
        return EL? {path: EL} : EL;
    };

    fluid.parseContextReference = function(reference, index, delimiter) {
        var endcpos = reference.indexOf("}", index + 1);
        if (endcpos === -1) {
            fluid.fail("Cannot parse context reference \"" + reference + "\": Malformed context reference without }");
        }
        var context = reference.substring(index + 1, endcpos);
        var endpos = delimiter? reference.indexOf(delimiter, endcpos + 1) : reference.length;
        var path = reference.substring(endcpos + 1, endpos);
        if (path.charAt(0) === ".") {
            path = path.substring(1);
        }
        return {context: context, path: path, endpos: endpos};
    };
    
    fluid.renderContextReference = function(parsed) {
        return "{" + parsed.context + "}." + parsed.path;  
    };
    
    fluid.fetchContextReference = function(parsed, directModel, env, elResolver) {
        if (elResolver) {
            parsed = elResolver(parsed, env);
        }
        var base = parsed.context? env[parsed.context] : directModel;
        if (!base) {
            return base;
        }
        return parsed.noDereference? parsed.path : fluid.get(base, parsed.path);
    };
    
    // unsupported, non-API function
    fluid.resolveContextValue = function(string, options) {
        if (options.bareContextRefs && string.charAt(0) === "{") {
            var parsed = fluid.parseContextReference(string, 0);
            return options.fetcher(parsed);        
        }
        else if (options.ELstyle && options.ELstyle !== "${}") {
            var parsed = fluid.extractELWithContext(string, options); // jslint:ok
            if (parsed) {
                return options.fetcher(parsed);
            }
        }
        while (typeof(string) === "string") {
            var i1 = string.indexOf("${");
            var i2 = string.indexOf("}", i1 + 2);
            if (i1 !== -1 && i2 !== -1) {
                var parsed; // jslint:ok
                if (string.charAt(i1 + 2) === "{") {
                    parsed = fluid.parseContextReference(string, i1 + 2, "}");
                    i2 = parsed.endpos;
                }
                else {
                    parsed = {path: string.substring(i1 + 2, i2)};
                }
                var subs = options.fetcher(parsed);
                var all = (i1 === 0 && i2 === string.length - 1); 
                // TODO: test case for all undefined substitution
                if (subs === undefined || subs === null) {
                    return subs;
                }
                string = all? subs : string.substring(0, i1) + subs + string.substring(i2 + 1);
            }
            else {
                break;
            }
        }
        return string;
    };
    
    fluid.resolveContextValue = fluid.wrapActivity(fluid.resolveContextValue, 
        ["    while resolving context value ", "arguments.0"]);
    
    function resolveEnvironmentImpl(obj, options) {
        fluid.guardCircularity(options.seenIds, obj, "expansion", 
             " - please ensure options are not circularly connected, or protect from expansion using the \"noexpand\" policy or expander");
        function recurse(arg) {
            return resolveEnvironmentImpl(arg, options);
        }
        if (typeof(obj) === "string" && !options.noValue) {
            return fluid.resolveContextValue(obj, options);
        }
        else if (fluid.isPrimitive(obj) || obj.nodeType !== undefined || obj.jquery) {
            return obj;
        }
        else if (options.filter) {
            return options.filter(obj, recurse, options);
        }
        else {
            return (options.noCopy? fluid.each : fluid.transform)(obj, function(value, key) {
                return resolveEnvironmentImpl(value, options);
            });
        }
    }
    
    fluid.defaults("fluid.resolveEnvironment", {
        ELstyle:     "${}",
        seenIds:     {},
        bareContextRefs: true
    });
    
    fluid.resolveEnvironment = function(obj, options) {
        // Don't create a component here since this function is itself used in the 
        // component expansion pathway - avoid all expansion in any case to head off FLUID-4301
        options = $.extend({}, fluid.rawDefaults("fluid.resolveEnvironment"), options);
        options.seenIds = {};
        return resolveEnvironmentImpl(obj, options);
    };

    /** "light" expanders, starting with support functions for the "deferredFetcher" expander **/

    fluid.expander.deferredCall = function(target, source, recurse) {
        var expander = source.expander;
        var args = (!expander.args || fluid.isArrayable(expander.args))? expander.args : fluid.makeArray(expander.args);
        args = recurse(args); 
        return fluid.invokeGlobalFunction(expander.func, args);
    };
    
    fluid.deferredCall = fluid.expander.deferredCall; // put in top namespace for convenience
    
    fluid.deferredInvokeCall = function(target, source, recurse) {
        var expander = source.expander;
        var args = (!expander.args || fluid.isArrayable(expander.args))? expander.args : fluid.makeArray(expander.args);
        args = recurse(args);  
        return fluid.invoke(expander.func, args);
    };
    
    // The "noexpand" expander which simply unwraps one level of expansion and ceases.
    fluid.expander.noexpand = function(target, source) {
        return $.extend(target, source.expander.tree);
    };
  
    fluid.noexpand = fluid.expander.noexpand; // TODO: check naming and namespacing
  
    // unsupported, non-API function
    fluid.expander.lightFilter = function (obj, recurse, options) {
        var togo;
        if (fluid.isArrayable(obj)) {
            togo = options.noCopy? obj : [];
            fluid.each(obj, function(value, key) {togo[key] = recurse(value);});
        }
        else {
            togo = options.noCopy? obj : {};
            for (var key in obj) {
                var value = obj[key];
                var expander;
                if (key === "expander" && !(options.expandOnly && options.expandOnly[value.type])) {
                    expander = fluid.getGlobalValue(value.type);  
                    if (expander) {
                        return expander.call(null, togo, obj, recurse, options);
                    }
                }
                if (key !== "expander" || !expander) {
                    togo[key] = recurse(value);
                }
            }
        }
        return options.noCopy? obj : togo;
    };
      
    // unsupported, non-API function
    fluid.expander.expandLight = function (source, expandOptions) {
        var options = $.extend({}, expandOptions);
        options.filter = fluid.expander.lightFilter;
        return fluid.resolveEnvironment(source, options);       
    };
          
})(jQuery, fluid_1_5);
/*
Copyright 2010-2011 OCAD University
Copyright 2010-2011 Lucendo Development Ltd.

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

// Declare dependencies
/*global fluid_1_5:true, jQuery*/

// JSLint options 
/*jslint white: true, funcinvoke: true, undef: true, newcap: true, nomen: true, regexp: true, bitwise: true, browser: true, forin: true, maxerr: 100, indent: 4 */

var fluid_1_5 = fluid_1_5 || {};

(function ($, fluid) {

    /** Framework-global caching state for fluid.fetchResources **/

    var resourceCache = {};
  
    var pendingClass = {};
 
    /** Accepts a hash of structures with free keys, where each entry has either
     * href/url or nodeId set - on completion, callback will be called with the populated
     * structure with fetched resource text in the field "resourceText" for each
     * entry. Each structure may contain "options" holding raw options to be forwarded
     * to jQuery.ajax().
     */
  
    fluid.fetchResources = function(resourceSpecs, callback, options) {
        var that = fluid.initLittleComponent("fluid.fetchResources", options);
        that.resourceSpecs = resourceSpecs;
        that.callback = callback;
        that.operate = function() {
            fluid.fetchResources.fetchResourcesImpl(that);
        };
        fluid.each(resourceSpecs, function(resourceSpec, key) {
             resourceSpec.recurseFirer = fluid.event.getEventFirer(null, null, "I/O completion for resource \"" + key + "\"");
             resourceSpec.recurseFirer.addListener(that.operate);
             if (resourceSpec.url && !resourceSpec.href) {
                resourceSpec.href = resourceSpec.url;
             }
        });
        if (that.options.amalgamateClasses) {
            fluid.fetchResources.amalgamateClasses(resourceSpecs, that.options.amalgamateClasses, that.operate);
        }
        that.operate();
        return that;
    };
  
    /*
     * This function is unsupported: It is not really intended for use by implementors.
     */
    // Add "synthetic" elements of *this* resourceSpec list corresponding to any
    // still pending elements matching the PROLEPTICK CLASS SPECIFICATION supplied 
    fluid.fetchResources.amalgamateClasses = function(specs, classes, operator) {
        fluid.each(classes, function(clazz) {
            var pending = pendingClass[clazz];
            fluid.each(pending, function(pendingrec, canon) {
                specs[clazz+"!"+canon] = pendingrec;
                pendingrec.recurseFirer.addListener(operator);
            });
        });
    };
  
    /*
     * This function is unsupported: It is not really intended for use by implementors.
     */
    fluid.fetchResources.timeSuccessCallback = function(resourceSpec) {
        if (resourceSpec.timeSuccess && resourceSpec.options && resourceSpec.options.success) {
            var success = resourceSpec.options.success;
            resourceSpec.options.success = function() {
            var startTime = new Date();
            var ret = success.apply(null, arguments);
            fluid.log("External callback for URL " + resourceSpec.href + " completed - callback time: " + 
                    (new Date().getTime() - startTime.getTime()) + "ms");
            return ret;
            };
        }
    };
    
    // TODO: Integrate punch-through from old Engage implementation
    function canonUrl(url) {
        return url;
    }
    
    fluid.fetchResources.clearResourceCache = function(url) {
        if (url) {
            delete resourceCache[canonUrl(url)];
        }
        else {
            fluid.clear(resourceCache);
        }  
    };
  
    /*
     * This function is unsupported: It is not really intended for use by implementors.
     */
    fluid.fetchResources.handleCachedRequest = function(resourceSpec, response) {
         var canon = canonUrl(resourceSpec.href);
         var cached = resourceCache[canon];
         if (cached.$$firer$$) {
             fluid.log("Handling request for " + canon + " from cache");
             var fetchClass = resourceSpec.fetchClass;
             if (fetchClass && pendingClass[fetchClass]) {
                 fluid.log("Clearing pendingClass entry for class " + fetchClass);
                 delete pendingClass[fetchClass][canon];
             }
             resourceCache[canon] = response;      
             cached.fire(response);
         }
    };
    
    /*
     * This function is unsupported: It is not really intended for use by implementors.
     */
    fluid.fetchResources.completeRequest = function(thisSpec, recurseCall) {
        thisSpec.queued = false;
        thisSpec.completeTime = new Date();
        fluid.log("Request to URL " + thisSpec.href + " completed - total elapsed time: " + 
            (thisSpec.completeTime.getTime() - thisSpec.initTime.getTime()) + "ms");
        thisSpec.recurseFirer.fire();
    };
  
    /*
     * This function is unsupported: It is not really intended for use by implementors.
     */
    fluid.fetchResources.makeResourceCallback = function(thisSpec) {
        return {
            success: function(response) {
                thisSpec.resourceText = response;
                thisSpec.resourceKey = thisSpec.href;
                if (thisSpec.forceCache) {
                    fluid.fetchResources.handleCachedRequest(thisSpec, response);
                }
                fluid.fetchResources.completeRequest(thisSpec);
            },
            error: function(response, textStatus, errorThrown) {
                thisSpec.fetchError = {
                    status: response.status,
                    textStatus: response.textStatus,
                    errorThrown: errorThrown
                };
                fluid.fetchResources.completeRequest(thisSpec);
            }
            
        };
    };
    
        
    /*
     * This function is unsupported: It is not really intended for use by implementors.
     */
    fluid.fetchResources.issueCachedRequest = function(resourceSpec, options) {
         var canon = canonUrl(resourceSpec.href);
         var cached = resourceCache[canon];
         if (!cached) {
             fluid.log("First request for cached resource with url " + canon);
             cached = fluid.event.getEventFirer(null, null, "cache notifier for resource URL " + canon);
             cached.$$firer$$ = true;
             resourceCache[canon] = cached;
             var fetchClass = resourceSpec.fetchClass;
             if (fetchClass) {
                 if (!pendingClass[fetchClass]) {
                     pendingClass[fetchClass] = {};
                 }
                 pendingClass[fetchClass][canon] = resourceSpec;
             }
             options.cache = false; // TODO: Getting weird "not modified" issues on Firefox
             $.ajax(options);
         }
         else {
             if (!cached.$$firer$$) {
                 options.success(cached);
             }
             else {
                 fluid.log("Request for cached resource which is in flight: url " + canon);
                 cached.addListener(function(response) {
                     options.success(response);
                 });
             }
         }
    };
    
    /*
     * This function is unsupported: It is not really intended for use by implementors.
     */
    // Compose callbacks in such a way that the 2nd, marked "external" will be applied
    // first if it exists, but in all cases, the first, marked internal, will be 
    // CALLED WITHOUT FAIL
    fluid.fetchResources.composeCallbacks = function(internal, external) {
        return external? function() {
            try {
                external.apply(null, arguments);
            }
            catch (e) {
                fluid.log("Exception applying external fetchResources callback: " + e);
            }
            internal.apply(null, arguments); // call the internal callback without fail
        } : internal;
    };
    
    /*
     * This function is unsupported: It is not really intended for use by implementors.
     */
    fluid.fetchResources.composePolicy = function(target, source, key) {
        return fluid.fetchResources.composeCallbacks(target, source);
    };
    
    fluid.defaults("fluid.fetchResources.issueRequest", {
        mergePolicy: {
            success: fluid.fetchResources.composePolicy,
            error: fluid.fetchResources.composePolicy,
            url: "reverse"
        }
    });
    
    /*
     * This function is unsupported: It is not really intended for use by implementors.
     */
    fluid.fetchResources.issueRequest = function(resourceSpec, key) {
        var thisCallback = fluid.fetchResources.makeResourceCallback(resourceSpec);
        var options = {  
             url:     resourceSpec.href,
             success: thisCallback.success, 
             error:   thisCallback.error,
             dataType: "text"};
        fluid.fetchResources.timeSuccessCallback(resourceSpec);
        fluid.merge(fluid.defaults("fluid.fetchResources.issueRequest").mergePolicy,
                      options, resourceSpec.options);
        resourceSpec.queued = true;
        resourceSpec.initTime = new Date();
        fluid.log("Request with key " + key + " queued for " + resourceSpec.href);

        if (resourceSpec.forceCache) {
            fluid.fetchResources.issueCachedRequest(resourceSpec, options);
        }
        else {
            $.ajax(options);
        }
    };
    
    fluid.fetchResources.fetchResourcesImpl = function(that) {
        var complete = true;
        var allSync = true;
        var resourceSpecs = that.resourceSpecs;
        for (var key in resourceSpecs) {
            var resourceSpec = resourceSpecs[key];
            if (!resourceSpec.options || resourceSpec.options.async) {
                allSync = false;
            }
            if (resourceSpec.href && !resourceSpec.completeTime) {
                 if (!resourceSpec.queued) {
                     fluid.fetchResources.issueRequest(resourceSpec, key);  
                 }
                 if (resourceSpec.queued) {
                     complete = false;
                 }
            }
            else if (resourceSpec.nodeId && !resourceSpec.resourceText) {
                var node = document.getElementById(resourceSpec.nodeId);
                // upgrade this to somehow detect whether node is "armoured" somehow
                // with comment or CDATA wrapping
                resourceSpec.resourceText = fluid.dom.getElementText(node);
                resourceSpec.resourceKey = resourceSpec.nodeId;
            }
        }
        if (complete && that.callback && !that.callbackCalled) {
            that.callbackCalled = true;
            if ($.browser.mozilla && !allSync) {
                // Defer this callback to avoid debugging problems on Firefox
                setTimeout(function() {
                    that.callback(resourceSpecs);
                    }, 1);
            }
            else {
                that.callback(resourceSpecs);
            }
        }
    };
    
    fluid.fetchResources.primeCacheFromResources = function(componentName) {
        var resources = fluid.defaults(componentName).resources;
        var that = {typeName: "fluid.fetchResources.primeCacheFromResources"};
        var expanded = (fluid.expandOptions ? fluid.expandOptions : fluid.identity)(fluid.copy(resources), that);
        fluid.fetchResources(expanded);
    };
    
    /** Utilities invoking requests for expansion **/
    fluid.registerNamespace("fluid.expander");
      
    /*
     * This function is unsupported: It is not really intended for use by implementors.
     */
    fluid.expander.makeDefaultFetchOptions = function (successdisposer, failid, options) {
        return $.extend(true, {dataType: "text"}, options, {
            success: function(response, environmentdisposer) {
                var json = JSON.parse(response);
                environmentdisposer(successdisposer(json));
            },
            error: function(response, textStatus) {
                fluid.log("Error fetching " + failid + ": " + textStatus);
            }
        });
    };
  
    /*
     * This function is unsupported: It is not really intended for use by implementors.
     */
    fluid.expander.makeFetchExpander = function (options) {
        return { expander: {
            type: "fluid.expander.deferredFetcher",
            href: options.url,
            options: fluid.expander.makeDefaultFetchOptions(options.disposer, options.url, options.options),
            resourceSpecCollector: "{resourceSpecCollector}",
            fetchKey: options.fetchKey
        }};
    };
    
    fluid.expander.deferredFetcher = function(target, source, recurse, expandOptions) {
        var expander = source.expander;
        var spec = fluid.copy(expander);
        // fetch the "global" collector specified in the external environment to receive
        // this resourceSpec
        var collector = fluid.resolveEnvironment(expander.resourceSpecCollector, expandOptions);
        delete spec.type;
        delete spec.resourceSpecCollector;
        delete spec.fetchKey;
        var environmentdisposer = function(disposed) {
            $.extend(target, disposed);
        };
        // replace the callback which is there (taking 2 arguments) with one which
        // directly responds to the request, passing in the result and OUR "disposer" - 
        // which once the user has processed the response (say, parsing JSON and repackaging)
        // finally deposits it in the place of the expander in the tree to which this reference
        // has been stored at the point this expander was evaluated.
        spec.options.success = function(response) {
             expander.options.success(response, environmentdisposer);
        };
        var key = expander.fetchKey || fluid.allocateGuid();
        collector[key] = spec;
        return target;
    };
    
    
})(jQuery, fluid_1_5);
