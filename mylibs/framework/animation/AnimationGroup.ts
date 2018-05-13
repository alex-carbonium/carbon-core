import { IAnimationOptions } from "carbon-core";

var easingFunctions = {
    /*
    * t - time from 0..1
    * b - initial value
    * c - end value
    * d - duration
    */
    none: function (t, b, c, d) {
        if (t === 0) {
            return b;
        }

        return c;
    },

    linear: function (t, b, c, d) {
        return c * t / d + b;
    },
    easeInQuad: function (t, b, c, d) {
        t /= d;
        return c * t * t + b;
    },
    easeOutQuad: function (t, b, c, d) {
        t /= d;
        return -c * t * (t - 2) + b;
    },
    easeInOutQuad: function (t, b, c, d) {
        t /= d / 2;
        if (t < 1) { return c / 2 * t * t + b };
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    },
    easeInCubic: function (t, b, c, d) {
        t /= d;
        return c * t * t * t + b;
    },
    easeOutCubic: function (t, b, c, d) {
        t /= d;
        t--;
        return c * (t * t * t + 1) + b;
    },
    easeInOutCubic: function (t, b, c, d) {
        t /= d / 2;
        if (t < 1) { return c / 2 * t * t * t + b };
        t -= 2;
        return c / 2 * (t * t * t + 2) + b;
    },
    easeInQuart: function (t, b, c, d) {
        t /= d;
        return c * t * t * t * t + b;
    },
    easeOutQuart: function (t, b, c, d) {
        t /= d;
        t--;
        return -c * (t * t * t * t - 1) + b;
    },
    easeInOutQuart: function (t, b, c, d) {
        t /= d / 2;
        if (t < 1) { return c / 2 * t * t * t * t + b };
        t -= 2;
        return -c / 2 * (t * t * t * t - 2) + b;
    },
    easeInQuint: function (t, b, c, d) {
        t /= d;
        return c * t * t * t * t * t + b;
    },
    easeOutQuint: function (t, b, c, d) {
        t /= d;
        t--;
        return c * (t * t * t * t * t + 1) + b;
    },
    easeInOutQuint: function (t, b, c, d) {
        t /= d / 2;
        if (t < 1) { return c / 2 * t * t * t * t * t + b };
        t -= 2;
        return c / 2 * (t * t * t * t * t + 2) + b;
    },
    easeInSine: function (t, b, c, d) {
        return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
    },
    easeOutSine: function (t, b, c, d) {
        return c * Math.sin(t / d * (Math.PI / 2)) + b;
    },
    easeInOutSine: function (t, b, c, d) {
        return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
    },
    easeInExpo: function (t, b, c, d) {
        return c * Math.pow(2, 10 * (t / d - 1)) + b;
    },
    easeOutExpo: function (t, b, c, d) {
        return c * (-Math.pow(2, -10 * t / d) + 1) + b;
    },
    easeInOutExpo: function (t, b, c, d) {
        t /= d / 2;
        if (t < 1) { return c / 2 * Math.pow(2, 10 * (t - 1)) + b };
        t--;
        return c / 2 * (-Math.pow(2, -10 * t) + 2) + b;
    },
    easeInCirc: function (t, b, c, d) {
        t /= d;
        return -c * (Math.sqrt(1 - t * t) - 1) + b;
    },
    easeOutCirc: function (t, b, c, d) {
        t /= d;
        t--;
        return c * Math.sqrt(1 - t * t) + b;
    },
    easeInOutCirc: function (t, b, c, d) {
        t /= d / 2;
        if (t < 1) { return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b };
        t -= 2;
        return c / 2 * (Math.sqrt(1 - t * t) + 1) + b;
    },
    easeInElastic: function (t, b, c, d) {
        let s = 1.70158;
        let p = 0;
        let a = c;

        if (t === 0) {
            return b;
        }

        if ((t /= d) === 1) {
            return b + c;
        }

        if (!p) {
            p = d * .3;
        }

        if (a < Math.abs(c)) {
            a = c;
            s = p / 4;
        } else {
            s = p / (2 * Math.PI) * Math.asin(c / a);
        }

        return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
    },
    easeOutElastic: function (t, b, c, d) {
        var s = 1.70158;
        var p = 0;
        var a = c;

        if (t === 0) {
            return b;
        }

        if ((t /= d) === 1) {
            return b + c;
        }

        if (!p) {
            p = d * .3;
        }

        if (a < Math.abs(c)) {
            a = c;
            s = p / 4;
        }
        else {
            s = p / (2 * Math.PI) * Math.asin(c / a);
        }

        return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b;
    },
    easeInOutElastic: function (t, b, c, d) {
        let s = 1.70158;
        let p = 0;
        let a = c;

        if (t === 0) {
            return b;
        }
        if ((t /= d / 2) === 2) {
            return b + c;
        }
        if (!p) {
            p = d * (.3 * 1.5);
        }

        if (a < Math.abs(c)) {
            a = c;
            s = p / 4;
        }
        else {
            s = p / (2 * Math.PI) * Math.asin(c / a);
        }
        if (t < 1) {
            return -.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
        }

        return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p) * .5 + c + b;
    },
    easeInBack: function (t, b, c, d, s) {
        if (s === undefined) {
            s = 1.70158
        };

        return c * (t /= d) * t * ((s + 1) * t - s) + b;
    },
    easeOutBack: function (t, b, c, d, s?) {
        if (s === undefined) {
            s = 1.70158;
        }
        return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
    },
    easeInOutBack: function (t, b, c, d, s?) {
        if (s === undefined) {
            s = 1.70158;
        }
        if ((t /= d / 2) < 1) {
            return c / 2 * (t * t * (((s *= (1.525)) + 1) * t - s)) + b;

        }
        return c / 2 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2) + b;
    },
    easeInBounce: function (t, b, c, d) {
        return c - easingFunctions.easeOutBounce(d - t, 0, c, d) + b;
    },
    easeOutBounce: function (t, b, c, d) {
        if ((t /= d) < (1 / 2.75)) {
            return c * (7.5625 * t * t) + b;
        } else if (t < (2 / 2.75)) {
            return c * (7.5625 * (t -= (1.5 / 2.75)) * t + .75) + b;
        } else if (t < (2.5 / 2.75)) {
            return c * (7.5625 * (t -= (2.25 / 2.75)) * t + .9375) + b;
        } else {
            return c * (7.5625 * (t -= (2.625 / 2.75)) * t + .984375) + b;
        }
    },
    easeInOutBounce: function (t, b, c, d) {
        if (t < d / 2) {
            return easingFunctions.easeInBounce(t * 2, 0, c, d) * .5 + b;
        }
        return easingFunctions.easeOutBounce(t * 2 - d, 0, c, d) * .5 + c * .5 + b;
    }
}

