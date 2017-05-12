import UIElement from "framework/UIElement";
import nearestPoint from  "math/NearestPoint";
import PropertyTracker from  "../../framework/PropertyTracker";
import BezierGraph from "math/bezierGraph";
import BezierCurve from "math/bezierCurve";
import Rect from "math/rect";
import Point from "math/point";
import ResizeDimension from "framework/ResizeDimension";
import Brush from "framework/Brush";
import PropertyMetadata from "framework/PropertyMetadata";
import Matrix from "math/matrix";
import {multiplyVectorConst, addVectors, subVectors} from "math/math";
import Shape from "framework/Shape";
import Selection from "framework/SelectionModel";
import Invalidate from "framework/Invalidate";
import Environment from "environment";
import SnapController from "framework/SnapController";
import Box from "framework/Box";
import {debounce} from "../../util";
import Command from "framework/commands/Command";
import {Types} from "../../framework/Defs";
import ArrangeStrategy from "../../framework/ArrangeStrategy";
import ResizeOptions from "../../decorators/ResizeOptions";
import { IMouseEventData, IKeyboardState, ChangeMode } from "carbon-core";
import { LayerTypes } from "carbon-app";

var CP_HANDLE_RADIUS = 3;
var CP_HANDLE_RADIUS2 = 6;
var CP_RADIUS = 4;
var CP_RADIUS2 = 8;

const POINT_STROKE = "#1592E6";
const POINT_FILL = "#fff";
const POINT_FILL_FIRST_OPEN = "yellow";

const enum PointType {
    Straight,
    Mirrored,
    Disconnected,
    Assymetric
};

var commandLengths = {
    m: 2,
    l: 2,
    h: 1,
    v: 1,
    c: 6,
    s: 4,
    q: 4,
    t: 2,
    a: 7
};

function pointsEqual(p1, p2) {
    if (p1 === p2) {
        return true;
    }
    return p1.type === p2.type && p1.x === p2.x && p1.y === p2.y
        && p1.cp1x === p2.cp1x && p1.cp1y === p2.cp1y
        && p1.cp2x === p2.cp2x && p1.cp2y === p2.cp2y;
}

function updateSelectedPoint(pt) {
    if (this._selectedPoint !== pt) {
        this._selectedPoint = pt;
        if (pt) {
            this.runtimeProps.currentPointX = pt.x;
            this.runtimeProps.currentPointY = pt.y;
            this._selectedPoint.type = pt.type;
        }
        this.setProps({selectedPointIdx: pt ? pt.idx : -1}, ChangeMode.Self);
        Selection.reselect();
    }
}

function addToSelectedPoints(pt) {
    if (this._selectedPoint && !Object.keys(this._selectedPoints).length) {
        this._selectedPoints[this._selectedPoint.idx] = this._selectedPoint;
    }
    if (this._selectedPoints[pt.idx]) {
        delete this._selectedPoints[pt.idx];
    } else {
        this._selectedPoints[pt.idx] = pt;
    }

    if (this.props.selectedPointIdx !== -1 && Object.keys(this._selectedPoints).length > 1){
        this.setProps({selectedPointIdx: -1}, ChangeMode.Self);
    }

    Invalidate.requestInteractionOnly();
}

function clearSelectedPoints() {
    this._selectedPoints = {};
}

var isLinePoint = function (pt) {
    return pt.type === PointType.Straight;
};

var getClickedPoint = function (x, y) {
    var pos = this.globalViewMatrixInverted().transformPoint2(x, y);

    var zoom = Environment.view.scale();
    for (var i = 0, len = this.points.length; i < len; ++i) {
        var pt = this.points[i];
        pt.idx = i;
        var x2 = pos.x - pt.x
            , y2 = pos.y - pt.y
        if (x2 * x2 + y2 * y2 < CP_RADIUS2 * Environment.view.contextScale / (zoom * zoom)) {
            return pt;
        }
    }
    return null;
};

var getClickedHandlePoint = function (x, y) {
    var pos = this.globalViewMatrixInverted().transformPoint2(x, y);

    var zoom = Environment.view.scale();

    for (var i = 0, len = this.points.length; i < len; ++i) {
        var pt = this.points[i];
        pt.idx = i;
        if (isLinePoint(pt)) {
            continue;
        }
        var x2 = pos.x - pt.cp1x
            , y2 = pos.y - pt.cp1y
        if (x2 * x2 + y2 * y2 < CP_HANDLE_RADIUS2 * Environment.view.contextScale / (zoom * zoom)) {
            pt._selectedPoint = 1;
            return pt;
        }

        x2 = pos.x - pt.cp2x
        y2 = pos.y - pt.cp2y
        if (x2 * x2 + y2 * y2 < CP_HANDLE_RADIUS2 * Environment.view.contextScale / (zoom * zoom)) {
            pt._selectedPoint = 2;
            return pt;
        }
    }
    return null;
};

var setLinePoint = function (pt) {
    pt.cp1x = pt.cp2x = pt.x;
    pt.cp1y = pt.cp2y = pt.y;
};

var drawSegment = function (context, pt, prevPt, closing) {
    var m = this.globalViewMatrix();
    var xy = m.transformPoint(pt);

    if (!this._firstPoint) {
        this._firstPoint = pt;
    }
    if ((pt.moveTo || this._firstPoint === pt) && !closing) {
        context.moveTo(xy.x, xy.y);
    }
    else if (isLinePoint(pt) && (isLinePoint(prevPt))) { // line segment
        context.lineTo(xy.x, xy.y);
    } else { // cubic bezier segment
        var cp1x = prevPt.cp2x
            , cp1y = prevPt.cp2y
            , cp2x = pt.cp1x
            , cp2y = pt.cp1y;

        if (isLinePoint(prevPt)) {
            cp1x = prevPt.x;//cp2x;
            cp1y = prevPt.y;//cp2y;
        } else if (isLinePoint(pt)) {
            cp2x = pt.x;//cp1x;
            cp2y = pt.y;//cp1y;
        }

        var cp1 = m.transformPoint2(cp1x, cp1y);
        var cp2 = m.transformPoint2(cp2x, cp2y);
        context.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, xy.x, xy.y);
    }

    if (pt.closed) {
        drawSegment.call(this, context, this._firstPoint, pt, true);
        context.closePath();
        this._firstPoint = null;
    }
};

var scalePointsToNewSize = function () {
    var bb = this.getBoundingBox();
    var m = this.viewMatrix();
    for (var i = 0; i < this.points.length; ++i) {
        var pt = this.points[i];
        var xy = m.transformPoint2(pt.x, pt.y);
        var cp1 = m.transformPoint2(pt.cp1x, pt.cp1y);
        var cp2 = m.transformPoint2(pt.cp2x, pt.cp2y);
        pt.x = xy.x - bb.x;
        pt.y = xy.y - bb.y;
        pt.cp1x = cp1.x - bb.x;
        pt.cp1y = cp1.y - bb.y;
        pt.cp2x = cp2.x - bb.x;
        pt.cp2y = cp2.y - bb.y;
        this._roundPoint(pt);
    }
    this.setTransform(Matrix.create().translate(bb.x, bb.y));
    this.setProps({br: bb.withPosition(0, 0)});
};

function moveAllPoints(dx, dy) {
    for (var i = 0, len = this.points.length; i < len; ++i) {
        var pt = this.points[i];
        pt.x -= dx;
        pt.y -= dy;
        pt.cp1x -= dx;
        pt.cp2x -= dx;
        pt.cp1y -= dy;
        pt.cp2y -= dy;
        // this._roundPoint(pt);
    }
}


function moveCurrentPoint(dx, dy) {
    var keys = Object.keys(this._selectedPoints);
    if (keys.length) {
        for (var i = 0; i < keys.length; ++i) {
            var p = this._selectedPoints[keys[i]];
            p.x -= dx;
            p.y -= dy;
            p.cp1x -= dx;
            p.cp1y -= dy;
            p.cp2x -= dx;
            p.cp2y -= dy;
        }
        this._groupMove = true;
    } else {
        this._currentPoint.x -= dx;
        this._currentPoint.y -= dy;
        this._currentPoint.cp1x -= dx;
        this._currentPoint.cp1y -= dy;
        this._currentPoint.cp2x -= dx;
        this._currentPoint.cp2y -= dy;
        this.setProps({currentPointX: this._currentPoint.x, currentPointY: this._currentPoint.y}, ChangeMode.Root);
    }
}

function drawArc(path, x, y, coords, matrix) {
    var rx = coords[0];
    var ry = coords[1];
    var rot = coords[2];
    var large = coords[3];
    var sweep = coords[4];
    var ex = coords[5];
    var ey = coords[6];
    var segs = arcToSegments(ex, ey, rx, ry, large, sweep, rot, x, y);
    for (var i = 0; i < segs.length; i++) {
        var bez = segmentToBezier.apply(this, segs[i]);

        var cp1 = matrix.transformPoint2(bez[0], bez[1]);
        var cp2 = matrix.transformPoint2(bez[2], bez[3]);
        var p = matrix.transformPoint2(bez[4], bez[5]);

        path.curveToPoint(p, cp1, cp2);
    }
}

