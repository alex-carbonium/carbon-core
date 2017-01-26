// @flow

import TypeDefaults from "./TypeDefaults";
import ObjectFactory from "./ObjectFactory";
import PropertyMetadata from "./PropertyMetadata";
import Box from "./Box";
import Brush from "./Brush";
import AnimationGroup from "./animation/AnimationGroup";
import ElementPropsChanged from "../commands/ElementPropsChanged";
import ElementDelete from "../commands/ElementDelete";
import ElementMove from "../commands/ElementMove";
import Matrix from "../math/matrix";
import Point from "../math/point";
import { isRectInRect, areRectsIntersecting } from "../math/math";
import stopwatch from "../Stopwatch";
import ResizeDimension from "./ResizeDimension";
import Constraints from "./Constraints";
import {
    Types,
    DockStyle,
    ArrangeStrategies,
    Overflow,
    HorizontalAlignment,
    VerticalAlignment,
    PointDirection
} from "./Defs";
import RotateFramePoint from "../decorators/RotateFramePoint";
import ResizeFramePoint from "../decorators/ResizeFramePoint";
import DefaultFrameType from "../decorators/DefaultFrameType";
import styleManager from "./style/StyleManager";
import NullContainer from "./NullContainer";
import Invalidate from "./Invalidate";
import Environment from "../environment";
import DataNode from "./DataNode";
import { createUUID, deepEquals } from "../util";
import Rect from "../math/rect";
import ResizeOptions from "../decorators/ResizeOptions";
import { DisplayProperty, PropertyDescriptor } from './PropertyMetadata';

require("../migrations/All");

var fwk = window.sketch.framework;

fwk.Stroke = Brush;

fwk.DockValues = { left: "Left", top: "Top", bottom: "Bottom", right: "Right", fill: "Fill" };

// constructor
export default class UIElement extends DataNode {
    constructor() {        
        super();

        // public variables
        //this.onresize = fwk.EventHelper.createEvent();
        this.stopwatch = new stopwatch();

        //this._draggingOver = false;
        //this._draggingData = null;
        //this._lockInvalidate = false;
        // this._seedNumber = new Date().getMilliseconds();

        if (DEBUG) {
            this.id(createUUID(this.t));
        }
        else {
            this.id(createUUID());
        }
        this.parent(NullContainer);
    }
    invalidate() {
        var parent = this.parent();
        if (parent) {
            parent.invalidate();
        }
    }
    resetRuntimeProps() {
        this.runtimeProps = {
            boundaryRectGlobal: null,
            globalViewMatrix: null,
            globalViewMatrixInverted: null,
            globalClippingBox: null,
            primitiveRoot: null,
            snapPoints: null,
        }
    }
    _roundValue(value) {
        return Math.round(value);
    }
    prepareProps(changes) {
        super.prepareProps.apply(this, arguments);
        if (changes.styleId !== undefined) {
            extend(changes, styleManager.getStyle(changes.styleId, 1).props);
        }
    }

    hasPendingStyle() {
        if (!this.props.styleId) {
            return false;
        }
        var baseStyle = styleManager.getStyle(this.props.styleId, 1);

        for (var p in baseStyle.props) {
            if (!deepEquals(this.props[p], baseStyle.props[p])) {
                return true;
            }
        }
        return false;
    }

    allowNameTranslation(){
        return true;
    }

    setProps(props) {
        var hasBr = props.hasOwnProperty("br");
        //TODO
        if (hasBr && !(props.br instanceof Rect)) {
            debugger;
        }

        if (!hasBr) {
            var hasW = props.hasOwnProperty("width");
            var hasH = props.hasOwnProperty("height");
            if (hasW || hasH) {
                var br = this.getBoundaryRect();
                var w = hasW ? props.width : br.width;
                var h = hasH ? props.height : br.height;
                props.br = br.withSize(w, h);
            }
        }
        super.setProps.apply(this, arguments);
    }
    propsUpdated(newProps, oldProps) {
        if (newProps.hasOwnProperty("m")
            || newProps.hasOwnProperty("stroke")
            || newProps.hasOwnProperty("br")
        ) {
            this.resetGlobalViewCache();
        }

        //raise events after all caches are updated
        super.propsUpdated.apply(this, arguments);
        this.invalidate();
    }
    propsPatched() {
        super.propsPatched.apply(this, arguments);
        this.invalidate();
    }

    selectLayoutProps(global) {
        var m = global ? this.globalViewMatrix() : this.viewMatrix();
        return {
            br: this.br(),
            m
        };
    }
    saveOrResetLayoutProps() {
        //this happens only for clones, so no need to clear origLayout
        if (!this.runtimeProps.origLayout) {
            this.runtimeProps.origLayout = this.selectLayoutProps();
        }
        else {
            this.setProps(this.runtimeProps.origLayout);
        }
    }

    selectDisplayProps(names, metadata = this.findMetadata()): any {
        var values = {};
        for (var i = 0; i < names.length; i++) {
            var propertyName = names[i];
            var descriptor: PropertyDescriptor = metadata[names[i]];
            if (descriptor.computed) {
                values[propertyName] = this[propertyName]();
            }
            else {
                values[propertyName] = this.props[propertyName];
            }
        }
        return values;
    }
    getDisplayPropValue(propertyName: string, descriptor: PropertyDescriptor = null): any {
        if (!descriptor) {
            descriptor = this.findMetadata()[propertyName];
        }
        if (descriptor.computed) {
            return this[propertyName]();
        }
        return this.props[propertyName];
    }
    setDisplayProps(changes, changeMode, metadata = this.findMetadata()) {
        var names = Object.keys(changes);
        for (var i = 0; i < names.length; i++) {
            var propertyName = names[i];
            var descriptor: PropertyDescriptor = metadata[propertyName];
            if (descriptor.computed) {
                this[propertyName](changes[propertyName], changeMode);
                delete changes[propertyName];
            }
        }

        this.prepareAndSetProps(changes, changeMode);
    }
    getAffectedDisplayProperties(changes): string[] {
        var properties = Object.keys(changes);
        if (changes.hasOwnProperty("br") || changes.hasOwnProperty("m")) {
            if (properties.indexOf("x") === -1) {
                properties.push("x");
            }
            if (properties.indexOf("y") === -1) {
                properties.push("y");
            }
            if (properties.indexOf("width") === -1) {
                properties.push("width");
            }
            if (properties.indexOf("height") === -1) {
                properties.push("height");
            }
            if (properties.indexOf("angle") === -1) {
                properties.push("angle");
            }

            var i = properties.indexOf("br");
            if (i !== -1) {
                properties.splice(i, 1);
            }
            i = properties.indexOf("m");
            if (i !== -1) {
                properties.splice(i, 1);
            }
        }
        return properties;
    }
    isChangeAffectingLayout(displayChanges) {
        return displayChanges.hasOwnProperty("x") || displayChanges.hasOwnProperty("y") || displayChanges.hasOwnProperty("width") || displayChanges.hasOwnProperty("height")
            || displayChanges.hasOwnProperty("angle")
            || displayChanges.hasOwnProperty("br")
            || displayChanges.hasOwnProperty("m");
    }
    getAffectedProperties(displayChanges): string[] {
        var properties = Object.keys(displayChanges);
        var result = [];
        var layoutPropsAdded = false;
        for (let i = 0; i < properties.length; ++i) {
            let p = properties[i];
            if (p === 'x' || p === 'y' || p === 'width' || p === 'height' || p === 'angle') {
                if (!layoutPropsAdded) {
                    result.push('br');
                    result.push('m');
                    layoutPropsAdded = true;
                }
            }
            else {
                result.push(p);
            }
        }
        return result;
    }

