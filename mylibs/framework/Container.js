import { Types, ArrangeStrategies, Overflow, StackAlign, StackOrientation, ChangeMode } from "./Defs";
import ArrangeStrategy from "./ArrangeStrategy";
import ContextPool from "./render/ContextPool";
import CorruptedElement from "./CorruptedElement";
import { areRectsEqual } from "../math/math";
import Environment from "../environment";
import PropertyMetadata from "./PropertyMetadata";
import UIElement from './UIElement';
import QuadAndLock from './QuadAndLock';
import logger from '../logger';
import Matrix from '../math/matrix';

var fwk = window.sketch.framework;

export default class Container extends UIElement {        
    constructor() {
        super();
        this.children = [];
    }
    performArrange(event, mode) {
        var e = event || {};
        e.newRect = this.getBoundaryRect();
        e.oldRect = e.oldRect || e.newRect;
        this.arrange(e, mode);
    }
    arrangeRootDepthFirst() {
        this.applyVisitorDepthFirst(x => x.performArrange());
    }
    arrangeStrategy(value) {
        if (value !== undefined) {
            this.setProps({ arrangeStrategy: value })
        }
        return this.props.arrangeStrategy;
    }
    arrangeStrategyInstance() {
        return ArrangeStrategy.findStrategy(this);
    }
    applySizeScaling(s, o, options) {
        var oldRect = this.getBoundaryRect();
        UIElement.prototype.applySizeScaling.apply(this, arguments);
        this.performArrange({ oldRect, reset: options && options.reset });
    }

    fillBackground(context, l, t, w, h) {
        if (this.fill() && fwk.Brush.canApply(this.fill()) && this.standardBackground()) {
            context.save();
            var cornerRadius = this.cornerRadius();
            if (cornerRadius !== fwk.QuadAndLock.Default) {
                context.roundedRectDifferentRadiusesPath(l, t, w, h,
                    cornerRadius.upperLeft,
                    cornerRadius.upperRight,
                    cornerRadius.bottomLeft,
                    cornerRadius.bottomRight);
            } else {
                context.beginPath();
                context.rectPath(l, t, w, h, true);
            }
            fwk.Brush.fill(this.fill(), context, l, t, w, h);
            context.restore();
        }
    }
    strokeBorder(context, w, h) {
        //not supported for iphone
        if (this.stroke() && fwk.Brush.canApply(this.stroke()) && this.standardBackground()) {
            context.save();
            var cornerRadius = this.cornerRadius();
            if (cornerRadius !== fwk.QuadAndLock.Default) {
                context.roundedRectDifferentRadiusesPath(0, 0, w, h,
                    cornerRadius.upperLeft,
                    cornerRadius.upperRight,
                    cornerRadius.bottomLeft,
                    cornerRadius.bottomRight);
            } else {
                context.rectPath(0, 0, w, h, true);
            }
            var dash = this.dashPattern();
            if (dash) {
                context.setLineDash(dash);
            }
            fwk.Brush.stroke(this.stroke(), context, 0, 0, w, h);
            context.restore();
        }
    }
    shouldApplyViewMatrix() {
        return false;
    }
    saveOrResetLayoutProps() {
        UIElement.prototype.saveOrResetLayoutProps.apply(this, arguments);
        this.children.forEach(e => e.saveOrResetLayoutProps());
    }
    drawSelf(context, w, h, environment) {
        context.save();
        this.globalViewMatrix().applyToContext(context);
        this.fillBackground(context, 0, 0, w, h);
        context.restore();

        this.drawChildren(context, w, h, environment);

        this.strokeBorder(context, w, h);

        this.drawDecorators(context, w, h, environment);
    }
    
    modifyContextBeforeDrawChildren(context) {

    }

