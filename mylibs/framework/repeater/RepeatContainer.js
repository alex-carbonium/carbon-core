import Container from "./../Container";
import PropertyMetadata from "./../PropertyMetadata";
import {ArrangeStrategies, Overflow, ChangeMode, Types} from "./../Defs";
import RepeatCell from "./RepeatCell";
import RepeatMarginTool from "./RepeatMarginTool";
import RepeatFrameType from "./frame/RepeatFrameType";

export default class RepeatContainer extends Container{
    canAccept(){
        return false;
    }
    prepareProps(changes){
        super.prepareProps(changes);
        if (changes.innerMarginX !== undefined) {
            changes.innerMarginX = changes.innerMarginX + .5|0;
        }
        if (changes.innerMarginY !== undefined) {
            changes.innerMarginY = changes.innerMarginY + .5|0;
        }
        if (changes.masterWidth !== undefined) {
            changes.masterWidth = changes.masterWidth + .5|0;
        }
        if (changes.masterHeight !== undefined) {
            changes.masterHeight = changes.masterHeight + .5|0;
        }
    }
    primitiveRoot(){
        return this;
    }
    primitivePath(){
        var realRoot = this._realPrimitiveRoot();
        if (!realRoot){
            return [];
        }
        var path = this.runtimeProps.primitivePath;
        if (!path){
            path = realRoot.primitivePath().slice();
            path[path.length - 1] = this.id();
            this.runtimeProps.primitivePath = path;
        }
        return path;
    }
    _realPrimitiveRoot(){
        var parent = this.parent();
        if (!parent){
            return null;
        }
        return parent.primitiveRoot();
    }

    trackInserted() {
        delete this.runtimeProps.primitivePath;
        super.trackInserted.apply(this, arguments);
    }
    trackDeleted(parent) {
        delete this.runtimeProps.primitivePath;
        super.trackDeleted.apply(this, arguments);
    }

    registerSetProps(element, props, oldProps, mode){
        if (mode === ChangeMode.Self){
            return;
        }
        var realRoot = this._realPrimitiveRoot();
        if (!realRoot){
            return;
        }
        if (element === this || element instanceof RepeatCell){
            realRoot.registerSetProps(element, props, oldProps, mode);
            return;
        }

        if (element.runtimeProps.repeatMaster){
            element = element.runtimeProps.repeatMaster;
            //transfer props from drag clone
            element.setProps(props, ChangeMode.Self);
        }
        this._buildChain(element);

        var current = element;
        var i = 0, l = this.children.length;
        do{
            var nodeProps = props;
            var nodeOldProps = oldProps;
            var propsChanged = true;
            if (current !== element){
                var split = this._splitProps(current, props, oldProps);
                nodeProps = split.common;
                nodeOldProps = split.oldCommon;
                propsChanged = split.commonChanged;
                if (propsChanged){
                    current.setProps(nodeProps, ChangeMode.Self);
                }
            }
            if (propsChanged){
                realRoot.registerSetProps(current, nodeProps, nodeOldProps, mode);
            }
            current = current.runtimeProps.repeatNext;
        } while (++i !== l);
    }

    registerInsert(parent, element, index, mode){
        if (mode === ChangeMode.Self){
            return;
        }
        var realRoot = this._realPrimitiveRoot();
        if (!realRoot){
            return;
        }
        if (parent === this){
            realRoot.registerInsert(parent, element, index, mode);
            return;
        }

        this._buildChain(parent);
        var current = parent;
        var i = 0, l = this.children.length;
        do{
            var node = element;
            if (current !== parent){
                node = element.clone();
                current.insert(node, index, ChangeMode.Self);
            }
            realRoot.registerInsert(current, node, index, mode);
            current = current.runtimeProps.repeatNext;
        } while (++i !== l);
    }

    registerDelete(parent, element, index, mode){
        if (mode === ChangeMode.Self){
            return;
        }
        var realRoot = this._realPrimitiveRoot();
        if (!realRoot){
            return;
        }
        if (parent === this){
            realRoot.registerDelete(parent, element, index, mode);
            return;
        }

        this._buildChain(parent);
        var current = parent;
        var i = 0, l = this.children.length;
        do{
            var node = element;
            if (current !== parent){
                node = current.children[index];
                current.remove(node, ChangeMode.Self);
            }
            realRoot.registerDelete(current, node, mode);
            current = current.runtimeProps.repeatNext;
        } while (++i !== l);
    }

