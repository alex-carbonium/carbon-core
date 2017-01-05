import TypeDefaults from "framework/TypeDefaults";
import Migrations from "migrations/MigrationRegistrar";
import PropertyTracker from "framework/PropertyTracker";
import ObjectCache from "framework/ObjectCache";
import ObjectFactory from "./ObjectFactory";
import PropertyMetadata from "framework/PropertyMetadata";
import Box from "framework/Box";
import Brush from "framework/Brush";
import Shadow from "framework/Shadow";
import Anchor from "framework/Anchor";
import QuadAndLock from "framework/QuadAndLock";
import Font from "framework/Font";
import AnimationGroup from "framework/animation/AnimationGroup";
import ElementPropsChanged from "commands/ElementPropsChanged";
import ElementDelete from "commands/ElementDelete";
import ElementMove from "commands/ElementMove";
import Matrix from "../math/matrix";
import Point from "../math/point";
import {rotatePointByDegree, isRectInRect, areRectsIntersecting} from "../math/math";
import stopwatch from "Stopwatch";
import ResizeDimension from "framework/ResizeDimension";
import {
    Types,
    DockStyle,
    ArrangeStrategies,
    Overflow,
    HorizontalAlignment,
    VerticalAlignment,
    PointDirection
} from "./Defs";
import RotateFramePoint from "decorators/RotateFramePoint";
import ResizeFramePoint from "decorators/ResizeFramePoint";
import DefaultFrameType from "decorators/DefaultFrameType";
import styleManager from "framework/style/StyleManager";
import ModelStateListener from "framework/sync/ModelStateListener";
import NullContainer from "framework/NullContainer";
import Invalidate from "framework/Invalidate";
import Environment from "environment";
import DataNode from "./DataNode";
import {createUUID, deepEquals} from "../util";
import Intl from "../Intl";
import UserSettings from "../UserSettings";
import Rect from "../math/rect";
import LineSegment from "../math/lineSegment";

require("migrations/All");

var fwk = sketch.framework;

fwk.Stroke = Brush;

fwk.DockValues = {left: "Left", top: "Top", bottom: "Bottom", right: "Right", fill: "Fill"};