    renderMaskedElements(context, mask, i, items, environment) {

        if (environment.finalRender || !mask.drawPath) {
            var clipingRect = mask.getBoundingBoxGlobal(false, true);
            var p1 = environment.pageMatrix.transformPoint2(clipingRect.x, clipingRect.y);
            var p2 = environment.pageMatrix.transformPoint2(clipingRect.x + clipingRect.width, clipingRect.y + clipingRect.height);
            p1.x = Math.max(0, 0 | p1.x * environment.contextScale);
            p1.y = Math.max(0, 0 | p1.y * environment.contextScale);
            p2.x = 0 | p2.x * environment.contextScale + .5;
            p2.y = 0 | p2.y * environment.contextScale + .5;

            var sw = p2.x - p1.x;
            var sh = p2.y - p1.y;

            var offContext = ContextPool.getContext(sw, sh, environment.contextScale);
            offContext.relativeOffsetX = -p1.x;
            offContext.relativeOffsetY = -p1.y;

            offContext.save();
            offContext.translate(-p1.x, -p1.y);
            environment.setupContext(offContext);
            this.globalViewMatrix().applyToContext(offContext);


            //offContext.clearRect(clipingRect.x, clipingRect.y, clipingRect.width, clipingRect.height);
            this.renderAfterMask(offContext, items, i, environment);

            offContext.beginPath();
            mask.viewMatrix().applyToContext(offContext);
            offContext.globalCompositeOperation = "destination-in";
            if (mask.drawPath) {
                mask.drawPath(offContext, mask.width(), mask.height());
                offContext.fillStyle = "black";
                offContext.fill2();
            } else {
                mask.drawSelf(offContext, mask.width(), mask.height(), environment);
            }

            offContext.restore();

            context.resetTransform();
            context.drawImage(offContext.canvas, 0, 0, sw, sh, p1.x, p1.y, sw, sh);
            ContextPool.releaseContext(offContext)
        } else {
            context.beginPath();
            mask.viewMatrix().applyToContext(context);
            mask.drawPath(context, mask.width(), mask.height());
            context.clip("evenodd");
            mask.viewMatrix().clone().invert().applyToContext(context);

            this.renderAfterMask(context, items, i, environment);
        }
    }
    renderAfterMask(context, items, i, environment) {
        for (; i < items.length; ++i) {
            var child = items[i];

            if (child.visible()) {
                this.drawChildSafe(child, context, environment);
            }
        }
    }
    clone() {
        if (this._cloning) {
            throw "Can't clone, chain contains recursive references";
        }
        this._cloning = true;
        var clone = UIElement.prototype.clone.apply(this, arguments);

        for (var i = 0; i < this.children.length; i++) {
            var e = this.children[i];
            clone.add(e.clone(), ChangeMode.Self);
        }
        delete this._cloning;
        return clone;
    }
    mirrorClone() {
        var clone = UIElement.prototype.mirrorClone.apply(this, arguments);

        for (var i = 0; i < this.children.length; i++) {
            var e = this.children[i];
            clone.add(e.mirrorClone(), ChangeMode.Self);
        }

        return clone;
    }
    drawChildren(context, w, h, environment) {
        this.modifyContextBeforeDrawChildren(context);

        if (this.children) {
            var items = this.children;
            for (var i = 0; i < items.length; ++i) {
                var child = items[i];
                if (child.clipMask()) {
                    this.drawWithMask(context, child, i, environment);
                    break;
                }
                if (child.visible()) {
                    this.drawChildSafe(child, context, environment);
                }
            }
        }
    }
    drawWithMask(context, mask, i, environment) {
        if (mask.visible()) {
            let b = mask.props.stroke;
            mask.props.stroke = null;
            this.drawChildSafe(mask, context, environment);
            mask.props.stroke = b;
        }
        context.save();
        this.renderMaskedElements(context, mask, i, this.children, environment);
        context.restore();
        if (mask.visible()) {
            let b = mask.fill();
            mask.setProps({ fill: null }, ChangeMode.Self);
            this.drawChildSafe(mask, context, environment);
            mask.setProps({ fill: b }, ChangeMode.Self);
        }
    }
    drawChildSafe(child, context, environment) {
        try {
            child.draw(context, environment);
        } catch (e) {
            logger.error("Draw error", e);
            if (child.canHandleCorruption()) {
                child.makeCorrupted();
                return;
            }
            var data;
            try {
                data = child.toJSON(true);
            }
            catch (e2) {
                logger.error("toJSON error", e2);
                data = {
                    props: {
                        width: child.width(),
                        height: child.height(),
                        y: child.y(),
                        x: child.x(),
                        id: child.id()
                    }
                }
            }
            var newChild = new CorruptedElement(data);
            newChild.parent(child.parent());
            var items = this.children;
            for (var i = 0; i < items.length; ++i) {
                var c = items[i];
                if (c === child) {
                    items.splice(i, 1, newChild);
                    break;
                }
            }
            newChild.draw(context, environment);
        }
    }
    padding(value) {
        if (value !== undefined) {
            this.setProps({ padding: value })
        }
        return this.props.padding;
    }
    innerHeight() {
        var padding = this.padding();
        return this.height() - padding.top - padding.bottom;
    }
    innerWidth() {
        var padding = this.padding();
        return this.width() - padding.left - padding.right;
    }
    allowMoveOutChildren(value) {
        //should not check on args length
        if (value !== undefined) {
            this.setProps({ allowMoveOutChildren: value })
        }
        return this.props.allowMoveOutChildren;
    }
    add(/*UIElement*/element, mode) {
        return this.insert(element, this.children.length, mode);
    }
    insert(/*UIElement*/element, /*int*/index, mode) {
        this.acquiringChild(element, index);

        var oldParent = element.parent();
        if (oldParent && !(oldParent === NullContainer)) {
            oldParent.remove(element, mode);
        }

        element.parent(this);

        this.insertChild(element, index, mode);

        this.invalidate();

        return element;
    }
    contains(element) {
        return this.positionOf(element) !== -1;
    }
    positionOf(element) {
        return this.children.indexOf(element);
    }
    count() {
        return this.children.length;
    }
    changePosition(/*UIElement*/element, /*int*/index, mode) {
        this.changeChildPosition(element, index, mode);
        this.invalidate();
    }
    remove(/*UIElement*/element, mode) {
        element.removing();

        this.releasingChild(element);
        var idx = this.removeChild(element, mode);

        element.removed();

        this.invalidate();

        return idx;
    }
    replace(elementFrom, elementTo) {
        var idx = this.positionOf(elementFrom);
        this.remove(elementFrom);
        this.insert(elementTo, idx);
    }
    clear() {
        for (var i = 0; i < this.children.length; i++) {
            var child = this.children[i];
            this.releasingChild(child);
            child.trackDeleted(this);
        }
        this.children.length = 0;
    }
    canAdd(element) {
        return true;
    }
    canRemove(element) {
        return true;
    }
    canInsert(element, index) {
        return true;
    }
    acquiringChild(child, index) {
    }
    releasingChild(child) {
        //child.onresize.unbind(this._childResizeHandler);
        child.parent(NullContainer);
    }
    canAccept(elements) {
        return !elements.some(x => !x.canBeAccepted(this));
    }
    mousedown(event) {
        super.mousedown.call(this, event); //to hide inplace editor
        this.delegateToChildren("mousedown", event);
    }
    mousemove(event) {
        this.delegateToChildren("mousemove", event);
    }
    mouseup(event) {
        this.delegateToChildren("mouseup", event);
    }
    dblclick(event) {
        this.delegateToChildren("dblclick", event);
    }
    click(event) {
        if (!this.lockedGroup()) {
            this.delegateToChildren("click", event);
        }
    }
    delegateToChildren(name, event) {
        for (let i = this.children.length - 1; i >= 0; --i) {
            var element = this.children[i];
            if (element.hitTest(event.x, event.y, event._scale)) {
                element[name](event);
                if (event.handled) {
                    break;
                }
            }

        }
    }
    hitElement(/*Point*/position, scale, predicate, directSelection) {
        var hitTest = predicate || this.hitTest;
        if (!(this.hitVisible(directSelection) && hitTest.call(this, position, scale))) {
            return null;
        }
        var hitElement = this.hitTransparent() ? null : this;

        //position = sketch.math2d.rotatePoint(position, this.angle() * Math.PI / 180, this.rotationOrigin(true));
        for (let i = this.children.length - 1; i >= 0; --i) {
            var element = this.children[i];
            var newHit = element.hitElement(position, scale, predicate, directSelection);
            if (newHit) {
                hitElement = newHit;
                break;
            }
        }

        return hitElement;
    }
    hitElements(/*Point*/position, scale) {
        var that = this;
        var elements = [];

        this.applyVisitor(function (element) {
            if (that !== element) {
                if (element.hitVisible() && element.hitTest(position, scale) && !element.hitTransparent() && element.canSelect() && !element.locked()) {
                    elements.push(element);
                }
            }
        });

        return elements;
    }
    hitElementDirect(position, scale, predicate) {
        var result = this.hitElement(position, scale, predicate, true);
        return result;
    }
    lockedGroup() {
        return this.enableGroupLocking() && !this.runtimeProps.unlocked;
    }
    select() {
    }
    captureMouse(/*UIElement*/element) {
        Environment.controller.captureMouse(element);
    }
    releaseMouse(/*UIElement*/element) {
        Environment.controller.releaseMouse(element);
    }
    applyVisitor(/*Visitor*/callback, useLogicalChildren, parent) {
        var stop = false;
        for (let i = this.children.length - 1; i >= 0; --i) {
            var item = this.children[i];
            if (item.applyVisitor(callback, useLogicalChildren, this) === false) {
                stop = true;
                break;
            }
        }
        if (!stop) {
            return callback(this, parent);
        }
        return false;
    }
    findActualParentForAncestorById(elementId) {
        var realParrent = null;
        this.applyVisitor(function (e, p) {
            if (e.id() === elementId) {
                realParrent = p;
                return false;
            }
        });

        return realParrent;
    }

