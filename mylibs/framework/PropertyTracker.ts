import EventHelper from './EventHelper';
import { IEvent3, Dictionary } from "carbon-basics";
import { IUIElement } from "carbon-model";

var tracker = {
    _suspended: false,
    _propsTrackingData: {},
    _inserts: [],
    _deletes: [],
    _flushNeeded: false,
    propertyChanged:EventHelper.createEvent() as IEvent3<IUIElement, Dictionary, Dictionary>,
    elementDeleted:EventHelper.createEvent(),
    elementInserted:EventHelper.createEvent(),
    changeProps:function(element, newProps, oldProps){
        if (!this._suspended){
            this.propertyChanged.raise(element, newProps, oldProps);
        }
        else{
            var elementData = this._propsTrackingData[element.id()];
            if (elementData){
                Object.assign(elementData.newProps, newProps);
                for (var name in oldProps){
                    if (!elementData.oldProps.hasOwnProperty(name)){
                        elementData.oldProps[name] = oldProps[name];
                    }
                }
            }
            else{
                this._propsTrackingData[element.id()] = {element, newProps, oldProps};
            }
            this._flushNeeded = true;
        }
    },
    registerInsert: function(parent, child){
        if (!this._suspended){
            this.elementInserted.raise(parent, child);
        }
        else{
            this._inserts.push({parent, child});
            this._flushNeeded = true;
        }
    },
    registerDelete: function(parent, child){
        if (!this._suspended){
            this.elementDeleted.raise(parent, child);
        }
        else{
            this._deletes.push({parent, child});
            this._flushNeeded = true;
        }
    },
    suspend: function(){
        this._suspended = true;
    },
    resume: function(){
        this._suspended = false;
        var flushNeeded = this._flushNeeded;
        this._flushNeeded = false;
        return flushNeeded;
    },
    resumeAndFlush: function(){
        if (this.resume()){
            this.flush();
        }
    },
    flush: function(){
        if (this._propsTrackingData){
            for (var elementId in this._propsTrackingData){
                let data = this._propsTrackingData[elementId];
                this.propertyChanged.raise(data.element, data.newProps, data.oldProps);
            }
        }
        for (let i = 0; i < this._inserts.length; i++){
            let data = this._inserts[i];
            this.elementInserted.raise(data.parent, data.child);
        }
        for (let i = 0; i < this._deletes.length; i++){
            let data = this._deletes[i];
            this.elementDeleted.raise(data.parent, data.child);
        }
        this._propsTrackingData = {};
        this._inserts = [];
        this._deletes = [];
    }
};

export default tracker;