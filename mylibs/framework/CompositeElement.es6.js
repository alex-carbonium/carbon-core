// @flow

import PropertyMetadata, {PropertyDescriptor} from "./PropertyMetadata";
import PropertyTracker from "./PropertyTracker";
import {leaveCommonProps} from "../util";
import {Types} from "./Defs";
import Brush from "./Brush";
import Font from "./Font";
import UIElement from "./UIElement";
import GroupArrangeStrategy from "./GroupArrangeStrategy";
import {IGroupContainer} from "./CoreModel";
import Box from "./Box";
import Rect from "../math/rect";
import Phantom from "./Phantom";
import Environment from "../environment";

export default class CompositeElement extends UIElement implements IGroupContainer{
    constructor(){
        super();

        this._types = [];
        this.children = [];                

        PropertyTracker.propertyChanged.bind(this, this._onPropsChanged);
    }

    get elements(){
        return this.children;
    }

    add(element){
        var systemType = element.systemType();
        if (this._types.indexOf(systemType) === -1){
            this._types.push(systemType);
        }
        element.enablePropsTracking();                        
        this.children.push(element);
    }
    remove(element){
        element.disablePropsTracking();

        var systemType = element.systemType();
        var canRemoveType = true;

        var elementIndex = -1;
        for (var i = 0; i < this.children.length; i++){
            var e = this.children[i];
            if (canRemoveType && e !== element && e.systemType() === systemType){
                canRemoveType = false;
            }
            if (e === element){
                elementIndex = i;
            }
        }
        
        this.children.splice(i, 1);

        if (canRemoveType){
            this._types.splice(this._types.indexOf(systemType), 1);
        }
    }

    performArrange(){
        if (this.elements.length > 1){
            this.resetTransform();
            GroupArrangeStrategy.arrange(this);
        }
    }

    wrapSingleChild(){
        return true;
    }

    translateChildren(){
        return false;
    }

    elementAt(index){
        return this.elements[index];
    }
    singleOrDefault(){
        return this.count() === 1 ? this.elements[0] : null;
    }
    singleOrSelf(){
        return this.count() === 1 ? this.elements[0] : this;
    }
    has(element){
        for (var i = 0, j = this.elements.length; i < j; ++i){
            if (this.elements[i] === element){
                return true;
            }
        }
        return false;
    }
    clear(){
        this.each(x => x.disablePropsTracking());
        this._types = [];
        //do not clear, selection model stores this by reference
        this.children = [];
        this.resetTransform();
    }
    count(){
        return this.elements.length;
    }

    propsUpdated(newProps, oldProps, mode){
        super.propsUpdated.apply(this, arguments);

        //not sure if it is safe to propagate other properties, so taking only what's needed for now
        if (newProps.visible !== oldProps.visible){
            for (var i = 0; i < this.elements.length; i++){
                this.elements[i].setProps({visible: newProps.visible}, mode);
            }
        }
    }

    hitTest(/*Point*/point, scale){
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
    }
    hitVisible(){
        return true;
    }
    canAccept(){
        return false;
    }
    each(callback){
        this.elements.forEach(callback);
    }
    map(callback){
        return this.elements.map(callback);
    }
    first(callback){
        return this.elements[0];
    }
    resizeDimensions(){
        return 0;
    }
    canDrag(){
        var canDrag = true;
        this.each(function(element){
            if (!element.canDrag()){
                canDrag = false;
                return false;
            }
        })
        return canDrag;
    }