    resetGlobalViewCache(resetPrimitiveRoot) {
        UIElement.prototype.resetGlobalViewCache.apply(this, arguments);

        if (this.children) {
            for (let i = this.children.length - 1; i >= 0; --i) {
                var e = this.children[i];
                e.resetGlobalViewCache(resetPrimitiveRoot);
            }
        }
    }
    global2local(/*Point*/pos) {
        var parent = this.parent();
        if (parent == null || !this.globalViewMatrix) {
            return pos;
        }
        var matrix = this.globalViewMatrixInverted();
        return matrix.transformPoint(pos);
    }
    local2global(/*Point*/pos) {
        var parent = this.parent();
        if (parent == null || !this.globalViewMatrix) {
            return pos;
        }

        var matrix = this.globalViewMatrix();
        return matrix.transformPoint(pos);
    }
    registerForLayerDraw(layer, element) {
        this.parent().registerForLayerDraw(layer, element);
    }
    unregisterForLayerDraw(layer, element) {
        this.parent().unregisterForLayerDraw(layer, element);
    }
    arrange(resizeEvent) {
        UIElement.prototype.arrange.apply(this, arguments);
        return ArrangeStrategy.arrange(this, resizeEvent);
    }
    autoWidth() {
        var overflow = this.overflow();
        return overflow === Overflow.AdjustHorizontal || overflow === Overflow.AdjustBoth || this.autoExpandWidth();
    }
    autoHeight() {
        var overflow = this.overflow();
        return overflow === Overflow.AdjustVertical || overflow === Overflow.AdjustBoth || this.autoExpandHeight();
    }
    autoExpandWidth() {
        var overflow = this.overflow();
        return overflow === Overflow.ExpandHorizontal || overflow === Overflow.ExpandBoth;
    }
    autoExpandHeight() {
        var overflow = this.overflow();
        return overflow === Overflow.ExpandVertical || overflow === Overflow.ExpandBoth;
    }
    autoGrowMode(value) {
        return this.field("_autoGrowMode", value, true);
    }
    cornerRadius(value) {
        if (value !== undefined) {
            this.setProps({ cornerRadius: value })
        }
        return this.props.cornerRadius;
    }
    dropPositioning(value) {
        if (value !== undefined) {
            this.setProps({ dropPositioning: value })
        }
        return this.props.dropPositioning;
    }
    enableGroupLocking(value) {
        if (value !== undefined) {
            this.setProps({ enableGroupLocking: value })
        }
        return this.props.enableGroupLocking;
    }
    unlockGroup() {
        if (this.enableGroupLocking()) {
            this.activeGroup(false);
            this.runtimeProps.unlocked = true;
            return true;
        }
        return false;
    }
    lockGroup() {
        if (this.enableGroupLocking()) {
            this.activeGroup(false);
            this.runtimeProps.unlocked = false;
        }
    }
    activeGroup(value) {
        if (arguments.length === 1) {
            this.runtimeProps.activeGroup = value;
        }
        return this.runtimeProps.activeGroup;
    }
    getDropData(pos, element) {
        var width = this.width(),
            height = this.height();

        pos = this.global2local(pos);

        var intervals = [];
        var last = 0;
        var baseLine;

        function calculateBaseLine(intervals, pos, insertIndex) {
            var minY = Number.MAX_VALUE;
            var lineY = 0;
            for (var i = 0; i < intervals.length; i++) {
                var itr = intervals[i];
                var minCandidate = Math.abs(itr - pos);
                if (minCandidate < minY) {
                    minY = minCandidate;
                    lineY = itr;
                    insertIndex = i;
                }
            }
            return { lineY: lineY, insertIndex: insertIndex };
        }

        var dropPositioning = this.dropPositioning();
        if (dropPositioning === 'vertical') {
            for (var i = 0; i < this.children.length; i++) {
                var _element = this.children[i];
                if (_element !== element) {
                    var gr = _element.getBoundaryRect();
                    intervals.push((last + gr.y) / 2);
                    last = gr.y + gr.height;
                }
            }

            intervals.push((last + height) / 2);

            baseLine = calculateBaseLine(intervals, pos.y);

            var pt1 = this.local2global({ x: 5, y: baseLine.lineY });
            var pt2 = this.local2global({ x: width - 10, y: baseLine.lineY });
            return {
                x1: pt1.x,
                y1: pt1.y,
                x2: pt2.x,
                y2: pt2.y,
                index: baseLine.insertIndex,
                angle: this.angle()
            }
        } else if (dropPositioning === 'horizontal') {
            for (var i = 0; i < this.children.length; i++) {
                var _element = this.children[i];
                if (_element !== element) {
                    var gr = _element.getBoundaryRect();
                    intervals.push((last + gr.x) / 2);
                    last = gr.x + gr.width;
                }
            }

            intervals.push((last + width) / 2);

            baseLine = calculateBaseLine(intervals, pos.x);

            var pt1 = this.local2global({ x: baseLine.lineY, y: 5 });
            var pt2 = this.local2global({ x: baseLine.lineY, y: height - 10 });
            return {
                x1: pt1.x,
                y1: pt1.y,
                x2: pt2.x,
                y2: pt2.y,
                index: baseLine.insertIndex,
                angle: this.angle()
            }
        }

        return null;
    }

