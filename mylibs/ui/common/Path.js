import UIElement from "framework/UIElement";
import nearestPoint from  "math/NearestPoint";
import BezierGraph from "math/bezierGraph";
import BezierCurve from "math/bezierCurve";
import ResizeDimension from "framework/ResizeDimension";
import InsertPathPointCommand from "commands/path/InsertPathPointCommand";
import ChangePathPointCommand from "commands/path/ChangePathPointCommand";
import commandManager from "framework/commands/CommandManager";
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

var CP_HANDLE_RADIUS = 3;
var CP_HANDLE_RADIUS2 = 6;
var CP_RADIUS = 4;
var CP_RADIUS2 = 8;

const POINT_STROKE = "#1592E6";
const POINT_FILL = "#fff";

var PointType = {
    Straight: 0,
    Mirrored: 1,
    Disconnected: 2,
    Assymetric: 3
}

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
            this.setProps({currentPointType: pt.type, currentPointX: pt.x, currentPointY: pt.y});
        } else {
            this.setProps({currentPointType: null, currentPointX: 0, currentPointY: 0});
        }
        this._internalChange = true;
        Selection.refreshSelection();
        this._internalChange = false;
    }
}

var isLinePoint = function (pt) {
    return pt.type === PointType.Straight;
};

var getClickedPoint = function (x, y) {
    var pos = this.globalViewMatrixInverted().transformPoint2(x, y);

    var zoom = Environment.view.scale();
    var sx = 1,
        sy = 1;
    if (this._sourceRect) {
        sx = this.width() / this._sourceRect.width;
        sy = this.height() / this._sourceRect.height;
    }

    for (var i = 0, len = this.points.length; i < len; ++i) {
        var pt = this.points[i];
        pt.idx = i;
        var x2 = pos.x - pt.x * sx
            , y2 = pos.y - pt.y * sy;
        if (x2 * x2 + y2 * y2 < CP_RADIUS2 / (zoom * zoom)) {
            return pt;
        }
    }
    return null;
};