    registerChangePosition(parent, element, index, oldIndex, mode){
        if (mode === ChangeMode.Self){
            return;
        }
        var realRoot = this._realPrimitiveRoot();
        if (!realRoot){
            return;
        }
        if (parent === this){
            realRoot.registerChangePosition(parent, element, index, oldIndex, mode);
            return;
        }

        this._buildChain(parent);
        var current = parent;
        var i = 0, l = this.children.length;
        do{
            var node = element;
            if (current !== parent){
                node = current.children[oldIndex];
                current.changePosition(node, index, ChangeMode.Self);
            }
            realRoot.registerChangePosition(current, node, index, oldIndex, mode);
            current = current.runtimeProps.repeatNext;
        } while (++i !== l);
    }

    performArrange(oldRect, mode){
        super.performArrange(oldRect, mode);
        if (mode === ChangeMode.Model){
            RepeatMarginTool.updateIfAttached(this);
        }
    }

    getNumX() : number{
        var masterWidth = this.props.masterWidth;
        var margin = this.props.innerMarginX;
        return masterWidth === 0 ? 1 : Math.ceil(this.width()/(masterWidth+margin));
    }

    getNumY() : number{
        var masterHeight = this.props.masterHeight;
        var margin = this.props.innerMarginY;
        return masterHeight === 0 ? 1 : Math.ceil(this.height()/(masterHeight + margin));
    }

    _buildChain(element){
        var i = 0;
        var next = element;
        var length = this.children.length;
        do{
            next = next.runtimeProps.repeatNext;
        } while (next && next !== element && ++i < length);

        if (i < length){
            var path = this._getIndexPath(element);
            for (var j = 0; j < length; j++){
                var cell1 = this.children[j];
                var cell2 = j + 1 === length ? this.children[0] : this.children[j + 1];
                var node1 = cell1;
                var node2 = cell2;
                for (var k = path.length - 1; k >= 0; k--){
                    var part = path[k];
                    node1 = node1.children[part];
                    node2 = node2.children[part];
                }
                node1.runtimeProps.repeatNext = node2;
            }
        }
    }
    _getIndexPath(element){
        var path = [];
        var current = element;
        while (current && !(current instanceof RepeatCell)){
            path.push(current.index());
            current = current.parent();
        }
        return path;
    }
    _splitProps(element, props, oldProps){
        var common = null;
        var oldCommon = null;
        var commonChanged = false;

        var metadata = element.propertyMetadata();
        var nonRepeatableProps = metadata.getNonRepeatableProps(element, props);
        for (var name in props){
            if (nonRepeatableProps.indexOf(name) === -1){
                common = common || {};
                common[name] = props[name];
                oldCommon = oldCommon || {};
                if (oldProps && oldProps[name] !== undefined){
                    oldCommon[name] = oldProps[name];
                }
                else{
                    oldCommon[name] = element.props[name];
                }
                if (common[name] !== oldCommon[name]) {
                    commonChanged = true;
                }
            }
        }
        return {common, oldCommon, commonChanged};
    }

    displayType(){
        return "Repeater";
    }

    select(multiSelect){
        super.select(multiSelect);
        if (!multiSelect){
            RepeatMarginTool.attach(this);
        }
    }
    unselect(){
        super.unselect();
        RepeatMarginTool.detach(this);
    }
    selectionFrameType() {
        return RepeatFrameType;
    }
    createDragClone(e){
        var clone = e.clone();
        clone.runtimeProps.repeatMaster = e;
        clone.runtimeProps.primitiveRoot = this;
        return clone;
    }

    selectGridProps(){
        return this.selectProps(["innerMarginX", "innerMarginY", "masterWidth", "masterHeight"]);
    }
}
RepeatContainer.prototype.t = Types.RepeatContainer;

PropertyMetadata.registerForType(RepeatContainer, {
    masterWidth: {
        defaultValue: 0
    },
    masterHeight: {
        defaultValue: 0
    },
    innerMarginX: {
        defaultValue: 40
    },
    innerMarginY: {
        defaultValue: 40
    },
    overflow: {
        defaultValue: Overflow.Clip
    },
    enableGroupLocking: {
        defaultValue: true
    },
    arrangeStrategy: {
        defaultValue: ArrangeStrategies.Repeat
    }
});