var arcToSegmentsCache = {},
    segmentToBezierCache = {},
    _join = Array.prototype.join,
    argsString;

// Generous contribution by Raph Levien, from libsvg-0.1.0.tar.gz
function arcToSegments(x, y, rx, ry, large, sweep, rotateX, ox, oy) {
    argsString = _join.call(arguments);
    if (arcToSegmentsCache[argsString]) {
        return arcToSegmentsCache[argsString];
    }

    var th = rotateX * (Math.PI / 180);
    var sin_th = Math.sin(th);
    var cos_th = Math.cos(th);
    rx = Math.abs(rx);
    ry = Math.abs(ry);
    var px = cos_th * (ox - x) * 0.5 + sin_th * (oy - y) * 0.5;
    var py = cos_th * (oy - y) * 0.5 - sin_th * (ox - x) * 0.5;
    var pl = (px * px) / (rx * rx) + (py * py) / (ry * ry);
    if (pl > 1) {
        pl = Math.sqrt(pl);
        rx *= pl;
        ry *= pl;
    }

    var a00 = cos_th / rx;
    var a01 = sin_th / rx;
    var a10 = (-sin_th) / ry;
    var a11 = (cos_th) / ry;
    var x0 = a00 * ox + a01 * oy;
    var y0 = a10 * ox + a11 * oy;
    var x1 = a00 * x + a01 * y;
    var y1 = a10 * x + a11 * y;

    var d = (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0);
    var sfactor_sq = 1 / d - 0.25;
    if (sfactor_sq < 0) sfactor_sq = 0;
    var sfactor = Math.sqrt(sfactor_sq);
    if (sweep === large) sfactor = -sfactor;
    var xc = 0.5 * (x0 + x1) - sfactor * (y1 - y0);
    var yc = 0.5 * (y0 + y1) + sfactor * (x1 - x0);

    var th0 = Math.atan2(y0 - yc, x0 - xc);
    var th1 = Math.atan2(y1 - yc, x1 - xc);

    var th_arc = th1 - th0;
    if (th_arc < 0 && sweep === 1) {
        th_arc += 2 * Math.PI;
    } else if (th_arc > 0 && sweep === 0) {
        th_arc -= 2 * Math.PI;
    }

    var segments = Math.ceil(Math.abs(th_arc / (Math.PI * 0.5 + 0.001)));
    var result = [];
    for (var i = 0; i < segments; i++) {
        var th2 = th0 + i * th_arc / segments;
        var th3 = th0 + (i + 1) * th_arc / segments;
        result[i] = [xc, yc, th2, th3, rx, ry, sin_th, cos_th];
    }

    return (arcToSegmentsCache[argsString] = result);
}

function segmentToBezier(cx, cy, th0, th1, rx, ry, sin_th, cos_th) {
    argsString = _join.call(arguments);
    if (segmentToBezierCache[argsString]) {
        return segmentToBezierCache[argsString];
    }

    var a00 = cos_th * rx;
    var a01 = -sin_th * ry;
    var a10 = sin_th * rx;
    var a11 = cos_th * ry;

    var th_half = 0.5 * (th1 - th0);
    var t = (8 / 3) * Math.sin(th_half * 0.5) * Math.sin(th_half * 0.5) / Math.sin(th_half);
    var x1 = cx + Math.cos(th0) - t * Math.sin(th0);
    var y1 = cy + Math.sin(th0) + t * Math.cos(th0);
    var x3 = cx + Math.cos(th1);
    var y3 = cy + Math.sin(th1);
    var x2 = x3 + t * Math.sin(th1);
    var y2 = y3 - t * Math.cos(th1);

    return (segmentToBezierCache[argsString] = [
        a00 * x1 + a01 * y1, a10 * x1 + a11 * y1,
        a00 * x2 + a01 * y2, a10 * x2 + a11 * y2,
        a00 * x3 + a01 * y3, a10 * x3 + a11 * y3
    ]);
}

class Path extends Shape {
    constructor() {
        super();
        this.points = [];
        this._lastPoints = [];
        this._currentPoint = null;
        this._selectedPoints = {};
        this.save = this._save;//debounce(this._save.bind(this), 500);
    }

    tryDelete(): boolean {
        if (this._selectedPoint && this.points.length > 2) {
            var keys = Object.keys(this._selectedPoints).map((k: any)=>k - 0).sort((a, b)=>b - a);
            if (keys.length) {
                for (var i = 0; i < keys.length; ++i) {
                    this.removePointAtIndex(keys[i]);
                }
                clearSelectedPoints.call(this);
            } else {
                this.removePointAtIndex(this._selectedPoint.idx);
            }

            updateSelectedPoint.call(this, null);
            return false;
        }
        return true;
    }

    _save() {
        var newPoints = this.points.slice();
        this.props.points = this._lastPoints;
        this.setProps({points: newPoints});
        this._lastPoints = this.points;
    }

    cloneProps(){
        var props = super.cloneProps();
        props.points = props.points.map(x => Object.assign({}, x));
        return props;
    }

    get points() {
        return this.props.points;
    }

    set points(value) {
        this.setProps({points: value});
    }

    controlPointForPosition(pos) {
        return getClickedPoint.call(this, pos.x, pos.y);
    }

    pointAtIndex(idx) {
        return this.points[idx];
    }

    get firstPoint(){
        return this.points[0];
    }
    get lastPoint(){
        return this.points[this.points.length - 1];
    }

    set nextPoint(value) {
        if (value != this._nextPoint) {
            Invalidate.requestInteractionOnly();
        }
        this._nextPoint = value;
        if (this._nextPoint) {
            this._initPoint(value);
        }
    }

    get nextPoint() {
        return this._nextPoint;
    }

    removeControlPoint(pt) {
        for (var i = 0; i < this.points.length; ++i) {
            if (this.points[i] === pt) {
                this.points.splice(i, 1);
                return;
            }
        }
    }

    _roundPoint(pt) {
        var x, y;
        if (this.props.pointRounding === 0) {
            x = (0 | (pt.x + 0.005) * 100) / 100;
            y = (0 | (pt.y + 0.005) * 100) / 100;
        } else if (this.props.pointRounding === 1) {
            x = (0 | pt.x * 2 + .5) / 2;
            y = (0 | pt.y * 2 + .5) / 2;
        } else {
            x = Math.round(pt.x);
            y = Math.round(pt.y);
        }

        if (pt.cp1x !== undefined) {
            pt.cp1x = this._roundValue(pt.cp1x);
            pt.cp1y = this._roundValue(pt.cp1y);
        }
        if (pt.cp2x !== undefined) {
            pt.cp2x = this._roundValue(pt.cp2x);
            pt.cp2y = this._roundValue(pt.cp2y);
        }

        pt.x = x;
        pt.y = y;
    }

    indexOfPoint(pt) {
        for (var i = 0; i < this.points.length; ++i) {
            if (this.points[i] === pt) {
                return i;
            }
        }

        return -1;
    }

    removePointAtIndex(idx) {
        this.points.splice(idx, 1);

        if (this.mode() === 'edit') {
            SnapController.calculateSnappingPointsForPath(this);
        }
    }

    removeLastPoint() {
        var length = this.length();
        this.removePointAtIndex(length - 1);
    }

    mode(value?) {
        if (arguments.length > 0) {
            var oldMode = this.mode();

            this.setProps({mode: value});

            if (value === "edit") {
                if (oldMode !== "edit") {
                    this.switchToEditMode(true);
                }
            } else {
                this.switchToEditMode(false);
            }
        }

        return this.props.mode;
    }

    cancel() {
        this.mode("resize");
    }

    enter() {
        if (this.mode() !== "edit") {
            this.edit();
        }
    }

    switchToEditMode(edit) {
        if (this._cancelBinding) {
            this._cancelBinding.dispose();
        }
        if (edit) {
            this.registerForLayerDraw(LayerTypes.Interaction, this);
            Invalidate.request();

            this._currentPoint = null;
            scalePointsToNewSize.call(this);
            this.save();
            SnapController.calculateSnappingPointsForPath(this);

            this._cancelBinding = Environment.controller.actionManager.subscribe('cancel', this.cancel.bind(this));
            this.captureMouse(this);

            updateSelectedPoint.call(this, this.points[0]);
        } else {
            this.unregisterForLayerDraw(LayerTypes.Interaction, this);
            Invalidate.request();

            this._cancelBinding = null;
            SnapController.clearActiveSnapLines();
            this.nextPoint = null;
            this.releaseMouse(this);
            this.resetGlobalViewCache();
        }

        Selection.reselect();
    }

