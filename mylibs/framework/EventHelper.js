var resolvedPromise;

var EventSubscription = function EventSubscription(event, callback){
    this.event = event;
    this.callback = callback;
};
EventSubscription.prototype.dispose = function dispose(){
    if (this.event){
        this.event.unbind(this.callback);
    }
    delete this.event;
    delete this.callback;
};

var Event = function Event(){
};

Event.prototype.bind = function bind(){
    var f;

    if (!this.subscribers){
        this.subscribers = [];
    }

    if(arguments.length === 1){
        f = arguments[0];
    } else {
        f = new EventHandler(arguments[0], arguments[1])
    }

    var subscription = new EventSubscription(this, f);
    this.subscribers.push(f);
    return subscription;
};

Event.prototype.bindHighPriority = function bind(){
    var f;

    if (!this.subscribers){
        this.subscribers = [];
    }

    if(arguments.length === 1){
        f = arguments[0];
    } else {
        f = new EventHandler(arguments[0], arguments[1])
    }

    var subscription = new EventSubscription(this, f);
    this.subscribers.splice(0,0,f);
    return subscription;
};



Event.prototype.bindAsync = function bindAsync(){
    var f;

    if (!this.subscribers){
        this.subscribers = [];
    }

    if(arguments.length === 1){
        f = new AsyncEventHandler(null, arguments[0]);
    } else {
        f = new AsyncEventHandler(arguments[0], arguments[1]);
    }

    var subscription = new EventSubscription(this, f);
    this.subscribers.push(f);
    return subscription;
};

Event.prototype.unbind = function unbind(){
    if (!this.subscribers){
        return;
    }

    var f;
    if(arguments.length == 1){
        f = arguments[0];
    } else {
        f = new EventHandler(arguments[0], arguments[1]);
    }

    for (var i = this.subscribers.length - 1; i >= 0; --i){
        if (this.subscribers[i] === f){
            this.subscribers.splice(i, 1);
            break;
        } else if (typeof f.equals === 'function' && f.equals(this.subscribers[i])){
            this.subscribers.splice(i, 1);
            break;
        }
    }

    if (!this.subscribers.length){
        delete this.subscribers;
        this.raiseStateChanged("empty");
    }
};
Event.prototype.clearSubscribers = function clearSubscribers(){
    if (this.subscribers){
        for (var i = 0; i < this.subscribers.length; i++){
            var s = this.subscribers[i];
            s.clear && s.clear();
        }
        delete this.subscribers;
    }
};
Event.prototype.lock = function lock(){
    this._locked = this._locked || 0;
    this._locked++;
};
Event.prototype.unlock = function unlock(){
    this._locked--;
    if(!this._locked){
        delete this._locked;
    }
};
Event.prototype.isLocked = function isLocked(){
    return this._locked > 0;
};
Event.prototype.raise = function raise(){
    if(this._locked){
        return;
    }

    if (!this.subscribers){
        return;
    }

    var promises;
    var args;
    if (arguments.length > 0){
        //to avoid optimization warning about passing arguments to other methods
        args = new Array(arguments.length);
        for (var j = 0, l = arguments.length; j < l; j++){
            args[j] = arguments[j];
        }
    }

    var s = [].concat(this.subscribers);
    for (var i = 0; i < s.length; ++i){
        var e = s[i];
        var res;
        if (e instanceof Event){
            if((res=e.raise.apply(e, args)) === false){
                return;
            }
        }
        else if (e instanceof EventHandler){
            if((res=e.raise.apply(e, args)) === false){
                return;
            }
        }
        else {
            if((res=e.apply(this, args)) === false){
                return;
            }
        }

        if(res && typeof res.then === 'function') {
            promises = promises || [];
            promises.push(res);
        }
    }

    if(promises) {
        return Promise.all(promises);
    }

    resolvedPromise = resolvedPromise || Promise.resolve();
    return resolvedPromise;
};
Event.prototype.enableStateTracking = function enableStateTracking(){
    this.stateChanged = EventHelper.createEvent();
    return this.stateChanged;
};
Event.prototype.disableStateTracking = function disableStateTracking(){
    if (this.stateChanged){
        this.stateChanged.clearSubscribers();
        delete this.stateChanged;
    }
};
Event.prototype.raiseStateChanged = function raiseStateChanged(message){
    if (this.stateChanged){
        this.stateChanged.raise(message);
    }
};

var EventHelper = {
    preventDefault : function(event){
        if(event.preventDefault)
        {
            event.preventDefault();
        }
        else
        {
            event.returnValue = false;
        }
    },
    createEvent : function createEvent(){
        return new Event();
    }
};


var EventHandler = function(that, method){
    this.__target = that;
    this.__method = method;
};

EventHandler.prototype.raise = function(){
    return this.__method.apply(this.__target, arguments);
};

EventHandler.prototype.equals = function(handler2){
    return this.__target === handler2.__target && this.__method === handler2.__method;
};

EventHandler.prototype.closure = function(){
    var that = this;
    return function eventHandlerClosure(){
        return that.raise.apply(that, arguments);
    }
};

var AsyncEventHandler = function(that, method){
    this.__target = that;
    this.__method = method;
};

AsyncEventHandler.prototype = new EventHandler();
AsyncEventHandler.constructor = EventHandler;
AsyncEventHandler.prototype.raise = function(){
    var args = arguments;
    var that = this;
    this._timerId = setTimeout(function() {
        that.__method.apply(that.__target, args);
    }, 1);
};
AsyncEventHandler.prototype.clear = function(){
    if (this._timerId){
        clearTimeout(this._timerId);
        this._timerId = 0;
    }
};


window.EventHandler = function(that, method) {
    return new EventHandler(that, method);
};

export default EventHelper;