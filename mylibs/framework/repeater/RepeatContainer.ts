import UIElement from "./../UIElement";
import Container from "./../Container";
import PropertyTracker from "./../PropertyTracker";
import PropertyMetadata from "./../PropertyMetadata";
import { ArrangeStrategies, Overflow, Types } from "./../Defs";
import RepeatCell from "./RepeatCell";
import RepeatMarginTool from "./RepeatMarginTool";
import RepeatFrameType from "./frame/RepeatFrameType";
import UserSettings from "../../UserSettings";
import Environment from "../../environment";
import GlobalMatrixModifier from "../GlobalMatrixModifier";
import Brush from "../Brush";
import Point from "../../math/point";
import Matrix from "../../math/matrix";
import Isolate from "../../commands/Isolate";
import Selection from "../SelectionModel";
import { IUIElement, IContainer, IRepeatContainer } from "carbon-model";
import { IMouseEventData } from "carbon-basics";
import { ChangeMode, IPrimitiveRoot } from "carbon-core";

interface IRepeatContainerRuntimeProps{
    lastActiveCell?: RepeatCell;
    primitivePath?: string[];
    insertingMultiple?: boolean;
}

export default class RepeatContainer extends Container implements IRepeatContainer, IPrimitiveRoot {
    children: RepeatCell[];
    runtimeProps: IRepeatContainerRuntimeProps;

    canAccept() {
        return false;
    }
    prepareProps(changes) {
        super.prepareProps(changes);
        if (changes.innerMarginX !== undefined) {
            changes.innerMarginX = Math.max(0, changes.innerMarginX + .5 | 0);
        }
        if (changes.innerMarginY !== undefined) {
            changes.innerMarginY = Math.max(0, changes.innerMarginY + .5 | 0);
        }
    }
    primitiveRoot() {
        return this;
    }
    isFinalRoot(): boolean{
        return false;
    }
    primitivePath() {
        var realRoot = this._realPrimitiveRoot();
        if (!realRoot) {
            return [];
        }
        var path = this.runtimeProps.primitivePath;
        if (!path) {
            path = realRoot.primitivePath().slice();
            path[path.length - 1] = this.id();
            this.runtimeProps.primitivePath = path;
        }
        return path;
    }
    _realPrimitiveRoot() {
        var parent = this.parent();
        if (!parent) {
            return null;
        }
        return parent.primitiveRoot();
    }

    getAffectedDisplayProperties(changes): string[] {
        var result = super.getAffectedDisplayProperties(changes);
        if (changes.hasOwnProperty("br") || changes.hasOwnProperty("innerMarginX") || changes.hasOwnProperty("innerMarginY")
            || changes.hasOwnProperty("offsetX") || changes.hasOwnProperty("offsetY")
        ) {
            if (result.indexOf("rows") === -1) {
                result.push("rows");
            }
            if (result.indexOf("cols") === -1) {
                result.push("cols");
            }
        }
        return result;
    }
    getAffectedProperties(displayChanges): string[] {
        var result = super.getAffectedProperties(displayChanges);
        if (result.indexOf("br") !== -1) {
            return result;
        }

        if (displayChanges.hasOwnProperty("rows") || displayChanges.hasOwnProperty("cols")) {
            result.push("br");
        }
        return result;
    }
    isChangeAffectingLayout(changes): boolean {
        var res = super.isChangeAffectingLayout(changes);
        if (res) {
            return res;
        }
        return changes.hasOwnProperty("innerMarginX") || changes.hasOwnProperty("innerMarginY");
    }

    seed(): string {
        return this.id();
    }

    dblclick(event: IMouseEventData) {
        var scale = Environment.view.scale();
        for (var i = 0; i < this.children.length; i++) {
            var cell = this.children[i];
            if (cell.hitTest(event, scale)){
                var element = cell.hitElementDirect(event, scale);
                if (element && element !== cell){
                    Selection.makeSelection([element]);
                }
                //do not handle for text tool
                event.handled = false;
                return;
            }
        }
    }

    trackInserted() {
        delete this.runtimeProps.primitivePath;
        super.trackInserted.apply(this, arguments);
    }
    trackDeleted(parent) {
        delete this.runtimeProps.primitivePath;
        super.trackDeleted.apply(this, arguments);
    }

    registerSetProps(element, props, oldProps, mode) {
        if (mode === ChangeMode.Self) {
            return;
        }
        var realRoot = this._realPrimitiveRoot();
        if (!realRoot) {
            return;
        }
        if (element === this || element instanceof RepeatCell || this.runtimeProps.insertingMultiple) {
            realRoot.registerSetProps(element, props, oldProps, mode);
            return;
        }

        var chain = this._buildChain(element);
        for (var i = 0; i < chain.length; ++i) {
            var current = chain[i];
            var nodeProps = props;
            var nodeOldProps = oldProps;
            var propsChanged = true;
            if (current !== element) {
                var split = this._splitProps(current, props, oldProps);
                nodeProps = split.common;
                nodeOldProps = split.oldCommon;
                propsChanged = split.commonChanged;
                if (propsChanged) {
                    current.setProps(nodeProps, ChangeMode.Self);
                }
            }
            if (propsChanged) {
                realRoot.registerSetProps(current, nodeProps, nodeOldProps, mode);
            }
        }
    }