    global2localDropPosition(pos) {
        return this.global2local(pos);
    }

    getChildren() {
        return this.children;
    }
    findElementByName(name) {
        var element;

        this.applyVisitor(function (el) {
            if (el.name() === name) {
                element = el;
                return false;
            }
        }, false);

        return element;
    }
    isAtomicInModel(value) {
        return this.field("_isAtomicInModel", value, false);
    }
    toJSON(includeDefaults) {
        var current = super.toJSON.apply(this, arguments);
        if (!this.isAtomicInModel()) {
            var children = current.children = [];
            for (var i = 0; i < this.children.length; i++) {
                var element = this.children[i];
                if (!element.isTemporary()) {
                    children.push(element.toJSON(includeDefaults));
                }
            }
        }
        return current;
    }
    getElementById(id) {
        var res = null;
        if (this.id() === id) {
            return this;
        }
        this.applyVisitor(function (el) {
            if (el.id() === id) {
                res = el;
                return false;
            }
        }, false);

        return res;
    }
    fromJSON(data) {
        //this.lockArrange();
        super.fromJSON.apply(this, arguments)
        this.childrenFromJSON(data.children);
        //this.unlockArrange();
        return this;
    }
    childrenFromJSON(children) {
        if (!this.isAtomicInModel() && children) {
            this.clear();
            for (var i = 0, length = children.length; i < length; i++) {
                var childData = children[i];
                //var newId = childData.id;
                // var duplicate = this.getElementById(newId);
                // if (duplicate) {
                //     setTimeout(function () {
                //         try {
                //             logger.error("Duplicate element with the same id", {
                //                 projectId: App.Current.id(),
                //                 data: childData
                //             })
                //         } catch (e) {
                //
                //         }
                //     }, 1);

                //} else {
                this.add(fwk.UIElement.fromJSON(childData));
                //}
            }
        }
    }
    findSingleChildOrDefault(predicate) {
        var result = null;
        this.applyVisitor(function (el) {
            if (predicate(el)) {
                result = el;
                return false;
            }
        }, false);

        return result;
    }
    dispose() {
        if (this.isDisposed()) {
            return;
        }

        for (var i = 0; i < this.children.length; i++) {
            var e = this.children[i];
            if (!e.isDisposed()) {
                e.dispose();
            }
        }

        super.dispose.apply(this, arguments)
    }
    toString() {
        return this.t.substr(this.t.lastIndexOf(".") + 1)
            + ": "
            + map(this.getChildren(), function (x) {
                return x.toString()
            }).join(", ");
    }
}    