    getTranslation() {
        return this.dm().translation;
    }
    applyTranslation(t, withReset, mode) {
        if (withReset) {
            this.saveOrResetLayoutProps();
        }
        this.applyTransform(Matrix.create().translate(t.x, t.y), false, mode);
    }
    applyDirectedTranslation(t, mode) {
        this.applyTransform(Matrix.create().translate(t.x, t.y), true, mode);
    }
    applyGlobalTranslation(t, changeMode) {
        let m = this.globalViewMatrix().prependedWithTranslation(t.x, t.y);
        m = this.parent().globalViewMatrixInverted().appended(m);
        this.setTransform(m, changeMode);
    }

    getRotation() {
        return -this.dm().rotation;
    }
    applyRotation(angle, o, withReset, mode) {
        if (withReset) {
            this.saveOrResetLayoutProps();
        }
        this.applyTransform(Matrix.create().rotate(-angle, o.x, o.y), false, mode);
    }
    isRotated() {
        return this.getRotation() % 360 !== 0;
    }

    applyScaling(s, o, options) {
        if (options && options.reset) {
            this.saveOrResetLayoutProps();
        }

        if ((options && options.sameDirection) || !this.isRotated()) {
            this.applySizeScaling(s, o, options);
            return true;
        }

        this.applyMatrixScaling(s, o, options);
        return false;
    }
    applyMatrixScaling(s, o, options) {
        if (options && options.sameDirection) {
            var localOrigin = this.viewMatrixInverted().transformPoint(o);
            this.applyTransform(Matrix.create().scale(s.x, s.y, localOrigin.x, localOrigin.y), true);
        }
        else {
            this.applyTransform(Matrix.create().scale(s.x, s.y, o.x, o.y));
        }
    }
    /**
     * This function must produce exactly the same visual result as
     * calling UIElement.applyTransform(Matrix.create().scale(s.x, s.y, o.x, oy)),
     * but instead of changing the matrix, width and height are updated.
     *
     * For respecting the origin, first width and height are changed, new origin is calculated
     * and translated to the original position if necessary.
     *
     * Flip is detected by negative width/height, in which case the matrix is reflected relative to origin.
     */
    applySizeScaling(s, o, options) {
        var br = this.getBoundaryRect();
        var newWidth = br.width * s.x;
        var newHeight = br.height * s.y;

        if (options && options.round) {
            newWidth = Math.round(newWidth);
            newHeight = Math.round(newHeight);
        }

        var localOrigin = this.viewMatrixInverted().transformPoint(o);
        var newX = s.x * br.x;
        var newY = s.y * br.y;
        if (options && options.round) {
            newX = Math.round(newX);
            newY = Math.round(newY);
        }
        var newProps = {};
        newProps.br = new Rect(Math.abs(newX), Math.abs(newY), Math.abs(newWidth), Math.abs(newHeight));

        var fx = s.x < 0 ? -1 : 1;
        var fy = s.y < 0 ? -1 : 1;
        var dx = s.x * (br.x - localOrigin.x) + localOrigin.x - newX;
        var dy = s.y * (br.y - localOrigin.y) + localOrigin.y - newY;
        if (options && options.round) {
            dx = Math.round(dx);
            dy = Math.round(dy);
        }

        if (fx === -1 || fy === -1 || dx !== 0 || dy !== 0) {
            var matrix = this.viewMatrix();
            if (fx === -1 || fy === -1) {
                if (fx === -1) {
                    dx = -dx;
                }
                if (fy === -1) {
                    dy = -dy;
                }
                matrix = matrix.appended(Matrix.create().scale(fx, fy));
            }
            newProps.m = matrix.appended(Matrix.create().translate(dx, dy));
        }
        if (options && options.round) {
            newProps.m = newProps.m || this.viewMatrix().clone();
            //set directly to avoid floating point results
            newProps.m.tx = Math.round(newProps.m.tx);
            newProps.m.ty = Math.round(newProps.m.ty);
        }

        this.prepareAndSetProps(newProps);
    }

    applyTransform(matrix, append, mode) {
        this.prepareAndSetProps({ m: append ? this.props.m.appended(matrix) : this.props.m.prepended(matrix) }, mode);
    }
    setTransform(matrix, mode) {
        this.setProps({ m: matrix }, mode);
    }
    resetTransform() {
        this.setProps({ m: Matrix.Identity });
    }

    roundBoundingBoxToPixelEdge() {
        var bb = this.getBoundingBox();
        var bb1 = bb.roundPosition();
        if (bb1 !== bb) {
            var t = bb1.topLeft().subtract(bb.topLeft());
            this.applyTranslation(t);
            bb1 = bb1.translate(t.x, t.y);
        }
        var bb2 = bb1.roundSize();
        if (bb2 !== bb1) {
            var s = new Point(bb2.width / bb1.width, bb2.height / bb1.height);
            var canRound = this.shouldApplyViewMatrix();
            this.applyScaling(s, bb1.topLeft(), ResizeOptions.Default.withRounding(canRound).withReset(false));
        }
    }

