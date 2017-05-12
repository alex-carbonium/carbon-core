import {isBrowser} from "./util";

if(typeof window === "undefined") {
    var global = this;
} else {
    global = window;
}


var GLOBAL = GLOBAL || global;

sketch.util = {};

sketch.getKlass = function(identifier){
    var parts = identifier.split(".");
    if (parts.length === 0) {
        return null;
    }
    var ns = global;
    for (var i = 0; i < parts.length; i++) {
        ns = ns[parts[i]];
    }
    return ns;
};

if (DEBUG) {
    global.watchPromise = function watchPromise(promise, name) {
        promise.then(function(){
            console.log('then: ' + name);
        })

        promise.fail(function(){
            console.log('fail: ' + name);
        })
    }
}

global.defineMessages = function defineMessages(messages){
    // this is just stub, used at compile time only
    return messages;
}

global.extend = function extend() {
    // copy reference to target object
    var target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, options;

    // Handle a deep copy situation
    if ( typeof target === "boolean" ) {
        deep = target;
        target = arguments[1] || {};
        // skip the boolean and the target
        i = 2;
    }

    // Handle case when target is a string or something (possible in deep copy)
    if ( typeof target !== "object" && typeof target !== "function" )
        target = {};

    for ( ; i < length; i++ )
        // Only deal with non-null/undefined values
        if ( (options = arguments[ i ]) != null )
        // Extend the base object
            for ( var name in options ) {
                var src = target[ name ], copy = options[ name ];

                // Prevent never-ending loop
                if ( target === copy )
                    continue;

                // Recurse if we're merging object values
                if ( deep && copy && typeof copy === "object" && !copy.nodeType )
                    target[ name ] = extend( deep,
                        // Never move original objects, clone them
                        src || ( copy.length != null ? [ ] : { } )
                        , copy );

                // Don't bring in undefined values
                else if ( copy !== undefined )
                    target[ name ] = copy;

            }

    // Return the modified object
    return target;
};

//Same as extend, but does not take into account properties of any prototypes in the object graph
global.extendOwnProperties = function extendOwnProperties() {
    // copy reference to target object
    var target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, options;

    // Handle a deep copy situation
    if ( typeof target === "boolean" ) {
        deep = target;
        target = arguments[1] || {};
        // skip the boolean and the target
        i = 2;
    }

    // Handle case when target is a string or something (possible in deep copy)
    if ( typeof target !== "object" && typeof target !== "function" )
        target = {};

    for ( ; i < length; i++ )
        // Only deal with non-null/undefined values
        if ( (options = arguments[ i ]) != null )
        // Extend the base object
            for ( var name in options ) {
                if (!options.hasOwnProperty(name)){
                    continue;
                }
                var src = target[ name ], copy = options[ name ];

                // Prevent never-ending loop
                if ( target === copy )
                    continue;

                // Recurse if we're merging object values
                if ( deep && copy && typeof copy === "object" && !copy.nodeType )
                    target[ name ] = extendOwnProperties( deep,
                        // Never move original objects, clone them
                        src || ( copy.length != null ? [ ] : { } )
                        , copy );

                // Don't bring in undefined values
                else if ( copy !== undefined )
                    target[ name ] = copy;

            }

    // Return the modified object
    return target;
};

global.extendDeep = function(target, newValues) {
    var clone = extend({}, target);
    var updateProperties = function(t, nv){
        for(var prop in nv){
            var value = nv[prop];
            if(prop[0] === '@')
            {
                prop = prop.substr(1);
                t[prop] = value;
            } else {
                t[prop] = extend({}, t[prop] || {});
                updateProperties(t[prop], value);
            }
        }
    };

    updateProperties(clone, newValues);

    return clone;
};

global.emptyUuid = "00000000-0000-0000-0000-000000000000";


global.each = function each(array, callback){
    for (var i = 0, j = array.length; i < j; ++i) {
        var result = callback(array[i], i);
        if (result === false){
            return;
        }
    }
};