Container.prototype.t = Types.Container;

PropertyMetadata.registerForType(Container, {
    angle: {
        editorArgument: 0,
        useInModel: false,
        editable: false,
        validate: [{ minMax: [0, 0] }]
    },
    arrangeStrategy: {
        defaultValue: ArrangeStrategies.Canvas
    },
    stackAlign: {
        defaultValue: StackAlign.Default
    },
    stackOrientation: {
        defaultValue: StackOrientation.Vertical
    },
    padding: {
        displayName: "Padding",
        type: "box",
        useInModel: true,
        editable: false,
        defaultValue: fwk.Box.Default
    },
    dropPositioning: {
        displayName: "Drop position",
        type: "choice",
        possibleValues: { "none": "None", "vertical": "Vertical", "horizontal": "Horizontal" },
        useInModel: true,
        editable: false,
        defaultValue: "none"
    },
    enableGroupLocking: {
        displayName: "Group locking",
        type: "trueFalse",
        useInModel: true,
        editable: false,
        defaultValue: false
    },
    overflow: {
        defaultValue: Overflow.Visible,
        displayName: "Overflow",
        type: "dropdown",
        options: {
            width: 1 / 2,
            items: [
                { name: "Clip", value: Overflow.Clip },
                { name: "Visible", value: Overflow.Visible },
                { name: "Grow and shrink horizontally", value: Overflow.AdjustHorizontal },
                { name: "Grow and shrink vertically", value: Overflow.AdjustVertical },
                { name: "Grow and shrink", value: Overflow.AdjustBoth },
                { name: "Grow horizontally", value: Overflow.ExpandHorizontal },
                { name: "Grow vertically", value: Overflow.ExpandVertical },
                { name: "Grow", value: Overflow.ExpandBoth }
            ]
        }
    },
    cornerRadius: {
        displayName: "Border radius",
        type: "quadAndLock",
        useInModel: true,
        editable: true,
        defaultValue: QuadAndLock.Default
    },
    allowMoveOutChildren: {
        displayName: "Allow drag elements out",
        type: "checkbox",
        useInModel: true,
        editable: true,
        defaultValue: true,
    },
    groups: function (element) {
        var ownGroups = [
            {
                label: element ? element.displayType() : '',
                properties: ["overflow"]
            }
        ];

        var baseGroups = PropertyMetadata.findAll(Types.Element).groups();
        return ownGroups.concat(baseGroups);
    }
});


Container.createCanvas = function () {
    var container = new Container();
    container.arrangeStrategy(ArrangeStrategies.Canvas);
    return container;
};
Container.createStackHorizontal = function () {
    var container = new Container();
    container.setProps({
        arrangeStrategy: ArrangeStrategies.Stack,
        stackOrientation: StackOrientation.Horizontal
    });
    return container;
};
Container.createStackVertical = function () {
    var container = new Container();
    container.arrangeStrategy(ArrangeStrategies.Stack);
    return container;
};
Container.createDock = function () {
    var container = new Container();
    container.arrangeStrategy(ArrangeStrategies.Dock);
    return container;
};
Container.createAlign = function () {
    var container = new Container();
    container.arrangeStrategy(ArrangeStrategies.Align);
    return container;
};