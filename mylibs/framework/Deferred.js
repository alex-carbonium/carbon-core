define(["bluebird"], function(q){
    var fwk = sketch.framework;
    fwk.Deferred = {};
    
    function Adapter(dfd, promise){
        this._dfd = dfd;
        this._promise = promise || dfd.promise;
    }
    Adapter.prototype.promise = function(){
        return this;
    };
    Adapter.prototype.underlyingPromise = function(){
        return this._promise;
    };
    Adapter.prototype.resolve = function(){
        return this._dfd.resolve.apply(this._dfd, arguments);
    };
    Adapter.prototype.reject = function(){
        return this._dfd.reject.apply(this._dfd, arguments);
    };
    Adapter.prototype.then = function(){
        return new Adapter(this._dfd, this._promise.then.apply(this._promise, arguments));
    };
    Adapter.prototype.fail = function(){
        return new Adapter(this._dfd, this._promise.error.apply(this._promise, arguments));
    };
    Adapter.prototype.catch = function(){
        return new Adapter(this._dfd, this._promise.catch.apply(this._promise, arguments));
    };
    Adapter.prototype.always = function(){
        return this._promise.finally.apply(this._promise, arguments);
    };
    Adapter.prototype.pipe = function(dfd){
        this.then(function(){
            dfd.resolve.apply(dfd, arguments);
        });
        this.fail(function(){
            dfd.reject.apply(dfd, arguments);
        });
        return this;
    };
    Adapter.prototype.isResolved = function(){
        return this._promise.isFulfilled();
    };
    Adapter.prototype.done = function(){
        this._promise.done();
    };

    fwk.Deferred.create = function(){
        return new Adapter(q.defer());
    };
    fwk.Deferred.createResolvedPromise = function(data){
        var dfd = new Adapter(q.defer());
        dfd.resolve(data);
        return dfd.promise();
    };

    fwk.Deferred.createRejectedPromise = function(data){
        var dfd = new Adapter(q.defer());
        dfd.reject(data);
        return dfd.promise();
    };

    fwk.Deferred.when = function(){
        var promises = [];
        var deferreds = [];

        if (arguments.length === 1 && (arguments[0] instanceof Array)){
            deferreds = arguments[0];
        }
        else {
            deferreds = arguments;
        }
        for (var i = 0; i < deferreds.length; i++){
            promises.push(deferreds[i].underlyingPromise());
        }
        var result = fwk.Deferred.create();
        q.all(promises)
            .then(function(){
                result.resolve.apply(result, arguments);
            })
            .error(function(){
                result.reject.apply(result, arguments);
            });
        return result;
    };

    fwk.Deferred.delay = function(){
        return new Adapter(q.delay.apply(q, arguments));
    };

    return fwk.Deferred;
});