// constructor
var UIElement = klass(DataNode, {
    __version__: 1, // override version if element properties are changed
    _constructor: function () {
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
    },
    invalidate: function () {
        var parent = this.parent();
        if (parent) {
            parent.invalidate();
        }
    },
    resetRuntimeProps: function () {
        this.runtimeProps = {
            boundaryRectGlobal: null,
            globalViewMatrix: null,
            globalViewMatrixInverted: null,
            globalClippingBox: null,
            primitiveRoot: null,
            snapPoints: null,
        }
    },
    _roundValue(value){
        return Math.round(value);
    },
    prepareProps: function (changes) {
        if (changes.width !== undefined) {
            var maxWidth = this.maxWidth();
            if (maxWidth !== undefined && changes.width > maxWidth) {
                changes.width = maxWidth;
            }
            var minWidth = this.minWidth();
            if (minWidth !== undefined && changes.width < minWidth) {
                changes.width = minWidth;
            }

            changes.width =  this._roundValue(changes.width);
        }
        if (changes.height !== undefined) {
            var maxHeight = this.maxHeight();
            if (maxHeight !== undefined && changes.height > maxHeight) {
                changes.height = maxHeight;
            }
            var minHeight = this.minHeight();
            if (minHeight !== undefined && changes.height < minHeight) {
                changes.height = minHeight;
            }

            changes.height = this._roundValue(changes.height);
        }

        if (changes.x !== undefined) {
            changes.x = this._roundValue(changes.x);
        }

        if (changes.y !== undefined) {
            changes.y = this._roundValue(changes.y);
        }

        if (changes.styleId !== undefined) {
            extend(changes, styleManager.getStyle(changes.styleId, 1).props);
        }
    },

    hasPendingStyle: function () {
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
    },
    setProps: function(props){
        var hasBr = props.hasOwnProperty("br");
        //TODO
        if (hasBr && !(props.br instanceof Rect)){
            debugger;
        }

        if (!hasBr){
            var hasW = props.hasOwnProperty("width");
            var hasH = props.hasOwnProperty("height");
            if (hasW || hasH){
                var br = this.getBoundaryRect();
                var w = hasW ? props.width : br.w;
                var h = hasH ? props.height : br.h;
                props.br = br.withSize(w, h);
            }
        }
        DataNode.prototype.setProps.apply(this, arguments);
    },
    propsUpdated: function (newProps, oldProps) {
        if (newProps.hasOwnProperty("m")
            || newProps.hasOwnProperty("stroke")
            || newProps.hasOwnProperty("br")
        ) {
            this.resetGlobalViewCache();
        }

        //raise events after all caches are updated
        DataNode.prototype.propsUpdated.apply(this, arguments);
        this.invalidate();
    },
    propsPatched: function () {
        DataNode.prototype.propsPatched.apply(this, arguments);
        this.invalidate();
    },

    selectLayoutProps: function(global){
        var m = global ? this.globalViewMatrix() : this.viewMatrix();
        return {
            br: this.br(),
            m
        };
    },
    saveOrResetLayoutProps: function(){
        //this happens only for clones, so no need to clear origLayout
        if (!this.runtimeProps.origLayout){
            this.runtimeProps.origLayout = this.selectLayoutProps();
        }
        else{
            this.setProps(this.runtimeProps.origLayout);
        }
    },

    getTranslation: function(){
        return this.dm().translation;
    },
    applyTranslation: function(t, withReset) {
        if (withReset){
            this.saveOrResetLayoutProps();
        }
        this.applyTransform(Matrix.create().translate(t.x, t.y));
    },
    applyDirectedTranslation: function(t) {
        this.applyTransform(Matrix.create().translate(t.x, t.y), true);
    },

    getRotation: function() {
        return -this.dm().rotation;
    },
    applyRotation: function(angle, o, withReset, mode){
        if (withReset){
            this.saveOrResetLayoutProps();
        }
        this.applyTransform(Matrix.create().rotate(-angle, o.x, o.y), false, mode);
    },
    isRotated: function(){
        return this.getRotation() % 360 !== 0;
    },

    applyScaling: function(s, o, sameDirection, withReset) {
        if (withReset){
            this.saveOrResetLayoutProps();
        }

        if (sameDirection || !this.isRotated()){
            this.applySizeScaling(s, o, sameDirection, withReset);
            return true;
        }

        this.applyMatrixScaling(s, o, sameDirection);
        return false;
    },
    applyMatrixScaling(s, o, sameDirection){
        if (sameDirection){
            var localOrigin = this.viewMatrixInverted().transformPoint(o);
            this.applyTransform(Matrix.create().scale(s.x, s.y, localOrigin.x, localOrigin.y), true);
        }
        else{
            this.applyTransform(Matrix.create().scale(s.x, s.y, o.x, o.y));
        }
    },
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
    applySizeScaling: function(s, o, sameDirection, withReset){
        var br = this.getBoundaryRect();
        var newWidth = br.width * s.x;
        var newHeight = br.height * s.y;

        var localOrigin = this.viewMatrixInverted().transformPoint(o);
        var wx = localOrigin.x === 0 ? 0 : br.width/localOrigin.x;
        var hy = localOrigin.y === 0 ? 0 : br.height/localOrigin.y;
        var newLocalOrigin = new Point(wx === 0 ? 0 : newWidth/wx, hy === 0 ? 0 : newHeight/hy);

        var newOrigin = this.viewMatrix().transformPoint(newLocalOrigin);
        var offset = o.subtract(newOrigin);
        var fx = s.x < 0 ? -1 : 1;
        var fy = s.y < 0 ? -1 : 1;

        var newProps = {
            br: new Rect(Math.abs(br.x * s.x), Math.abs(br.y * s.y), Math.abs(newWidth), Math.abs(newHeight))
        };

        if (fx === -1 || fy === -1 || !offset.equals(Point.Zero)){
            var matrix = this.viewMatrix();
            if (fx === -1 || fy === -1){
                matrix = matrix.appended(Matrix.create().scale(fx, fy));
            }
            newProps.m = matrix.prepended(Matrix.create().translate(offset.x, offset.y));
        }

        this.prepareAndSetProps(newProps);
    },

    applyTransform: function(matrix, append, mode) {
        this.prepareAndSetProps({m: append ? this.props.m.appended(matrix) : this.props.m.prepended(matrix)}, mode);
    },
    setTransform: function(matrix, mode) {
        this.setProps({m: matrix}, mode);
    },
    resetTransform: function() {
        this.setProps({m: Matrix.Identity});
    },

    arrange: function () {
    },
    performArrange: function (oldRect) {
    },
    _init: function () {

    },
    // updateStyle: function () {
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
    dragTo: function (event) {
        this.position(event);
    },
    // lastDrawnRect: function (value) {
    //     if (arguments.length !== 0) {
    //         this._lastDrawnRect = value;
    //     }
    //
    //     return this._lastDrawnRect;
    // },
    draggingEnter: function (event) {
    },
    draggingLeft: function (event) {
    },
    getDropData: function (event) {
        return null;
    },
    startResizing: function () {
        Environment.controller.startResizingEvent.raise();
    },
    stopResizing: function () {
        Environment.controller.stopResizingEvent.raise();
    },
    getSnapPoints: function (local) {
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

        var angle = this.angle();

        if (angle) {
            var p1 = sketch.math2d.rotatePoint({x: x, y: y}, angle * Math.PI / 180, origin);
            var p2 = sketch.math2d.rotatePoint({x: x + width, y: y}, angle * Math.PI / 180, origin);
            var p3 = sketch.math2d.rotatePoint({
                x: x + width,
                y: y + height
            }, angle * Math.PI / 180, origin);
            var p4 = sketch.math2d.rotatePoint({x: x, y: y + height}, angle * Math.PI / 180, origin);

            return this.runtimeProps.snapPoints = {
                xs: [~~p1.x, ~~p2.x, ~~p3.x, ~~p4.x],
                ys: [~~p1.y, ~~p2.y, ~~p3.y, ~~p4.y],
                center: {x: ~~(origin.x), y: ~~(origin.y)}
            };
        } else {
            return this.runtimeProps.snapPoints = {
                xs: [x, x + width],
                ys: [y, y + height],
                center: {x: ~~(origin.x), y: ~~(origin.y)}
            };
        }
    },
    position: function (pos) {
        if (arguments.length === 0) {
            return new Point(this.x(), this.y());
        }
        this.prepareAndSetProps(pos);
    },
    centerPositionGlobal: function () {
        var rect = this.getBoundaryRectGlobal();
        return {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2};
    },
    addDecorator: function (decorator) {
        if (!this.decorators) {
            this.decorators = [];
        }
        if (this.decorators.indexOf(decorator) === -1) {
            this.decorators.push(decorator);
            decorator.attach(this);
            Invalidate.requestUpperOnly();
        }
    },
    removeDecorator: function (decorator) {
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
    },
    removeAllDecorators: function(){
        var decorators = this.decorators;
        if (decorators){
            decorators.forEach(x => x.detach());
            this.decorators = [];
            Invalidate.requestUpperOnly();
        }
        return decorators;
    },
    removeDecoratorByType: function (type) {
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
    },
    removed: function () {

    },
    removing: function () {

    },
    autoSelectOnPaste: function () {
        return true;
    },

    getBoundaryRect: function (includeMargin = false) {
        var br = this.props.br;
        if (!includeMargin || this.margin() === Box.Default){
            return br;
        }
        var margin = this.margin();
        return new Rect(br.x - margin.left, br.y - margin.top, br.width + margin.left + margin.right, br.height + margin.top + margin.bottom);
    },
    size: function () {
        return {
            width: this.width(),
            height: this.height()
        }
    },
    getBoundaryRectGlobal: function (includeMargin = false) {
        return this.getBoundingBoxGlobal(includeMargin);
    },

    getBoundingBox: function (includeMargin = false) {
        var rect = this.getBoundaryRect(includeMargin);
        return this.transformRect(rect, this.viewMatrix());
    },
    getBoundingBoxGlobal: function (includeMargin = false) {
        if (this.runtimeProps.globalClippingBox) {
            return this.runtimeProps.globalClippingBox;
        }

        var rect = this.getBoundaryRect(includeMargin);
        var bb = this.transformRect(rect, this.globalViewMatrix());
        this.runtimeProps.globalClippingBox = bb;
        return bb;
    },
    transformRect: function(rect, matrix){
        if (matrix.isTranslatedOnly()){
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
    },

    getMaxOuterBorder: function () {
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
    },
    expandRectWithBorder: function(rect){
        var border = this.getMaxOuterBorder();
        if (border !== 0){
            return rect.expand(border);
        }
        return rect;
    },
    getHitTestBox: function (scale, includeMargin = false, includeBorder = true) {
        var rect = this.getBoundaryRect(includeMargin);
        var goodScaleW = rect.width * scale > 10;
        var goodScaleH = rect.height * scale > 10;
        if (!includeBorder && goodScaleW && goodScaleW){
            return rect;
        }

        var border = this.getMaxOuterBorder();
        if (border === 0 && goodScaleW && goodScaleH){
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
    },

    hitTest: function (/*Point*/point, scale, includeMargin = false) {
        if (!this.visible()) {
            return false;
        }
        var rect = this.getHitTestBox(scale, includeMargin);

        var matrix = this.globalViewMatrixInverted();
        point = matrix.transformPoint(point);

        return point.x >= rect.x && point.x < rect.x + rect.width && point.y >= rect.y && point.y < rect.y + rect.height;
    },
    hitTestGlobalRect: function(rect){
        if (!this.hitVisible()) {
            return false;
        }

        var bb = this.getBoundingBoxGlobal();
        if (!areRectsIntersecting(bb, rect)){
            return false;
        }

        var m = this.globalViewMatrix();
        if (m.isTranslatedOnly()){
            return true;
        }

        if (isRectInRect(bb, rect)){
            return true;
        }

        var br = this.getBoundaryRect();
        var segments1 = m.transformRect(br);
        var segments2 = rect.segments();

        for (var i = 0; i < segments1.length; i++){
            var s1 = segments1[i];
            for (var j = 0; j < segments2.length; j++){
                var s2 = segments2[j];
                if (s1.intersects(s2)){
                    return true;
                }
            }
        }
        return false;
    },
    // pageLink: function (value) {
    //     var action = this.action();
    //     if (action.type === 0/*PageLink*/) {
    //         return action.pageId;
    //     }
    //     return null;
    // },

    resetGlobalViewCache: function (resetPrimitiveRoot = false) {
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
    },
    viewMatrix: function () {
        return this.props.m;
    },
    dm: function () {
        if (!this.runtimeProps.dm){
            this.runtimeProps.dm = this.props.m.decompose();
        }
        return this.runtimeProps.dm;
    },
    viewMatrixInverted: function () {
        if (!this.runtimeProps.viewMatrixInverted){
            this.runtimeProps.viewMatrixInverted = this.viewMatrix().clone().invert();
        }
        return this.runtimeProps.viewMatrixInverted;
    },
    shouldApplyViewMatrix: function(){
        return true;
    },
    applyViewMatrix: function(context){
        if (this.shouldApplyViewMatrix()){
            this.globalViewMatrix().applyToContext(context);
        }
    },
    draw: function (context, environment) {
        this.stopwatch.start();

        var w = this.width(),
            h = this.height();

        context.save();
        context.globalAlpha = context.globalAlpha * this.opacity();

        this.applyViewMatrix(context, environment);

        this.drawSelf(context, w, h, environment);

        context.restore();

        this.drawDecorators(context, w, h, environment);

        //console.log(this.displayName() + " : " + this.stopwatch.getElapsedTime());
    },
    drawSelf: function (context, w, h) {

    },
    drawDecorators: function(context, w, h, environment){
        if (this.decorators) {
            context.save();
            for (var i = 0, j = this.decorators.length; i < j; ++i) {
                this.decorators[i].draw(context, w, h, environment);
            }
            context.restore();
        }
    },
    drawBoundaryPath: function(context, matrix){
        var r = this.getBoundaryRect();

        context.beginPath();

        var p = matrix.transformPoint2(r.x, r.y, true);
        context.moveTo(p.x, p.y);

        p = matrix.transformPoint2(r.x + r.width, r.y, true);
        context.lineTo(p.x, p.y);

        p = matrix.transformPoint2(r.x + r.width, r.y + r.height, true);
        context.lineTo(p.x, p.y);

        p = matrix.transformPoint2(r.x, r.y + r.height, true);
        context.lineTo(p.x, p.y);

        context.closePath();
    },
    primitiveRoot: function () {
        if (this.runtimeProps.primitiveRoot) {
            return this.runtimeProps.primitiveRoot;
        }
        var parent = this.parent();
        var root = parent ? parent.primitiveRoot() : null;
        this.runtimeProps.primitiveRoot = root;
        return root;
    },
    primitivePath: function () {
        var path = this.primitiveRoot().primitivePath().slice();
        path[path.length - 1] = this.id();
        return path;
    },
    createDragClone: function (element) {
        return element.clone();
    },
    globalViewMatrix: function () {
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
        this.onGlobalViewMatrixUpdated(this.runtimeProps.globalViewMatrix);

        return this.runtimeProps.globalViewMatrix;
    },
    onGlobalViewMatrixUpdated: function(matrix){

    },
    globalViewMatrixInverted: function () {
        if (!this.runtimeProps.globalViewMatrixInverted) {
            this.runtimeProps.globalViewMatrixInverted = this.globalViewMatrix().clone().invert()
        }

        return this.runtimeProps.globalViewMatrixInverted;
    },
    trackPropertyState: function (name) {
        return null;
    },
    clip: function (context, l, t, w, h) {
        if (this.clipSelf()) {
            context.rectPath(l, t, w, h);
            context.clip();
        }
    },
    mousemove: function (event) {
        if (this.editor != null) {
            event.handled = true;
        }
    },
    mouseup: function (event) {
    },
    mousedown: function (event) {
    },
    dblclick: function (event) {
    },
    click: function (event) {
    },
    // mouseLeaveElement: function (event) {
    // },
    // mouseEnterElement: function (event) {
    // },
    // defaultAction: function (event) {
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
    setDefaultAction: function (defaultAction) {
        this._defaultAction = defaultAction;
    },
    select: function (multiSelect, view) {

    },
    unselect: function () {
    },
    captureMouse: function () {
        Environment.controller.captureMouse(this);
    },
    releaseMouse: function () {
        Environment.controller.releaseMouse(this);
    },
    canMultiSelect: function () {
        return true;
    },
    canAlign: function () {
        return true;
    },
    canGroup: function () {
        return true;
    },
    canChangeOrder: function () {
        return true;
    },
    zOrder: function () {
        if (arguments.length > 0) {
            throw "zOrder is readonly";
        }
        var parent = this.parent();
        if (!parent || parent === NullContainer) {
            return null;
        }

        return parent.children.indexOf(this);
    },
    x: function (/*int*/value) {
        if (value !== undefined) {
            this.setProps({x: value});
        }
        return this.props.x;
    },
    y: function (/*set*/value) {
        if (value !== undefined) {
            this.setProps({y: value});
        }
        return this.props.y;
    },
    width: function (value) {
        if (value !== undefined) {
            this.setProps({width: value});
        }
        return this.br().width;
    },
    height: function (value) {
        if (value !== undefined) {
            this.setProps({height: value});
        }
        return this.br().height;
    },
    br: function (value) {
        if (value !== undefined) {
            this.setProps({br: value});
        }
        return this.props.br;
    },
    right: function () {
        return this.x() + this.width();
    },
    bottom: function () {
        return this.y() + this.height();
    },
    outerHeight: function () {
        var margin = this.margin();
        return this.height() + margin.top + margin.bottom;
    },
    outerWidth: function () {
        var margin = this.margin();
        return this.width() + margin.left + margin.right;
    },
    locked: function (value) {
        if (value !== undefined) {
            this.setProps({locked: value});
        }
        return this.props.locked;
    },
    clipDragClone: function (value) {
        return this.field("_clipDragClone", value, false);
    },
    isTemporary: function (value) {
        return this.field("_isTemporary", value, false);
    },
    hitVisible: function (directSelection) {
        if (this.locked() || !this.visible()){
            return false;
        }
        var parent = this.parent();
        if (!parent){
            return false;
        }
        if (directSelection){
            return true;
        }
        return !parent.lockedGroup() || parent.activeGroup();
    },
    hitTransparent: function () {
        return false;
    },
    canSelect: function (value) {
        return this.field("_canSelect", value, true);
    },
    visible: function (value) {
        if (value !== undefined) {
            this.setProps({visible: value});
        }
        return this.props.visible;
    },
    autoPosition: function (value) {
        return this.field("_autoPosition", value, fwk.UIElement.FieldMetadata.autoPosition.defaultValue);
    },
    allowSnapping: function (value) {
        return this.field("_allowSnapping", value, true);
    },
    tags: function (value) {
        return this.field("_tags", value, fwk.UIElement.FieldMetadata["tags"].defaultValue);
    },
    crazySupported: function (value) {
        return this.field("_crazySupported", value, true);
    },
    customScale: function (value) {
        var res = this.field("_customScale", value, false);
        if (value !== undefined) {
            this.resetGlobalViewCache();
        }

        return res;
    },
    fill: function (value) {
        if (value !== undefined) {
            this.setProps({fill: value});
        }
        return this.props.fill;
    },
    stroke: function (value) {
        if (value !== undefined) {
            this.setProps({stroke: value});
        }
        return this.props.stroke;
    },
    dashPattern: function (value) {
        if (value !== undefined) {
            this.setProps({dashPattern: value});
        }
        return this.props.dashPattern;
    },
    selectFrameVisible: function () {
        return true;
    },
    field: function (name, value, defaultValue) {
        if (value !== undefined) {
            this[name] = value;
        }
        var res = this[name];
        return res !== undefined ? res : defaultValue;
    },
    clipSelf: function (/*bool*/value) {
        if (value !== undefined) {
            this.setProps({overflow: Overflow.Clip});
        }
        return this.props.overflow === Overflow.Clip;
    },
    overflow: function (value) {
        if (value !== undefined) {
            this.setProps({overflow: value});
        }
        return this.props.overflow;
    },
    parent: function (/*UIElement*/value) {
        if (value !== undefined) {
            this._parent = value;
            this.resetGlobalViewCache(true);
        }
        return this._parent;
    },
    opacity: function (/*double*/value) {
        if (value !== undefined) {
            this.setProps({opacity: value});
        }
        return this.props.opacity;
    },
    angle: function (/*double*/value) {
        if (value !== undefined) {
            this.setProps({angle: value});
        }
        return this.props.angle;
    },
    shadow: function (/*double*/value) {
        if (value !== undefined) {
            this.setProps({shadow: value});
        }
        return this.props.shadow;
    },
    minWidth: function (/*Number*/value) {
        if (value !== undefined) {
            this.setProps({minWidth: value});
        }
        return this.props.minWidth;
    },
    minHeight: function (/*Number*/value) {
        if (value !== undefined) {
            this.setProps({minHeight: value});
        }
        return this.props.minHeight;
    },
    maxWidth: function (/*Number*/value) {
        if (value !== undefined) {
            this.setProps({maxWidth: value});
        }
        return this.props.maxWidth;
    },
    maxHeight: function (/*Number*/value) {
        if (value !== undefined) {
            this.setProps({maxHeight: value});
        }
        return this.props.maxHeight;
    },
    canDrag: function (value) {
        return this.field("_canDrag", value, true);
    },
    flipVertical: function (value) {
        if (value !== undefined) {
            this.setProps({flipVertical: value});
        }
        return this.props.flipVertical;
    },
    flipHorizontal: function (value) {
        if (value !== undefined) {
            this.setProps({flipHorizontal: value});
        }
        return this.props.flipHorizontal;
    },
    clipMask: function (/*bool*/value) {
        if (value !== undefined) {
            this.setProps({clipMask: value});
        }
        return this.props.clipMask;
    },

    scalableX: function (value) {
        return this.field("_scalableX", value, true);
    },
    scalableY: function (value) {
        return this.field("_scalableY", value, true);
    },
    isDropSupported: function (value) {
        return true;
    },
    showResizeHint: function () {
        return true;
    },
    showDropTarget: function () {
        return true;
    },
    activeInPreview: function (value) {
        return this.field("_activeInPreview", value, false);
    },
    cloneWhenDragging: function () {
        return true;
    },
    visibleWhenDrag: function (value) {
        if (value !== undefined) {
            this.setProps({visibleWhenDrag: value});
        }
        return this.props.visibleWhenDrag;
    },
    standardBackground: function (value) {
        return this.field("_standardBackground", value, true);
    },
    name: function (value) {
        if (value !== undefined) {
            this.setProps({name: value});
        }
        return this.props.name;
    },
    anchor: function (value) {
        if (value !== undefined) {
            this.setProps({anchor: value});
        }
        return this.props.anchor;
    },
    resize: function (props) {
        this.prepareAndSetProps(props);
    },
    initialResize: function (parent) {
        switch (this.autoPosition()) {
            case "top":
            case "bottom":
            case "middle":
            case "fill":
                this.width(parent.width());
                break;
        }
    },
    getType: function () {
        return "UIElement";
    },
    getDescription: function () {
        return _(this.t);
    },
    applyVisitor: function (/*Visitor*/callback) {
        return callback(this);
    },
    canAccept: function (elements, autoInsert) {
        return false;
    },
    canBeAccepted: function (element) {
        return true;
    },
    canConvertToPath: function () {
        return false;
    },
    sizeProperties: function () {
        return {
            width: this.props.width,
            height: this.props.height
        };
    },
    onLayerDraw: function (layer, context) {

    },
    registerForLayerDraw: function (layerNum) {
        var parent = this.parent();
        if (parent) {
            parent.registerForLayerDraw(layerNum, this);
        }
    },
    unregisterForLayerDraw: function (layerNum) {
        var parent = this.parent();
        if (parent) {
            parent.unregisterForLayerDraw(layerNum, this);
        }
    },
    margin: function (value) {
        if (value !== undefined) {
            this.setProps({margin: value});
        }
        return this.props.margin;
    },

    isDescendantOrSame: function (element) {
        var current = this;
        do {
            if (current.isSameAs(element)) {
                return true;
            }
            current = current.parent();
        } while (current && current !== NullContainer);

        return false;
    },
    isSameAs: function (element) {
        return element === this;
    },
    horizontalAlignment: function (value) {
        if (value !== undefined) {
            this.setProps({horizontalAlignment: value});
        }
        return this.props.horizontalAlignment;
    },
    verticalAlignment: function (value) {
        if (value !== undefined) {
            this.setProps({verticalAlignment: value});
        }
        return this.props.verticalAlignment;
    },
    dockStyle: function (value) {
        if (value !== undefined) {
            this.setProps({dockStyle: value});
        }
        return this.props.dockStyle;
    },
    index: function () {
        return this.parent().children.indexOf(this);
    },
    each: function (callback) {
        each([this], callback);
    },
    cloneProps: function () {
        return Object.assign({}, this.props);
    },
    clone: function () {
        var clone = ObjectFactory.fromType(this.t, this.cloneProps());
        clone.id(createUUID());
        return clone;
    },
    mirrorClone: function () {
        var clone = ObjectFactory.fromType(this.t, this.cloneProps());
        return clone;
    },
    cursor: function () {
        return null;
    },
    resizeDimensions: function (value) {
        if (value) {
            value = +value; // convert from string, to make it work with property editor
        }
        return this.field("_resizeDimensions", value, ResizeDimension.Both);
    },
    init: function (values, isDefault, selector) {
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
    },
    fromJSON: function (data) {
        //TODO: bring back migrations when necessary
        // if (data.props.version !== this.__version__) {
        //     if (!Migrations.runMigrations(this.t, data, this.__version__)) {
        //         throw "Migration not successful: " + this.t + " from " + data.props.version + " to " + this.__version__;
        //     }
        //     App.Current.migrationUpgradeNotifications.push(this);
        // }
        this.__state = 1;

        DataNode.prototype.fromJSON.apply(this, arguments);

        delete this.__state;
        return this;
    },
    getEditableProperties: function (recursive) {
        return PropertyMetadata.getEditableProperties(this.systemType(), recursive);
    },
    displayName: function () {
        return this.name() || this.displayType();
    },
    displayType: function () {
        return "type." + this.t;
    },
    systemType: function () {
        return this.t;
    },
    findPropertyMetadata: function (propName) {
        return PropertyMetadata.find(this.systemType(), propName);
    },
    quickEditProperty: function (value) {
        return this.field("_quickEditProperty", value, "");
    },
    toString: function () {
        return this.t;
    },
    getPath: function () {
        var path = [this];
        var e = this;
        while (typeof e.parent === "function" && e.parent()) {
            path.push(e.parent());
            e = e.parent();
        }
        return this.id() + ': ' + map(path.reverse(), function (x) {
                return x.t;
            }).join("->");
    },

    dispose: function () {
        if (this._isDisposed) {
            return;
        }
        //this.onresize.clearSubscribers();
        //delete this.onresize;

        delete this.props;

        this._isDisposed = true;
    },
    isDisposed: function () {
        return this._isDisposed;
    },
    rotationOrigin: function (global) {
        return this.center(global);
    },
    center: function (global) {
        var m = global ? this.globalViewMatrix() : this.viewMatrix();
        return m.transformPoint(this.br().center());
    },
    hitElement: function (position, scale, predicate) {
        if (this.hitVisible()) {

            predicate = predicate || this.hitTest;
            if (predicate.call(this, position, scale)) {
                return this;
            }
        }

        return null;
    },
    isAncestor: function (element) {
        var parent = this.parent();
        while (parent) {
            if (parent === element) {
                return true;
            }

            parent = parent.parent();
        }

        return false;
    },
    isOrphaned: function () {
        return this.parent() === NullContainer;
    },
    canBeRemoved: function () {
        return true;
    },

    page: function () {
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
    },

    getTags: function () {
        var tags = this.tags();
        if (tags) {
            return tags.split(",");
        }
        return [];
    },
    hasTag: function (tag) {
        var tags = this.getTags();
        return sketch.util.contains(tags, tag);
    },
    addTag: function (tag) {
        var tags = this.getTags();
        if (!sketch.util.contains(tags, tag)) {
            tags.push(tag);
            this.tags(tags.join(","));
        }
        return this;
    },
    contextMenu: function (context, menu) {

    },
    constructMoveCommand: function (newParent, newIndex) {
        return new ElementMove(this, newParent, newIndex);
    },
    constructPropsChangedCommand: function (newProps, oldProps) {
        return new ElementPropsChanged(this, newProps, oldProps);
    },
    constructDeleteCommand: function () {
        return new ElementDelete(this);
    },
    move: function (rect) {
        this.resize(rect);
    },
    exportPatch: function () {
    },
    applyPatch: function (data) {
    },
    selectionFrameType: function () {
        return DefaultFrameType;
    },
    iconType: function () {
        return this.props.iconType || 'rectangle';
    },
    createSelectionFrame: function (view) {
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
    },
    getPropsDiff: function (other, oldProps) {
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
    },
    prepareMoveByDelta: function (changes, dx, dy, width, height) {
        var origin = this.rotationOrigin();
        var newOrigin = rotatePointByDegree({
            x: origin.x + dx / 2,
            y: origin.y + dy / 2
        }, -this.angle(), origin);

        changes.x = newOrigin.x - width / 2;
        changes.y = newOrigin.y - height / 2;
    },
    // returns deffered object
    animate: function (properties, duration, options, progressCallback) {
        var animationValues = [];
        options = extend({}, options);
        options.duration = duration || 0;
        var that = this;
        for (var propName in properties) {
            var newValue = properties[propName];
            var accessor = (function (name) {
                return function prop_accessor(value) {
                    if (arguments.length > 0) {
                        that.setProps({[name]: value});
                    }
                    return that.props[name];
                }
            })(propName);

            var currentValue = accessor();

            animationValues.push({from: currentValue, to: newValue, accessor: accessor});
        }

        var group = new AnimationGroup(animationValues, options, progressCallback);
        Environment.view.animationController.registerAnimationGroup(group);

        return group.promise();
    },

    styleId: function (value) {
        if (arguments.length > 0) {
            this.setProps({styleId: value});
        }

        return this.props.styleId;
    },

    getStyleProps: function () {
        var stylePropNames = PropertyMetadata.getStylePropertyNamesMap(this.systemType(), 1);
        var res = {};
        for (var name in stylePropNames) {
            res[name] = sketch.util.flattenObject(this.props[name]);
        }
        return res;
    },

    beforeAddFromToolbox: function () {

    },
    afterAddFromToolbox: function () {

    },

    propertyMetadata: function () {
        return PropertyMetadata.findAll(this.t);
    },

    toSVG: function () {
        var ctx = new C2S(this.width(), this.height());
        this.draw(ctx);
        return ctx.getSerializedSvg();
    }
});

fwk.UIElement = UIElement;

fwk.UIElement.fromTypeString = function (type, parameters) {
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

fwk.UIElement.construct = function () {
    return ObjectFactory.construct.apply(ObjectFactory, arguments);
};

fwk.UIElement.fromType = function (type, parameters) {
    return ObjectFactory.fromType(type, parameters);
};

fwk.UIElement.fromJSON = function (data) {
    return ObjectFactory.fromJSON(data);
};

fwk.UIElement.prototype.t = Types.Element;
fwk.UIElement.prototype.defaultSize = {width: 100, height: 100};


fwk.UIElement.FieldMetadata = {
    autoPosition: {
        defaultValue: "center",
        possibleValues: {
            center: "Center",
            top: "Top",
            bottom: "Bottom",
            parent: "Parent",
            fill: "Fill",
            middle: "Middle"
        },
        displayName: "Auto position"
    },
    resizeDimensions: {
        defaultValue: ResizeDimension.Both,
        possibleValues: {
            "0": "None",
            "1": "Vertical",
            "2": "Horizontal",
            "3": "Both"
        },
        displayName: "Resize dimensions"
    },
    allowSnapping: {
        defaultValue: true,
        displayName: "Allow snapping"
    },
    tags: {
        defaultValue: "Primitive",
        displayName: "Tags"
    }
};

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
                {name: "Left", value: DockStyle.Left},
                {name: "Top", value: DockStyle.Top},
                {name: "Right", value: DockStyle.Right},
                {name: "Bottom", value: DockStyle.Bottom},
                {name: "Fill", value: DockStyle.Fill},
                {name: "None", value: DockStyle.None}
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
                {name: "Left", value: HorizontalAlignment.Left},
                {name: "Right", value: HorizontalAlignment.Right},
                {name: "Stretch", value: HorizontalAlignment.Stretch},
                {name: "Center", value: HorizontalAlignment.Center},
                {name: "None", value: HorizontalAlignment.None}
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
                {name: "Top", value: VerticalAlignment.Top},
                {name: "Bottom", value: VerticalAlignment.Bottom},
                {name: "Stretch", value: VerticalAlignment.Stretch},
                {name: "Middle", value: VerticalAlignment.Middle},
                {name: "None", value: VerticalAlignment.None}
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
        useInModel: true,
        editable: true,
        defaultValue: 0
    },
    height: {
        displayName: "Height",
        type: "numeric",
        useInModel: true,
        editable: true,
        defaultValue: 0
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
        useInModel: true,
        editable: true,
        defaultValue: 0
    },
    y: {
        displayName: "Top",
        type: "numeric",
        useInModel: true,
        editable: true,
        defaultValue: 0
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
        defaultValue: 0,
        options: {
            size: 1 / 4,
            min: -360,
            max: 360
        },
        customizable: true
    },
    shadow: {
        displayName: "Shadow",
        useInModel: true,
        defaultValue: Shadow.None
    },
    flipHorizontal: {
        defaultValue: false
    },
    flipVertical: {
        defaultValue: false
    },
    anchor: {
        displayName: "Pin to edge",
        type: "multiToggle",
        useInModel: true,
        editable: false,
        defaultValue: fwk.Anchor.Default,
        options: {
            items: [
                {field: "left", icon: "ico-prop_pin-left"},
                {field: "top", icon: "ico-prop_pin-top"},
                {field: "right", icon: "ico-prop_pin-right"},
                {field: "bottom", icon: "ico-prop_pin-bottom"}
            ],
            size: 3 / 4
        }
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
        displayName: "Dash pattern",
        type: "dashPattern",
        defaultValue: null,
        style: 1,
        customizable: true
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
                label: "Colors",
                properties: ["fill", "stroke"],
                hidden: true
            },
            {
                label: "Style",
                properties: ["styleId", "opacity"]
            },
            {
                label: "Appearance",
                properties: ["visible", "cornerRadius", "clipMask"]
            },
            {
                label: "Layout",
                properties: ["width", "height", "x", "y", "anchor", "angle", "dockStyle", "horizontalAlignment", "verticalAlignment"]
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

export default fwk.UIElement;