global.parallelFor = function parallelFor(array, callback){
    var promises = [];
    each(array, function(e, i){
        var deferred = $.Deferred();
        setTimeout(function(){
            callback(e,i);
            deferred.resolve();
        }, 0);
        promises.push(deferred.promise());
    });
    return $.when.apply($, promises);
};

global.foreach = function foreach(object, callback){
    for (var el in object) {
        var result = callback(object[el], el);
        if (result === false){
            return;
        }
    }
};

global.map = function map(array, callback){
    var result = [];
    if (!array){
        return result;
    }
    for(var i =0 ; i<array.length; ++i){
        result.push(callback(array[i], i));
    }
    return result;
};

global.mapObject = function map(object, callback){
    var result = [];
    if (!object){
        return result;
    }
    for(var p in object){
        result.push(callback(object[p], p));
    }
    return result;
};

global.rectScale = function rectScale(rect, scaleX, scaleY){
    rect.x *= scaleX;
    rect.y *= scaleY;
    rect.width *= scaleX;
    rect.height *= scaleY;
}

global.rectTranslate = function rectTranslate(rect, x, y){
    rect.x += x;
    rect.y += y;
}

global.eachReverse = function eachReverse(array, callback){
    for (var i = array.length - 1; i >= 0; --i){
        var result = callback(array[i], i);
        if (result === false){
            return;
        }
    }
};

global.parseJsonDate = function parseJsonDate(value){
    return new Date(value);
};

global.removeElement = function removeElement(array, element){
    for (var i = 0, j = array.length; i < j; ++i) {
        if(array[i] === element){
            array.splice(i, 1);
            return i;
        }
    }
    return -1;
};

sketch.util.min = function util_min(array, accessor){
    var result = null;
    for (let i = 0, l = array.length; i < l; ++i) {
        let element = array[i];
        var value = accessor ? accessor(element, i) : element;
        if (result === null || value < result){
            result = value;
        }
    }
    return result;
};

sketch.util.max = function util_max(array, accessor){
    var result = null;
    for (let i = 0, l = array.length; i < l; ++i) {
        let element = array[i];
        var value = accessor ? accessor(element, i) : element;
        if (result === null || value > result){
            result = value;
        }
    }
    return result;
};

sketch.util.sum = function util_sum(array, accessor){
    var result = 0;
    each(array, function(element){
        result += accessor(element);
    });
    return result;
};

sketch.util.where = function util_where(array, predicate){
    var result = [];
    each(array, function(element){
        if(predicate(element)){
            result.push(element);
        }
    });
    return result;
};

//TODO: throw if not found
sketch.util.singleOrDefault = function util_singleOrDefault(array, accessor){
    var result;
    each(array, function(element){
        if (accessor(element)){
            result = element;
            return false;
        }
    });
    return result;
};

sketch.util.firstOrDefault = function util_firstOrDefault(array, accessor){
    var result;
    each(array, function(element){
        if (accessor(element)){
            result = element;
            return false;
        }
    });
    return result;
};

sketch.util.contains = function util_contains(array, element){
    return sketch.util.firstOrDefault(array, function(e){ return e === element;}) !== undefined;
};

sketch.util.distinct = function util_distinct(array){
    var res = [];
    for (var i = 0, l = array.length; i < l; ++i){
        var e = array[i];
        if (res.indexOf(e) === -1){
            res.push(e);
        }
    }
    return res;
};

sketch.util.containsAny = function util_containsAny(source, elements){
    for (var i = 0, l = source.length; i < l; ++i){
        var obj = source[i];
        for (var j = 0, k = elements.length; j < k; ++j){
            var obj1 = elements[j];
            if (obj === obj1){
                return true;
            }
        }
    }
    return false;
};

sketch.util.indexOf = function util_indexOf(array, accessor){
    var result = -1;
    each(array, function(element, i){
        if (accessor(element)){
            result = i;
            return false;
        }
    });
    return result;
};

sketch.util.flattenObject = function util_flattenObject(obj) {
    if(!obj || (obj instanceof Array)) {
        return obj;
    }
    if(typeof obj === 'object'){
        var res = {};
        for(var p in obj){
            res[p] = obj[p];
        }

        return res;
    }
    return obj;
}