    arrange() {
    }
    performArrange(oldRect) {
    }
    _init() {

    }
    // updateStyle() {
    //     if (fwk.Font.familyOverride) {
    //         if (this.props.font) {
    //             var oldFont = this.props.font;
    //             var oldFamily = oldFont.family;
    //             if (oldFamily !== fwk.Font.familyOverride) {
    //
    //                 this.setProps({font: oldFont.extend({family: fwk.Font.familyOverride})});
    //             }
    //         }
    //     }
    // },
    dragTo(event) {
        this.position(event);
    }
    // lastDrawnRect(value) {
    //     if (arguments.length !== 0) {
    //         this._lastDrawnRect = value;
    //     }
    //
    //     return this._lastDrawnRect;
    // },
    draggingEnter(event) {
    }
    draggingLeft(event) {
    }
    getDropData(event) {
        return null;
    }
    startResizing(eventData) {
        Environment.controller.startResizingEvent.raise(eventData);
    }
    stopResizing(eventData) {
        Environment.controller.stopResizingEvent.raise(eventData);
    }
    canHandleCorruption() {
        return false;
    }
    getSnapPoints(local) {
        if (!this.allowSnapping()) {
            return null;
        }

        if (this.runtimeProps.snapPoints) {
            return this.runtimeProps.snapPoints;
        }

        var rect = this.getBoundaryRectGlobal();
        var x = rect.x,
            y = rect.y,
            width = rect.width,
            height = rect.height;
        var origin = this.rotationOrigin(true);

        if (local) {
            x = 0;
            y = 0;
            origin.x -= rect.x;
            origin.y -= rect.y;
        }

        return this.runtimeProps.snapPoints = {
            xs: [x, x + width],
            ys: [y, y + height],
            center: { x: origin.x, y: origin.y }
        };
    }
    position() {
        if (arguments.length === 1) {
            debugger; //fix me
        }
        return this.getBoundingBox().topLeft();
    }
    centerPositionGlobal() {
        var rect = this.getBoundaryRectGlobal();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }
    addDecorator(decorator) {
        if (!this.decorators) {
            this.decorators = [];
        }
        if (this.decorators.indexOf(decorator) === -1) {
            this.decorators.push(decorator);
            decorator.attach(this);
            Invalidate.requestUpperOnly();
        }
    }
    removeDecorator(decorator) {
        if (!this.decorators) {
            return;
        }
        for (var i = 0, max = this.decorators.length; i < max; i++) {
            if (this.decorators[i] === decorator) {
                this.decorators[i].detach();
                this.decorators.splice(i, 1);
                Invalidate.requestUpperOnly();
                break;
            }
        }
    }
    removeAllDecorators() {
        var decorators = this.decorators;
        if (decorators) {
            decorators.forEach(x => x.detach());
            this.decorators = [];
            Invalidate.requestUpperOnly();
        }
        return decorators;
    }
    removeDecoratorByType(type) {
        if (!this.decorators) {
            return;
        }
        for (var i = 0, max = this.decorators.length; i < max; i++) {
            if (this.decorators[i].t === type.prototype.t) {
                this.decorators[i].detach();
                this.decorators.splice(i, 1);
                Invalidate.requestUpperOnly();
                break;
            }
        }
    }
    removed() {

    }
    removing() {

    }
    autoSelectOnPaste() {
        return true;
    }

    getBoundaryRect(includeMargin = false) {
        var br = this.props.br;
        if (!includeMargin || this.margin() === Box.Default) {
            return br;
        }
        var margin = this.margin();
        return new Rect(br.x - margin.left, br.y - margin.top, br.width + margin.left + margin.right, br.height + margin.top + margin.bottom);
    }
    size() {
        return {
            width: this.width(),
            height: this.height()
        }
    }
    getBoundaryRectGlobal(includeMargin = false) {
        return this.getBoundingBoxGlobal(includeMargin);
    }

    getBoundingBox(includeMargin = false) {
        var rect = this.getBoundaryRect(includeMargin);
        return this.transformRect(rect, this.viewMatrix());
    }
    getBoundingBoxGlobal(includeMargin = false) {
        if (this.runtimeProps.globalClippingBox) {
            return this.runtimeProps.globalClippingBox;
        }

        var rect = this.getBoundaryRect(includeMargin);
        var bb = this.transformRect(rect, this.globalViewMatrix());
        this.runtimeProps.globalClippingBox = bb;
        return bb;
    }
    transformRect(rect, matrix) {
        if (matrix.isTranslatedOnly()) {
            return rect.translate(matrix.tx, matrix.ty);
        }

        var p1 = matrix.transformPoint2(rect.x, rect.y);
        var p2 = matrix.transformPoint2(rect.x + rect.width, rect.y);
        var p3 = matrix.transformPoint2(rect.x + rect.width, rect.y + rect.height);
        var p4 = matrix.transformPoint2(rect.x, rect.y + rect.height);

        var l = Math.min(p1.x, p2.x, p3.x, p4.x);
        var r = Math.max(p1.x, p2.x, p3.x, p4.x);
        var t = Math.min(p1.y, p2.y, p3.y, p4.y);
        var b = Math.max(p1.y, p2.y, p3.y, p4.y);

        return new Rect(l, t, r - l, b - t);
    }

    getMaxOuterBorder() {
        if (!this.stroke()) {
            return 0;
        }
        var stroke = this.stroke();
        if (stroke.lineWidth === 0) {
            return 0;
        }
        if (stroke.position === 0) {
            return stroke.lineWidth / 2 + .5 | 0;
        }
        if (stroke.position === 1) {
            return 0;
        }
        return stroke.lineWidth;
    }
    expandRectWithBorder(rect) {
        var border = this.getMaxOuterBorder();
        if (border !== 0) {
            return rect.expand(border);
        }
        return rect;
    }
    getHitTestBox(scale, includeMargin = false, includeBorder = true) {
        var rect = this.getBoundaryRect(includeMargin);
        var goodScaleW = rect.width * scale > 10;
        var goodScaleH = rect.height * scale > 10;
        if (!includeBorder && goodScaleW && goodScaleW) {
            return rect;
        }

        var border = this.getMaxOuterBorder();
        if (border === 0 && goodScaleW && goodScaleH) {
            return rect;
        }

        var x = rect.x - border;
        var y = rect.y - border;
        var width = rect.width + border;
        var height = rect.height + border;

        if (!goodScaleW) {
            x -= 5;
            width += 10;
        }
        if (goodScaleH) {
            y -= 5;
            height += 10;
        }
        return new Rect(x, y, width, height);
    }

    hitTest(/*Point*/point, scale, includeMargin = false) {
        if (!this.visible()) {
            return false;
        }
        var rect = this.getHitTestBox(scale, includeMargin);

        var matrix = this.globalViewMatrixInverted();
        point = matrix.transformPoint(point);

        return point.x >= rect.x && point.x < rect.x + rect.width && point.y >= rect.y && point.y < rect.y + rect.height;
    }
    hitTestGlobalRect(rect) {
        if (!this.hitVisible()) {
            return false;
        }

        var bb = this.getBoundingBoxGlobal();
        if (!areRectsIntersecting(bb, rect)) {
            return false;
        }

        var m = this.globalViewMatrix();
        if (m.isTranslatedOnly()) {
            return true;
        }

        if (isRectInRect(bb, rect)) {
            return true;
        }

        var br = this.getBoundaryRect();
        var segments1 = m.transformRect(br);
        var segments2 = rect.segments();

        for (var i = 0; i < segments1.length; i++) {
            var s1 = segments1[i];
            for (var j = 0; j < segments2.length; j++) {
                var s2 = segments2[j];
                if (s1.intersects(s2)) {
                    return true;
                }
            }
        }
        return false;
    }
    // pageLink(value) {
    //     var action = this.action();
    //     if (action.type === 0/*PageLink*/) {
    //         return action.pageId;
    //     }
    //     return null;
    // },

