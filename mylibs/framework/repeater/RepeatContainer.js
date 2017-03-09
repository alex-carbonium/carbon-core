import UIElement from "./../UIElement";
import Container from "./../Container";
import PropertyMetadata from "./../PropertyMetadata";
import {ArrangeStrategies, Overflow, ChangeMode, Types} from "./../Defs";
import RepeatCell from "./RepeatCell";
import RepeatMarginTool from "./RepeatMarginTool";
import RepeatFrameType from "./frame/RepeatFrameType";
import UserSettings from "../../UserSettings";
import Environment from "../../environment";
import GlobalMatrixModifier from "../GlobalMatrixModifier";
import Brush from "../Brush";

export default class RepeatContainer extends Container{
    canAccept(){
        return false;
    }
    prepareProps(changes){
        super.prepareProps(changes);
        if (changes.innerMarginX !== undefined) {
            changes.innerMarginX = Math.max(0, changes.innerMarginX + .5|0);
        }
        if (changes.innerMarginY !== undefined) {
            changes.innerMarginY = Math.max(0, changes.innerMarginY + .5|0);
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

        var chain = this._buildChain(element);
        for (var i = 0; i < chain.length; ++i){
            var current = chain[i];
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
        }
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

        var chain = this._buildChain(parent);
        for (var i = 0; i < chain.length; ++i){
            var current = chain[i];
            var node = element;
            if (current !== parent){
                node = element.clone();
                current.insert(node, index, ChangeMode.Self);
            }
            realRoot.registerInsert(current, node, index, mode);
        }
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

        var chain = this._buildChain(parent);
        for (var i = 0; i < chain.length; ++i){
            var current = chain[i];
            var node = element;
            if (current !== parent){
                node = current.children[index];
                current.remove(node, ChangeMode.Self);
            }
            realRoot.registerDelete(current, node, mode);
        }
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

        var chain = this._buildChain(parent);
        for (var i = 0; i < chain.length; ++i){
            var current = chain[i];
            var node = element;
            if (current !== parent){
                node = current.children[oldIndex];
                current.changePosition(node, index, ChangeMode.Self);
            }
            realRoot.registerChangePosition(current, node, index, oldIndex, mode);
        }
    }

    performArrange(oldRect, mode){
        super.performArrange(oldRect, mode);
        if (mode === ChangeMode.Model){
            RepeatMarginTool.updateIfAttached(this);
        }
    }

    getCols() : number{
        var masterWidth = this.children[0].br().width;
        var margin = this.props.innerMarginX;
        var cols = masterWidth === 0 ? 1 : Math.ceil(this.br().width/(masterWidth+margin));
        return cols < 1 ? 1 : cols;
    }

    getRows() : number{
        var masterHeight = this.children[0].br().height;
        var margin = this.props.innerMarginY;
        var rows = masterHeight === 0 ? 1 : Math.ceil(this.br().height/(masterHeight + margin));
        return rows < 1 ? 1 : rows;
    }

    findMasterCounterpart(element: UIElement): UIElement{
        var cellPath = this._getCellIndexPath(element);
        if (cellPath.cell === this.children[0]){
            return element;
        }
        return this._findByIndexPath(this.children[0], cellPath.path);
    }

    findSelectionTarget(element: element): UIElement{
        var cell = this.runtimeProps.lastActiveCell || this.children[0];
        var cellPath = this._getCellIndexPath(element)
        if (cellPath.cell === cell){
            return element;
        }
        return this._findByIndexPath(cell, cellPath.path);
    }

    static tryFindRepeaterParent(element: UIElement): RepeatContainer{
        var current = element.parent();
        while (current && !(current instanceof RepeatContainer)){
            current = current.parent();
        }
        return current;
    }

    _buildChain(element): UIElement[]{
        var result = [element];
        var cellPath = this._getCellIndexPath(element);
        var currentCell = cellPath.cell;

        for (var i = 0; i < this.children.length; ++i){
            var cell = this.children[i];
            if (cell === currentCell){
                continue;
            }

            result.push(this._findByIndexPath(cell, cellPath.path));
        }

        return result;
    }
    _getCellIndexPath(element: UIElement): {cell: RepeatCell, path: number[]}{
        var path = [];
        var current = element;
        while (current && !(current instanceof RepeatCell)){
            path.push(current.index());
            current = current.parent();
        }
        return {cell: current, path};
    }
    _findByIndexPath(parent: Container, path: number[]): UIElement{
        var current = parent;
        for (var k = path.length - 1; k >= 0; k--){
            var part = path[k];
            current = current.children[part];
        }
        return current;
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

    selectGridProps(){
        return this.selectProps(["innerMarginX", "innerMarginY", "masterWidth", "masterHeight"]);
    }

    strokeBorder(context, w, h) {
        if (Brush.canApply(this.stroke())){
            super.strokeBorder(context, w, h);
            return;
        }
        if (!this.lockedGroup()) {
            context.save();
            context.strokeStyle = UserSettings.group.active_stroke;

            var scale = Environment.view.scale();
            context.scale(1 / scale, 1 / scale);

            context.beginPath();
            try {
                GlobalMatrixModifier.pushPrependScale();
                super.drawBoundaryPath(context);
                context.stroke();
            }
            finally {
                GlobalMatrixModifier.pop();
                context.restore();
            }
        }
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