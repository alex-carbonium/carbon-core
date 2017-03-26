import {IEvent} from "carbon-core"

var resolvedPromise;

class EventSubscription {
    constructor(public event:IEvent<any>, public callback:()=>void) {

    }

    dispose(){
        if (this.event){
            this.event.unbind(this.callback);
        }
        delete this.event;
        delete this.callback;
    }
};

class Event<T> implements IEvent<T> {
    private subscribers: any[];
    private _locked: number;
    private stateChanged: any;

    bind(){
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
    }

    bindHighPriority(){
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
    }

    bindAsync(){
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
    }

    unbind(){
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
    }

    clearSubscribers(){
        if (this.subscribers){
            for (var i = 0; i < this.subscribers.length; i++){
                var s = this.subscribers[i];
                s.clear && s.clear();
            }
            delete this.subscribers;
        }
    }

    lock(){
        this._locked = this._locked || 0;
        this._locked++;
    }

    unlock(){
        this._locked--;
        if(!this._locked){
            delete this._locked;
        }
    }

    isLocked(){
        return this._locked > 0;
    }

    raise(){
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
    }

    enableStateTracking(){
        this.stateChanged = EventHelper.createEvent();
        return this.stateChanged;
    }
    disableStateTracking(){
        if (this.stateChanged){
            this.stateChanged.clearSubscribers();
            delete this.stateChanged;
        }
    }
    raiseStateChanged(message){
        if (this.stateChanged){
            this.stateChanged.raise(message);
        }
    }
}

class EventHandler {
    constructor(protected __target:any, protected __method: any) {

    }

    raise(){
        return this.__method.apply(this.__target, arguments);
    }

    equals(handler2){
        return this.__target === handler2.__target && this.__method === handler2.__method;
    }

    closure (){
        var that = this;
        return function eventHandlerClosure(){
            return that.raise.apply(that, arguments);
        }
    }
}

class AsyncEventHandler extends EventHandler{
    private _timerId:number;

    constructor(__target:any, __method:any) {
        super(__target, __method);
    }

    raise(){
        var args = arguments;
        var method = this.__method;
        var target = this.__target;
        this._timerId = setTimeout(function() {
            method.apply(target, args);
        }, 1);
    }

    clear(){
        if (this._timerId){
            clearTimeout(this._timerId);
            this._timerId = 0;
        }
    }
};

window['EventHandler'] = function(that, method) {
    return new EventHandler(that, method);
};


export default class EventHelper  {
    static preventDefault(event){
        if(event.preventDefault)
        {
            event.preventDefault();
        }
        else
        {
            event.returnValue = false;
        }
    }

    static createEvent<T>() : IEvent<T>{
        return new Event<T>();
    }
};