sketch.util.replace = function util_replace(array, what, to){
    var index = array.indexOf(what);
    array.splice(index,1,to);
};

sketch.util.fitDimensions = function util_fitDimensions(width, height, desiredWidth, desiredHeight, allowScaleUp){
    var nPercentW = desiredWidth / width;
    var nPercentH = desiredHeight / height;

    var nPercent = nPercentH < nPercentW ? nPercentH : nPercentW;

    if (nPercent > 1 && !allowScaleUp)
        return {width: width, height: height};

    var destWidth = width * nPercent;
    var destHeight = height * nPercent;

    return {width: ~~destWidth, height: ~~destHeight};
};

sketch.util.spliceStrict = function util_spliceStrict(array, objOrCallback){
    var isCallback = typeof objOrCallback === "function";
    var accessor = function(obj){
        if (isCallback){
            return objOrCallback(obj);
        }
        return obj === objOrCallback;
    };
    for (var i = array.length - 1; i >= 0; --i) {
        if (accessor(array[i])){
            array.splice(i, 1);
        }
    }
};

sketch.util.dummyFunc = function util_dummyFunc(ret) {
    return function(){
        return ret;
    }
};
sketch.util.createEvent = function util_createEvent(e){
    var f = function(){
        this.layerX = e.layerX;
        this.layerY = e.layerY;
        this.originalEvent = {}
    };

    f.prototype = jQuery.Event.prototype;
    return new f();
};

sketch.util.equals = function util_equals(obj1, obj2){
    if (obj1 === obj2)
        return true;
    // Call #equals() on both obj1 and obj2
    if (obj1 && obj1.equals)
        return obj1.equals(obj2);
    if (obj2 && obj2.equals)
        return obj2.equals(obj1);
    // Deep compare objects or arrays
    if (obj1 && obj2
            && typeof obj1 === 'object' && typeof obj2 === 'object') {
        // Compare arrays
        if (Array.isArray(obj1) && Array.isArray(obj2)) {
            var length = obj1.length;
            if (length !== obj2.length)
                return false;
            while (length--) {
                if (!Base.equals(obj1[length], obj2[length]))
                    return false;
            }
        } else {
            // Deep compare objects.
            var keys = Object.keys(obj1),
                length = keys.length;
            // Ensure that both objects contain the same number of
            // properties before comparing deep equality.
            if (length !== Object.keys(obj2).length)
                return false;
            while (length--) {
                // Deep compare each member
                var key = keys[length];
                if (!(obj2.hasOwnProperty(key)
                        && Base.equals(obj1[key], obj2[key])))
                    return false;
            }
        }
        return true;
    }
    return false;
};

sketch.util.removeGroupFromArray = function util_removeGroupFromArray(array, group){
    for(var i = 0; i < group.length; ++i){
        var idx = array.indexOf(group[i]);
        if(idx !== -1) {
            array.splice(idx, 1);
        }
    }
}

sketch.util.arrayToString = function util_arrayToString(array, selector){
    var result = "";

    each(array, function(p){
        if (result.length){
            result += ", ";
        }
        result += "[";
        var s = selector(p);
        if (typeof s === "object"){
            result += s.join(", ");
        }
        else{
            result += s;
        }
        result += "]";
    });

    return result;
};


sketch.util.groupByAndCount = function(array, keyFunc){
    var result = [];
    each(array, function(e){
        var key = keyFunc(e);
        var entry = sketch.util.singleOrDefault(result, function(x){
            return x.key === key;
        });
        if (!entry){
            entry = { key:key, count:0, toString:function(){
                return this.key + "," + this.count;
            }};
            result.push(entry);
        }
        ++entry.count;
    });

    return result.sort(function(a, b){
        return b.count - a.count;
    });
};