var easingTypeMap = [
    "none",
    "linear",
    "easeInQuad",
    "easeOutQuad",
    "easeInOutQuad",
    "easeInCubic",
    "easeOutCubic",
    "easeInOutCubic",
    "easeInQuart",
    "easeOutQuart",
    "easeInOutQuart",
    "easeInQuint",
    "easeOutQuint",
    "easeInOutQuint",
    "easeInSine",
    "easeOutSine",
    "easeInOutSine",
    "easeInExpo",
    "easeOutExpo",
    "easeInOutExpo",
    "easeInCirc",
    "easeOutCirc",
    "easeInOutCirc",
    "easeInElastic",
    "easeOutElastic",
    "easeInOutElastic",
    "easeInBack",
    "easeOutBack",
    "easeInOutBack",
    "easeInBounce",
    "easeOutBounce",
    "easeInOutBounce"
]

var defaultOptions = {
    curve: 1,// linear
    delay:0,
    duration:0
}

export default class AnimationGroup {
    _values: any;
    _easing: any;
    _completed: boolean;
    _resolve: any;
    _startTime: number;
    _promise: Promise<any>;
    _doneCallback: any;
    _stopped: boolean;
    _lastT: number;
    _restart: boolean;
    _count = 0;
    controller: any;
    public onAnimationEnd: () => void;

    constructor(values, private options: IAnimationOptions, private progressCallback) {
        this.options = extend(extend({}, defaultOptions), options);
        this._values = values;

        if (typeof this.options.curve === 'function') {
            this._easing = this.options.curve;
        }
        else if (typeof this.options.curve === 'number') {
            let curve = easingTypeMap[this.options.curve];
            this._easing = easingFunctions[curve];
        }

        this._completed = false;
        this._count = (this.options.repeat === undefined) ? 1 : this.options.repeat;
        this._promise = new Promise(resolve => this._resolve = resolve);
    }

    promise() {
        return this._promise;
    }

    start(controller, startTime) {
        this.controller = controller;
        this._startTime = startTime + (this.options.delay || 0);
    }

    complete() {
        this._completed = true;
        this._resolve();
        if (this.onAnimationEnd) {
            this.onAnimationEnd();
        }
    }

    dispose() {
        this._completed = true;
    }

    update(currentTime) {
        if (this._restart) {
            this._restart = false;
            this._startTime = currentTime;
        }

        if (this._completed && this._stopped) {
            return;
        }

        var t = currentTime - this._startTime;
        if (t < 0) {
            // skip this update because of delay
            return;
        }

        this._updateWithParameter(t);
    }

    _updateWithParameter(t: number) {
        var duration = this.options.duration;
        if (t >= duration) {
            t = duration;
            this._count--;
            if(this._count) {
                this._restart = true;
            }
        }

        for (var i = 0; i < this._values.length; ++i) {
            var value = this._values[i];
            let newValue;
            if (t === duration) {
                newValue = value.to;
            } else {
                if (value.from instanceof Array) {
                    newValue = new Array(value.length);//TODO: use from pool
                    for (var k = 0; k < value.from.length; k++) {
                        var v = this._easing(t, value.from[k], value.to[k] - value.from[k], duration);
                        newValue[k] = v;
                    }
                } else {
                    newValue = this._easing(t, value.from, value.to - value.from, duration);
                }
            }
            value.accessor(newValue);
        }
        this.progressCallback && this.progressCallback();
        if (this._count <= 0) {
            this.complete();
        }

        this._lastT = t;
    }

    isCompleted() {
        return this._completed;
    }

    finish() {
        this._updateWithParameter(this.options.duration);
    }

    stop() {
        this._stopped = false;
    }

    reset() {
        this._updateWithParameter(0);
        this._stopped = true;
    }

    restart() {
        this._restart = false;
        this._stopped = false;
        this._completed = false;
        this._count = (this.options.repeat === undefined) ? 1 : this.options.repeat;
        this._promise = new Promise(resolve => this._resolve = resolve);

        this._updateWithParameter(0);
        this.controller.unregisterAnimationGroup(this);
        this.controller.registerAnimationGroup(this);
    }
}
