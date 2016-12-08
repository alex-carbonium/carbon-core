import UIElement from "framework/UIElement";
import PropertyMetadata from "framework/PropertyMetadata";
import PropertyTracker from "framework/PropertyTracker";
import util from "util";
import Matrix from "math/matrix";
import {leaveCommonProps} from "../util";
import {Types} from "./Defs";
import {combineRects} from "../math/math";

var CompositeElement =  klass2("sketch.framework.CompositeElement", UIElement, {
    _constructor: function(){
        this.elements = [];
        this._selected = false;
        this._canDraw = false;

        this._initialized = true;
        this._types = [];
        //this._angleEditable = false;

        PropertyTracker.propertyChanged.bind(this, this._onPropsChanged);
    },
    add: function(element){
        //var length = this.elements.push(element);
        // if (length > 1 && this.elements[length - 1].zOrder() < this.elements[length - 2].zOrder()){
        //     this.elements.sort(function(a, b){ return a.zOrder() - b.zOrder(); })
        // }
        var systemType = element.systemType();
        if (this._types.indexOf(systemType) === -1){
            this._types.push(systemType);
        }
        element.enablePropsTracking();
        var gr = element.getBoundaryRectGlobal();
        if (this.elements.length === 0){
            this.setProps(gr);
        }
        else{
            var props = this.selectProps(["x", "y", "width", "height"]);
            this.setProps(combineRects(props, gr));
        }
        this.elements.push(element);
        this.resetGlobalViewCache();
    },
    remove: function(element){
        this.elements.splice(this.elements.indexOf(element), 1);
        element.disablePropsTracking();

        var systemType = element.systemType();
        var canRemoveType = true;
        var props = null;

        for (var i = 0; i < this.elements.length; i++){
            var e = this.elements[i];
            if (canRemoveType && e !== element && e.systemType() === systemType){
                canRemoveType = false;
            }
            var gr = e.getBoundaryRectGlobal();
            if (props === null){
                props = gr;
            }
            else{
                props = combineRects(props, gr);
            }
        }
        this.setProps(props);

        if (canRemoveType){
            this._types.splice(this._types.indexOf(systemType), 1);
        }
        this.resetGlobalViewCache();
    },
    elementAt: function(index){
        return this.elements[index];
    },
    singleOrDefault: function(){
        return this.count() === 1 ? this.elements[0] : null;
    },
    singleOrSelf: function(){
        return this.count() === 1 ? this.elements[0] : this;
    },
    has: function(element){
        for (var i = 0, j = this.elements.length; i < j; ++i){
            if (this.elements[i] === element){
                return true;
            }
        }
        return false;
    },
    clear: function(){
        this._canDraw = false;
        this.each(x => x.disablePropsTracking());
        this.elements = [];
        this._types = [];
        //this.setProps({x: 0, y: 0, width: 0, height: 0});
        this.resetGlobalViewCache();
    },

    propsUpdated: function(newProps, oldProps, mode){
        UIElement.prototype.propsUpdated.apply(this, arguments);

        //not sure if it is safe to propagate other properties, so taking only what's needed for now
        if (newProps.visible !== oldProps.visible){
            for (var i = 0; i < this.elements.length; i++){
                this.elements[i].setProps({visible: newProps.visible}, mode);
            }
        }
    },

    hitTest: function(/*Point*/point, scale){
        var count = this.count();
        if (count === 0){
            return false;
        }

        for (var i = count - 1; i >= 0; i--){
            var el = this.elements[i];
            if (el.hitTest(point, scale)){
                return true;
            }
        }
        return false;
    },
    count: function(){
        return this.elements.length;
    },
    hitVisible: function(){
        return true;
    },
    canAccept: function(){
        return false;
    },
    each: function(callback){
        this.elements.forEach(callback);
    },
    map: function(callback){
        return this.elements.map(callback);    
    },
    first: function(callback){
        return this.elements[0];
    },
    resizeDimensions: function(){
        return 0;
    },
    drawSelf: function(context,w,h, environment){
        if (this._canDraw){
            var x = this.x();
            var y = this.y();
            for (let i = 0, l = this.elements.length; i < l; ++i) {
                let element = this.elements[i];
                context.save();
                var gr = element.getBoundaryRectGlobal();
                context.translate(gr.x - x, gr.y - y);
                element.drawSelf(context, element.width(), element.height(), environment);
                context.restore();
            }
        }
    },
    canDrag: function(){
        var canDrag = true;
        this.each(function(element){
            if (!element.canDrag()){
                canDrag = false;
                return false;
            }
        })
        return canDrag;
    },
    // min: function(accessor){
    //     var result = null;
    //
    //     this.each(function(element){
    //         var value = accessor(element);
    //         if (result === null || value < result){
    //             result = value;
    //         }
    //     });
    //
    //     return result;
    // },
    // max: function(accessor){
    //     var result = null;
    //
    //     this.each(function(element){
    //         var value = accessor(element);
    //         if (result === null || value > result){
    //             result = value;
    //         }
    //     });
    //
    //     return result;
    // },
    // x: function(value){
    //     if (!this._initialized){
    //         return 0;
    //     }
    //
    //     if (arguments.length === 0){
    //         return this.min(function(element){
    //             var gr = element.getBoundingBoxGlobal();
    //             return gr.x;
    //         });
    //     }
    //
    //     var oldValue = this.x();
    //     var diff = value - oldValue;
    //
    //     this.each(function(element){
    //         if (element.canDrag()){
    //             element.x(element.x() + diff);
    //         }
    //     });
    //
    //     //this.properties.raisePropertyChanged();
    //
    //     return 0;
    // },
    // y: function(value){
    //     if (!this._initialized){
    //         return 0;
    //     }
    //
    //     if (arguments.length === 0){
    //         return this.min(function(element){
    //             var gr = element.getBoundingBoxGlobal();
    //             return gr.y;
    //         });
    //     }
    //
    //     var oldValue = this.y();
    //     var diff = value - oldValue;
    //
    //     this.each(function(element){
    //         if (element.canDrag()){
    //             element.y(element.y() + diff);
    //         }
    //     });
    //
    //     //this.properties.raisePropertyChanged();
    //
    //     return 0;
    // },
    // width: function(value){
    //     if (!this._initialized){
    //         return 0;
    //     }
    //
    //     return this.max(function(element){
    //             var gr = element.getBoundingBoxGlobal();
    //             return gr.x + gr.width;
    //         }) - this.x();
    // },
    // height: function(value){
    //     if (!this._initialized){
    //         return 0;
    //     }
    //
    //     return this.max(function(element){
    //             var gr = element.getBoundingBoxGlobal();
    //             return gr.y + gr.height;
    //         }) - this.y();
    // },

    isDescendantOrSame: function(element){
        var res = false;              

        this.each(function(e){
            res |= e.isDescendantOrSame(element);
            if (res){
                return false;// break;
            }
        });

        return res;
    },
    clone: function(){
        var clone = UIElement.prototype.clone.apply(this, arguments);
        this.each(function(element){
            clone.add(element.clone());
        });
        if (this.commonProps){
            clone.setCommonProps(this.commonProps);
        }
        return clone;
    },
    startDrag: function(){
        this._canDraw = true;
    },
    stopDrag: function(){
        this._canDraw = false;
    },
    displayName: function(){
        if (this.allHaveSameType()){
            return this.elements[0].displayName();
        }
        return "";
    },
    findPropertyMetadata: function(propName){
        return PropertyMetadata.find(this._types[0], propName);
    },
    allHaveSameType: function(){
        return this._types.length === 1;
    },
    allHaveSameParent: function(){
        var result = true;
        var parent;

        this.each(function(e){
            if (parent && e.parent() !== parent){
                result = false;
                return false;
            }
            parent = e.parent();
        });

        return result;
    },
    parents: function(){
        var parents = [];
        for (var i = 0; i < this.elements.length; i++){
            var parent = this.elements[i].parent();
            if (parents.indexOf(parent) === -1){
                parents.push(parent);
            }
        }
        return parents;
    },
    prepareCommonProps: function(changes){
        var result = [];
        for (var i = 0; i < this.elements.length; i++){
            var element = this.elements[i];
            var elementChanges = Object.assign({}, changes);
            element.prepareProps(elementChanges);
            result.push(elementChanges);
        }
        return result;
    },
    selectCommonProps: function(names){
        var result = [];
        for (var i = 0; i < this.elements.length; i++){
            var element = this.elements[i];
            result.push(element.selectProps(names));
        }
        return result;
    },
    // rules:
    // - find groups with matching label for all types, these groups are assumed to have same props
    // - in remaining groups, find props with same name+type and put them into a default group
    createPropertyGroups: function(){
        if (this.count() === 0){
            return [];
        }

        if (this.count() === 1){
            var type = this._types[0];
            var metadata = PropertyMetadata.findAll(type);
            this.commonProps = this.elements[0].props;
            return metadata ? metadata.groups(this.elements[0]) : [];
        }

        var commonGroups = [];
        var entries = [];

        for (var i = 0; i < this._types.length; i++){
            var type = this._types[i];
            var metadata = PropertyMetadata.findAll(type);
            if (metadata){
                entries.push({
                    metadata: metadata,
                    groups: metadata.groups()
                });
            }
        }

        var sample = entries[0];
        var used = {};
        for (var i = 0; i < sample.groups.length; i++){
            var candidate = sample.groups[i];
            if (!candidate.label){
                continue;
            }

            for (var j = 1; j < entries.length; j++){
                var entry = entries[j];
                var found = false;
                for (var k = 0; k < entry.groups.length; k++){
                    var group = entry.groups[k];
                    if (group.label === candidate.label){
                        found = true;
                        break;
                    }
                }
                if (!found){
                    candidate = null;
                    break;
                }
            }

            if (candidate){
                commonGroups.push(candidate);
                used[candidate.label] = true;
            }
        }

        var commonProps = [];
        for (var i = 0; i < sample.groups.length; i++){
            if (used[sample.groups[i].label]){
                continue;
            }
            for (var j = 0; j < sample.groups[i].properties.length; j++){
                var candidateName = sample.groups[i].properties[j];
                var candidateType = sample.metadata[candidateName].type;

                for (var k = 1; k < entries.length; k++){
                    var entry = entries[k];
                    var found = false;
                    for (var l = 0; l < entry.groups.length; l++){
                        var group = entry.groups[l];
                        for (var m = 0; m < group.properties.length; m++){
                            var propertyName = group.properties[m];
                            var propertyMetadata = entry.metadata[propertyName];
                            var propertyType = propertyMetadata ? propertyMetadata.type : null;
                            if (propertyName === candidateName && propertyType === candidateType){
                                found = true;
                                break;
                            }
                        }
                        if (found){
                            break;
                        }
                    }
                    if (!found){
                        candidateName = null;
                        break;
                    }
                }

                if (candidateName){
                    commonProps.push(candidateName);
                }
            }
        }

        if (commonProps.length){
            commonGroups.splice(0, 0, {
                label: this.allHaveSameType() ? this.elements[0].displayType() : "Common",
                properties: commonProps
            });
        }

        this.setCommonProps(commonGroups);

        return commonGroups;
    },
    setCommonProps: function(groups){
        var propNames = ["name", "locked"];
        var sample = this.elements[0];
        var props = {
            name: sample.props.name,
            locked: sample.props.locked
        };
        for (var i = 0; i < groups.length; i++){
            var group = groups[i];
            for (var j = 0; j < group.properties.length; j++){
                var propertyName = group.properties[j];
                var value = sample.props[propertyName];
                props[propertyName] = value;
                propNames.push(propertyName);
            }
        }
        for (var i = 1; i < this.elements.length; i++){
            var element = this.elements[i];
            var changes = element.selectProps(propNames);
            leaveCommonProps(props, changes);
        }
        this.commonProps = props;
    },
    updateViewMatrix:function() {
        this.resetGlobalViewCache();
    },
    globalViewMatrix:function() {
        return Matrix.Identity;
    },
    _onPropsChanged: function(element, newProps){
        if (this.has(element)){
            if (newProps.flipVertical !== undefined
                || newProps.flipHorizontal !== undefined
                || newProps.angle !== undefined
                || newProps.x !== undefined
                || newProps.y !== undefined
                || newProps.stroke !== undefined
            ) {
                this.updateViewMatrix();
            }
            else if (newProps.width !== undefined || newProps.height !== undefined) {
                this.resetGlobalViewCache();
            }

            if(!this.commonProps) {
                this.createPropertyGroups();
            }
            if (this.count() === 1){
                var oldProps = {};
                for (var i in newProps){
                    oldProps[i] = this.commonProps[i];
                }

                PropertyTracker.changeProps(this, newProps, oldProps);
                return;
            }
            //for multiselection, capture all changes within the current tick and fire a single update on next tick
            if (!this._newPropsForNextTick){
                this._newPropsForNextTick = extend(true, {}, newProps);
            }
            else{
                leaveCommonProps(this._newPropsForNextTick, newProps);
            }
            if (this._propsChangedTimer){
                clearTimeout(this._propsChangedTimer);
                this._propsChangedTimer = 0;
            }
            var that = this;
            this._propsChangedTimer = setTimeout(function(){ that._onPropsChangedNextTick(); }, 1);
        }
    },
    _onPropsChangedNextTick: function(){
        if (this.isDisposed()){
            return;
        }
        var newProps = this._newPropsForNextTick;
        this._newPropsForNextTick = null;

        var oldProps = {};
        for (var i in newProps){
            oldProps[i] = this.commonProps[i];
        }

        PropertyTracker.changeProps(this, newProps, oldProps);
    },
    dispose: function(){
        UIElement.prototype.dispose.apply(this, arguments);
        PropertyTracker.propertyChanged.unbind(this, this._onPropsChanged);
    }
});

CompositeElement.prototype.t = Types.CompositeElement;

PropertyMetadata.registerForType(CompositeElement, {
    groups: function(element){
        return element.getCommonProperties();
    }
});

export default CompositeElement;