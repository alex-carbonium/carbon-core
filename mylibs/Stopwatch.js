define(function (){
    var Stopwatch = function (name, start){
        if (start) {
            this.start();
        }
        this._metrics = {};
        this._name = name;
    };

    Stopwatch.prototype.start = function (){
        var now = new Date().getTime();
        this._startTime = now;
        this._lastCheckpointTime = now;
    };

    Stopwatch.prototype.checkpoint = function (name){
        var now = new Date().getTime();
        this._metrics[this._name + "_" + name] = now - this._lastCheckpointTime;
        this._lastCheckpointTime = now;
    };

    Stopwatch.prototype.getElapsedTime = function (){
        return new Date() - this._startTime;
    };

    Stopwatch.prototype.getMetrics = function (){
        this._metrics[this._name] = new Date().getTime() - this._startTime;
        return this._metrics;
    };

    return Stopwatch;
});