    _initPoint(point) {
        this._roundPoint(point);
        if (point.type === undefined) {
            if (point.cp1x == undefined && point.cp2x == undefined) {
                point.type = PointType.Straight;
                point.cp1x = point.x;
                point.cp1y = point.y;
                point.cp2x = point.x;
                point.cp2y = point.y;
            } else if (point.cp1x == undefined) {
                point.type = PointType.Assymetric;
                point.cp1x = point.x;
                point.cp1y = point.y;
            } else if (point.cp2x == undefined) {
                point.type = PointType.Assymetric;
                point.cp2x = point.x;
                point.cp2y = point.y;
            } else {
                point.type = PointType.Assymetric;
            }
        }

    }

    addPoint(point) {
        if (!point)
            return;

        this._initPoint(point);
        this.points.push(point);

        if (this.mode() === 'edit') {
            SnapController.calculateSnappingPointsForPath(this);
        }

        this.save();

        return point;
    }

    insertPointAtIndex(point, idx) {
        this._initPoint(point);
        this.points.splice(idx, 0, point);

        if (this.mode() === 'edit') {
            SnapController.calculateSnappingPointsForPath(this);
        }

        this.save();

        return point;
    }

    changePointAtIndex(point, idx, changeMode: ChangeMode = ChangeMode.Model) {
        this.points.splice(idx, 1, point);
        if (this.mode() === 'edit') {
            SnapController.calculateSnappingPointsForPath(this);
        }

        if (changeMode !== ChangeMode.Self){
            this.save();
        }
    }

    length() {
        return this.points.length;
    }

    select() {
        this._selected = true;
        this._enterBinding = Environment.controller.actionManager.subscribe('enter', this.enter.bind(this));
    }

    unselect() {
        this._selected = false;

        if (this._enterBinding) {
            this._enterBinding.dispose();
            delete this._enterBinding;
        }
    }

    selectFrameVisible(){
        return this.mode() !== "edit";
    }

    edit() {
        this.mode("edit");
    }

    dblclick(event, scale?) {
        if (this.mode() !== "edit") {
            this.edit();
        } else {
            var pt = getClickedPoint.call(this, event.x, event.y);
            if (pt) {
                if (pt.type !== PointType.Straight) {
                    pt.type = PointType.Straight;
                } else {
                    pt.type = PointType.Assymetric;
                }
                Invalidate.request();

                return;
            }

            if (!this.hitTest(event, scale)) {
                this.cancel();
            }
        }
    }

    mouseup(event: IMouseEventData, keys: IKeyboardState) {
        delete this._altPressed;
        if (this._bendingData) {
            this._bendingData = null;
            SnapController.clearActiveSnapLines();
            this._currentPoint = null;
            this._handlePoint = null;
            this.adjustBoundaries();
            this.invalidate();

            PropertyTracker.resumeAndFlush();
            return;
        }

        if (this._selectedPoint && !keys.shift && !this._groupMove) {
            clearSelectedPoints.call(this);
        }

        var pt = this._currentPoint || this._handlePoint;
        if (pt != null) {
            SnapController.clearActiveSnapLines();
            this._currentPoint = null;
            this._handlePoint = null;
            if (!pointsEqual(pt, this._originalPoint)) {
                this.changePointAtIndex(pt, pt.idx);
                this.adjustBoundaries();
                //  commandManager.execute(new ChangePathPointCommand(this, pt, this._originalPoint));
            }
            PropertyTracker.resumeAndFlush();
        }
    }

    bendPoints(newPos, data) {
        // p2 = (Bc - (Ac + Iij)*p0 - (Ec - Kij)*p3 - Bdtij  ) / DD;
        var Bc = multiplyVectorConst(newPos, 1 / data.C);
        var p2 = multiplyVectorConst(
            addVectors(
                Bc,
                multiplyVectorConst(data.p0, -(data.Ac + data.Iij)),
                multiplyVectorConst(data.p3, -(data.Ec - data.Kij)),
                multiplyVectorConst(data.Bdtij, -1),
            ),
            1 / data.DD
        );

        // p1 = Bc - Ac*p0 - Dc*p2 -Ec*p3
        var p1 = addVectors(
            Bc,
            multiplyVectorConst(data.p0, -data.Ac),
            multiplyVectorConst(p2, -data.Dc),
            multiplyVectorConst(data.p3, -data.Ec)
        );

        var len = this.length();
        var p1idx = (data.idx - 1 + len) % len;
        var p0 = clone(this.points[p1idx]);
        var p3 = clone(this.points[data.idx]);

        p0.cp2x = p1.x;
        p0.cp2y = p1.y;
        p3.cp1x = p2.x;
        p3.cp1y = p2.y;
        p0.type = PointType.Disconnected;
        p3.type = PointType.Disconnected;
        this.changePointAtIndex(p0, p1idx);
        this.changePointAtIndex(p3, data.idx);
    }

    calculateOriginalBendingData(point) {
        var len = this.length();
        var p1idx = (point.idx - 1 + len) % len;
        var p0 = this.points[p1idx];
        var p3 = this.points[point.idx];
        var p1 = {x: p0.cp2x, y: p0.cp2y};
        var p2 = {x: p3.cp1x, y: p3.cp1y};
        var t = point.t;
        var t_2 = t * t;
        var t_3 = t_2 * t;
        var tm1 = 1 - t;
        var tm1_2 = tm1 * tm1;
        var tm1_3 = tm1_2 * tm1;

        var A = tm1_3;
        var C = 3 * tm1_2 * t;
        var D = 3 * tm1 * t_2;
        var E = t_3;

        var Bt = addVectors(
            multiplyVectorConst(p0, A),
            multiplyVectorConst(p1, C),
            multiplyVectorConst(p2, D),
            multiplyVectorConst(p3, E)
        );

        var I = 3 * tm1_2;
        var J = 6 * tm1 * t;
        var K = 3 * t_2;

        var Bdt = addVectors(
            multiplyVectorConst(subVectors(p1, p0), I),
            multiplyVectorConst(subVectors(p2, p1), J),
            multiplyVectorConst(subVectors(p3, p2), K)
        );
        var IJ = I - J;
        return {
            Bt: Bt,
            C: C,
            Ac: A / C,
            Dc: D / C,
            Ec: E / C,
            Bdtij: multiplyVectorConst(Bdt, 1 / IJ),
            Iij: I / IJ,
            Kij: K / IJ,
            DD: D / C - (J - K) / IJ,
            idx: point.idx,
            p0: p0,
            p3: p3
        };
        // p2 = (Bc - Ac*p0 - Ec*p3 - Bdtij - Iij*p0 - Kij*p3) / DD;
        // p1 = Bc - Ac*p0 - Dc*p2 -Ec*p3
    }

    mousedown(event: IMouseEventData, keys: IKeyboardState) {
        var x = event.x,
            y = event.y;

        this._groupMove = false;

        if (this.mode() !== "edit") {
            return;
        }

        var pt = getClickedPoint.call(this, x, y);

        if (pt && keys.shift) {
            addToSelectedPoints.call(this, pt);
        } else if (!pt || !this._selectedPoints[pt.idx]) {
            clearSelectedPoints.call(this);
        }

        if (pt != null) {
            event.handled = true;
            if (keys.alt) {
                this._altPressed = true;
                this._handlePoint = pt;
                this._handlePoint._selectedPoint = 0;
            } else {
                this._currentPoint = pt;
            }
            this._originalPoint = clone(pt);
            this._pointOnPath = null;
        } else {
            pt = getClickedHandlePoint.call(this, x, y);
            if (pt != null) {
                event.handled = true;
                this._handlePoint = pt;
                this._originalPoint = clone(pt);
                this._pointOnPath = null;
            } else if (this._pointOnPath) {
                event.handled = true;

                if (keys.shift) {
                    var data = this.getInsertPointData(this._pointOnPath);
                    if (data.length === 1) {
                        var newPoint = this.insertPointAtIndex(data[0], data[0].idx);
                    } else {
                        this.changePointAtIndex(data[0], data[0].idx);
                        this.changePointAtIndex(data[1], data[1].idx);
                        newPoint = this.insertPointAtIndex(data[2], data[2].idx);
                    }

                    this._currentPoint = newPoint;
                    this._originalPoint = clone(newPoint);

                    this._pointOnPath = null;
                    Invalidate.request();
                }
                else{
                    this._bendingData = this.calculateOriginalBendingData(this._pointOnPath);
                    // set bending handler
                    this._pointOnPath = null;
                }
            }
        }

        if (Object.keys(this._selectedPoints).length <= 1){
            updateSelectedPoint.call(this, pt);
        }

        if (event.handled){
            PropertyTracker.suspend();
        }
    }

