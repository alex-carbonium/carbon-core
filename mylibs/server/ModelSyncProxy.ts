import backend from "../backend";
import Primitive from "../framework/sync/Primitive";
import DeferredPrimitives from "../framework/sync/DeferredPrimitives";
import Invalidate from "../framework/Invalidate";
import Selection from "../framework/SelectionModel";
import UIElement from "../framework/UIElement";
import logger from "../logger";
import { createUUID, deepEquals } from "../util";
import { IApp, ChangeMode } from "carbon-core";

var debug = require("../DebugUtil")("carb:modelSync");

var EXTERNAL_MAP_CLEANUP_TIMEOUT = 2 * 60 * 1000;

export default class ModelSyncProxy {
    [name:string]:any;
    constructor(app:IApp){
        this._app = app;
        this._primitiveQueue = [];
        this._requestInProgress = false;
        this._requestStartTime = null;
        this._pendingPrimitives = [];
        this._locals = [];
        this._externals = [];
        this._lastCleanupTime = new Date();

        this._app.changedLocally.bind(this.changedLocally);
        this._app.changedExternally.bind(this.changedExternally);
    }

    getLatest(){
        return backend.changeModel(this._app, [], true)
            .then(response => JSON.parse(response));
    }

    changedLocally = primitives => {
        for (var i = 0; i < primitives.length; i++){
            var primitive = primitives[i];
            primitive.id = createUUID();
            primitive.sessionId = backend.sessionId;
            primitive.time = new Date().valueOf();

            if (DEBUG){
                debug("Local %p %o", primitive, primitive);
            }

            if (primitive.type){ //TODO: remove if when all primitives are changed
                this._registerLocal(primitive);
                this._pendingPrimitives.push(primitive);
            }
        }

        if (this._app.activityMonitor){
            this._app.activityMonitor.ensureActive();
        }

        this._app.state.isDirty(true);
    };

    change(){
        var syncBroken = this._app.syncBroken();
        if (!syncBroken && this._pendingPrimitives.length === 0){
            return Promise.resolve({id: this._app.id(), version: this._app.version()});
        }

        var requestTooLong = this._requestStartTime && new Date().getTime() - this._requestStartTime > 120 * 1000;
        if (this._requestInProgress && requestTooLong){
            logger.warn("Request in progress since " + this._requestStartTime.toISOString());
            return Promise.resolve({id: this._app.id(), version: this._app.version()});
        }

        this._requestInProgress = true;
        this._requestStartTime = new Date();

        this._cleanupLocals();

        var comparePages = DEBUG && !!sessionStorage.getItem("comparePages");
        var getFullProjectBackFromServer = this._app.syncBroken() || comparePages;
        var primitives = this._pendingPrimitives;
        var primitivesSent = primitives.length;

        return backend.changeModel(this._app, primitives, getFullProjectBackFromServer)
            .then(response =>{
                var data = JSON.parse(response);
                if (comparePages){
                    comparePagesDebug(App.Current.toJSON(), response);
                }
                if (!this._app.id() && !getFullProjectBackFromServer){
                    this._app.setProps(data, ChangeMode.Self);
                }

                if (primitivesSent === this._pendingPrimitives.length){
                    this._pendingPrimitives.length = 0;
                    this._app.state.isDirty(false);
                }
                else{
                    this._pendingPrimitives.splice(0, primitivesSent);
                }

                //syncBroken is set after request is made so the result would not contain pages yet
                if (getFullProjectBackFromServer){
                    this._app.actionManager.invoke("cancel");
                    this.resync(data);
                    this._app.syncBroken(false);
                }
                return {id: this._app.id(), version: this._app.version()};
            })
            .finally(() => {
                this._requestInProgress = false;
            });
    }

    changedExternally = (primitivesStrings, fromVersion, toVersion) => {
        if (this._app.syncBroken()){
            return;
        }
        var primitives;
        if (primitivesStrings.length === 0){
            primitives = [Primitive.no_op()];
        }
        else {
            primitives = primitivesStrings.map(JSON.parse);
        }

        debug("enqueue from: " + fromVersion + " to: " + toVersion);
        this.enqueuePrimitives(primitives, fromVersion, toVersion);
        if (this._primitiveQueue.blocked){
            return;
        }

        this._app.state.setExternalChange(true);
        this.applyPrimitives()
            .then(() => {
                Invalidate.request();
            })
            .catch(e => {
                this._app.syncBroken(true);
                logger.warn("sync required: " + e.message);
                if (!this._requestInProgress){
                    this._app.actionManager.invoke("save");
                }
            })
            .finally(() => {
                this._app.state.setExternalChange(false);
            });
    };

