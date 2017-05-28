import { isBrowser } from "./util";

if (typeof window === "undefined") {
    var global = this;
} else {
    global = window;
}


var GLOBAL = GLOBAL || global;

global.extend = function extend() {
    // copy reference to target object
    var target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, options;

    // Handle a deep copy situation
    if (typeof target === "boolean") {
        deep = target;
        target = arguments[1] || {};
        // skip the boolean and the target
        i = 2;
    }

    // Handle case when target is a string or something (possible in deep copy)
    if (typeof target !== "object" && typeof target !== "function")
        target = {};

    for (; i < length; i++)
        // Only deal with non-null/undefined values
        if ((options = arguments[i]) != null)
            // Extend the base object
            for (var name in options) {
                var src = target[name], copy = options[name];

                // Prevent never-ending loop
                if (target === copy)
                    continue;

                // Recurse if we're merging object values
                if (deep && copy && typeof copy === "object" && !copy.nodeType)
                    target[name] = extend(deep,
                        // Never move original objects, clone them
                        src || (copy.length != null ? [] : {})
                        , copy);

                // Don't bring in undefined values
                else if (copy !== undefined)
                    target[name] = copy;

            }

    // Return the modified object
    return target;
};

global.emptyUuid = "00000000-0000-0000-0000-000000000000";

global.each = function each(array, callback) {
    for (var i = 0, j = array.length; i < j; ++i) {
        var result = callback(array[i], i);
        if (result === false) {
            return;
        }
    }
};

global.foreach = function foreach(object, callback) {
    for (var el in object) {
        var result = callback(object[el], el);
        if (result === false) {
            return;
        }
    }
};

global.map = function map(array, callback) {
    var result = [];
    if (!array) {
        return result;
    }
    for (var i = 0; i < array.length; ++i) {
        result.push(callback(array[i], i));
    }
    return result;
};

global.mapObject = function map(object, callback) {
    var result = [];
    if (!object) {
        return result;
    }
    for (var p in object) {
        result.push(callback(object[p], p));
    }
    return result;
};

global.rectScale = function rectScale(rect, scaleX, scaleY) {
    rect.x *= scaleX;
    rect.y *= scaleY;
    rect.width *= scaleX;
    rect.height *= scaleY;
}

global.rectTranslate = function rectTranslate(rect, x, y) {
    rect.x += x;
    rect.y += y;
}

global.eachReverse = function eachReverse(array, callback) {
    for (var i = array.length - 1; i >= 0; --i) {
        var result = callback(array[i], i);
        if (result === false) {
            return;
        }
    }
};

global.parseJsonDate = function parseJsonDate(value) {
    return new Date(value);
};

global.removeElement = function removeElement(array, element) {
    for (var i = 0, j = array.length; i < j; ++i) {
        if (array[i] === element) {
            array.splice(i, 1);
            return i;
        }
    }
    return -1;
};

global.clone = function clone(object, deep) {
    if (deep) {
        return extend(true, {}, object);
    }
    return extend({}, object);
};

global.makeRef = function makeRef(object) {
    return { value: object };
};

global.emptyObject = function emptyObject() {
    return {};
}

global.toArray = function toArray(array, callback) {
    var result = [];
    for (var i = 0, j = array.length; i < j; ++i) {
        result.push(callback(array[i]));
    }
    return result;
};

if (isBrowser && !global.requestAnimationFrame) {

    global.requestAnimationFrame = (function () {

        return global.webkitRequestAnimationFrame ||
            global.mozRequestAnimationFrame ||
            global.oRequestAnimationFrame ||
            global.msRequestAnimationFrame ||
            function ( /* function FrameRequestCallback */callback, /* DOMElement Element */element) {

                global.setTimeout(callback, 1000 / 30);

            };

    })();
}
if (isBrowser && !global.cancelAnimationFrame) {
    global.cancelAnimationFrame = global.webkitCancelAnimationFrame ||
        global.mozCancelAnimationFrame ||
        global.oCancelAnimationFrame ||
        global.mCancelAnimationFrame;
}