    mousemove(event: IMouseEventData, keys: IKeyboardState) {
        if (this.mode() !== "edit") {
            return;
        }

        var pos = {x: event.x, y: event.y};

        if (this._bendingData) {
            event.handled = true;

            pos = SnapController.applySnappingForPoint(pos);
            pos = this.globalViewMatrixInverted().transformPoint(pos);
            this.bendPoints(pos, this._bendingData);

            Invalidate.request();
            return;
        }


        if (this._currentPoint != null) {
            pos = SnapController.applySnappingForPoint(pos);

            pos = this.globalViewMatrixInverted().transformPoint(pos);

            this._roundPoint(pos);

            var newX = pos.x
                , newY = pos.y
                , dx = this._currentPoint.x - newX
                , dy = this._currentPoint.y - newY;
            if (dx || dy) {
                moveCurrentPoint.call(this, dx, dy);

                Invalidate.request();
            }
            return;
        } else if (this._handlePoint != null) {
            pos = SnapController.applySnappingForPoint(pos);
            pos = this.globalViewMatrixInverted().transformPoint(pos);
            // this._roundPoint(pos);
            var pt = this._handlePoint;
            var newX = pos.x,
                newY = pos.y;
            let x = pt.x,
                y = pt.y;
            if (pt._selectedPoint === 1) {
                pt.cp1x = newX;
                pt.cp1y = newY;
                var x2 = pt.cp2x,
                    y2 = pt.cp2y;
            } else {
                pt.cp2x = newX;
                pt.cp2y = newY;
                var x2 = pt.cp1x,
                    y2 = pt.cp1y;
            }

            if (pt.type !== PointType.Disconnected) {
                var len2 = Math.sqrt((x - x2) * (x - x2) + (y - y2) * (y - y2));
                var len1 = Math.sqrt((x - newX) * (x - newX) + (y - newY) * (y - newY));

                if (this._altPressed || pt._selectedPoint === 0 || pt.type === PointType.Mirrored) { // move both handles
                    len2 = len1;
                    pt.type = PointType.Mirrored;
                } else {
                    pt.type = PointType.Assymetric;
                }

                if (len1 > 0) {
                    var vx = (newX - x) * len2 / len1;
                    var vy = (newY - y) * len2 / len1;

                    if (pt._selectedPoint === 1) {
                        pt.cp2x = x - vx;
                        pt.cp2y = y - vy;
                    } else {
                        pt.cp1x = x - vx;
                        pt.cp1y = y - vy;
                    }
                }
            }
            Invalidate.request();
            return;
        }

        var pt = this.getPointIfClose(event);
        if (this._pointOnPath !== pt) {
            this._pointOnPath = pt;
            Invalidate.requestInteractionOnly();
        }


        // highligh hover points
        function updateHoverPoint(pt) {
            if (this._hoverPoint !== pt) {
                this._hoverPoint = pt;
                Invalidate.requestInteractionOnly();
            }

            return pt;
        }

        function updateHoverHandlePoint(pt) {
            if (this._hoverHandlePoint !== pt) {
                this._hoverHandlePoint = pt;
                Invalidate.requestInteractionOnly();
            }

            return pt;
        }

        let x = event.x, y = event.y;
        var pt = getClickedPoint.call(this, x, y);
        if (!updateHoverPoint.call(this, pt)) {

            pt = getClickedHandlePoint.call(this, x, y);
            updateHoverHandlePoint.call(this, pt);
        }

        if (this.isHoveringOverHandle() || (this.isHoveringOverPoint() && keys.alt)){
            event.cursor = "pen_move_handle";
        }
        else if (this.isHoveringOverPoint()){
            event.cursor = "pen_move_point";
        }
        else if (this.isHoveringOverSegment()){
            event.cursor = keys.shift ? "pen_add_point" : "pen_move_segment";
        }
        else{
            event.cursor = Environment.controller.defaultCursor();
        }
    }

    closed(value?) {
        if (value !== undefined) {
            this.setProps({closed: value});
        }
        return this.props.closed;
    }

    prepareProps(changes) {
        super.prepareProps(changes);
        // if (changes.width !== undefined && changes.width < 1) {
        //     changes.width = 1;
        // }
        //
        // if (changes.height !== undefined && changes.height < 1) {
        //     changes.height = 1;
        // }

        if (changes.currentPointX !== undefined && this._currentPoint) {
            changes.currentPointX = this._roundValue(changes.currentPointX);
        }

        if (changes.currentPointY !== undefined && this._currentPoint) {
            changes.currentPointY = this._roundValue(changes.currentPointY);
        }

        if (changes.pointRounding) {
            //  moveAllPoints.call(this, 0, 0);
        }
    }

    hitTest(point, scale, boundaryRectOnly = false) {
        if (this.hasBadTransform()){
            return false;
        }

        if (this._currentPoint || this._handlePoint || this._pointOnPath) {
            return true;
        }

        if ((getClickedPoint.call(this, point.x, point.y) != null)
            || (getClickedHandlePoint.call(this, point.x, point.y) != null)) {
            return true;
        }
        var res = UIElement.prototype.hitTest.apply(this, arguments);
        if (res) {
            if (boundaryRectOnly){
                return true;
            }

            var brush = this.fill();
            if (!brush || !brush.type) {
                var p = this.getPointIfClose(point, 8);
                if (p) {
                    return true;
                } else {
                    return false;
                }
            }
            else {
                var matrix = this.parent().globalViewMatrixInverted();
                point = matrix.transformPoint(point);

                var graph = BezierGraph.fromPath(this, this.viewMatrix());

                var count = 0;
                var ray = BezierCurve.bezierCurveWithLine(point, {x: point.x + 100000, y: point.y})
                for (var curve of graph.contours) {
                    for (var edge of curve.edges) {
                        edge.intersectionsWithBezierCurve(ray, {}, ()=> {
                            count++;
                        })
                    }
                }
                return (count & 1) === 1;
            }
        }
        return res;
    }

    resizeDimensions() {
        return (this.mode() === "resize" ? ResizeDimension.Both : ResizeDimension.None);
    }

    onLayerDraw(layer, context, environment) {
        if (this._selected && this.mode() === "edit") {
            var scale = environment.view.scale();
            context.save();

            context.lineWidth = 1 / scale;

            context.strokeStyle = "rgba(100,100,255,0.5)";
            context.beginPath();

            var matrix = this.globalViewMatrix();
            var w = this.props.width,
                h = this.props.height;

            var handlePoint = this._handlePoint || this._hoverHandlePoint;
            var hoverPoint = this._currentPoint || this._hoverPoint;

            this.drawPath(context, w, h);
            if (this.nextPoint && this.points.length && !this.closed()) {
                if (hoverPoint == this.points[0]) {
                    var nextPt = hoverPoint;
                } else {
                    nextPt = this.nextPoint;
                }
                drawSegment.call(this, context, nextPt, this.points[this.points.length - 1], true);
            }
            context.stroke();

            var needClearStyle = true;

            function clearStyle() {
                if (needClearStyle) {
                    context.strokeStyle = POINT_STROKE;
                    context.fillStyle = POINT_FILL;
                    needClearStyle = false;
                }
            }


            for (var i = 0, len = this.points.length; i < len; ++i) {
                var pt = this.points[i];
                var tpt = matrix.transformPoint(pt);

                clearStyle();

                if (!isLinePoint(pt)) {

                    var cp1 = matrix.transformPoint2(pt.cp1x, pt.cp1y);
                    var cp2 = matrix.transformPoint2(pt.cp2x, pt.cp2y);
                    context.beginPath();
                    context.moveTo(cp1.x, cp1.y);
                    context.lineTo(tpt.x, tpt.y);
                    context.lineTo(cp2.x, cp2.y);
                    context.stroke();

                    if (pt === handlePoint && (handlePoint._selectedPoint == 1 || this._altPressed)) {
                        context.fillStyle = POINT_STROKE;
                        needClearStyle = true;
                    }

                    //context.circle(cp1.x, cp1.y, CP_HANDLE_RADIUS / scale);
                    var r = CP_HANDLE_RADIUS / scale;
                    context.beginPath();
                    context.moveTo(cp1.x - r, cp1.y);
                    context.lineTo(cp1.x, cp1.y - r);
                    context.lineTo(cp1.x + r, cp1.y);
                    context.lineTo(cp1.x, cp1.y + r);
                    context.closePath();
                    context.fill();
                    context.stroke();

                    clearStyle();

                    if (pt === handlePoint && (handlePoint._selectedPoint == 2 || this._altPressed)) {
                        context.fillStyle = POINT_STROKE;
                        needClearStyle = true;
                    }
                    context.beginPath();
                    //context.circle(cp2.x, cp2.y, CP_HANDLE_RADIUS / scale);
                    context.moveTo(cp2.x - r, cp2.y);
                    context.lineTo(cp2.x, cp2.y - r);
                    context.lineTo(cp2.x + r, cp2.y);
                    context.lineTo(cp2.x, cp2.y + r);
                    context.closePath();
                    context.fill();
                    context.stroke();

                    clearStyle();
                }
                if (pt === hoverPoint || pt === this._selectedPoint || this._selectedPoints[pt.idx]) {
                    context.fillStyle = POINT_STROKE;
                    needClearStyle = true;
                } else if (i === this.points.length - 1 && !this.closed() && !pt.closed) {
                    context.fillStyle = POINT_FILL_FIRST_OPEN;
                    needClearStyle = true;
                }

                var r = CP_RADIUS;
                if (i === 0 && !this.closed() && !pt.closed)
                {
                    r--;
                    context.circle(tpt.x, tpt.y, (r + 2)/ scale);
                    context.stroke();
                }

                context.circle(tpt.x, tpt.y, r / scale);
                context.fill();
                context.stroke();
            }

            if (this._pointOnPath) {
                context.fillStyle = POINT_STROKE;
                var pp = this.globalViewMatrix().transformPoint(this._pointOnPath);
                context.circle(pp.x, pp.y, CP_RADIUS / scale);
                context.fill2();
            }
            context.restore();
        }
    }