sketch.util.findMinMovesSet = function(arrFrom, arrTo) {
    if(arrFrom.length !== arrTo.length) {
        throw "findMinMovesSet: arrays must be of the same size";
    }
    var instructions = [];
    for(var i = 0; i < arrFrom.length; ++i) {
        var el = arrFrom[i];
        for(var j = 0; j < arrTo.length; ++j) {
            if(el == arrTo[j]) {
                instructions.push({el:el, d:Math.abs(i-j), to:j});
                break;
            }
        }
    }

    instructions.sort(function(a,b){
        return b.d - a.d;
    });

    var i = 0;
    while(!areSameArrays(arrFrom, arrTo)){
        var instruction = instructions[i];
        i++;
        for(var j = 0; j < arrFrom.length; ++j) {
            if(arrFrom[j] == instruction.el) {
                arrFrom.splice(j, 1);
                arrFrom.splice(instruction.to, 0, instruction.el);
                break;
            }
        }
    }

    instructions.splice(i, instructions.length - i);
    each(instructions, function(e){
        delete e.d;
    })

    return instructions;
}

global.clone = function clone(object, deep) {
    if(deep){
        return extend(true, {}, object);
    }
    return extend({}, object);
};

global.toArray = function toArray(array, callback){
    var result = [];
    for (var i = 0, j = array.length; i < j; ++i) {
        result.push(callback(array[i]));
    }
    return result;
};

global.areSameArrays = function areSameArrays(array1, array2){
    if (!array1 || !array2){
        return false;
    }
    if (array1.length !== array2.length){
        return false;
    }
    for (var i = 0, j = array1.length; i < j; ++i) {
        if(array1[i] !== array2[i]){
            return false;
        }
    }
    return true;
};

global.intersectArrays = function intersectArrays(array1, array2){
    for(var i = 0; i < array2.length; ++i){
        if(array1.indexOf(array2[i]) === -1){
            return false;
        }
    }

    return true;
}

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
if (isBrowser && !global.cancelAnimationFrame){
    global.cancelAnimationFrame = global.webkitCancelAnimationFrame ||
        global.mozCancelAnimationFrame ||
        global.oCancelAnimationFrame ||
        global.mCancelAnimationFrame;
}

sketch.types = {};
global.klass2 = function klass2(name, parent, props){
    var value = klass(parent, props, name);

    var current = isBrowser ? global : GLOBAL;
    var components = name.split('.');
    for (var i = 0; i < components.length - 1; i++) {
        var component = components[i];
        var newCurrent = current[component];
        current = current[component] = newCurrent || {};
    }
    var className = components[components.length - 1];
    if(DEBUG && current[className]){
        var currentPrototype = current[className].prototype;
        for(var method in value.prototype){
            if(value.prototype.hasOwnProperty(method)){
                currentPrototype[method] = value.prototype[method];
            }
        }
    } else {
        current[className] = value;
    }

    sketch.types[value.prototype.t] = {
        parentType: parent && parent.prototype.t ? parent.prototype.t : null
    };

    return value;
};

if(DEBUG){
    var __duid = 0;
}

(function klass_closure(){

    var F;
    var childName;
    var member, i;
    var slice = Array.prototype.slice;

    global.klass = function klass(/*args*/) {
        var Parent, props, name;
        if (arguments.length === 1){
            props = arguments[0];
        }
        else if (arguments.length === 2){
            Parent = arguments[0];
            props = arguments[1];
        }
        else if (arguments.length === 3){
            Parent = arguments[0];
            props = arguments[1];
            name = arguments[2];
        }
        var Child;

        // new constructor
        if (DEBUG && name){
            //named function, helpful for analyzing heap dumps
            childName = name.replace(/\./g, "_");
            Child = eval('function ' + childName + '(){' +
                'this.__duid__ = __duid++;' +
                ' Child.prototype._constructor.apply(this, arguments);' +
                ' if (typeof this._init === "function"){ + ' +
                '    this._init(); ' +
                '}' +
            '}; ' + childName);
        }
        else {
            Child = function ChildConstructor(){
                Child.prototype._constructor.apply(this, arguments);
                if (typeof this._init === "function"){
                    this._init();
                }
            };
        }

        // inherit
        Parent = Parent || Object;
        F = function TempFunction() { };
        F.prototype = Parent.prototype;
        Child.prototype = new F();
        Child.Super = Parent.prototype;
        Child.SuperConstructor = Parent.constructor;
        Child.prototype.constructor = Child;
        Child.prototype.Klass = Child;
        Child.prototype.SuperKlass = Parent.prototype;


        // add implementation methods
        for (i in props) {
            if (props.hasOwnProperty(i)) {
                member = props[i];

//                if (typeof member === "function") {
//                    if (Config.ENABLE_ASPECTS){
//                        member = sketch.aspects.wrap(i, member);
//                    }
//                }

                Child.prototype[i] = member;
            }
        }

        var ownConstructor = null;
        if (Child.prototype.hasOwnProperty("_constructor")) {
            ownConstructor = Child.prototype._constructor;
        }

        Child.prototype._constructor = function KlassConstructor() {
            var callSuper = true;
            if (Child.prototype.hasOwnProperty("_callSuper")) {
                callSuper = Child.prototype._callSuper;
            }

            if (callSuper && Child.Super && Child.Super.hasOwnProperty("_constructor")) {
                Child.Super._constructor.apply(this, arguments);
            }

            if (ownConstructor != null) {
                ownConstructor.apply(this, arguments);
            }
        };

        return Child;
    };
})();