    resetGlobalViewCache(resetPrimitiveRoot = false) {
        delete this.runtimeProps.boundaryRectGlobal;
        delete this.runtimeProps.globalViewMatrix;
        delete this.runtimeProps.globalViewMatrixInverted;
        delete this.runtimeProps.viewMatrixInverted;
        delete this.runtimeProps.globalClippingBox;
        delete this.runtimeProps.snapPoints;
        delete this.runtimeProps.dm;
        //primitive root should be changed only when changing parent, it is needed for repeater clones
        if (resetPrimitiveRoot) {
            delete this.runtimeProps.primitiveRoot;
        }
    }
    viewMatrix() {
        return this.props.m;
    }
    dm() {
        if (!this.runtimeProps.dm) {
            this.runtimeProps.dm = this.props.m.decompose();
        }
        return this.runtimeProps.dm;
    }
    viewMatrixInverted() {
        if (!this.runtimeProps.viewMatrixInverted) {
            this.runtimeProps.viewMatrixInverted = this.viewMatrix().clone().invert();
        }
        return this.runtimeProps.viewMatrixInverted;
    }
    shouldApplyViewMatrix() {
        return true;
    }
    applyViewMatrix(context) {
        if (this.shouldApplyViewMatrix()) {
            this.globalViewMatrix().applyToContext(context);
        }
    }
    draw(context, environment) {
        this.stopwatch.start();

        var w = this.width(),
            h = this.height();

        context.save();
        context.globalAlpha = context.globalAlpha * this.opacity();

        this.applyViewMatrix(context, environment);

        this.clip(context);
        this.drawSelf(context, w, h, environment);

        context.restore();

        this.drawDecorators(context, w, h, environment);

        //console.log(this.displayName() + " : " + this.stopwatch.getElapsedTime());
    }
    drawSelf(context, w, h) {

    }
    drawDecorators(context, w, h, environment) {
        if (this.decorators) {
            context.save();
            for (var i = 0, j = this.decorators.length; i < j; ++i) {
                this.decorators[i].draw(context, w, h, environment);
            }
            context.restore();
        }
    }
    drawBoundaryPath(context, matrix, round = true) {
        var r = this.getBoundaryRect();
        const roundFactor = 2;

        context.beginPath();

        var p = matrix.transformPoint2(r.x, r.y);
        if (round) {
            p.roundMutableBy(roundFactor);
        }
        context.moveTo(p.x, p.y);

        p = matrix.transformPoint2(r.x + r.width, r.y);
        if (round) {
            p.roundMutableBy(roundFactor);
        }
        context.lineTo(p.x, p.y);

        p = matrix.transformPoint2(r.x + r.width, r.y + r.height);
        if (round) {
            p.roundMutableBy(roundFactor);
        }
        context.lineTo(p.x, p.y);

        p = matrix.transformPoint2(r.x, r.y + r.height);
        if (round) {
            p.roundMutableBy(roundFactor);
        }
        context.lineTo(p.x, p.y);

        context.closePath();
    }
    primitiveRoot() {
        if (this.runtimeProps.primitiveRoot) {
            return this.runtimeProps.primitiveRoot;
        }
        var parent = this.parent();
        var root = parent ? parent.primitiveRoot() : null;
        this.runtimeProps.primitiveRoot = root;
        return root;
    }
    primitivePath() {
        var path = this.primitiveRoot().primitivePath().slice();
        path[path.length - 1] = this.id();
        return path;
    }
    createDragClone(element) {
        return element.clone();
    }
    globalViewMatrix() {
        if (this.runtimeProps.globalViewMatrix) {
            return this.runtimeProps.globalViewMatrix;
        }

        var parent = this.parent();
        if (!parent || parent === NullContainer) {
            return this.viewMatrix();
        }

        var matrix = parent.globalViewMatrix().clone();
        matrix.append(this.viewMatrix());
        this.runtimeProps.globalViewMatrix = Object.freeze(matrix);

        return this.runtimeProps.globalViewMatrix;
    }
    globalViewMatrixInverted() {
        if (!this.runtimeProps.globalViewMatrixInverted) {
            this.runtimeProps.globalViewMatrixInverted = this.globalViewMatrix().clone().invert()
        }

        return this.runtimeProps.globalViewMatrixInverted;
    }
    trackPropertyState(name) {
        return null;
    }
    clip(context) {
        if (this.clipSelf()) {
            var m = this.shouldApplyViewMatrix() ? Matrix.Identity : this.globalViewMatrix();
            this.drawBoundaryPath(context, m);
            context.clip();
        }
    }
    mousemove(event) {
        if (this.editor != null) {
            event.handled = true;
        }
    }
    mouseup(event) {
    }
    mousedown(event) {
    }
    dblclick(event) {
    }
    click(event) {
    }
    // mouseLeaveElement(event) {
    // },
    // mouseEnterElement(event) {
    // },
    // defaultAction(event) {
    //     if (this._defaultAction) {
    //         return this._defaultAction;
    //     }
    //     var pageId = this.pageLink();
    //     if (pageId) {
    //         this._defaultAction = new sketch.ui.SwitchPageAction(pageId);
    //         return this._defaultAction;
    //     }
    //     return null;
    // },
    setDefaultAction(defaultAction) {
        this._defaultAction = defaultAction;
    }
    select(multiSelect, view) {

    }
    unselect() {
    }
    captureMouse() {
        Environment.controller.captureMouse(this);
    }
    releaseMouse() {
        Environment.controller.releaseMouse(this);
    }
    canMultiSelect() {
        return true;
    }
    canAlign() {
        return true;
    }
    canGroup() {
        return true;
    }
    canChangeOrder() {
        return true;
    }
    zOrder() {
        if (arguments.length > 0) {
            throw "zOrder is readonly";
        }
        var parent = this.parent();
        if (!parent || parent === NullContainer) {
            return null;
        }

        return parent.children.indexOf(this);
    }
    x(value, changeMode) {
        if (arguments.length !== 0) {
            var t = Point.create(value - this.x(), 0);
            this.applyGlobalTranslation(t, changeMode);

            return;
        }

        var root = this.primitiveRoot();
        if (!root) {
            return this.getBoundingBox().x;
        }
        let m = root.globalViewMatrixInverted().appended(this.globalViewMatrix());
        return this.transformRect(this.getBoundaryRect(), m).x;
    }
    y(value, changeMode) {
        if (arguments.length !== 0) {
            var t = Point.create(0, value - this.y());
            this.applyGlobalTranslation(t, changeMode);

            return;
        }

        var root = this.primitiveRoot();
        if (!root) {
            return this.getBoundingBox().y;
        }
        let m = root.globalViewMatrixInverted().appended(this.globalViewMatrix());
        return this.transformRect(this.getBoundaryRect(), m).y;
    }
    width(value, changeMode) {
        if (arguments.length !== 0) {
            var br = this.br();
            this.setProps({ br: br.withSize(value, br.height) }, changeMode);
        }
        return this.br().width;
    }
    height(value, changeMode) {
        if (arguments.length !== 0) {
            var br = this.br();
            this.setProps({ br: br.withSize(br.width, value) }, changeMode);
        }
        return this.br().height;
    }
    angle(value, changeMode) {
        if (arguments.length !== 0) {
            this.applyRotation(value - this.angle(), this.center(), false, changeMode);
        }
        return -this.globalViewMatrix().decompose().rotation;
    }
    br(value) {
        if (value !== undefined) {
            this.setProps({ br: value });
        }
        return this.props.br;
    }
    right() {
        return this.x() + this.width();
    }
    bottom() {
        return this.y() + this.height();
    }
    outerHeight() {
        var margin = this.margin();
        return this.height() + margin.top + margin.bottom;
    }
    outerWidth() {
        var margin = this.margin();
        return this.width() + margin.left + margin.right;
    }
    locked(value) {
        if (value !== undefined) {
            this.setProps({ locked: value });
        }
        return this.props.locked;
    }
    clipDragClone(value) {
        return this.field("_clipDragClone", value, false);
    }
    isTemporary(value) {
        return this.field("_isTemporary", value, false);
    }
    hitVisible(directSelection) {
        if (this.locked() || !this.visible()) {
            return false;
        }
        var parent = this.parent();
        if (!parent) {
            return false;
        }
        if (directSelection) {
            return true;
        }
        return !parent.lockedGroup() || parent.activeGroup();
    }
    hitTransparent() {
        return false;
    }
    canSelect(value) {
        return this.field("_canSelect", value, true);
    }
    visible(value) {
        if (value !== undefined) {
            this.setProps({ visible: value });
        }
        return this.props.visible;
    }
    autoPosition(value) {
        return this.field("_autoPosition", value, "center");
    }
    allowSnapping(value) {
        return this.field("_allowSnapping", value, true);
    }
    tags(value) {
        return this.field("_tags", value, '');
    }
    crazySupported(value) {
        return this.field("_crazySupported", value, true);
    }
    customScale(value) {
        var res = this.field("_customScale", value, false);
        if (value !== undefined) {
            this.resetGlobalViewCache();
        }

        return res;
    }
    fill(value) {
        if (value !== undefined) {
            this.setProps({ fill: value });
        }
        return this.props.fill;
    }
    stroke(value) {
        if (value !== undefined) {
            this.setProps({ stroke: value });
        }
        return this.props.stroke;
    }
    dashPattern(value) {
        if (value !== undefined) {
            this.setProps({ dashPattern: value });
        }
        if (typeof this.props.dashPattern === 'string') {
            switch (this.props.dashPattern) {
                case 'solid':
                    return null;
                case 'dotted':
                    return [1, 1];
                case 'dashed':
                    return [4, 2];
            }
        }
        return this.props.dashPattern;
    }
    selectFrameVisible() {
        return true;
    }
    field(name, value, defaultValue) {
        if (value !== undefined) {
            this[name] = value;
        }
        var res = this[name];
        return res !== undefined ? res : defaultValue;
    }
    clipSelf(/*bool*/value) {
        if (value !== undefined) {
            this.setProps({ overflow: Overflow.Clip });
        }
        return this.props.overflow === Overflow.Clip;
    }
    overflow(value) {
        if (value !== undefined) {
            this.setProps({ overflow: value });
        }
        return this.props.overflow;
    }
    parent(/*UIElement*/value) {
        if (value !== undefined) {
            this._parent = value;
            this.resetGlobalViewCache(true);
        }
        return this._parent;
    }
    opacity(/*double*/value) {
        if (value !== undefined) {
            this.setProps({ opacity: value });
        }
        return this.props.opacity;
    }
    minWidth(/*Number*/value) {
        if (value !== undefined) {
            this.setProps({ minWidth: value });
        }
        return this.props.minWidth;
    }
    minHeight(/*Number*/value) {
        if (value !== undefined) {
            this.setProps({ minHeight: value });
        }
        return this.props.minHeight;
    }
    maxWidth(/*Number*/value) {
        if (value !== undefined) {
            this.setProps({ maxWidth: value });
        }
        return this.props.maxWidth;
    }
    maxHeight(/*Number*/value) {
        if (value !== undefined) {
            this.setProps({ maxHeight: value });
        }
        return this.props.maxHeight;
    }
    canDrag(value) {
        return this.field("_canDrag", value, true);
    }
    flipVertical(value) {
        if (value !== undefined) {
            this.setProps({ flipVertical: value });
        }
        return this.props.flipVertical;
    }
    flipHorizontal(value) {
        if (value !== undefined) {
            this.setProps({ flipHorizontal: value });
        }
        return this.props.flipHorizontal;
    }
    clipMask(/*bool*/value) {
        if (value !== undefined) {
            this.setProps({ clipMask: value });
        }
        return this.props.clipMask;
    }