    applySizeScaling(s, o, options, changeMode) {
        this.applyMatrixScaling(s, o, options, changeMode);
    }

    skew(): void{
    }

    shouldApplyViewMatrix(){
        return false;
    }

    drawPath(context, w, h) {
        if (this.points.length == 0) {
            return;
        }

        var pt;
        var points = this.points;
        this._firstPoint = null;
        var prevPt = null;// = pt = points[0];
        for (var i = 0, len = points.length; i < len; ++i) {
            pt = points[i];
            drawSegment.call(this, context, pt, prevPt);
            prevPt = pt;
        }
        if (this.closed() && !prevPt.closed) {
            drawSegment.call(this, context, points[0], prevPt, true);
            context.closePath();
        }
    }

    // drawSelf (context, w, h, environment) {
    //     if (this._points.length == 0) {
    //         return;
    //     }
    //     context.save();
    //     context.strokeStyle = "black";
    //     context.lineCap = "round";
    //     context.beginPath();
    //     this.drawPath(context, w, h);
    //
    //     Brush.fill(this.fill(), context, 0, 0, w, h);
    //     Brush.stroke(this.stroke(), context, 0, 0, w, h);
    //
    //     context.restore();
    // },

    getBoundingBoxGlobal(includeMargin: boolean = false): Rect {
        if (!this.runtimeProps.globalClippingBox) {
            this.runtimeProps.globalClippingBox = this.getGlobalBoundingBox();
        }

        return this.runtimeProps.globalClippingBox;
    }

    getBoundingBox(){
        if (this.points.length <= 1){
            return Rect.Zero;
        }
        if (!this.runtimeProps.bb){
            var graph = new BezierGraph();
            graph.initWithBezierPath(this, this.viewMatrix());
            this.runtimeProps.bb = Rect.fromObject(graph.bounds);
        }

        return this.runtimeProps.bb;
    }

    getGlobalBoundingBox() {
        if (this.points.length <= 1){
            return Rect.Zero;
        }
        var graph = new BezierGraph();
        graph.initWithBezierPath(this, this.globalViewMatrix());
        return Rect.fromObject(graph.bounds);
    }

    adjustBoundaries() {
        //happens when all add-point commands are rolled back
        if (this.points.length <= 1) {
            return;
        }

        var graph = new BezierGraph();
        graph.initWithBezierPath(this, Matrix.Identity);

        this.prepareAndSetProps({br: Rect.fromObject(graph.bounds)});

        this.save();
    }

    getInsertPointData(pointInfo) {
        var pt: any = {x: pointInfo.x, y: pointInfo.y, idx: pointInfo.idx};
        var t = pointInfo.t;
        var len = this.length();
        var p4 = clone(this.points[pointInfo.idx]);
        p4.idx = pointInfo.idx;
        var p1idx = (pointInfo.idx - 1 + len) % len;
        var p1 = clone(this.points[p1idx]);
        p1.idx = p1idx;

        if (isLinePoint(p4) && isLinePoint(p1)) {
            setLinePoint(pt);
            return [pt];
        } else {
            if (isLinePoint(p1)) {
                p1.cp2x = p1.x;//p4.cp1x;
                p1.cp2y = p1.y;//p4.cp1y;
            } else if (isLinePoint(p4)) {
                p4.cp1x = p4.x;//p1.cp2x;
                p4.cp1y = p4.y;//p1.cp2y;
            }
            var p3 = {x: p4.cp1x, y: p4.cp1y};
            var p2 = {x: p1.cp2x, y: p1.cp2y};

            var p11 = {
                x: p1.x + t * (p2.x - p1.x)
                , y: p1.y + t * (p2.y - p1.y)
            }
                , p12 = {
                x: p2.x + t * (p3.x - p2.x)
                , y: p2.y + t * (p3.y - p2.y)
            }
                , p13 = {
                x: p3.x + t * (p4.x - p3.x)
                , y: p3.y + t * (p4.y - p3.y)
            }
                , p21 = {
                x: p11.x + t * (p12.x - p11.x)
                , y: p11.y + t * (p12.y - p11.y)
            }
                , p22 = {
                x: p12.x + t * (p13.x - p12.x)
                , y: p12.y + t * (p13.y - p12.y)
            };

            p1.cp2x = p11.x;
            p1.cp2y = p11.y;
            p4.cp1x = p13.x;
            p4.cp1y = p13.y;

            pt.cp1x = p21.x;
            pt.cp1y = p21.y;
            pt.cp2x = p22.x;
            pt.cp2y = p22.y;
        }

        //this.insertPointAtIndex(pt, pointInfo.idx);
        return [p1, p4, pt];
    }

    joinMode(value) {
        if (arguments.length > 0) {
            this.setProps({joinMode: value});
        }

        return this.props.joinMode;
    }

    getPointIfClose(pos, dist?) {
        var matrix = this.globalViewMatrixInverted();
        pos = matrix.transformPoint(pos);
        var resPt = null;
        var prevPt = this.points[0];
        dist = (dist || 4) / Environment.view.scale() * Environment.view.contextScale;

        function checkDistance(pt, prevPt, idx) {
            if (isLinePoint(pt) && isLinePoint(prevPt)) {
                var pr: any = {x: 0, y: 0, idx: idx};
                var d = nearestPoint.onLine(prevPt, pt, pos, pr);
                setLinePoint(pr);
            } else {


                var p1 = {x: prevPt.x, y: prevPt.y};
                var p2 = {x: pt.x, y: pt.y};
                var cp2 = {x: pt.cp1x, y: pt.cp1y};
                var cp1 = {x: prevPt.cp2x, y: prevPt.cp2y};
                if (isLinePoint(prevPt)) {
                    cp1.x = prevPt.x;//cp2.x;
                    cp1.y = prevPt.y;//cp2.y;
                } else if (isLinePoint(pt)) {
                    cp2.x = pt.x;//cp1.x;
                    cp2.y = pt.y;//cp1.y;
                }

                pr = {x: 0, y: 0, idx: idx};
                d = nearestPoint.onCurve(p1, cp1, cp2, p2, pos, pr);
            }
            d = Math.abs(d);
            if (d < dist) {
                dist = d;
                resPt = {x: pr.x, y: pr.y, idx: idx, t: pr.t};
            }
        }

        for (var i = 1; i < this.points.length; ++i) {
            var pt = this.points[i];
            checkDistance(pt, prevPt, i);
            prevPt = pt;
        }

        if (this.closed()) {
            checkDistance(this.points[0], prevPt, 0);
        }

        return resPt;
    }