    isDescendantOrSame(element){
        var res = false;

        this.each(function(e){
            res |= e.isDescendantOrSame(element);
            if (res){
                return false;// break;
            }
        });

        return res;
    }
    displayName(){
        if (this.allHaveSameType()){
            return this.elements[0].displayName();
        }
        return "";
    }
    findPropertyDescriptor(propName){
        return PropertyMetadata.find(this._types[0], propName);
    }
    allHaveSameType(){
        return this._types.length === 1;
    }
    allHaveSameParent(){
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
    }
    parents(){
        var parents = [];
        for (var i = 0; i < this.elements.length; i++){
            var parent = this.elements[i].parent();
            if (parents.indexOf(parent) === -1){
                parents.push(parent);
            }
        }
        return parents;
    }
    prepareCommonProps(changes){
        var result = [];
        for (var i = 0; i < this.elements.length; i++){
            var element = this.elements[i];
            var elementChanges = Object.assign({}, changes);
            for(var p in elementChanges){
                if(p === 'fill' || p === 'stroke'){
                    elementChanges[p] = Brush.extend(element.props[p], elementChanges[p])
                } else if (p === 'font'){
                    elementChanges[p] = Font.extend(element.props[p], elementChanges[p])
                }
            }
            element.prepareProps(elementChanges);
            result.push(elementChanges);
        }
        return result;
    }
    selectCommonProps(names){
        var result = [];
        for (var i = 0; i < this.elements.length; i++){
            var element = this.elements[i];
            result.push(element.selectProps(names));
        }
        return result;
    }
    // rules:
    // - find groups with matching label for all types, these groups are assumed to have same props
    // - in remaining groups, find props with same name+type and put them into a default group
    createPropertyGroups(){
        if (this.count() === 0){
            return [];
        }

        if (this.count() === 1){
            let type = this._types[0];
            let metadata = PropertyMetadata.findAll(type);            
            let groups = metadata ? metadata.groups(this.elements[0]) : [];                        
            return groups;
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

        return commonGroups;
    }

    getDisplayPropValue(propertyName: string, descriptor: PropertyDescriptor){
        if (this.count() === 1){
            return this.elements[0].getDisplayPropValue(propertyName, descriptor);
        }

        var values = this.elements.map(x => x.getDisplayPropValue(propertyName, descriptor));
        var base = values[0];
        for (let i = 1; i < values.length; ++i){
            let next = values[i];
            let isComplex = typeof next === "object" || Array.isArray(next);
            if (isComplex){
                leaveCommonProps(base, next);
            }            
            else if (next !== base){
                base = undefined;
                break;
            }
        }
        
        return base;
    }
    prepareDisplayPropsVisibility(){
        var type = this.allHaveSameType() ?
            this.elements[0].systemType() :
            this.systemType();
        
        var metadata = PropertyMetadata.findAll(type);
        if (!metadata || !metadata.prepareVisibility){
            return {};
        }
        
        var base = metadata.prepareVisibility(this.elements[0], this, Environment.view);
        for (let i = 1; i < this.elements.length; ++i){
            let element = this.elements[i];
            let next = metadata.prepareVisibility(element, this, Environment.view);
            if (next){
                for (let p in next){
                    let visible = next[p];
                    if (!visible){
                        base[p] = false;
                    }
                }
            }            
        }
        return base;
    }

    _onPropsChanged(element, newProps){
        if (this.has(element)){
            if (newProps.hasOwnProperty("m") || newProps.hasOwnProperty("br")
            ) {
                this.resetGlobalViewCache();                
            }
            
            if (this.count() === 1){
                PropertyTracker.changeProps(this, newProps, {});
                return;
            }
            //for multiselection, capture all changes within the current tick and fire a single update on next tick
            if (!this._newPropsForNextTick){
                this._newPropsForNextTick = {};
            }            
            
            this._newPropsForNextTick = Object.assign(this._newPropsForNextTick, newProps);
            
            if (this._propsChangedTimer){
                clearTimeout(this._propsChangedTimer);
                this._propsChangedTimer = 0;
            }
            this._propsChangedTimer = setTimeout(() => this._onPropsChangedNextTick(), 1);
        }
    }
    _onPropsChangedNextTick(){
        if (this.isDisposed()){
            return;
        }
        var newProps = this._newPropsForNextTick;
        this._newPropsForNextTick = null;

        this.performArrange();
        PropertyTracker.changeProps(this, newProps, {});
    }    

    dispose(){
        super.dispose.apply(this, arguments);
        PropertyTracker.propertyChanged.unbind(this, this._onPropsChanged);
    }

    padding(){
        return Box.Default;
    }
}

CompositeElement.prototype.t = Types.CompositeElement;

PropertyMetadata.registerForType(CompositeElement, {
    groups(element){
        return element.getCommonProperties();
    }
});