    scalableX(value) {
        return this.field("_scalableX", value, true);
    }
    scalableY(value) {
        return this.field("_scalableY", value, true);
    }
    isDropSupported(value) {
        return true;
    }
    showResizeHint() {
        return true;
    }
    showDropTarget() {
        return true;
    }
    activeInPreview(value) {
        return this.field("_activeInPreview", value, false);
    }
    cloneWhenDragging() {
        return false;
    }
    visibleWhenDrag(value) {
        if (value !== undefined) {
            this.setProps({ visibleWhenDrag: value });
        }
        return this.props.visibleWhenDrag;
    }
    standardBackground(value) {
        return this.field("_standardBackground", value, true);
    }
    name(value) {
        if (value !== undefined) {
            this.setProps({ name: value });
        }
        return this.props.name;
    }
    constraints(value) {
        if (value !== undefined) {
            this.setProps({ constraints: value });
        }
        return this.props.constraints;
    }
    resize(props) {
        this.prepareAndSetProps(props);
    }
    initialResize(parent) {
        switch (this.autoPosition()) {
            case "top":
            case "bottom":
            case "middle":
            case "fill":
                this.width(parent.width());
                break;
        }
    }
    getType() {
        return "UIElement";
    }
    getDescription() {
        return _(this.t);
    }
    applyVisitor(/*Visitor*/callback) {
        return callback(this);
    }
    canAccept(elements, autoInsert) {
        return false;
    }
    canBeAccepted(element) {
        return true;
    }
    canConvertToPath() {
        return false;
    }
    sizeProperties() {
        return {
            width: this.props.width,
            height: this.props.height
        };
    }
    onLayerDraw(layer, context) {

    }
    registerForLayerDraw(layerNum) {
        var parent = this.parent();
        if (parent) {
            parent.registerForLayerDraw(layerNum, this);
        }
    }
    unregisterForLayerDraw(layerNum) {
        var parent = this.parent();
        if (parent) {
            parent.unregisterForLayerDraw(layerNum, this);
        }
    }
    margin(value) {
        if (value !== undefined) {
            this.setProps({ margin: value });
        }
        return this.props.margin;
    }