    polygonArea() {
        var area = 0;
        var points = this.points;

        for (var i = 0, len = points.length; i < len; i++) {
            var j = (i + 1) % len;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        return area / 2;
    }

    isClockwise() {
        return this.polygonArea() > 0;
    }

    isHoveringOverSegment(): boolean{
        return !!this._pointOnPath;
    }
    isHoveringOverHandle(): boolean{
        return !!this._hoverHandlePoint;
    }
    isHoveringOverPoint(): boolean{
        return !!this._hoverPoint;
    }
    get hoverPoint(){
        return this._hoverPoint;
    }
    resetHover(): void{
        this._pointOnPath = null;
        this._hoverHandlePoint = null;
        this._hoverPoint = null;
    }

    fromJSON(data) {
        this.points.length = 0;

        var current = UIElement.prototype.fromJSON.call(this, data);

        this._currentPoint = null;
        this._handlePoint = null;

        return current;
    }

    elements(matrix, offset, angle, origin) {
        var points = this.points;
        var res = [];
        if (!points.length) {
            return res;
        }


        offset = offset || {x: 0, y: 0};

        // if (this._sourceRect) {
        //     matrix.scale(this.width() / this._sourceRect.width, this.height() / this._sourceRect.height);
        // }

        // if (angle && origin) {
        //     matrix.rotate(angle, origin.x, origin.y);
        // }
        // matrix.translate(offset.x, offset.y);

        var pt;
        var prevPt = pt = points[0];
        var p = matrix.transformPoint(prevPt);
        res.push({kind: "M", point: p});


        function buildSegment(pt, prevPt, matrix) {
            if (isLinePoint(pt) && isLinePoint(prevPt)) { // line segment
                p = matrix.transformPoint(pt);
                res.push({kind: "L", point: p});
            } else { // cubic bezier segment
                var cp1x = prevPt.cp2x
                    , cp1y = prevPt.cp2y
                    , cp2x = pt.cp1x
                    , cp2y = pt.cp1y;

                if (isLinePoint(prevPt)) {
                    cp1x = prevPt.x;//cp2x;
                    cp1y = prevPt.y;//cp2y;
                } else if (isLinePoint(pt)) {
                    cp2x = pt.x;//cp1x;
                    cp2y = pt.y;//cp1y;
                }

                p = matrix.transformPoint(pt);
                var p1 = matrix.transformPoint2(cp1x, cp1y);
                var p2 = matrix.transformPoint2(cp2x, cp2y);
                res.push({kind: "C", point: p, controlPoints: [p1, p2]});
            }
        }

        for (var i = 1, len = points.length; i < len; ++i) {
            pt = points[i];
            buildSegment(pt, prevPt, matrix);
            prevPt = pt;
        }
        if (true/*this.closed()*/) {
            buildSegment(points[0], prevPt, matrix);
            res.push({kind: "Z"});
        }

        return res;
    }

    moveToPoint(point) {
        this._lastPoint = this.addPoint(point);
        this._lastPoint.moveTo = true;
    }

    moveTo(x, y) {
        this._lastPoint = this.addPoint({x, y});
        this._lastPoint.moveTo = true;
    }

    closeAtPoint() {
        this._lastPoint.closed = true;
    }

    lineToPoint(point) {
        this._lastPoint = this.addPoint(point);
    }

    lineTo(x, y) {
        this._lastPoint = this.addPoint({x, y});
    }

    curveToPoint(point, cp1, cp2) {
        this._lastPoint.cp2x = cp1.x;
        this._lastPoint.cp2y = cp1.y;
        this._lastPoint.type = PointType.Assymetric;
        this._lastPoint = this.addPoint(point);
        this._lastPoint.cp1x = cp2.x;
        this._lastPoint.cp1y = cp2.y;
        this._lastPoint.type = PointType.Assymetric;
    }

    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
        this._lastPoint.cp2x = cp1x;
        this._lastPoint.cp2y = cp1y;
        this._lastPoint.type = PointType.Assymetric;
        this._lastPoint = this.addPoint({x, y});
        this._lastPoint.cp1x = cp2x;
        this._lastPoint.cp1y = cp2y;
        this._lastPoint.type = PointType.Assymetric;
    }

    quadraticCurveToPoint(c, p) {
        this.curveToPoint(p, c, c);
    }

    currentPointX(value: number, changeMode: ChangeMode): number{
        if (arguments.length && this._selectedPoint){
            var newPoint = Object.assign({}, this._selectedPoint);
            newPoint.x = value;
            this._selectedPoint = newPoint;
            this.changePointAtIndex(newPoint, newPoint.idx, changeMode);
            this.runtimeProps.currentPointX = newPoint.x;
            Invalidate.request();
        }
        return this.runtimeProps.currentPointX;
    }
    currentPointY(value: number, changeMode: ChangeMode): number{
        if (arguments.length && this._selectedPoint){
            var newPoint = Object.assign({}, this._selectedPoint);
            newPoint.y = value;
            this._selectedPoint = newPoint;
            this.changePointAtIndex(newPoint, newPoint.idx, changeMode);
            this.runtimeProps.currentPointY = newPoint.y;
            Invalidate.request();
        }
        return this.runtimeProps.currentPointY;
    }
    currentPointType(value: PointType, changeMode: ChangeMode): PointType{
        if (arguments.length && this._selectedPoint){
            this._selectedPoint.type = value;
            Invalidate.request();
            Selection.reselect();
        }
        return this._selectedPoint ? this._selectedPoint.type : null;
    }

    fromSvgString(d, matrix) {
        var path = d.match(/[mzlhvcsqta][^mzlhvcsqta]*/gi);
        var svgCommands = this._parsePath(path);
        this._renderSvgCommands(svgCommands, matrix);
        this.adjustBoundaries();
    }

    _splitPoints(path) {
        var state = 0;
        var res = [];
        var pos = 0;

        for (var i = 0; i < path.length; ++i) {
            var c = path[i];
            switch (state) {
                case 0: // begining of number
                    if (c >= '0' && c <= '9') {
                        state = 1;
                        pos = i;
                    }
                    else if (c == '.') {
                        state = 2;
                        pos = i;
                    }
                    else if (c === '-') {
                        state = 1;
                        pos = i;
                    }
                    break;
                case 1: // start of first part
                    if (c >= '0' && c <= '9') {
                        state = 1;
                    }
                    else if (c == '.') {
                        state = 2;
                    }
                    else {
                        // dump symbol
                        res.push(path.substr(pos, i - pos))
                        state = 0;
                        i--;
                    }
                    break;
                case 2: // start of the second part after .
                    if (c >= '0' && c <= '9') {
                        state = 2;
                    }
                    else {
                        // dump symbol
                        res.push(path.substr(pos, i - pos))
                        state = 0;
                        i--;
                    }
                    break;
            }
        }
        res.push(path.substr(pos, path.length - pos));

        return res;
    }

    _parsePath(path) {
        var result = [],
            currentPath,
            chunks,
            parsed;

        for (var i = 0, chunksParsed, len = path.length; i < len; i++) {
            currentPath = path[i];
            chunks = this._splitPoints(currentPath.slice(1).trim());
            chunksParsed = [currentPath.charAt(0)];

            for (var j = 0, jlen = chunks.length; j < jlen; j++) {
                parsed = parseFloat(chunks[j]);
                if (!isNaN(parsed)) {
                    chunksParsed.push(parsed);
                }
            }

            var command = chunksParsed[0].toLowerCase(),
                commandLength = commandLengths[command];

            if (chunksParsed.length - 1 > commandLength) {
                for (var k = 1, klen = chunksParsed.length; k < klen; k += commandLength) {
                    result.push([chunksParsed[0]].concat(chunksParsed.slice(k, k + commandLength)));
                }
            }
            else {
                result.push(chunksParsed);
            }
        }

        return result;
    }

    transform(matrix){
        var points = this.points;
        for(var i = 0; i < points.length; ++i) {
            var point = points[i];
            var p = matrix.transformPoint2(point.x, point.y);
            point.x = p.x;
            point.y = p.y;
            if(point.cp1x !== undefined) {
                var cp1 = matrix.transformPoint2(point.cp1x, point.cp1y);
                point.cp1x = cp1.x;
                point.cp1y = cp1.y;
            }
            if(point.cp2x != undefined) {
                var cp2 = matrix.transformPoint2(point.cp2x, point.cp2y);
                point.cp2x = cp2.x;
                point.cp2y = cp2.y;
            }
        }
        this.adjustBoundaries();
    }

    resetGlobalViewCache(){
        super.resetGlobalViewCache.apply(this, arguments);
        delete this.runtimeProps.bb;
    }

