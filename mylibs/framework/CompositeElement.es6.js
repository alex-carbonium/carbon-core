import PropertyMetadata from "framework/PropertyMetadata";
import PropertyTracker from "framework/PropertyTracker";
import {leaveCommonProps} from "../util";
import {Types} from "./Defs";
import Brush from "framework/Brush";
import Font from "framework/Font";
import UIElement from "./UIElement";
import GroupArrangeStrategy from "./GroupArrangeStrategy";
import Box from "./Box";
import Rect from "../math/rect";
import Phantom from "./Phantom";

export default class CompositeElement extends UIElement{
    constructor(){
        super();

        this._types = [];
        this.children = [];
        this.elements = [];

        PropertyTracker.propertyChanged.bind(this, this._onPropsChanged);
    }
    add(element){
        var systemType = element.systemType();
        if (this._types.indexOf(systemType) === -1){
            this._types.push(systemType);
        }
        element.enablePropsTracking();
        this.elements.push(element);
        this.children.push(new Phantom(element, element.selectLayoutProps(true)));
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
        this.elements.splice(i, 1);
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
        this.elements = [];
        this.children = [];
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
    clone(){
        var clone = super.clone.apply(this, arguments);
        if (this.commonProps){
            clone.setCommonProps(this.commonProps);
        }
        return clone;
    }
    displayName(){
        if (this.allHaveSameType()){
            return this.elements[0].displayName();
        }
        return "";
    }
    findPropertyMetadata(propName){
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
    }
    setCommonProps(groups){
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
    }
    _onPropsChanged(element, newProps){
        if (this.has(element)){
            if (newProps.hasOwnProperty("m")
                || newProps.hasOwnProperty("stroke")
                || newProps.hasOwnProperty("width")
                || newProps.hasOwnProperty("height")
            ) {
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
    }
    _onPropsChangedNextTick(){
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