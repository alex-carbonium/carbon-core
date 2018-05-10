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
import { IMouseEventData } from "carbon-basics";
import { IUIElement, IContainer, IRepeatContainer, ChangeMode, IPrimitiveRoot, IUIElementProps, UIElementFlags } from "carbon-core";

interface IRepeatContainerRuntimeProps {
    lastActiveCell?: RepeatCell;
    primitivePath?: string[];
    internalUpdate?: boolean;
}

export default class RepeatContainer extends Container implements IRepeatContainer, IPrimitiveRoot {
    children: RepeatCell[];
    runtimeProps: IRepeatContainerRuntimeProps;

    canAccept() {
        return false;
    }
    prepareProps(changes, mode?) {
        super.prepareProps(changes, mode);
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
    isFinalRoot(): boolean {
        return false;
    }
    primitivePath() {
        var nextRoot = this.findNextRoot();
        if (!nextRoot) {
            return [];
        }
        var path = this.runtimeProps.primitivePath;
        if (!path) {
            path = nextRoot.primitivePath().slice();
            path[path.length - 1] = this.id;
            this.runtimeProps.primitivePath = path;
        }
        return path;
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

    saveOrResetLayoutProps(mode: ChangeMode) {
        let res = super.saveOrResetLayoutProps(mode);
        if (!res) {
            this.performArrange(null, mode);
        }
        return res;
    }

    seed(): string {
        return this.id;
    }

    dblclick(event: IMouseEventData) {
        var scale = event.view.scale();
        for (var i = 0; i < this.children.length; i++) {
            var cell = this.children[i];
            if (cell.hitTest(event, scale)) {
                var element = cell.hitElementDirect(event, scale);
                if (element && element !== cell) {
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
        var realRoot = this.findNextRoot();
        if (!realRoot) {
            return;
        }
        if (element === this || element instanceof RepeatCell || this.runtimeProps.internalUpdate) {
            realRoot.registerSetProps(element, props, oldProps, mode);
            return;
        }

        var chain = this.findRepeatedElements(element);
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
                    current.prepareAndSetProps(nodeProps, ChangeMode.Self);
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
        var realRoot = this.findNextRoot();
        if (!realRoot) {
            return;
        }
        if (parent === this || this.runtimeProps.internalUpdate) {
            realRoot.registerInsert(parent, element, index, mode);
            return;
        }

        this.checkDuplicationInCell(element);

        var chain = this.findRepeatedElements(parent);
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
        var realRoot = this.findNextRoot();
        if (!realRoot) {
            return;
        }
        if (parent === this || this.runtimeProps.internalUpdate) {
            realRoot.registerDelete(parent, element, index, mode);
            return;
        }

        var chain = this.findRepeatedElements(parent);
        for (var i = 0; i < chain.length; ++i) {
            var current = chain[i];
            var node = element;
            if (current !== parent) {
                node = current.children[index];
                current.remove(node, ChangeMode.Self);
            }
            realRoot.registerDelete(current, node, index, mode);
        }
    }

    registerChangePosition(parent, element, index, oldIndex, mode) {
        if (mode === ChangeMode.Self) {
            return;
        }
        var realRoot = this.findNextRoot();
        if (!realRoot) {
            return;
        }
        if (parent === this || this.runtimeProps.internalUpdate) {
            realRoot.registerChangePosition(parent, element, index, oldIndex, mode);
            return;
        }

        var chain = this.findRepeatedElements(parent);
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

    isEditable() {
        return true;
    }

    private checkDuplicationInCell(element: IUIElement) {
        let updateCommonId = false;

        if (element.props.rid) {
            let cell = element.findAncestorOfType(RepeatCell);
            let other = cell.findNodeBreadthFirst(x => x.props.rid === element.props.rid && x !== element);
            if (other) {
                updateCommonId = true;
            }
        }
        else {
            updateCommonId = true;
        }

        if (updateCommonId) {
            this.runtimeProps.internalUpdate = true;
            element.applyVisitorDepthFirst(x => x.setProps({ rid: x.id }));
            this.runtimeProps.internalUpdate = false;
        }
    }

    addDroppedElements(dropTarget: Container, elements: IUIElement[], e: IMouseEventData) {
        let result = [];
        if (!elements.length) {
            return result;
        }

        this.runtimeProps.internalUpdate = true;
        var matrix = Matrix.createTranslationMatrix(Math.round(e.x), Math.round(e.y));
        matrix = dropTarget.globalMatrixToLocal(matrix);

        var cells = this.children;
        let rid = elements[0].id;
        let clone = false;
        for (var i = 0, j = 0; i < this.children.length; i++) {
            var cell = this.children[i];
            var parent = this.findRepeatedElement(cell, dropTarget) as Container;
            var element = clone ? elements[j].clone() : elements[j];
            element.setTransform(matrix);
            element.setProps({ rid });
            result.push(parent.add(element));

            if (++j === elements.length) {
                j = 0;
                clone = true;
            }
        }

        this.runtimeProps.internalUpdate = false;

        return result;
    }

    performArrange(e?, mode: ChangeMode = ChangeMode.Model): void {
        super.performArrange(e, mode);
        if (mode === ChangeMode.Model) {
            RepeatMarginTool.updateIfAttached(this);
        }
    }

    activeCell() {
        return this.runtimeProps.lastActiveCell || this.children[0];
    }

    findMasterCounterpart(element: UIElement): UIElement {
        return this.findRepeatedElement(this.children[0], element);
    }

    findSelectionTarget(element: UIElement): UIElement {
        var cell = this.activeCell();
        return this.findRepeatedElement(cell, element);
    }

    static tryFindRepeaterParent(element: IUIElement): RepeatContainer | null {
        return element.findAncestorOfType(RepeatContainer);
    }

    findRepeatedElements(element: IUIElement): UIElement[] {
        if (element instanceof RepeatCell) {
            return this.children;
        }

        let result = [];

        for (var i = 0; i < this.children.length; ++i) {
            let clone = this.findRepeatedElement(this.children[i], element);
            result.push(clone);
        }

        return result;
    }
    private findRepeatedElement(cell: RepeatCell, element: IUIElement) {
        if (element instanceof RepeatCell) {
            return cell;
        }
        return cell.findNodeBreadthFirst(x => x.props.rid === element.props.rid);
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

    enableGroupLocking() {
        return true;
    }

    strokeBorder(context, w, h, environment) {
        if (Brush.canApply(this.stroke)) {
            super.strokeBorder(context, w, h, environment);
            return;
        }
        if (!this.lockedGroup()) {
            context.save();
            context.strokeStyle = UserSettings.group.active_stroke;

            var scale = environment.scale;
            context.scale(1 / scale, 1 / scale);

            context.beginPath();
            try {
                GlobalMatrixModifier.pushPrependScale(environment.scaleMatrix);
                super.drawBoundaryPath(context);
                context.stroke();
            }
            finally {
                GlobalMatrixModifier.pop();
                context.restore();
            }
        }
    }

    get offsetX() {
        return this.children[0].getBoundingBox().x;
    }

    set offsetX(value) {
        this._offsetX(value);
    }

    _offsetX(value?, mode?) {
        var diff = value - this.offsetX;
        var t = new Point(diff, 0)
        this.children[0].applyTranslation(t, false, mode);
    }

    get offsetY() {
        return this.children[0].getBoundingBox().y;
    }

    set offsetY(value) {
        this._offsetY(value);
    }

    _offsetY(value?, mode?) {
        var diff = value - this.offsetY;
        var t = new Point(0, diff)
        this.children[0].applyTranslation(t, false, mode);
    }

    get rows() {
        if (this.children.length === 0) {
            return 1;
        }
        var masterHeight = this.children[0].boundaryRect().height;
        var margin = this.props.innerMarginY;
        var offsetY = this.offsetY;

        var rows = masterHeight === 0 ? 1 : Math.ceil((this.boundaryRect().height - offsetY) / (masterHeight + margin));
        return rows < 1 ? 1 : rows;
    }

    set rows(value) {
        this._rows(value);
    }

    _rows(value?, mode?) {
        var masterHeight = this.children[0].boundaryRect().height;
        var margin = this.props.innerMarginY;
        var offsetY = this.offsetY;

        var newHeight = offsetY + value * masterHeight + (value - 1) * margin;
        this.setProps({ br: this.boundaryRect().withHeight(newHeight) }, mode);
    }

    get cols() {
        if (this.children.length === 0) {
            return 1;
        }
        var masterWidth = this.children[0].boundaryRect().width;
        var margin = this.props.innerMarginX;
        var offsetX = this.offsetX;

        var cols = masterWidth === 0 ? 1 : Math.ceil((this.boundaryRect().width - offsetX) / (masterWidth + margin));
        return cols < 1 ? 1 : cols;
    }

    set cols(value) {
        this._cols(value);
    }

    _cols(value?, mode?) {
        var masterWidth = this.children[0].boundaryRect().width;
        var margin = this.props.innerMarginX;
        var offsetX = this.offsetX;

        var newWidth = offsetX + value * masterWidth + (value - 1) * margin;
        this.setProps({ br: this.boundaryRect().withWidth(newWidth) }, mode);
        return value;
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
        defaultValue: 20,
        type: "numeric",
        options: {
            min: 0
        }
    },
    innerMarginY: {
        displayName: "@repeater.marginY",
        defaultValue: 20,
        type: "numeric",
        options: {
            min: 0
        }
    },
    overflow: {
        defaultValue: Overflow.Clip
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