    _renderSvgCommands(commands, matrix) {
        var current, // current instruction
            previous = null,
            x = 0, // current x
            y = 0, // current y
            controlX = 0, // current control point x
            controlY = 0, // current control point y
            tempX,
            tempY,
            scaleX = 1,
            scaleY = 1,
            tempControlX,
            tempControlY,
            l = 0,//this.x(),//-((this.width() / 2) + this.pathOffset.x),
            t = 0;//this.y();//-((this.height() / 2) + this.pathOffset.y);

        for (var i = 0, len = commands.length; i < len; ++i) {

            current = commands[i];

            switch (current[0]) { // first letter

                case 'l': // lineto, relative
                    x += current[1] * scaleX;
                    y += current[2] * scaleY;
                    this.lineToPoint(matrix.transformPoint2(x + l, y + t));
                    controlX = null;
                    controlY = null;
                    break;

                case 'L': // lineto, absolute
                    x = current[1] * scaleX;
                    y = current[2] * scaleY;
                    this.lineToPoint(matrix.transformPoint2(x + l, y + t));
                    controlX = null;
                    controlY = null;
                    break;

                case 'h': // horizontal lineto, relative
                    x += current[1] * scaleX;
                    this.lineToPoint(matrix.transformPoint2(x + l, y + t));
                    controlX = null;
                    controlY = null;
                    break;

                case 'H': // horizontal lineto, absolute
                    x = current[1] * scaleX;
                    this.lineToPoint(matrix.transformPoint2(x + l, y + t));
                    controlX = null;
                    controlY = null;
                    break;

                case 'v': // vertical lineto, relative
                    y += current[1] * scaleY;
                    this.lineToPoint(matrix.transformPoint2(x + l, y + t));
                    controlX = null;
                    controlY = null;
                    break;

                case 'V': // verical lineto, absolute
                    y = current[1] * scaleY;
                    this.lineToPoint(matrix.transformPoint2(x + l, y + t));
                    controlX = null;
                    controlY = null;
                    break;

                case 'm': // moveTo, relative
                    x += current[1] * scaleX;
                    y += current[2] * scaleY;
                    // draw a line if previous command was moveTo as well (otherwise, it will have no effect)
                    this[(previous && (previous[0] === 'm' || previous[0] === 'M')) ? 'lineToPoint' : 'moveToPoint'](matrix.transformPoint2(x + l, y + t));
                    controlX = null;
                    controlY = null;
                    break;

                case 'M': // moveTo, absolute
                    x = current[1] * scaleX;
                    y = current[2] * scaleY;
                    // draw a line if previous command was moveTo as well (otherwise, it will have no effect)
                    this[(previous && (previous[0] === 'm' || previous[0] === 'M')) ? 'lineToPoint' : 'moveToPoint'](matrix.transformPoint2(x + l, y + t));
                    controlX = null;
                    controlY = null;
                    break;

                case 'c': // bezierCurveTo, relative
                    tempX = x + current[5] * scaleX;
                    tempY = y + current[6] * scaleY;
                    controlX = x + current[3] * scaleX;
                    controlY = y + current[4] * scaleY;
                    this.curveToPoint(
                        matrix.transformPoint2(tempX + l,
                            tempY + t),
                        matrix.transformPoint2(x + current[1] * scaleX + l, // x1
                            y + current[2] * scaleY + t), // y1
                        matrix.transformPoint2(controlX + l, // x2
                            controlY + t)
                    );
                    x = tempX;
                    y = tempY;
                    break;

                case 'C': // bezierCurveTo, absolute
                    x = current[5] * scaleX;
                    y = current[6] * scaleY;
                    controlX = current[3] * scaleX;
                    controlY = current[4] * scaleY;
                    this.curveToPoint(
                        matrix.transformPoint2(x + l, y + t),
                        matrix.transformPoint2(current[1] * scaleX + l, current[2] * scaleY + t),
                        matrix.transformPoint2(controlX + l, controlY + t)
                    );
                    break;

                case 's': // shorthand cubic bezierCurveTo, relative

                    // transform to absolute x,y
                    tempX = x + current[3] * scaleX;
                    tempY = y + current[4] * scaleY;

                    // calculate reflection of previous control points
                    controlX = controlX ? (2 * x - controlX) : x;
                    controlY = controlY ? (2 * y - controlY) : y;

                    this.curveToPoint(
                        matrix.transformPoint2(tempX + l, tempY + t),
                        matrix.transformPoint2(controlX + l, controlY + t),
                        matrix.transformPoint2(x + current[1] * scaleX + l, y + current[2] * scaleY + t)
                    );
                    // set control point to 2nd one of this command
                    // "... the first control point is assumed to be the reflection of the second control point on the previous command relative to the current point."
                    controlX = x + current[1] * scaleX;
                    controlY = y + current[2] * scaleY;

                    x = tempX;
                    y = tempY;
                    break;

                case 'S': // shorthand cubic bezierCurveTo, absolute
                    tempX = current[3] * scaleX;
                    tempY = current[4] * scaleY;
                    // calculate reflection of previous control points
                    controlX = controlX ? (2 * x - controlX) : x;
                    controlY = controlY ? (2 * y - controlY) : y;

                    this.curveToPoint(
                        matrix.transformPoint2(tempX + l, tempY + t),
                        matrix.transformPoint2(controlX + l, controlY + t),
                        matrix.transformPoint2(current[1] * scaleX + l, current[2] * scaleY + t)
                    );
                    x = tempX;
                    y = tempY;

                    // set control point to 2nd one of this command
                    // "... the first control point is assumed to be the reflection of the second control point on the previous command relative to the current point."
                    controlX = current[1] * scaleX;
                    controlY = current[2] * scaleY;

                    break;

                case 'q': // quadraticCurveTo, relative
                    // transform to absolute x,y
                    tempX = x + current[3] * scaleX;
                    tempY = y + current[4] * scaleY;

                    controlX = x + current[1] * scaleX;
                    controlY = y + current[2] * scaleY;

                    this.quadraticCurveToPoint(
                        matrix.transformPoint2(controlX + l, controlY + t),
                        matrix.transformPoint2(tempX + l, tempY + t)
                    );
                    x = tempX;
                    y = tempY;
                    break;

                case 'Q': // quadraticCurveTo, absolute
                    tempX = current[3] * scaleX;
                    tempY = current[4] * scaleY;

                    this.quadraticCurveToPoint(
                        matrix.transformPoint2(current[1] * scaleX + l, current[2] * scaleY + t),
                        matrix.transformPoint2(tempX + l, tempY + t)
                    );
                    x = tempX;
                    y = tempY;
                    controlX = current[1] * scaleX;
                    controlY = current[2] * scaleY;
                    break;

                case 't': // shorthand quadraticCurveTo, relative

                    // transform to absolute x,y
                    tempX = x + current[1] * scaleX;
                    tempY = y + current[2] * scaleY;


                    if (previous[0].match(/[QqTt]/) === null) {
                        // If there is no previous command or if the previous command was not a Q, q, T or t,
                        // assume the control point is coincident with the current point
                        controlX = x;
                        controlY = y;
                    }
                    else if (previous[0] === 't') {
                        // calculate reflection of previous control points for t
                        controlX = 2 * x - tempControlX;
                        controlY = 2 * y - tempControlY;
                    }
                    else if (previous[0] === 'q') {
                        // calculate reflection of previous control points for q
                        controlX = 2 * x - controlX;
                        controlY = 2 * y - controlY;
                    }

                    tempControlX = controlX;
                    tempControlY = controlY;

                    this.quadraticCurveToPoint(
                        matrix.transformPoint2(controlX + l, controlY + t),
                        matrix.transformPoint2(tempX + l, tempY + t)
                    );
                    x = tempX;
                    y = tempY;
                    controlX = x + current[1] * scaleX;
                    controlY = y + current[2] * scaleY;
                    break;

                case 'T':
                    tempX = current[1] * scaleX;
                    tempY = current[2] * scaleY;

                    // calculate reflection of previous control points
                    controlX = 2 * x - controlX;
                    controlY = 2 * y - controlY;
                    this.quadraticCurveToPoint(
                        matrix.transformPoint2(controlX + l, controlY + t),
                        matrix.transformPoint2(tempX + l, tempY + t)
                    );
                    x = tempX;
                    y = tempY;
                    break;

                case 'a':
                    // TODO: optimize this
                    drawArc(this, x + l, y + t, [
                        current[1] * scaleX,
                        current[2] * scaleY,
                        current[3],
                        current[4],
                        current[5],
                        current[6] * scaleX + x + l,
                        current[7] * scaleY + y + t
                    ], matrix);
                    x += current[6] * scaleX;
                    y += current[7] * scaleY;
                    controlX = null;
                    controlY = null;
                    break;

                case 'A':
                    // TODO: optimize this
                    drawArc(this, x + l, y + t, [
                        current[1] * scaleX,
                        current[2] * scaleY,
                        current[3],
                        current[4],
                        current[5],
                        current[6] * scaleX + l,
                        current[7] * scaleY + t
                    ], matrix);
                    x = current[6] * scaleX;
                    y = current[7] * scaleY;
                    controlX = null;
                    controlY = null;
                    break;

                case 'z':
                case 'Z':
                    this.closeAtPoint();
                    controlX = null;
                    controlY = null;
                    break;
            }
            previous = current;
        }
    }

    static smoothPoint = function (p, p1, p2, eps) {
        var vx = p2.x - p1.x
            , vy = p2.y - p1.y
            , d = Math.sqrt(vx * vx + vy * vy)
            , res: any = {x: p.x, y: p.y};
        vx = vx / d * eps;
        vy = vy / d * eps;

        res.cp1x = p.x - vx;
        res.cp2x = p.x + vx;
        res.cp1y = p.y - vy;
        res.cp2y = p.y + vy;

        return res;
    }