    isDescendantOrSame(element) {
        var current = this;
        do {
            if (current.isSameAs(element)) {
                return true;
            }
            current = current.parent();
        } while (current && current !== NullContainer);

        return false;
    }
    isSameAs(element) {
        return element === this;
    }
    horizontalAlignment(value) {
        if (value !== undefined) {
            this.setProps({ horizontalAlignment: value });
        }
        return this.props.horizontalAlignment;
    }
    verticalAlignment(value) {
        if (value !== undefined) {
            this.setProps({ verticalAlignment: value });
        }
        return this.props.verticalAlignment;
    }
    dockStyle(value) {
        if (value !== undefined) {
            this.setProps({ dockStyle: value });
        }
        return this.props.dockStyle;
    }
    index() {
        return this.parent().children.indexOf(this);
    }
    each(callback) {
        each([this], callback);
    }
    clone() {
        var clone = ObjectFactory.fromType(this.t, this.cloneProps());
        clone.id(createUUID());
        return clone;
    }
    sourceId(id) {
        if (arguments.length > 0) {
            this.setProps({ sourceId: id });
        }

        return this.props.sourceId || this.props.id;
    }
    mirrorClone() {
        var clone = ObjectFactory.fromType(this.t, this.cloneProps());
        return clone;
    }
    cursor() {
        return null;
    }
    resizeDimensions(value) {
        if (value) {
            value = +value; // convert from string, to make it work with property editor
        }
        return this.field("_resizeDimensions", value, ResizeDimension.Both);
    }
    init(values, isDefault, selector) {
        var props = {};
        var that = this;
        for (var name in values) {
            if (name[0] === "_") {
                this.field(name, values[name]);
            } else if (name[0] === "#") {
                var elementName = name.substr(1);
                this.findSingleChildOrDefault(function (e) {
                    if (e.name() === elementName) {
                        e.init(values[name]);
                    }
                })
            } else if (name[0] === "$") {

            } else {
                var value = values[name];
                if (value && value.t) {
                    var type = value.t;
                    var defaultFunc = TypeDefaults[type];
                    var defaults = {};
                    if (defaultFunc) {
                        defaults = defaultFunc();
                    }
                    value = Object.assign(defaults, value);
                }

                props[name] = value;
            }
        }
        this.setProps(props);
        return this;
    }
    fromJSON(data) {
        //TODO: bring back migrations when necessary
        // if (data.props.version !== this.__version__) {
        //     if (!Migrations.runMigrations(this.t, data, this.__version__)) {
        //         throw "Migration not successful: " + this.t + " from " + data.props.version + " to " + this.__version__;
        //     }
        //     App.Current.migrationUpgradeNotifications.push(this);
        // }
        this.__state = 1;

        super.fromJSON.apply(this, arguments);

        delete this.__state;
        return this;
    }
    getEditableProperties(recursive) {
        return PropertyMetadata.getEditableProperties(this.systemType(), recursive);
    }
    displayName() {
        return this.name() || this.displayType();
    }
    displayType() {
        return "type." + this.t;
    }
    systemType() {
        return this.t;
    }
    findMetadata() {
        return PropertyMetadata.findAll(this.systemType());
    }
    findPropertyDescriptor(propName): PropertyDescriptor {
        return PropertyMetadata.find(this.systemType(), propName);
    }
    quickEditProperty(value) {
        return this.field("_quickEditProperty", value, "");
    }
    toString() {
        return this.t;
    }
    getPath() {
        var path = [this];
        var e = this;
        while (typeof e.parent === "function" && e.parent()) {
            path.push(e.parent());
            e = e.parent();
        }
        return this.id() + ': ' + map(path.reverse(), function (x) {
            return x.t;
        }).join("->");
    }

    dispose() {
        if (this._isDisposed) {
            return;
        }
        //this.onresize.clearSubscribers();
        //delete this.onresize;

        delete this.props;

        this._isDisposed = true;
    }
    isDisposed() {
        return this._isDisposed;
    }
    rotationOrigin(global) {
        return this.center(global);
    }
    center(global) {
        var m = global ? this.globalViewMatrix() : this.viewMatrix();
        return m.transformPoint(this.br().center());
    }
    hitElement(position, scale, predicate) {
        if (this.hitVisible()) {

            predicate = predicate || this.hitTest;
            if (predicate.call(this, position, scale)) {
                return this;
            }
        }

        return null;
    }
    isAncestor(element) {
        var parent = this.parent();
        while (parent) {
            if (parent === element) {
                return true;
            }

            parent = parent.parent();
        }

        return false;
    }
    isOrphaned() {
        return this.parent() === NullContainer;
    }
    canBeRemoved() {
        return true;
    }

    page() {
        var element;
        var nextParent = this;
        do {
            element = nextParent;
            nextParent = !nextParent.isDisposed() ? nextParent.parent() : null;
        } while (nextParent && (nextParent instanceof fwk.UIElement) && !(nextParent === NullContainer));

        if (element && (element instanceof fwk.Page)) {
            return element;
        }
        return null;
    }

