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
import Matrix from "math/matrix";
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
            viewMatrix: new Matrix(),
            boundaryRectGlobal: null,
            globalViewMatrix: null,
            globalViewMatrixInverted: null,
            globalClippingBox: null,
            primitiveRoot: null,
            snapPoints: null
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
    propsUpdated: function (newProps, oldProps) {
        if (newProps.flipVertical !== undefined
            || newProps.flipHorizontal !== undefined
            || newProps.angle !== undefined
            || newProps.x !== undefined
            || newProps.y !== undefined
            || (newProps.stroke !== undefined)
        ) {
            this.updateViewMatrix();
        }
        else if (newProps.width !== undefined || newProps.height !== undefined) {
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
    arrange: function () {
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
    startDrag: function (event) {

    },
    stopDrag: function (event) {

    },
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
    dropOn: function (event) {
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
            return {x: this.x(), y: this.y()};
        }
        this.prepareProps(pos);
        this.setProps(pos);
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
    //TODO: fix non-scalable elements, they do not work properly anyway
    getBoundaryRect: function (includeMargin = false) {
        var margin = includeMargin ? this.margin() : Box.Default;
        return {
            x: this.x() - margin.left,
            y: this.y() - margin.top,
            width: this.width() + margin.left + margin.right,
            height: this.height() + margin.top + margin.bottom
        };
    },
    size: function () {
        return {
            width: this.width(),
            height: this.height()
        }
    },
    getBoundaryRectGlobal: function (includeMargin = false) {
        if (this.runtimeProps.boundaryRectGlobal) {
            return this.runtimeProps.boundaryRectGlobal;
        }
        var rect = this.getBoundaryRect(includeMargin);
        var parent = this.parent();
        if (parent == null) {
            return rect;
        }

        var globalPos = parent.local2global(rect);

        rect.x = globalPos.x;
        rect.y = globalPos.y;

        this.runtimeProps.boundaryRectGlobal = Object.freeze(rect);

        return rect;
    },

    getBoundingBox: function (includeMargin = false) {
        if (!this.angle()) {
            return this.getBoundaryRect(includeMargin);
        }

        var width = this.width() || 0;
        var height = this.height() || 0;
        var matrix = this.viewMatrix();
        var margin = includeMargin ? this.margin() : Box.Default;

        var p1 = matrix.transformPoint2(0 - margin.left, 0 - margin.top);
        var p2 = matrix.transformPoint2(width + margin.right, 0 - margin.top);
        var p3 = matrix.transformPoint2(width + margin.right, height + margin.bottom);
        var p4 = matrix.transformPoint2(0 - margin.left, height + margin.bottom);

        var xs = [p1.x, p2.x, p3.x, p4.x];
        var ys = [p1.y, p2.y, p3.y, p4.y];
        var l = sketch.util.min(xs);
        var r = sketch.util.max(xs);
        var t = sketch.util.min(ys);
        var b = sketch.util.max(ys);

        var rect = {x: l, y: t, width: r - l, height: b - t};
        return rect;
    },
    getBoundingBoxGlobal: function (includeMargin = false, includeBorder = false) {
        if (this.runtimeProps.globalClippingBox) {
            return this.runtimeProps.globalClippingBox;
        }

        var margin = includeMargin ? this.margin() : Box.Default;
        var border = includeBorder ? this.getMaxOuterBorder() : 0;
        var l = 0;
        var r = 0;
        var t = 0;
        var b = 0;
        if (includeMargin || includeBorder) {
            l = Math.max(margin.left, border);
            t = Math.max(margin.top, border);
            r = Math.max(margin.right, border);
            b = Math.max(margin.bottom, border);
        }

        var width = this.width() || 0;
        var height = this.height() || 0;
        var matrix = this.globalViewMatrix();


        var p1 = matrix.transformPoint2(-l, -t);
        var p2 = matrix.transformPoint2(width + r, -t);
        var p3 = matrix.transformPoint2(width + r, height + b);
        var p4 = matrix.transformPoint2(-l, height + b);

        var xs = [p1.x, p2.x, p3.x, p4.x];
        var ys = [p1.y, p2.y, p3.y, p4.y];
        l = sketch.util.min(xs);
        r = sketch.util.max(xs);
        t = sketch.util.min(ys);
        b = sketch.util.max(ys);

        var rect = {x: l, y: t, width: r - l, height: b - t};
        this.runtimeProps.globalClippingBox = rect;
        return rect;
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
    getHitTestBox: function (scale, includeMargin = false, includeBorder = true) {
        var width = this.width(),
            height = this.height();
        var x = 0,
            y = 0;

        var border = includeBorder ? this.getMaxOuterBorder() : 0;
        var l = border;
        var t = border;
        var r = border;
        var b = border;

        if (includeMargin) {
            var margin = this.margin();
            l = Math.max(margin.left, border);
            t = Math.max(margin.top, border);
            r = Math.max(margin.right, border);
            b = Math.max(margin.bottom, border);
        }

        width += l + r;
        height += t + b;
        x = -l;
        y = -t;

        if (width < 0) {
            width = -width;
        }

        if (height < 0) {
            height = -height;
        }

        if (width * scale < 10) {
            x = -5;
            width += 10;
        }
        if (height * scale < 10) {
            y = -5;
            height += 10;
        }
        return {x: x, y: y, width: width, height: height};
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
    // pageLink: function (value) {
    //     var action = this.action();
    //     if (action.type === 0/*PageLink*/) {
    //         return action.pageId;
    //     }
    //     return null;
    // },
    updateViewMatrix: function () {
        var matrix = new Matrix();
        var sw = 1;
        if (this.flipHorizontal()) {
            sw = -1;
        }

        var sh = 1;
        if (this.flipVertical()) {
            sh = -1;
        }
        var x = this.x(),
            y = this.y();
        var origin = this.rotationOrigin();
        matrix.rotate(this.angle(), origin.x, origin.y);

        matrix.scale(sw, sh, origin.x, origin.y);

        matrix.translate(x, y);

        this.setViewMatrix(Object.freeze(matrix));
        this.resetGlobalViewCache();
    },
    setViewMatrix: function (matrix) {
        this.runtimeProps.viewMatrix = matrix;
    },
    resetGlobalViewCache: function (resetPrimitiveRoot = false) {
        delete this.runtimeProps.boundaryRectGlobal;
        delete this.runtimeProps.globalViewMatrix;
        delete this.runtimeProps.globalViewMatrixInverted;
        delete this.runtimeProps.globalClippingBox;
        delete this.runtimeProps.snapPoints;
        //primitive root should be changed only when changing parent, it is needed for repeater clones
        if (resetPrimitiveRoot) {
            delete this.runtimeProps.primitiveRoot;
        }
    },
    viewMatrix: function () {
        return this.runtimeProps.viewMatrix;
    },
    draw: function (context, environment) {
        this.stopwatch.start();

        var x = this.x(),
            y = this.y(),
            w = this.width(),
            h = this.height();

        context.save();
        context.globalAlpha = context.globalAlpha * this.opacity();

        // Math.seedrandom(this._seedNumber);
        // if (!this.crazySupported()) {
        //     fwk.CrazyScope.push(false);
        // }

        var customScale = this.customScale();

        var scaleX, scaleY;
        scaleX = scaleY = environment.view.scale();
        if (customScale) {
            scaleX = 1 / customScale.x;
        }
        else if (this.scalableX()) {
            scaleX = 1;
        }
        if (customScale) {
            scaleY = 1 / customScale.y;
        }
        else if (this.scalableY()) {
            scaleY = 1;
        }

        if (scaleX !== 1 || scaleY !== 1) {
            context.scale(1 / scaleX, 1 / scaleY);
            context.translate(x * (scaleX - 1), y * (scaleY - 1));
        }

        this.viewMatrix().applyToContext(context);

        this.clip(context, 0, 0, w, h);

        this.drawSelf(context, w, h, environment);
        context.restore();

        if (this.decorators) {
            context.save();
            for (var i = 0, j = this.decorators.length; i < j; ++i) {
                this.decorators[i].draw(context, w, h, environment);
            }
            context.restore();
        }

        // if (!this.crazySupported()) {
        //     fwk.CrazyScope.pop();
        // }

        //console.log(this.displayName() + " : " + this.stopwatch.getElapsedTime());
    },
    drawSelf: function (context, w, h, environment) {
        context.save();
        context.rectPath(0, 0, w, h, true);
        fwk.Brush.fill(this.fill(), context, 0, 0, w, h);
        var dash = this.dashPattern();
        if (dash) {
            context.setLineDash(dash);
        }
        fwk.Brush.stroke(this.stroke(), context, 0, 0, w, h);
        context.restore();
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

        return matrix;
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
    mouseLeaveElement: function (event) {
    },
    mouseEnterElement: function (event) {
    },
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
        return this.props.width;
    },
    height: function (value) {
        if (value !== undefined) {
            this.setProps({height: value});
        }
        return this.props.height;
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
    hitVisible: function (/*bool*/value) {
        if (arguments.length === 0) {
            var hitVisibleSelf = this.field("_hitVisible", value, true);
            var parent = this.parent();
            return parent != null && hitVisibleSelf && !parent.lockedGroup() && !this.locked() && this.visible();
        }
        return this.field("_hitVisible", value);
    },
    hitTransparent: function (value) {
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
            this.updateViewMatrix();
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
    canAccept: function (element, autoInsert) {
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
        var newProps = extendOwnProperties(true, {}, this.props);
        ObjectFactory.updatePropsWithPrototype(newProps);
        return newProps;
    },
    clone: function () {
        var clone = fwk.UIElement.fromType(this.t, this.cloneProps());
        clone.id(createUUID());
        return clone;
    },
    mirrorClone: function () {
        var clone = fwk.UIElement.fromType(this.t, this.cloneProps());
        return clone;
    },
    cursor: function () {
        if (this.canSelect() && this.canDrag() && !this.locked())
            return "move_cursor";

        return "";
    },
    resizeDimensions: function (value) {
        if (value) {
            value = +value; // convert from string, to make it work with property editor
        }
        return this.field("_resizeDimensions", value, ResizeDimension.Both);
    },
    getVisualActions: function () {
        return {fromCategories: ["Layering"]};
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
    beforeDragTo: function (position) {
        return position;
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
        if (global) {
            var rect = this.getBoundaryRectGlobal();
            return {
                x: rect.x + rect.width / 2,
                y: rect.y + rect.height / 2
            }
        }
        return {
            x: this.x() + this.width() / 2,
            y: this.y() + this.height() / 2
        };
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
        var frame;
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

        switch (this.resizeDimensions()) {
            case ResizeDimension.Both:
                frame = {
                    element: this,
                    frame: true,
                    points: [
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
                    ]
                }
                break;
            case ResizeDimension.Vertical:
                frame = {
                    element: this,
                    frame: true,
                    points: [
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
                    ]
                }
                break;
            case ResizeDimension.Horizontal:
                frame = {
                    element: this,
                    frame: true,
                    points: [
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
                    ]
                }
                break;
            default: {
                frame = {
                    element: this,
                    frame: true,
                    points: []
                };
                break;
            }
        }

        if (this._angleEditable !== false /*properties.angle.getIsEditable()*/) {
            frame.points.splice(0, 0, {
                type: RotateFramePoint,
                moveDirection: PointDirection.Any,
                x: 0,
                y: 0,
                cursor: 8,
                update: function (p, x, y, w, h) {
                    p.x = x + w / 2;
                    p.y = y;
                }
            });
        }

        return frame;
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
        var angle = this.angle() * Math.PI / 180;
        var newOrigin = sketch.math2d.rotatePoint({
            x: origin.x + dx / 2,
            y: origin.y + dy / 2
        }, -angle, origin);

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

fwk.UIElement.construct = function (type) {
    var current;
    if (typeof type === "string") {
        var typeMetadata = PropertyMetadata.findAll(type);
        if (typeMetadata && typeMetadata._class) {
            current = typeMetadata._class;
        }
    } else {
        current = type;
    }

    if (!current) {
        throw "Type not found: " + type;
    }

    var args = Array.prototype.slice.call(arguments);
    args.splice(0, 1);
    var instance = Object.create(current.prototype);
    current.apply(instance, args);
    return instance;
}

fwk.UIElement.fromType = function (type, parameters) {
    return ObjectFactory.fromType(type, parameters);
};

fwk.UIElement.fromJSON = function (data) {
    return ObjectFactory.fromJSON(data);
};

fwk.UIElement.prototype.t = Types.Element;


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
        defaultValue: true
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
                label: "Style",
                properties: ["styleId", "opacity", "fill", "stroke"]
            },
            {
                label: "Appearance",
                properties: ["visible", "cornerRadius", "clipMask"]
            },
            {
                label: "Layout",
                properties: ["width", "height", "x", "y", "anchor", "angle", "dockStyle", "horizontalAlignment", "verticalAlignment"]
            },
            {
                label: "Margin",
                properties: ["margin"]
            }
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
        return ["id", "name"];
    }
});

export default fwk.UIElement;