    static fromSvgPathElement(element, parsedAttributes, matrix) {
        // var parsedAttributes = svgParser.parseAttributes(element, ATTRIBUTE_NAMES);
        var path = new Path();

        App.Current.activePage.nameProvider.assignNewName(path);

        setElementPropertiesFromAttributes(path, parsedAttributes);

        // polygon
        if (parsedAttributes.points) {
            var pairs = parsedAttributes.points.replace('\n', ' ').replace('\r', ' ').split(' ');
            for (var i = 0; i < pairs.length; ++i) {
                var pair = pairs[i];
                if (pair) {
                    var xy = pair.split(',');
                    var point = {x: parseFloat(xy[0]), y: parseFloat(xy[1])};
                    point = matrix.transformPoint(point);
                    path.addPoint(point);
                }
            }
            path.closed(true);
        }

        if (parsedAttributes.d) {
            path.fromSvgString(parsedAttributes.d, matrix);
        }


        path.adjustBoundaries();

        return path;
    }

    static fromSvgLineElement(element, parsedAttributes, matrix) {
        // var parsedAttributes = svgParser.parseAttributes(element, ATTRIBUTE_NAMES);
        var path = new Path();

        App.Current.activePage.nameProvider.assignNewName(path);

        setElementPropertiesFromAttributes(path, parsedAttributes);

        path.addPoint(matrix.transformPoint({x: parsedAttributes.x1 || 0, y: parsedAttributes.y1 || 0}));
        path.addPoint(matrix.transformPoint({x: parsedAttributes.x2 || 0, y: parsedAttributes.y2 || 0}));

        path.adjustBoundaries();

        return path;
    }

    static fromSvgPolylineElement(element, parsedAttributes, matrix) {
        // var parsedAttributes = svgParser.parseAttributes(element, ATTRIBUTE_NAMES);
        var path = new Path();
        App.Current.activePage.nameProvider.assignNewName(path);

        setElementPropertiesFromAttributes(path, parsedAttributes);

        if (parsedAttributes.points) {
            var pairs = parsedAttributes.points.replace('\n', ' ').replace('\r', ' ').split(' ');
            for (var i = 0; i < pairs.length; ++i) {
                var pair = pairs[i];
                if (pair) {
                    var xy = pair.split(',');
                    path.addPoint(matrix.transformPoint({x: parseFloat(xy[0]), y: parseFloat(xy[1])}));
                }
            }
        }

        path.adjustBoundaries();

        return path;
    }

    static translatePoints(points, left, top) {
        var newPoints = [];
        for (var i = 0, l = points.length; i < l; ++i) {
            var pt = clone(points[i]);
            pt.x = pt.x - left;
            pt.cp1x = pt.cp1x - left;
            pt.cp2x = pt.cp2x - left;

            pt.y = pt.y - top;
            pt.cp1y = pt.cp1y - top;
            pt.cp2y = pt.cp2y - top;

            //this._roundPoint(pt);
            newPoints.push(pt);
        }
        return newPoints;
    }
    static pointsToSvg(points, closed) {
        var d = "";
        if (!points.length) {
            return d;
        }
        d = "M " + points[0].x + "," + points[0].y;
        for (var i = 1, len = points.length; i < len; ++i) {
            d += "\r\n" + svgCommand(points[i], points[i - 1]);
        }
        if (closed) {
            d += "\r\n" + " Z";
        }
        return d;
    }

    static circleAtPoint(center, radius) {

        const MagicNumber = 0.55228475;
        var controlPointLength = radius * MagicNumber;
        var path = new Path();
        path.addPoint({
            x: center.x - radius,
            y: center.y,
            cp1x: center.x - radius,
            cp1y: center.y - controlPointLength,
            cp2x: center.x - radius,
            cp2y: center.y + controlPointLength
        });

        path.addPoint({
            x: center.x,
            y: center.y + radius,
            cp1x: center.x - controlPointLength,
            cp1y: center.y + radius,
            cp2x: center.x + controlPointLength,
            cp2y: center.y + radius
        });


        path.addPoint({
            x: center.x + radius,
            y: center.y,
            cp1x: center.x + radius,
            cp1y: center.y + controlPointLength,
            cp2x: center.x + radius,
            cp2y: center.y - controlPointLength
        });

        path.addPoint({
            x: center.x,
            y: center.y - radius,
            cp1x: center.x + controlPointLength,
            cp1y: center.y - radius,
            cp2x: center.x - controlPointLength,
            cp2y: center.y - radius
        });

        path.closed(true);
        path.adjustBoundaries();
        return path;
    }

    static rectangle(x, y, width, height) {
        var path = new Path();
        path.addPoint({
            x: x,
            y: y
        });

        path.addPoint({
            x: x + width,
            y: y
        });

        path.addPoint({
            x: x + width,
            y: y + height
        });

        path.addPoint({
            x: x,
            y: y + height
        });

        path.closed(true);
        path.adjustBoundaries();

        return path;
    }
}
Path.prototype.t = Types.Path;

PropertyMetadata.registerForType(Path, {
    closed: {
        defaultValue: false,
        type: "checkbox",
        useInModel: true,
        editable: true,
        displayName: "Closed"
    },
    currentPointX: {
        displayName: "X",
        type: "numeric",
        defaultValue: 0,
        computed: true
    },
    currentPointY: {
        displayName: "Y",
        type: "numeric",
        defaultValue: 0,
        computed: true
    },
    currentPointType: {
        displayName: "Point type",
        type: "multiSwitch",
        defaultValue: null,
        computed: true,
        options: {
            items: [
                {value: PointType.Straight, icon: "ico-prop_node-straight"},
                {value: PointType.Mirrored, icon: "ico-prop_node-mirrroed"},
                {value: PointType.Assymetric, icon: "ico-prop_node-assymetric"},
                {value: PointType.Disconnected, icon: "ico-prop_node-disconnected"}
            ],
            size: 3 / 4
        }
    },
    mode: {
        editable: false,
        useInModel: false,
        defaultValue: "resize"
    },
    points: {
        defaultValue: []
    },
    groups (path) {
        var baseGroups = PropertyMetadata.findAll(Types.Shape).groups();

        if (path && path.mode() === "edit"){
            return [
                {
                    label: path.displayType(),
                    properties: ["pointRounding"]
                },
                {
                    label: "@selectedPoint",
                    properties: ["currentPointX", "currentPointY", "currentPointType"]
                },
                baseGroups.find(x => x.label === "Appearance"),
                baseGroups.find(x => x.label === "@shadow")
            ];
        }

        return baseGroups;
    },
    prepareVisibility(props){
        var editMode = props.mode === "edit";
        var pointSelected = props.selectedPointIdx !== -1;
        return {
            currentPointX: editMode && pointSelected,
            currentPointY: editMode && pointSelected,
            currentPointType: editMode && pointSelected,
            pointRounding: editMode
        };
    }
});


function setElementPropertiesFromAttributes(element, parsedAttributes) {
    element.setProps({pointRounding: 0});

    if (parsedAttributes.fill !== undefined) {
        if (!parsedAttributes.fill || parsedAttributes.fill == "none") {
            element.fill(Brush.Empty);
        } else {
            element.fill(Brush.createFromColor(parsedAttributes.fill));
        }
    }
    else {
        element.fill(Brush.Black);
    }

    if (parsedAttributes.stroke) {
        element.stroke(Brush.createFromColor(parsedAttributes.stroke/*, parsedAttributes.strokeWidth, 0*/));
    } else {
        element.stroke(Brush.Empty);
    }

    if (parsedAttributes.opacity) {
        element.opacity(parsedAttributes.opacity);
    }

    if (parsedAttributes.miterLimit != undefined) {
        element.miterLimit(parsedAttributes.miterLimit);
    }

    if (parsedAttributes.lineJoin) {
        element.lineJoin(parsedAttributes.lineJoin);
    }

    if (parsedAttributes.lineCap) {
        element.lineCap(parsedAttributes.lineCap);
    }

    if (parsedAttributes.id) {
        element.name(parsedAttributes.id);
    }
}


function svgCommand(pt, prevPt) {
    if (isLinePoint(pt) && isLinePoint(prevPt)) { // line segment
        return "L " + pt.x + "," + pt.y;
    }
    // cubic bezier segment
    var cp1x = prevPt.cp2x
        , cp1y = prevPt.cp2y
        , cp2x = pt.cp1x
        , cp2y = pt.cp1y;

    if (isLinePoint(prevPt)) {
        cp1x = prevPt.x;//cp2x;
        cp1y = prevPt.y;//cp2y;
    } else if (isLinePoint(pt)) {
        cp2x = pt.x;//cp1x;
        cp2y = pt.y;//cp1y;
    }

    return "C " + cp1x + "," + cp1y + " " + cp2x + "," + cp2y + " " + pt.x + "," + pt.y;
}

export default Path;
