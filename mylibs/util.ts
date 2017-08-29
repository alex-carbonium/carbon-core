export var isBrowser = !!(typeof window !== 'undefined' && (typeof navigator !== 'undefined') && window.document);

export function debounce(func, wait, immediate){
    var timeout;
    return function(){
        var context = this, args = arguments;
        var later = function(){
            timeout = null;
            if (!immediate) {func.apply(context, args);}
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) {func.apply(context, args);}
    };
}

export function throttle(func, limit){
    var wait = false;
    return function(){
        var context = this, args = arguments;
        if (!wait){
            func.apply(context, args);
            wait = true;
            setTimeout(function(){
                wait = false;
            }, limit);
        }
    }
}

export function imageDataPointToCssColor(imageData, x) {
    var r = imageData[x*4 + 0];
    var g = imageData[x*4 + 1];
    var b = imageData[x*4 + 2];
    var a = imageData[x*4 + 3];
    if(a !== 255) {
        return `rgba(${r},${g},${b},${a/255})`;
    }

    return `rgb(${r},${g},${b})`;
}

export function contextScale(context){
    var devicePixelRatio = window.devicePixelRatio || 1;
    var backingStoreRatio = context.backingStorePixelRatio ||
        context.webkitBackingStorePixelRatio ||
        context.mozBackingStorePixelRatio ||
        context.msBackingStorePixelRatio ||
        context.oBackingStorePixelRatio ||
        1;

    // on some machines it is non integer, it affects rendering
    return 0 | (devicePixelRatio / backingStoreRatio);
}

var useIntegerIds = false;
var idCounter = 0;
if (DEBUG){
    useIntegerIds = !!localStorage.getItem("useIntegerIds");
}

export var createUUID = (typeof(window.crypto) !== 'undefined' && typeof(window.crypto.getRandomValues) !== 'undefined') ?
    function(debugPrefix?){
        if (DEBUG){
            if (useIntegerIds){
                ++idCounter;
                return debugPrefix ? debugPrefix + idCounter + "" : idCounter + "";
            }
        }
        var buf = new Uint16Array(8);
        window.crypto.getRandomValues(buf);
        var S4 = function(num){
            var ret = num.toString(16);
            while (ret.length < 4){
                ret = "0" + ret;
            }
            return ret;
        };
        return (S4(buf[0]) + S4(buf[1]) + S4(buf[2]) + S4(buf[3]) + S4(buf[4]) + S4(buf[5]) + S4(buf[6]) + S4(buf[7]));
    }
    : function(){
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c === 'x' ? r : (r & 0x7 | 0x8)).toString(16);
    });
    return uuid;
};

export const emptyUuid = "00000000-0000-0000-0000-000000000000";

export function leaveCommonProps(target, source){
    for (var p in target){
        var targetValue = target[p];
        var sourceValue = source[p];
        if (targetValue && sourceValue && typeof targetValue === "object" && !Array.isArray(targetValue)){
            var clone = extend(true, {}, targetValue);
            leaveCommonProps(clone, sourceValue);
            target[p] = clone;
        }
        else if (Array.isArray(targetValue)) {
            if(!deepEquals(targetValue, sourceValue)) {
                target[p] = undefined;
            } else {
                target[p] = targetValue;
            }
        }
        else if (targetValue !== sourceValue){
            target[p] = undefined;
        }
    }
}

export function deepEquals(o1, o2, path?) {
    path = path || "";
    if (o1 === o2){
        return true;
    }

    if (!o1 || !o2){
        return false;
    }

    if(!(typeof o1 === 'object') || !(typeof o2 === 'object')){
        return false;
    }

    var k1 = Object.keys(o1);
    var k2 = Object.keys(o2);
    if (k1.length !== k2.length){
        return false;
    }

    var res = true;
    for(var i=0; i < k1.length; ++i){
        var key = k1[i];
        var v1 = o1[key];
        var v2 = o2[key];
        if (typeof v1 === typeof v2 && typeof v1 === "object"){
            res = deepEquals(v1, v2, path + "." + key)
        }
        else {
            res = v1 === v2;
        }
        if(!res){
            return false;
        }
    }

    return res;
};

export function pushAll(target: any[], source: any[]) {
    for (var i = 0; i < source.length; i++) {
        target.push(source[i]);
    }
}