global._ = function _(key){
    var value = sketch.Strings.get(key);
    if (!value){
        return "";
    }
    return value;
};

global.colors = {
    colornames:{
        aqua: '#00ffff', black: '#000000', blue: '#0000ff', fuchsia: '#ff00ff',
        gray: '#808080', green: '#008000', lime: '#00ff00', maroon: '#800000',
        navy: '#000080', olive: '#808000', purple: '#800080', red: '#ff0000',
        silver: '#c0c0c0', teal: '#008080', white: '#ffffff', yellow: '#ffff00'
    },
    toRgb: function(c) {
        c = '0x' + colors.toHex(c).substring(1);
        c = [(c >> 16) & 255, (c >> 8) & 255, c & 255];
        return 'rgb(' + c.join(',') + ')';
    },
    RGBToRGBA:function(rgb){
        if(typeof rgb.a == "undefined" || !rgb.a){
            rgb.a = 1;
        }
        return "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + rgb.a/100 + ")";
    },
    toHex: function(c) {
        var tem, i = 0, c = c ? c.toString().toLowerCase() : '';
        if (/^#[a-f0-9]{3,6}$/.test(c)) {
            if (c.length < 7) {
                var A = c.split('');
                c = A[0] + A[1] + A[1] + A[2] + A[2] + A[3] + A[3];
            }
            return c;
        }
        if (/^[a-z]+$/.test(c)) {
            return colors.colornames[c] || '';
        }
        c = c.match(/\d+(\.\d+)?%?/g) || [];
        if (c.length < 3) return '';
        c = c.slice(0, 3);
        while (i < 3) {
            tem = c[i];
            if (tem.indexOf('%') != -1) {
                tem = Math.round(parseFloat(tem) * 2.55);
            }
            else tem = parseInt(tem);
            if (tem < 0 || tem > 255) c.length = 0;
            else c[i++] = tem.toString(16).padZero(2);
        }
        if (c.length == 3) return '#' + c.join('').toLowerCase();
        return '';
    },
    HexToRGB : function (hex) {
        var rgb;
        if((hex.indexOf('#') > -1)){
            hex = hex.substring(1);
        }
        if(hex.length === 3){
            rgb = {
                r:parseInt(hex[0]+hex[0], 16),
                g:parseInt(hex[1]+hex[1], 16),
                b:parseInt(hex[2]+hex[2], 16),
                a:100
            }
        } else {
            var hex16 = parseInt(hex.substring((hex.length == 8 ? 2 : 0)), 16);
            rgb = {r: hex16 >> 16, g: (hex16 & 0x00FF00) >> 8, b: (hex16 & 0x0000FF), a: 100};
            if(hex.length == 8) {
                //ARGB
                rgb.a = 100*((parseInt(hex.substr(0,2),16) / 255).toFixed(2));
            }
        }

        return rgb;

    },
    stringToRgbArray : function(color){
        //can accept:
        //#FFFFFF
        //rgb(255,255,255)
        //rgba(255,255,255,1)
        //returns {rgba} array
        var rgb;
        var substrPos;
        if(color.indexOf("#") > -1) {
            return this.HexToRGB(color);
        }
        if(color.indexOf("rgb(") > -1){
            substrPos = 4;
        } else {
            //rgba
            substrPos = 5;
        }
        color = color.substring(substrPos, color.length-1).split(",");
        return {r:parseInt(color[0]), g:parseInt(color[1]), b:parseInt(color[2]), a:parseFloat(color[3])*100 || 100}

    },
    HexToHSB : function (hex) {
        return this.RGBToHSB(this.HexToRGB(hex));
    },
    RGBToHSB : function (rgb) {
        var hsb = {
            h: 0,
            s: 0,
            b: 0,
            a: rgb.a
        };
        var min = Math.min(rgb.r, rgb.g, rgb.b);
        var max = Math.max(rgb.r, rgb.g, rgb.b);
        var delta = max - min;
        hsb.b = max;
        if (max != 0) {

        }
        hsb.s = max != 0 ? 255 * delta / max : 0;
        if (hsb.s != 0) {
            if (rgb.r == max) {
                hsb.h = (rgb.g - rgb.b) / delta;
            } else if (rgb.g == max) {
                hsb.h = 2 + (rgb.b - rgb.r) / delta;
            } else {
                hsb.h = 4 + (rgb.r - rgb.g) / delta;
            }
        } else {
            hsb.h = -1;
        }
        hsb.h *= 60;
        if (hsb.h < 0) {
            hsb.h += 360;
        }
        hsb.s *= 100/255;
        hsb.b *= 100/255;
        hsb.h = Math.round(hsb.h);
        hsb.s = Math.round(hsb.s);
        hsb.b = Math.round(hsb.b);
        return hsb;
    },
    HSBToRGB : function (hsb) {
        var rgb = {};
        var h = Math.round(hsb.h);
        var s = Math.round(hsb.s*255/100);
        var v = Math.round(hsb.b*255/100);
        if(s == 0) {
            rgb.r = rgb.g = rgb.b = v;
        } else {
            var t1 = v;
            var t2 = (255-s)*v/255;
            var t3 = (t1-t2)*(h%60)/60;
            if(h==360) h = 0;
            if(h<60) {rgb.r=t1;	rgb.b=t2; rgb.g=t2+t3}
            else if(h<120) {rgb.g=t1; rgb.b=t2;	rgb.r=t1-t3}
            else if(h<180) {rgb.g=t1; rgb.r=t2;	rgb.b=t2+t3}
            else if(h<240) {rgb.b=t1; rgb.r=t2;	rgb.g=t1-t3}
            else if(h<300) {rgb.b=t1; rgb.g=t2;	rgb.r=t2+t3}
            else if(h<360) {rgb.r=t1; rgb.g=t2;	rgb.b=t1-t3}
            else {rgb.r=0; rgb.g=0;	rgb.b=0}
        }
        return {r:Math.round(rgb.r), g:Math.round(rgb.g), b:Math.round(rgb.b), a:hsb.a};
    },
    RGBToHex : function (rgb, skipAlpha/* if set to true, alpha will be skipped and normal color will be return, e.g. #ffffff*/) {
        var hex = [];
        if(!skipAlpha){
            hex.push(Math.floor((rgb.a/100) * 255).toString(16))
        }
        hex.push(rgb.r.toString(16));
        hex.push(rgb.g.toString(16));
        hex.push(rgb.b.toString(16));
        $.each(hex, function (nr, val) {
            if (val.length == 1) {
                hex[nr] = '0' + val;
            }
        });
        return hex.join('');
    },
    HSBToHex : function (hsb, skipAlpha) {
        return this.RGBToHex(this.HSBToRGB(hsb), skipAlpha);
    },
    nextComplimentaryColor:function(hex, count) {
        var rgb = colors.stringToRgbArray(hex);

        var hsb = colors.RGBToHSB(rgb);
        if(hsb.s < 5) {
            hsb.b = (hsb.b+(100/count)) % 80;
        } else {
            hsb.h = (hsb.h+(360/count)) % 360;
    }

        return '#'+colors.HSBToHex(hsb, true);
    }
};