    enqueuePrimitives(primitives, fromVersion, toVersion){
        if (primitives.length && fromVersion && toVersion) {
            primitives[0].fromVersion = fromVersion;
            primitives[primitives.length - 1].toVersion = toVersion;
        }

        Array.prototype.push.apply(this._primitiveQueue, primitives);
    }

    applyPrimitives() : Promise<void> {
        return new Promise<void>(this.applyPrimitivesAsync);
    }
    applyPrimitivesAsync = (resolve, reject) => {
        var primitiveQueue = this._primitiveQueue;
        var i = 0;
        var app = this._app;
        var that = this;

        function process() {
            var run = true;
            do {
                primitiveQueue.blocked = false;
                if (i == primitiveQueue.length) {
                    primitiveQueue.length = 0;
                    resolve();
                    break;
                }

                var primitive = primitiveQueue[i++];

                if (primitive.fromVersion && primitive.fromVersion !== app.version()){
                    primitiveQueue.length = 0;
                    reject(new Error("failed to sync primitive: " + primitive.fromVersion + " app: " + app.version()));
                    break;
                }

                that._changeProject(primitive);

                if (primitive.toVersion) {
                    debug("set from: " + app.version() + " to: " + primitive.toVersion);
                    app.version(primitive.toVersion);
                }

                // if (promise) {
                //     primitiveQueue.blocked = true;
                //     promise.then(process).catch(reject);
                //     run = false;
                // }
            } while (run);
        }

        process();
    };

    _changeProject(p){
        this._registerExternal(p);
        var changedExternally = this._externals.indexOf(p) !== -1;

        if (changedExternally){
            DeferredPrimitives.register(p);
        }

        this._cleanupExternals();

        //TODO: it seems we have a bug here, this method should return a promise.
    }

    resync(data){
        this._app.state.setExternalChange(true);
        Selection.makeSelection([]);
        this._app.isLoaded = false;

        var pageId = this._app.activePage.id();
        this._app.fromJSON(data);
        this._app.reloaded.raise();

        this._app.isLoaded = true;
        this._app.state.setExternalChange(false);

        this._app.setActivePageById(pageId);
    }

    clearPendingChanges(){
        this._pendingPrimitives.length = 0;
    }
    getPendingChanges(){
        return this._pendingPrimitives;
    }
    addPendingChanges(primitives){
        Array.prototype.push.apply(this._pendingPrimitives, primitives);
    }

    _registerLocal(p){
        this._locals.push(p);
        var i = Primitive.speculativeIndexOf(this._externals, p);
        if (i !== -1){
            this._externals[i] = null;
        }
    }
    _registerExternal(p){
        var ownSession = p.sessionId === backend.sessionId;
        if (!ownSession){
            if (Primitive.speculativeIndexOf(this._locals, p) === -1){
                if (DEBUG){
                    debug("Will apply primitives from %s session:", ownSession ? "OWN" : "other");
                }
                p._regDate = new Date();
                this._externals.push(p);
            }
            else{
                debug("Ignoring external primitive:");
            }
            if (DEBUG){
                debug("External %p %o", p, p);
            }
        }
    }
    _cleanupLocals(){
        this._locals.length = 0;
    }
    _cleanupExternals(){
        var now : any = new Date();
        if (now - this._lastCleanupTime > EXTERNAL_MAP_CLEANUP_TIMEOUT) {
            var allNull = true;
            for (var i = 0; i < this._externals.length; i++){
                var p = this._externals[i];
                if (p){
                    if (now - p._regDate > EXTERNAL_MAP_CLEANUP_TIMEOUT) {
                        this._externals[i] = null;
                    }
                }
                allNull = allNull && !!p;
            }
            if (allNull){
                this._externals.length = 0;
            }
            this._lastCleanupTime = new Date();
        }
    }
}


function comparePagesDebug(data, response){
    var pages = map(JSON.parse(response).children, function(pageData){
        var page = UIElement.fromJSON(pageData);
        var result = page.toJSON();
        page.dispose();
        return result;
    });
    var o1 = {children: pages};

    var o2 = {children: data.children};
    if (!deepEquals(o1, o2)){
        console.error("incorrect merge");
    }

    return data;
}