var getClickedHandlePoint = function (x, y) {
    var pos = this.globalViewMatrixInverted().transformPoint2(x, y);

    var zoom = Environment.view.scale() * Environment.view.contextScale;
    var sx = 1,
        sy = 1;
    if (this._sourceRect) {
        sx = this.width() / this._sourceRect.width;
        sy = this.height() / this._sourceRect.height;
    }


    for (var i = 0, len = this.points.length; i < len; ++i) {
        var pt = this.points[i];
        pt.idx = i;
        if (isLinePoint(pt)) {
            continue;
        }
        var x2 = pos.x - pt.cp1x * sx
            , y2 = pos.y - pt.cp1y * sy;
        if (x2 * x2 + y2 * y2 < CP_HANDLE_RADIUS2 / (zoom * zoom)) {
            pt._selectedPoint = 1;
            return pt;
        }

        x2 = pos.x - pt.cp2x * sx;
        y2 = pos.y - pt.cp2y * sy;
        if (x2 * x2 + y2 * y2 < CP_HANDLE_RADIUS2 / (zoom * zoom)) {
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

var drawSegment = function (context, pt, prevPt, sx, sy) {
    if (isLinePoint(pt) && isLinePoint(prevPt)) { // line segment
        context.lineTo(pt.x * sx, pt.y * sy);
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

        context.bezierCurveTo(cp1x * sx, cp1y * sy, cp2x * sx, cp2y * sy, pt.x * sx, pt.y * sy);
    }
};

var scalePointsToNewSize = function (rect, oldRect) {
    oldRect.height = oldRect.height || 0.01;
    oldRect.width = oldRect.width || 0.01;
    rect.height = rect.height || 0.01;
    rect.width = rect.width || 0.01;

    if (rect.x == oldRect.x || rect.width != oldRect.width) {
        var scale = rect.width / oldRect.width;
        for (var i = 0; i < this.points.length; ++i) {
            var pt = this.points[i];
            pt.x *= scale;
            pt.cp1x *= scale;
            pt.cp2x *= scale;
            this._roundPoint(pt);
        }
    }

    if (this.flipHorizontal()) {
        for (var i = 0; i < this.points.length; ++i) {
            var pt = this.points[i];
            pt.x = rect.width - pt.x;
            pt.cp1x = rect.width - pt.cp1x;
            pt.cp2x = rect.width - pt.cp2x;
            this._roundPoint(pt)
        }
        this.flipHorizontal(false);
    }

    if (rect.y == oldRect.y || rect.height != oldRect.height) {
        scale = rect.height / oldRect.height;

        for (i = 0; i < this.points.length; ++i) {
            pt = this.points[i];
            pt.y *= scale;
            pt.cp1y *= scale;
            pt.cp2y *= scale;
            this._roundPoint(pt);
        }
    }

    if (this.flipVertical()) {
        for (var i = 0; i < this.points.length; ++i) {
            var pt = this.points[i];
            pt.y = rect.height - pt.y;
            pt.cp1y = rect.height - pt.cp1y;
            pt.cp2y = rect.height - pt.cp2y;
        }
        this.flipVertical(false);
    }

    this._sourceRect.width = rect.width;
    this._sourceRect.height = rect.height;
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
        this._roundPoint(pt);
    }
}

class Path extends Shape {
    constructor() {
        super();
        this.points = [];
        this._lastPoints = [];
        this._currentPoint = null;
        this.save = debounce(this._save.bind(this), 500);
    }

    _save() {
        var newPoints = this.points.slice();
        this.props.points = this._lastPoints;
        this.setProps({points: newPoints});
        this._lastPoints = this.points;
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

    set nextPoint(value){
        if(value != this._nextPoint){
            Invalidate.requestUpperOnly();
        }
        this._nextPoint = value;
        if(this._nextPoint){
            this._initPoint(value);
        }
    }

    get nextPoint(){
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

    _roundvalue(value) {
        if (this.props.pointRounding === 0) {
            value = (0 | value * 100) / 100;
        } else if (this.props.pointRounding === 1) {
            value = (0 | value * 2 + .5) / 2;
        } else {
            value = Math.round(value);
        }

        return value;
    }

    _roundPoint(pt) {
        var x,y;
        if (this.props.pointRounding === 0) {
            x = (0 | pt.x * 100) / 100;
            y = (0 | pt.y * 100) / 100;
        } else if (this.props.pointRounding === 1) {
            x = (0 | pt.x * 2 + .5) / 2;
            y = (0 | pt.y * 2 + .5) / 2;
        } else {
            x = Math.round(pt.x);
            y = Math.round(pt.y);
        }
        if(pt.type != PointType.Straight && pt.type !== undefined) {
            var dx = pt.x - x;
            var dy = pt.y - y;
            pt.cp1x -= dx;
            pt.cp2x -= dx;
            pt.cp1y -= dy;
            pt.cp2y -= dy;
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

    mode(value) {
        if (arguments.length > 0) {
            if (value === "edit") {
                if (this.mode() !== "edit") {
                    this.switchToEditMode(true);
                }
            } else {
                this.switchToEditMode(false);
            }

            this.setProps({mode: value});
        }

        return this.props.mode;
    }

    switchToEditMode(edit) {
        if (edit) {
            this._currentPoint = null;
            if (this._sourceRect) {
                scalePointsToNewSize.call(this, this.getBoundaryRect(), this._sourceRect);
                this.save();
                this.captureMouse();
            }
            SnapController.calculateSnappingPointsForPath(this);
        } else {
            this.releaseMouse();
        }
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

    changePointAtIndex(point, idx) {
        this.points.splice(idx, 1, point);
        if (this.mode() === 'edit') {
            SnapController.calculateSnappingPointsForPath(this);
        }

        this.save();
    }

    length() {
        return this.points.length;
    }

    select() {
        this._selected = true;
        this.registerForLayerDraw(2);
        Invalidate.request();
    }

    unselect() {
        this._selected = false;
        this.unregisterForLayerDraw(2);
        if (!this._internalChange) {
            Invalidate.request();
            this.mode("resize");
            this.releaseMouse();
        }
    }

    edit(){
        this.mode("edit");
        this._internalChange = true;
        Selection.refreshSelection();
        this._internalChange = false;
    }

    dblclick(event) {
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
            }
        }
    }

    mouseup() {
        delete this._altPressed;

        if (this._bendingData) {
            this._bendingData = null;
            SnapController.clearActiveSnapLines();
            this._currentPoint = null;
            this._handlePoint = null;
            this.releaseMouse();
            this.adjustBoundaries();
            this.invalidate();
            return;
        }

        var pt = this._currentPoint || this._handlePoint;
        if (pt != null) {
            SnapController.clearActiveSnapLines();
            this._currentPoint = null;
            this._handlePoint = null;
            this.releaseMouse();
            if (!pointsEqual(pt, this._originalPoint)) {
                this.adjustBoundaries();
                this.changePointAtIndex(pt, pt.idx);
                //  commandManager.execute(new ChangePathPointCommand(this, pt, this._originalPoint));
            }
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

    mousedown(event) {
        var x = event.x,
            y = event.y;

        if (this.mode() !== "edit") {
            return;
        }

        var pt = getClickedPoint.call(this, x, y);

        updateSelectedPoint.call(this, pt);

        if (pt != null) {
            event.handled = true;
            if (event.event.altKey) {
                this._altPressed = true;
                this._handlePoint = pt;
                this._handlePoint._selectedPoint = 0;
            } else {
                this._currentPoint = pt;
            }
            this._originalPoint = clone(pt);
            this._pointOnPath = null;
            this.captureMouse();
        } else {
            pt = getClickedHandlePoint.call(this, x, y);
            if (pt != null) {
                event.handled = true;
                this._handlePoint = pt;
                this._originalPoint = clone(pt);
                this._pointOnPath = null;
                this.captureMouse();
            } else if (this._pointOnPath) {
                event.handled = true;

                if (!event.event.altKey) {
                    this._bendingData = this.calculateOriginalBendingData(this._pointOnPath);
                    // set bending handler
                    this._pointOnPath = null;
                    this.captureMouse();
                    return;
                }


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
        }
    }

    mousemove(event) {
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
                this._currentPoint.x = newX;
                this._currentPoint.y = newY;

                this._currentPoint.cp1x -= dx;
                this._currentPoint.cp1y -= dy;
                this._currentPoint.cp2x -= dx;
                this._currentPoint.cp2y -= dy;

                // this._roundPoint(this._currentPoint);


                this.setProps({currentPointX: newX, currentPointY: newY});

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
            var x = pt.x,
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

        var pt = this.getPointIfClose({x: event.x, y: event.y});
        if (this._pointOnPath !== pt) {
            this._pointOnPath = pt;
            if (pt) {
                this.captureMouse();
            } else {
                this.releaseMouse();
            }
            Invalidate.requestUpperOnly();
        }


        // highligh hover points
        function updateHoverPoint(pt) {
            if (this._hoverPoint !== pt) {
                this._hoverPoint = pt;
                Invalidate.requestUpperOnly();
            }

            return pt;
        }

        function updateHoverHandlePoint(pt) {
            if (this._hoverHandlePoint !== pt) {
                this._hoverHandlePoint = pt;
                Invalidate.requestUpperOnly();
            }

            return pt;
        }

        var x = event.x, y = event.y;
        var pt = getClickedPoint.call(this, x, y);
        if (!updateHoverPoint.call(this, pt)) {

            pt = getClickedHandlePoint.call(this, x, y);
            updateHoverHandlePoint.call(this, pt);
        }

        if (pt) {
            this.captureMouse();
        } else {
            this.releaseMouse()
        }
    }

    closed(value) {
        if (value !== undefined) {
            this.setProps({closed: value});
        }
        return this.props.closed;
    }

    prepareProps(changes){
        if (changes.width !== undefined && changes.width < 1) {
            changes.width = 1;
        }

        if (changes.height !== undefined && changes.height < 1) {
            changes.height = 1;
        }

        if (changes.currentPointX !== undefined && this._currentPoint) {
            changes.currentPointX = this._roundvalue(changes.currentPointX);
        }

        if (changes.currentPointY !== undefined && this._currentPoint) {
            changes.currentPointY = this._roundvalue(changes.currentPointY);
        }

        if (changes.pointRounding) {
            moveAllPoints.call(this, 0, 0);
        }
    }

    propsUpdated(props, oldProps) {
        if (props.currentPointType !== undefined && this._selectedPoint) {
            this._selectedPoint.type = props.currentPointType;
            Invalidate.request();
        }

        UIElement.prototype.propsUpdated.apply(this, arguments);
    }

    hitTest(point, scale) {
        if (this._currentPoint || this._handlePoint || this._pointOnPath) {
            return true;
        }

        if ((getClickedPoint.call(this, point.x, point.y) != null)
            || (getClickedHandlePoint.call(this, point.x, point.y) != null)) {
            return true;
        }
        var res = UIElement.prototype.hitTest.apply(this, arguments);
        if (res) {
            var brush = this.backgroundBrush();
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

                var graph = BezierGraph.fromPath(this);

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

    selectFrameVisible() {
        return this.mode() !== "edit";
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
            matrix.applyToContext(context);
            var w = this.props.width,
                h = this.props.height;
            var sx = 1,
                sy = 1;
            if (this._sourceRect) {
                sx = w / this._sourceRect.width;
                sy = h / this._sourceRect.height;
            }

            this.drawPath(context, w, h);
            if(this.nextPoint && this.points.length && !this.closed()){
                drawSegment.call(this, context, this.nextPoint, this.points[this.points.length-1], sx, sy);
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

            var handlePoint = this._handlePoint || this._hoverHandlePoint;
            var hoverPoint = this._currentPoint || this._hoverPoint;

            for (var i = 0, len = this.points.length; i < len; ++i) {
                var pt = this.points[i];
                var tpt = {x: pt.x * sx, y: pt.y * sy};

                clearStyle();

                if (!isLinePoint(pt)) {

                    var cp1 = {x: pt.cp1x * sx, y: pt.cp1y * sy};
                    var cp2 = {x: pt.cp2x * sx, y: pt.cp2y * sy};
                    context.beginPath();
                    context.moveTo(cp1.x, cp1.y);
                    context.lineTo(pt.x, pt.y);
                    context.lineTo(cp2.x, cp2.y);
                    context.stroke();

                    if (pt === handlePoint && (handlePoint._selectedPoint == 1 || this._altPressed)) {
                        context.fillStyle = POINT_STROKE;
                        needClearStyle = true;
                    }

                    context.circle(cp1.x, cp1.y, CP_HANDLE_RADIUS / scale);
                    context.fill();
                    context.stroke();

                    clearStyle();

                    if (pt === handlePoint && (handlePoint._selectedPoint == 2 || this._altPressed)) {
                        context.fillStyle = POINT_STROKE;
                        needClearStyle = true;
                    }
                    context.circle(cp2.x, cp2.y, CP_HANDLE_RADIUS / scale);
                    context.fill();
                    context.stroke();

                    clearStyle();
                }
                if (pt === hoverPoint || pt === this._selectedPoint) {
                    context.fillStyle = POINT_STROKE;
                    needClearStyle = true;
                }

                context.circle(tpt.x, tpt.y, CP_RADIUS / scale);
                context.fill();
                context.stroke();
            }

            if (this._pointOnPath) {
                context.fillStyle = POINT_STROKE;
                context.circle(this._pointOnPath.x, this._pointOnPath.y, CP_RADIUS / scale);
                context.fill2();
            }
            context.restore();
        }
    }

    drawPath(context, w, h) {
        if (this.points.length == 0) {
            return;
        }

        var sx = 1, sy = 1;
        if (this._sourceRect) {
            sx = w / this._sourceRect.width;
            sy = h / this._sourceRect.height;
        }

        var pt;
        var points = this.points;
        var prevPt = pt = points[0];
        context.moveTo(pt.x * sx, pt.y * sy);
        for (var i = 1, len = points.length; i < len; ++i) {
            pt = points[i];
            drawSegment.call(this, context, pt, prevPt, sx, sy);
            prevPt = pt;
        }
        if (this.closed()) {
            drawSegment.call(this, context, points[0], prevPt, sx, sy);
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
    //     Brush.fill(this.backgroundBrush(), context, 0, 0, w, h);
    //     context.lineWidth = this.borderWidth();
    //     Brush.stroke(this.borderBrush(), context, 0, 0, w, h);
    //
    //     context.restore();
    // },

    getBoundingBoxGlobal(includeMargin = false, includeBorder = false) {
        if (this.runtimeProps.globalClippingBox) {
            return this.runtimeProps.globalClippingBox;
        }

        var rect = this.getBoundaryRect();
        var minx = rect.x;
        var miny = rect.y;
        var maxx = rect.x + rect.width;
        var maxy = rect.y + rect.height;

        for (var i = 0; i < this.points.length; ++i) {
            var p = this.points[i];
            minx = Math.min(minx, p.x);
            minx = Math.min(minx, p.cp1x);
            minx = Math.min(minx, p.cp2x);
            miny = Math.min(miny, p.y);
            miny = Math.min(miny, p.cp1y);
            miny = Math.min(miny, p.cp2y);

            maxx = Math.max(maxx, p.x);
            maxx = Math.max(maxx, p.cp1x);
            maxx = Math.max(maxx, p.cp2x);
            maxy = Math.max(maxy, p.y);
            maxy = Math.max(maxy, p.cp1y);
            maxy = Math.max(maxy, p.cp2y);
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

        var matrix = this.globalViewMatrix();

        var p1 = matrix.transformPoint2(minx - l, miny - t);
        var p2 = matrix.transformPoint2(maxx + r, miny - t);
        var p3 = matrix.transformPoint2(maxx + r, maxy + b);
        var p4 = matrix.transformPoint2(minx - l, maxy + b);

        var xs = [p1.x, p2.x, p3.x, p4.x];
        var ys = [p1.y, p2.y, p3.y, p4.y];
        l = sketch.util.min(xs);
        r = sketch.util.max(xs);
        t = sketch.util.min(ys);
        b = sketch.util.max(ys);

        var rect = {x: l, y: t, width: r - l, height: b - t};
        this.runtimeProps.globalClippingBox = rect;
        return rect;
    }

    getGlobalBoundingBox() {
        var graph = new BezierGraph();
        var matrix = this.viewMatrix();
        this.runtimeProps.viewMatrix = new Matrix();
        this.viewMatrix().translate(this.x(), this.y());
        graph.initWithBezierPath(this);//, null, -this.angle(), {x:this.width()/2, y:this.height()/2});
        var b = graph.bounds;
        this.runtimeProps.viewMatrix = matrix;

        return {x: b.x, y: b.y, width: b.width, height: b.height};
    }


    adjustBoundaries() {
        //happens when all add-point commands are rolled back
        if (this.points.length <= 1) {
            return;
        }

        delete this._graph;

        var l = this.x() || 0;
        var t = this.y() || 0;

        var box = this.getGlobalBoundingBox();
        var x = box.x,
            y = box.y,
            width = box.width,
            height = box.height;

        moveAllPoints.call(this, x - l, y - t);


        if (this.angle()) {
            var origin = this.rotationOrigin();

            var angle = this.angle() * Math.PI / 180;
            var newOrigin = sketch.math2d.rotatePoint({
                x: x + width / 2,
                y: y + height / 2
            }, -angle, origin);


            var newLeft = newOrigin.x - width / 2;
            var newTop = newOrigin.y - height / 2;

            x = newLeft;
            y = newTop;
        }

        this._internalChange = true;
        var props = {
            x: x,
            y: y,
            width: Math.round(width),
            height: Math.round(height)
        };
        this._roundPoint(props);
        this.prepareProps(props);
        this.setProps(props);

        this._sourceRect = this.getBoundaryRect();
        this._internalChange = false;

        this.save();
    }

    getInsertPointData(pointInfo) {
        var pt = {x: pointInfo.x, y: pointInfo.y, idx: pointInfo.idx};
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

    getPointIfClose(pos, dist) {
        var matrix = this.globalViewMatrixInverted();
        var sx = 1, sy = 1;
        if (this._sourceRect) {
            sx = this.width() / this._sourceRect.width;
            sy = this.height() / this._sourceRect.height;
        }

        pos = matrix.transformPoint(pos);
        pos.x /= sx;
        pos.y /= sy;
        var resPt = null;
        var prevPt = this.points[0];
        dist = (dist || 4) / Environment.view.scale() * Environment.view.contextScale;

        function checkDistance(pt, prevPt, idx) {
            if (isLinePoint(pt) && isLinePoint(prevPt)) {
                var pr = {x: 0, y: 0, idx: idx};
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

    cursor(event) {
        if (this.mode() !== 'edit') {
            return UIElement.prototype.cursor.apply(this, arguments);
        }

        var pt = getClickedPoint.call(this, event.x, event.y);
        if (pt != null) {
            return 'move_point';
        }

        pt = getClickedHandlePoint.call(this, event.x, event.y);
        if (pt != null) {
            return 'move_handle';
        }

        if (this._pointOnPath && event.event.altKey) {
            return "add_point";
        }


        return UIElement.prototype.cursor.apply(this, arguments);
    }

    toJSON(includeDefaults) {
        var current = UIElement.prototype.toJSON.call(this, includeDefaults);
        // var points = current.points = [];
        // for (var i = 0; i < this.points.length; ++i) {
        //     points.push(clone(this.points[i]));
        // }
        return current;
    }

    clone() {
        var c = super.clone();
        c.points = this.points.slice();
        c._sourceRect = this._sourceRect;
        return c;
    }

    mirrorClone() {
        var c = super.mirrorClone();
        c.points = this.points.slice();
        c._sourceRect = this._sourceRect;
        return c;
    }

    fromJSON(data) {
        this.points.length = 0;

        var current = UIElement.prototype.fromJSON.call(this, data);
        // for (var i = 0; i < data.points.length; ++i) {
        //     this.addPoint(data.points[i]);
        // }

        this._currentPoint = null;
        this._handlePoint = null;
        if (data.props.points && data.props.points.length) {
            this._sourceRect = this.getGlobalBoundingBox();
            this._sourceRect.width = Math.max(this._sourceRect.width, 1);
            this._sourceRect.height = Math.max(this._sourceRect.height, 1);
        }

        return current;
    }

    elements(offset, angle, origin) {
        var points = this.points;
        var res = [];
        if (!points.length) {
            return res;
        }


        offset = offset || {x: 0, y: 0};


        var matrix = this.viewMatrix().clone();

        if (this._sourceRect) {
            matrix.scale(this.width() / this._sourceRect.width, this.height() / this._sourceRect.height);
        }

        if (angle && origin) {
            matrix.rotate(angle, origin.x, origin.y);
        }
        matrix.translate(offset.x, offset.y);

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
    }

    lineToPoint(point) {
        this._lastPoint = this.addPoint(point);
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

}

PropertyMetadata.registerForType(Path, {
    closed: {
        defaultValue: false,
        type: "onOff",
        useInModel: true,
        editable: true,
        displayName: "Closed"
    },
    borderBrush: {
        defaultValue: Brush.Black,
        displayName: "Stroke brush",
        type: "stroke",
        useInModel: true,
        editable: true
    },
    backgroundBrush: {
        type: "fill",
        useInModel: true,
        editable: true,
        displayName: "Fill brush"
    },
    currentPointX: {
        displayName: "X",
        type: "numeric",
        useInModel: false,
        editable: true,
        defaultValue: undefined
    },
    currentPointY: {
        displayName: "Y",
        type: "numeric",
        useInModel: false,
        editable: true,
        defaultValue: undefined
    },
    currentPointType: {
        displayName: "Point type",
        type: "multiSwitch",
        useInModel: false,
        editable: true,
        defaultValue: PointType.Mirrored,
        options: {
            items: [
                {value: PointType.Straight, icon: "ico-point-straight"},
                {value: PointType.Mirrored, icon: "ico-point-mirrored"},
                {value: PointType.Assymetric, icon: "ico-point-assymetric"},
                {value: PointType.Disconnected, icon: "ico-point-disconnected"}
            ],
            size: 3 / 4
        }
    },
    pointRounding: {
        displayName: "Point rounding",
        type: "dropdown",
        options: {
            size: 1,
            items: [{name: "Don't round", value: 0}, {name: "Round to half pixels", value: 1}, {
                name: "Round to full pixels edges",
                value: 2
            }]
        },
        defaultValue: 1,
        useInModel: true,
        editable: true
    },
    mode: {
        editable: false,
        useInModel: false,
        defaultValue: "resize"
    },
    points: {
        defaultValue: []
    },
    groups () {
        return [
            {
                label: "",
                properties: ["currentPointX", "currentPointY", "currentPointType"]
            },
            {
                label: "Appearance",
                expanded: false,
                properties: ["visible", "opacity", "backgroundBrush", "borderBrush", "clipMask"]
            },
            {
                label: "Layout",
                properties: ["width", "height", "x", "y", "anchor", "angle"],
                expanded: true
            },
            {
                label: "Settings",
                properties: ["pointRounding"],
                expanded: true
            }
        ];
    },
    prepareVisibility(props){
        var editMode = props.mode === "edit";
        return {
            currentPointX: editMode && props.currentPointType !== null,
            currentPointY: editMode && props.currentPointType !== null,
            currentPointType: editMode && props.currentPointType !== null,
            pointRounding: props.mode === "edit"
        };
    }
});

Path.smoothPoint = function (p, p1, p2, eps) {
    var vx = p2.x - p1.x
        , vy = p2.y - p1.y
        , d = Math.sqrt(vx * vx + vy * vy)
        , res = {x: p.x, y: p.y};
    vx = vx / d * eps;
    vy = vy / d * eps;

    res.cp1x = p.x - vx;
    res.cp2x = p.x + vx;
    res.cp1y = p.y - vy;
    res.cp2y = p.y + vy;

    return res;
};

var ATTRIBUTE_NAMES = 'points x y width height rx ry transform fill stroke stroke-width'.split(' ');
Path.fromSvgElement = function (element, options) {
    var parsedAttributes = sketch.svg.parseAttributes(element, ATTRIBUTE_NAMES);
    var path = new Path();

    if (parsedAttributes.fill) {
        path.backgroundBrush(Brush.createFromColor(parsedAttributes.fill));
    }
    if (parsedAttributes.stroke) {
        path.borderBrush(Brush.createFromColor(parsedAttributes.stroke));
    }
    if (parsedAttributes.strokeWidth) {
        path.borderBrush().lineWidth = parsedAttributes.strokeWidth;
    }

    if (parsedAttributes.points) {
        var pairs = parsedAttributes.points.replace('\n', ' ').replace('\r', ' ').split(' ');
        for (var i = 0; i < pairs.length; ++i) {
            var pair = pairs[i];
            if (pair) {
                var xy = pair.split(',');
                path.addPoint({x: parseFloat(xy[0]), y: parseFloat(xy[1])});
            }
        }
    }

    path.closed(true);
    path.adjustBoundaries();

    return path;
};


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

Path.translatePoints = function (points, left, top) {
    var newPoints = [];
    for (var i = 0, l = points.length; i < l; ++i) {
        var pt = clone(points[i]);
        pt.x = pt.x - left;
        pt.cp1x = pt.cp1x - left;
        pt.cp2x = pt.cp2x - left;

        pt.y = pt.y - top;
        pt.cp1y = pt.cp1y - top;
        pt.cp2y = pt.cp2y - top;

        this._roundPoint(pt);
        newPoints.push(pt);
    }
    return newPoints;
};
Path.pointsToSvg = function (points, closed) {
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
};

Path.circleAtPoint = function circleAtPoint(center, radius) {

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

Path.rectangle = function circleAtPoint(x, y, width, height) {
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


export default Path;