    registerInsert(parent, element, index, mode) {
        if (mode === ChangeMode.Self) {
            return;
        }
        var realRoot = this._realPrimitiveRoot();
        if (!realRoot) {
            return;
        }
        if (parent === this || this.runtimeProps.insertingMultiple) {
            realRoot.registerInsert(parent, element, index, mode);
            return;
        }

        var chain = this._buildChain(parent);
        for (var i = 0; i < chain.length; ++i) {
            var current = chain[i];
            var node = element;
            if (current !== parent) {
                node = element.clone();
                current.insert(node, index, ChangeMode.Self);
            }
            realRoot.registerInsert(current, node, index, mode);
        }
    }

    registerDelete(parent, element, index, mode) {
        if (mode === ChangeMode.Self) {
            return;
        }
        var realRoot = this._realPrimitiveRoot();
        if (!realRoot) {
            return;
        }
        if (parent === this || this.runtimeProps.insertingMultiple) {
            realRoot.registerDelete(parent, element, index, mode);
            return;
        }

        var chain = this._buildChain(parent);
        for (var i = 0; i < chain.length; ++i) {
            var current = chain[i];
            var node = element;
            if (current !== parent) {
                node = current.children[index];
                current.remove(node, ChangeMode.Self);
            }
            realRoot.registerDelete(current, node, mode);
        }
    }

    registerChangePosition(parent, element, index, oldIndex, mode) {
        if (mode === ChangeMode.Self) {
            return;
        }
        var realRoot = this._realPrimitiveRoot();
        if (!realRoot) {
            return;
        }
        if (parent === this || this.runtimeProps.insertingMultiple) {
            realRoot.registerChangePosition(parent, element, index, oldIndex, mode);
            return;
        }

        var chain = this._buildChain(parent);
        for (var i = 0; i < chain.length; ++i) {
            var current = chain[i];
            var node = element;
            if (current !== parent) {
                node = current.children[oldIndex];
                current.changePosition(node, index, ChangeMode.Self);
            }
            realRoot.registerChangePosition(current, node, index, oldIndex, mode);
        }
    }

    isEditable(){
        return true;
    }

    addDroppedElements(dropTarget: Container, elements: IUIElement[], e: IMouseEventData){
        if (!elements.length){
            return;
        }

        this.runtimeProps.insertingMultiple = true;
        var matrix = Matrix.createTranslationMatrix(Math.round(e.x), Math.round(e.y));
        matrix = dropTarget.globalMatrixToLocal(matrix);

        var cellPath = this._getCellIndexPath(dropTarget);
        var cells = this.children;
        for (var i = 0; i < this.children.length && i < elements.length; i++) {
            var cell = this.children[i];
            var parent = this._findByIndexPath(cell, cellPath.path) as Container;
            var element = elements[i];
            element.setTransform(matrix);
            parent.add(element);
        }

        this.runtimeProps.insertingMultiple = false;
    }

    performArrange(oldRect, mode = ChangeMode.Model) {
        super.performArrange(oldRect, mode);
        if (mode === ChangeMode.Model) {
            RepeatMarginTool.updateIfAttached(this);
        }
    }

    findMasterCounterpart(element: UIElement): UIElement {
        var cellPath = this._getCellIndexPath(element);
        if (cellPath.cell === this.children[0]) {
            return element;
        }
        return this._findByIndexPath(this.children[0], cellPath.path);
    }

    findSelectionTarget(element: UIElement): UIElement {
        var cell = this.runtimeProps.lastActiveCell || this.children[0];
        var cellPath = this._getCellIndexPath(element)
        if (cellPath.cell === cell) {
            return element;
        }
        return this._findByIndexPath(cell, cellPath.path);
    }

    static tryFindRepeaterParent(element: UIElement): RepeatContainer | null {
        return element.findAncestorOfType(RepeatContainer);
    }

    _buildChain(element): UIElement[] {
        var result = [element];
        var cellPath = this._getCellIndexPath(element);
        var currentCell = cellPath.cell;

        for (var i = 0; i < this.children.length; ++i) {
            var cell = this.children[i];
            if (cell === currentCell) {
                continue;
            }

            result.push(this._findByIndexPath(cell, cellPath.path));
        }

        return result;
    }
    _getCellIndexPath(element: UIElement): { cell: RepeatCell, path: number[] } {
        var path = [];
        var current = element;
        while (current && !(current instanceof RepeatCell)) {
            path.push(current.index());
            current = current.parent();
        }
        return { cell: current as RepeatCell, path };
    }
    _findByIndexPath(parent: Container, path: number[]): UIElement {
        var current: UIElement = parent;
        for (var k = path.length - 1; k >= 0; k--) {
            var part = path[k];
            current = current.children[part] as UIElement;
        }
        return current;
    }