    getTags() {
        var tags = this.tags();
        if (tags) {
            return tags.split(",");
        }
        return [];
    }
    hasTag(tag) {
        var tags = this.getTags();
        return sketch.util.contains(tags, tag);
    }
    addTag(tag) {
        var tags = this.getTags();
        if (!sketch.util.contains(tags, tag)) {
            tags.push(tag);
            this.tags(tags.join(","));
        }
        return this;
    }
    contextMenu(context, menu) {

    }
    constructMoveCommand(newParent, newIndex) {
        return new ElementMove(this, newParent, newIndex);
    }
    constructPropsChangedCommand(newProps, oldProps) {
        return new ElementPropsChanged(this, newProps, oldProps);
    }
    constructDeleteCommand() {
        return new ElementDelete(this);
    }
    move(rect) {
        this.resize(rect);
    }
    exportPatch() {
    }
    applyPatch(data) {
    }
    selectionFrameType() {
        return DefaultFrameType;
    }
    iconType() {
        return this.props.iconType || 'rectangle';
    }
    createSelectionFrame(view) {
        if (!this.selectFrameVisible()) {
            return {
                element: this,
                frame: false,
                points: []
            }
        }

        if (view.prototyping()) {
            return {
                element: this,
                frame: true,
                points: []
            }
        }

        var points = [];

        if (this._angleEditable !== false /*properties.angle.getIsEditable()*/) {
            points.push(
                {
                    type: RotateFramePoint,
                    moveDirection: PointDirection.Any,
                    x: 0,
                    y: 0,
                    cursor: 8,
                    update: function (p, x, y, w, h) {
                        p.x = x;
                        p.y = y;
                    }
                },
                {
                    type: RotateFramePoint,
                    moveDirection: PointDirection.Any,
                    x: 0,
                    y: 0,
                    cursor: 8,
                    update: function (p, x, y, w, h) {
                        p.x = x + w;
                        p.y = y;
                    }
                },
                {
                    type: RotateFramePoint,
                    moveDirection: PointDirection.Any,
                    x: 0,
                    y: 0,
                    cursor: 8,
                    update: function (p, x, y, w, h) {
                        p.x = x + w;
                        p.y = y + h;
                    }
                },
                {
                    type: RotateFramePoint,
                    moveDirection: PointDirection.Any,
                    x: 0,
                    y: 0,
                    cursor: 8,
                    update: function (p, x, y, w, h) {
                        p.x = x;
                        p.y = y + h;
                    }
                }
            );
        }

        switch (this.resizeDimensions()) {
            case ResizeDimension.Both:
                points.push(
                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Any,
                        x: 0,
                        y: 0,
                        cursor: 3,
                        rv: [1, 1],
                        update: function (p, x, y, w, h) {
                            p.x = x + w;
                            p.y = y + h;
                        }
                    },
                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Any,
                        x: 0,
                        y: 0,
                        cursor: 7,
                        rv: [-1, -1],
                        update: function (p, x, y, w, h) {
                            p.x = x;
                            p.y = y;
                        }
                    },
                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Any,
                        x: 0,
                        y: 0,
                        cursor: 1,
                        rv: [1, -1],
                        update: function (p, x, y, w, h) {
                            p.x = x + w;
                            p.y = y;
                        }
                    },

                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Any,
                        x: 0,
                        y: 0,
                        cursor: 5,
                        rv: [-1, 1],
                        update: function (p, x, y, w, h) {
                            p.x = x;
                            p.y = y + h;
                        }
                    },
                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Vertical,
                        x: 0,
                        y: 0,
                        cursor: 0,
                        rv: [0, -1],
                        update: function (p, x, y, w, h) {
                            p.x = x + w / 2;
                            p.y = y;
                        }
                    },
                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Horizontal,
                        x: 0,
                        y: 0,
                        cursor: 2,
                        rv: [1, 0],
                        update: function (p, x, y, w, h) {
                            p.x = x + w;
                            p.y = y + h / 2;
                        }
                    },
                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Vertical,
                        x: 0,
                        y: 0,
                        cursor: 4,
                        rv: [0, 1],
                        update: function (p, x, y, w, h) {
                            p.x = x + w / 2;
                            p.y = y + h;
                        }
                    },
                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Horizontal,
                        x: 0,
                        y: 0,
                        cursor: 6,
                        rv: [-1, 0],
                        update: function (p, x, y, w, h) {
                            p.x = x;
                            p.y = y + h / 2;
                        }
                    }
                );
                break;
            case ResizeDimension.Vertical:
                points.push(
                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Vertical,
                        x: 0,
                        y: 0,
                        cursor: 0,
                        rv: [0, -1],
                        update: function (p, x, y, w, h) {
                            p.x = x + w / 2;
                            p.y = y;
                        }
                    },
                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Vertical,
                        x: 0,
                        y: 0,
                        cursor: 4,
                        rv: [0, 1],
                        update: function (p, x, y, w, h) {
                            p.x = x + w / 2;
                            p.y = y + h;
                        }
                    }
                );
                break;
            case ResizeDimension.Horizontal:
                points.push(
                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Horizontal,
                        x: 0,
                        y: 0,
                        cursor: 2,
                        rv: [1, 0],
                        update: function (p, x, y, w, h) {
                            p.x = x + w;
                            p.y = y + h / 2;
                        }
                    },
                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Horizontal,
                        x: 0,
                        y: 0,
                        cursor: 6,
                        rv: [-1, 0],
                        update: function (p, x, y, w, h) {
                            p.x = x;
                            p.y = y + h / 2;
                        }
                    }
                );
                break;
        }

        return {
            element: this,
            frame: true,
            points: points
        };
    }
    getPropsDiff(other, oldProps) {
        var res = {};
        for (var p in other) {
            if (this.props[p] !== other[p]) {
                res[p] = other[p];
                if (oldProps) {
                    oldProps[p] = this.props[p];
                }
            }
        }

        return res;
    }
    // returns deffered object
    animate(properties, duration, options, progressCallback) {
        var animationValues = [];
        options = extend({}, options);
        options.duration = duration || 0;
        var that = this;
        for (var propName in properties) {
            var newValue = properties[propName];
            var accessor = (function (name) {
                return function prop_accessor(value) {
                    if (arguments.length > 0) {
                        that.setProps({ [name]: value });
                    }
                    return that.props[name];
                }
            })(propName);

            var currentValue = accessor();

            animationValues.push({ from: currentValue, to: newValue, accessor: accessor });
        }

        var group = new AnimationGroup(animationValues, options, progressCallback);
        Environment.view.animationController.registerAnimationGroup(group);

        return group.promise();
    }

    styleId(value) {
        if (arguments.length > 0) {
            this.setProps({ styleId: value });
        }

        return this.props.styleId;
    }

    getStyleProps() {
        var stylePropNames = PropertyMetadata.getStylePropertyNamesMap(this.systemType(), 1);
        var res = {};
        for (var name in stylePropNames) {
            res[name] = sketch.util.flattenObject(this.props[name]);
        }
        return res;
    }

    beforeAddFromToolbox() {

    }
    afterAddFromToolbox() {

    }

    propertyMetadata() {
        return PropertyMetadata.findAll(this.t);
    }

    toSVG() {
        var ctx = new C2S(this.width(), this.height());
        this.draw(ctx);
        return ctx.getSerializedSvg();
    }

    static fromTypeString(type, parameters) {
        var components = type.split('.');
        var current = sketch;
        for (var i = 1; i < components.length; i++) {
            var component = components[i];
            current = current[component];
            if (!current) {
                var newType = fwk.UIElement.upgradeTypeName(type);
                if (newType !== type) {
                    return fwk.UIElement.fromType(newType, parameters);
                }
                throw 'Type not found: ' + type;
            }
        }

        return current;
    }

    static construct() {
        return ObjectFactory.construct.apply(ObjectFactory, arguments);
    }

    static fromType(type, parameters) {
        return ObjectFactory.fromType(type, parameters);
    }

    static fromJSON(data) {
        return ObjectFactory.fromJSON(data);
    }
}