global.isolatedCall = function isolatedCall(context, callback){
    context.__onlyOnce=context.__onlyOnce||{};
    if(!context.__onlyOnce[callback]){
        context.__onlyOnce[callback] = true;

        callback.call(context);

        delete context.__onlyOnce[callback];
    }
}

global.calculateRatioSize = function(sourceSize, newSize) {
    var sourceRation = sourceSize.width / sourceSize.height,
        newRation = newSize.width / newSize.height,
        scale;

    if(sourceRation < newRation) {
        scale = sourceSize.width / newSize.width;
    } else {
        scale = sourceSize.height / newSize.height;
    }
    return {width: ~~(sourceSize.width/scale), height: ~~(sourceSize.height/scale)}
};

//TODO: this fails when two elements have the same gradient brush, for example
global.detectCircularReference = function detectCircularReference(obj){
    var visited = [];
    var path=[];

    function check(o){
        if(!o || typeof o !== 'object'){
            return false;
        }
        if(visited.indexOf(o)!=-1){
            return true;
        }
        visited.push(o);

        for(var child in o){
            var r = check(o[child]);
            if(r){
                path.splice(0,0,child);
                return r;
            }
        }
        return false;
    }

    check(obj);

    return path.join('|');
}

global.resolveType = function resolveType(typeName) {
    var current = global;
    var components = typeName.split('.');
    for (var i = 0; i < components.length; i++) {
        var component = components[i];
        current = current[component];
        if(!current){
            throw 'Type not found: ' + typeName;
        }
    }

    return current;
}