    _splitProps(element, props, oldProps) {
        var common = null;
        var oldCommon = null;
        var commonChanged = false;

        var nonRepeatableProps = element.getNonRepeatableProps(props);
        for (var name in props) {
            if (nonRepeatableProps.indexOf(name) === -1) {
                common = common || {};
                common[name] = props[name];
                oldCommon = oldCommon || {};
                if (oldProps && oldProps[name] !== undefined) {
                    oldCommon[name] = oldProps[name];
                }
                else {
                    oldCommon[name] = element.props[name];
                }
                if (common[name] !== oldCommon[name]) {
                    commonChanged = true;
                }
            }
        }
        return { common, oldCommon, commonChanged };
    }

    displayType() {
        return "Repeater";
    }

    select(multiSelect) {
        super.select(multiSelect);
        if (!multiSelect) {
            RepeatMarginTool.attach(this);
        }
    }
    unselect() {
        super.unselect();
        RepeatMarginTool.detach(this);
    }
    selectionFrameType() {
        return RepeatFrameType;
    }

    selectGridProps() {
        return this.selectProps(["innerMarginX", "innerMarginY"]);
    }

    strokeBorder(context, w, h) {
        if (Brush.canApply(this.stroke())) {
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

    offsetX(value?, mode?) {
        if (arguments.length) {
            var diff = value - this.offsetX();
            var t = new Point(diff, 0)
            this.children[0].applyTranslation(t, false, mode);
        }
        return this.children[0].getBoundingBox().x;
    }
    offsetY(value?, mode?) {
        if (arguments.length) {
            var diff = value - this.offsetY();
            var t = new Point(0, diff)
            this.children[0].applyTranslation(t, false, mode);
        }
        return this.children[0].getBoundingBox().y;
    }
    rows(value, mode) {
        if (this.children.length === 0) {
            return 1;
        }
        var masterHeight = this.children[0].boundaryRect().height;
        var margin = this.props.innerMarginY;
        var offsetY = this.offsetY();

        if (arguments.length) {
            var newHeight = offsetY + value * masterHeight + (value - 1) * margin;
            this.setProps({ br: this.boundaryRect().withHeight(newHeight) }, mode);
            return value;
        }

        var rows = masterHeight === 0 ? 1 : Math.ceil((this.boundaryRect().height - offsetY) / (masterHeight + margin));
        return rows < 1 ? 1 : rows;
    }
    cols(value, mode) {
        if (this.children.length === 0) {
            return 1;
        }
        var masterWidth = this.children[0].boundaryRect().width;
        var margin = this.props.innerMarginX;
        var offsetX = this.offsetX();

        if (arguments.length) {
            var newWidth = offsetX + value * masterWidth + (value - 1) * margin;
            this.setProps({ br: this.boundaryRect().withWidth(newWidth) }, mode);
            return value;
        }

        var cols = masterWidth === 0 ? 1 : Math.ceil((this.boundaryRect().width - offsetX) / (masterWidth + margin));
        return cols < 1 ? 1 : cols;
    }
}
RepeatContainer.prototype.t = Types.RepeatContainer;

PropertyMetadata.registerForType(RepeatContainer, {
    offsetX: {
        displayName: "@repeater.offsetX",
        defaultValue: 0,
        computed: true,
        type: "numeric"
    },
    offsetY: {
        displayName: "@repeater.offsetY",
        defaultValue: 0,
        type: "numeric",
        computed: true
    },
    rows: {
        displayName: "@repeater.copiesY",
        defaultValue: 0,
        type: "numeric",
        computed: true
    },
    cols: {
        displayName: "@repeater.copiesX",
        defaultValue: 0,
        type: "numeric",
        computed: true
    },
    innerMarginX: {
        displayName: "@repeater.marginX",
        defaultValue: 50,
        type: "numeric",
        options: {
            min: 0
        }
    },
    innerMarginY: {
        displayName: "@repeater.marginY",
        defaultValue: 50,
        type: "numeric",
        options: {
            min: 0
        }
    },
    overflow: {
        defaultValue: Overflow.Clip
    },
    enableGroupLocking: {
        defaultValue: true
    },
    arrangeStrategy: {
        defaultValue: ArrangeStrategies.Repeat
    },
    groups: function () {
        var groups = PropertyMetadata.findAll(Types.Container).groups();
        groups.splice(1, 0, {
            label: "Repeater",
            properties: ["cols", "rows", "innerMarginX", "innerMarginY", "offsetX", "offsetY"]
        });

        return groups;
    }
});