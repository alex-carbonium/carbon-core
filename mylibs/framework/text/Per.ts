import { Functor } from "carbon-text";

function toFunc(valOrFunc, bindThis) {
    if (typeof valOrFunc !== 'function') {
        return Array.isArray(valOrFunc)
            ? function (emit) {
                return valOrFunc.some(emit);
            } : function (emit) {
                return emit(valOrFunc);
            };
    }
    if (bindThis) {
        return function (emit, value) {
            valOrFunc.call(bindThis, emit, value);
        }
    }
    return valOrFunc;
}

function lambda(expression) {
    return typeof expression === 'string'
        ? new Function('x', 'return ' + expression)
        : expression;
}

function blank(emit, value) {
    emit(value);
}

function setOrCall(obj, name) {
    var prop = obj[name];
    if (typeof prop === 'function') {
        return prop;
    }
    return function (val) {
        obj[name] = val;
    }
}

function optionalLimit(limit) {
    return typeof limit != 'number' ? Number.MAX_VALUE : limit;
}

function ignore() { }

function truthy(value) { return !!value; }
function min(l, r) { return Math.min(l, r); }
function max(l, r) { return Math.max(l, r); }
function sum(l, r) { return l + r }
function and(l, r) { return !!(l && r) }
function or(l, r) { return !!(l || r) }
function not(v) { return !v }

export class Per {
    forEach: Functor;

    constructor(valOrFunc, bindThis?) {
        this.forEach = toFunc(valOrFunc, bindThis);
    }

    static create(valOrFunc, bindThis?) {
        if (arguments.length === 0) {
            return new Per(blank);
        }
        if (valOrFunc && valOrFunc instanceof Per) {
            return valOrFunc;
        }
        return new Per(valOrFunc, bindThis)
    }

    per(valOrFunc, bindThis?) {
        var first = this.forEach;
        var second = toFunc(valOrFunc && valOrFunc.forEach || valOrFunc, bindThis);
        return Per.create(function (emit, value) {
            return first(function (firstVal) {
                return second(emit, firstVal);
            }, value);
        });
    }

    /* passes along modified/mapped vals*/
    map(mapFunc) {
        mapFunc = lambda(mapFunc);
        return this.per(function (emit, value) {
            return emit(mapFunc(value));
        });
    }

    /* passes along values that's predicate is true */
    filter(predicate) {
        predicate = lambda(predicate);
        return this.per(function (emit, value) {
            if (predicate(value)) {
                return emit(value);
            }
        });
    }

    /* concatenates 2 per's */
    concat(second, secondThis?): Per {
        if (second instanceof Per) {
            second = second.forEach;
        } else {
            second = toFunc(second, secondThis);
        }
        var first = this.forEach;
        return Per.create(function (emit, value) {
            first(emit, value);
            second(emit, value);
        });
    }

    /* skips first N values */
    skip(count) {
        return this.per(function (emit, value) {
            if (count > 0) {
                count--;
                return false;
            }
            return emit(value);
        });
    }

    /* takes N values, and they are passed further on */
    take(count) {
        return this.per(function (emit, value) {
            if (count <= 0) {
                return true;
            }
            count--;
            return emit(value);
        });
    }

    /* executes function on passed values. Then they are passed further on, unless listener returns true */
    listen(untilFunc) {
        return this.per(function (emit, value) {
            if (untilFunc(value)) {
                return true;
            }
            return emit(value);
        });
    }

    /* converts vals to array */
    flatten() {
        return this.per(function (emit, array) {
            return !Array.isArray(array)
                ? emit(array)
                : array.some(function (value) {
                    return emit(value);
                });
        });
    }

    /* passes values from reducer further on to next reducer. Starting from "seed" */
    reduce(reducer, seed?) {
        var result = seed, started = arguments.length == 2;
        return this.per(function (emit, value) {
            result = started ? reducer(result, value) : value;
            emit(result);
            started = true;
        });
    }

    /*  A passive observer - gathers results into the specified array, but
    otherwise has no effect on the stream of values
 */
    into(ar, limit?) {
        if (!Array.isArray(ar)) {
            throw new Error("into expects an array");
        }
        limit = optionalLimit(limit);
        return this.listen(function (value) {
            if (limit <= 0) {
                return true;
            }
            ar.push(value);
            limit--;
        });
    }

    /*  Tracks first, last and count for the values as they go past,
        up to an optional limit (see 'first' and 'last' methods).
     */
    monitor(data) {
        var n = 0;
        var count = setOrCall(data, 'count'),
            first = setOrCall(data, 'first'),
            last = setOrCall(data, 'last'),
            limit = data.limit;
        if (typeof limit != 'number') {
            limit = Number.MAX_VALUE;
        }
        if (limit < 1) {
            return this;
        }
        return this.listen(function (value) {
            if (n === 0) {
                first(value);
            }
            n++;
            count(n);
            last(value);
            if (n >= limit) {
                return true;
            }
        });
    }

    /*  Send a value into the pipeline without caring what emerges
    (only useful if you set up monitors and/or intos, or
    similar stateful observers).
 */
    submit(value?) {
        return this.forEach(ignore, value);
    }

    all() {
        var results = [];
        this.into(results).submit();
        return results;
    }

    first() {
        var results: any = { limit: 1 };
        this.monitor(results).submit();
        return results.count > 0 ? results.first : (void 0);
    }

    last() {
        var results: any = {};
        this.monitor(results).submit();
        return results.count > 0 ? results.last : (void 0);
    }

    /* passes t/f further along */
    truthy() { return this.filter(truthy); }
    min() { return this.reduce(min, Number.MAX_VALUE); }
    max() { return this.reduce(max, -Number.MAX_VALUE); }
    sum() { return this.reduce(sum, 0); }
    and = function () { return this.reduce(and, true); }
    or = function () { return this.reduce(or, false); }
    not = function () { return this.map(not); }

    static pulse(ms) {
        var counter = 0;
        return Per.create(function (emit) {
            function step() {
                if (emit(counter++) !== true) {
                    setTimeout(step, ms);
                }
            }
            step();
        });
    }
}

export default Per;