global.dispose = function dispose(obj) {
    if(obj) {
        obj.dispose();
    }
}


sketch.util.deepEquals = function(o1, o2, path) {
    path = path || "";
    if(o1 == o2){
        return true;
    }

    if(o1== null || o2 == null){
        return false;
    }
    var k1 = Object.keys(o1).sort();
    var k2 = Object.keys(o2).sort();
    if (k1.length != k2.length) {
        logger.trace("Incorrect count of children: " + path);
        logger.trace("Props1: " + k1.join(", "));
        logger.trace("Props2: " + k2.join(", "));
        return false;
    }

    var res = true;
    for(var i=0; i < k1.length; ++i){
        if(((typeof o1[k1[i]]) == (typeof o2[k2[i]])) && ((typeof o2[k2[i]]) == "object")){
            res = sketch.util.deepEquals(o1[k1[i]], o2[k2[i]], path + "." + k1[i])
        }
        else {
            res = o1[k1[i]] == o2[k2[i]];
            if(!res) {
                logger.trace("Incorrect node: " + path + "." + k1[i]);
                logger.trace("Value1: " + o1[k1[i]]);
                logger.trace("Value2: " + o2[k2[i]]);
            }
        }
        if(!res){
            return false;
        }
    }

    return res;
}



sketch.math2d = {};
sketch.math2d.rotatePoint = function(point, angle, origin) {
    var cosa =Math.cos(-angle);
    var sina = Math.sin(-angle);
    var dx = point.x - origin.x;
    var dy = point.y - origin.y;
    return {x: origin.x + dx * cosa - dy * sina,
        y: origin.y + dx * sina + dy * cosa};
}

sketch.math2d.pointToLineDistance= function(point, x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y1 - y2;
    return (dy*point.x + dx*point.y + (x1*y2-x2*y1)) / Math.sqrt(dx*dx + dy*dy);
}

if (typeof Object.assign != 'function') {
  (function () {
    Object.assign = function (target) {
      'use strict';
      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var output = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var source = arguments[index];
        if (source !== undefined && source !== null) {
          for (var nextKey in source) {
            if (source.hasOwnProperty(nextKey)) {
              output[nextKey] = source[nextKey];
            }
          }
        }
      }
      return output;
    };
  })();
}

if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString, position) {
      var subjectString = this.toString();
      if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
        position = subjectString.length;
      }
      position -= searchString.length;
      var lastIndex = subjectString.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
  };
}