fwk.UIElement = UIElement;

UIElement.prototype.t = Types.Element;
UIElement.prototype.__version__ = 1;

PropertyMetadata.registerForType(UIElement, {
    margin: {
        displayName: "Margin",
        type: "box",
        defaultValue: Box.Default
    },
    dockStyle: {
        displayName: "Dock style",
        type: "dropdown",
        options: {
            size: 1 / 2,
            items: [
                { name: "Left", value: DockStyle.Left },
                { name: "Top", value: DockStyle.Top },
                { name: "Right", value: DockStyle.Right },
                { name: "Bottom", value: DockStyle.Bottom },
                { name: "Fill", value: DockStyle.Fill },
                { name: "None", value: DockStyle.None }
            ]
        },
        defaultValue: DockStyle.None
    },
    horizontalAlignment: {
        displayName: "Horizontal alignment",
        type: "dropdown",
        options: {
            size: 1,
            items: [
                { name: "Left", value: HorizontalAlignment.Left },
                { name: "Right", value: HorizontalAlignment.Right },
                { name: "Stretch", value: HorizontalAlignment.Stretch },
                { name: "Center", value: HorizontalAlignment.Center },
                { name: "None", value: HorizontalAlignment.None }
            ]
        },
        defaultValue: HorizontalAlignment.None
    },
    verticalAlignment: {
        displayName: "Vertical alignment",
        type: "dropdown",
        options: {
            size: 1,
            items: [
                { name: "Top", value: VerticalAlignment.Top },
                { name: "Bottom", value: VerticalAlignment.Bottom },
                { name: "Stretch", value: VerticalAlignment.Stretch },
                { name: "Middle", value: VerticalAlignment.Middle },
                { name: "None", value: VerticalAlignment.None }
            ]
        },
        defaultValue: VerticalAlignment.None
    },
    visibleWhenDrag: {
        defaultValue: false
    },
    width: {
        displayName: "Width",
        type: "numeric",
        computed: true,
        options: {
            step: 1,
            miniStep: .1
        }
    },
    height: {
        displayName: "Height",
        type: "numeric",
        computed: true,
        options: {
            step: 1,
            miniStep: .1
        }
    },
    name: {
        displayName: "Name",
        type: "text",
        useInModel: true,
        editable: false,
        defaultValue: ""
    },
    x: {
        displayName: "Left",
        type: "numeric",
        computed: true,
        options: {
            step: 1,
            miniStep: .1
        }
    },
    y: {
        displayName: "Top",
        type: "numeric",
        computed: true,
        options: {
            step: 1,
            miniStep: .1
        }
    },
    m: {
        defaultValue: Matrix.Identity
    },
    br: {
        defaultValue: Rect.Zero
    },
    locked: {
        displayName: "Locked",
        type: "toggle",
        useInModel: true,
        options: {
            icon: "ico-prop_lock"
        },
        defaultValue: false
    },
    visible: {
        displayName: "Visible",
        type: "trueFalse",
        useInModel: true,
        editable: true,
        defaultValue: true,
        customizable: true
    },
    hitTransparent: {
        defaultValue: false
    },
    opacity: {
        displayName: "Opacity",
        type: "numeric",
        defaultValue: 1,
        style: 1,
        customizable: true,
        options: {
            step: .1,
            min: 0,
            max: 1
        }
    },
    angle: {
        displayName: "Angle",
        type: "numeric",
        options: {
            min: -360,
            max: 360,
            step: 1,
            miniStep: .1
        },
        customizable: true,
        computed: true
    },
    flipHorizontal: {
        defaultValue: false
    },
    flipVertical: {
        defaultValue: false
    },
    constraints: {
        displayName: "@constraints",
        type: "constraints",
        useInModel: true,
        editable: false,
        defaultValue: Constraints.Default
        // options: {
        //     items: [
        //         {field: "left", icon: "ico-prop_pin-left"},
        //         {field: "top", icon: "ico-prop_pin-top"},
        //         {field: "right", icon: "ico-prop_pin-right"},
        //         {field: "bottom", icon: "ico-prop_pin-bottom"}
        //     ],
        //     size: 3 / 4
        // }
    },
    overflow: {
        defaultValue: Overflow.Visible
    },
    fill: {
        displayName: "Fill",
        type: "fill",
        useInModel: true,
        editable: true,
        defaultValue: fwk.Brush.Empty,
        style: 1,
        customizable: true
    },
    stroke: {
        displayName: "Stroke",
        type: "stroke",
        useInModel: true,
        editable: true,
        defaultValue: fwk.Brush.Empty,
        style: 1,
        customizable: true
    },
    dashPattern: {
        displayName: "@strokePattern",
        type: "strokePattern",
        defaultValue: 'solid',
        options: {},
        items: [
            { value: 'solid' },
            { value: 'dashed' },
            { value: 'dotted' }
        ],
    },
    clipMask: {
        displayName: "Use as mask",
        type: "checkbox",
        useInModel: true,
        defaultValue: false
    },
    prototyping: {
        defaultValue: false,
        useInModel: false,
        editable: false
    },
    styleId: {
        displayName: 'Shared style',
        type: "styleName",
        defaultValue: null
    },
    groups: function () {
        return [
            {
                label: "Layout",
                properties: ["x", "y", "width", "height", "angle"]
            },
            {
                label: "Colors",
                properties: ["fill", "stroke"],
                hidden: true
            },
            {
                label: "Style",
                properties: ["styleId", "opacity"]
            },
            {
                label: "@constraints",
                properties: ["constraints"]
            },
            {
                label: "Appearance",
                properties: ["visible", "cornerRadius", "clipMask"]
            }
            // ,
            // {
            //     label: "Margin",
            //     properties: ["margin"]
            // }
        ];
    },
    prepareVisibility: function (props, selection, view) {
        if (view.prototyping()) {
            var res = {};
            for (var name in props) {
                res[name] = false;
            }
            return res;
        }
        return {
            dockStyle: selection.parents().every(x => x.props.arrangeStrategy === ArrangeStrategies.Dock)
        };
    },
    getNonRepeatableProps: function () {
        return ["id", "name", "visible", "source"];
    }
});