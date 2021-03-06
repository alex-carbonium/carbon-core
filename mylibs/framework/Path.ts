import UIElement from "./UIElement";
import nearestPoint from "../math/NearestPoint";
import PropertyTracker from "./PropertyTracker";
import BezierGraph from "../math/bezierGraph";
import BezierCurve from "../math/bezierCurve";
import Rect from "../math/rect";
import Point from "../math/point";
import Brush from "./Brush";
import PropertyMetadata from "./PropertyMetadata";
import Matrix from "../math/matrix";
import { multiplyVectorConst, addVectors, subVectors } from "../math/math";
import Shape from "./Shape";
import Selection from "./SelectionModel";
import Invalidate from "./Invalidate";
import Box from "./Box";
import { debounce } from "../util";
import { Types } from "./Defs";
import ResizeOptions from "../decorators/ResizeOptions";
import { IMouseEventData, KeyboardState, ChangeMode, IIntersectionRange, ResizeDimension, LayerType, IContainerProps, PointType, IPathPoint, IUIElementProps, ElementState, ICoordinate } from "carbon-core";
import UserSettings from "../UserSettings";
import Cursors from "../Cursors";
import PathManipulationDecorator from "../ui/common/path/PathManipulationDecorator";
import ExtensionPoint from "./ExtensionPoint";
import NullContainer from "./NullContainer";

const CP_HANDLE_RADIUS = UserSettings.path.editHandleSize;
const CP_HANDLE_RADIUS2 = CP_HANDLE_RADIUS * 2;
const CP_RADIUS = UserSettings.path.editPointSize;
const CP_RADIUS2 = CP_RADIUS * 2;

const POINT_STROKE = UserSettings.path.pointStroke;
const POINT_FILL = UserSettings.path.pointFill;
const POINT_FILL_FIRST_OPEN = UserSettings.path.pointFillFirstPoint;

const commandLengths = {
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

class PathPoint extends UIElement<any> {
    constructor(public px: number, public py: number) {
        super();
        this.applyTranslation({ x: px, y: py });
        this.setProps({ br: new Rect(0, 0, 1, 1) });
    }
}


function isLinePoint(pt) {
    return pt.type === PointType.Straight;
};

function pointsEqual(p1, p2) {
    if (p1 === p2) {
        return true;
    }
    return p1.type === p2.type && p1.x === p2.x && p1.y === p2.y
        && p1.cp1x === p2.cp1x && p1.cp1y === p2.cp1y
        && p1.cp2x === p2.cp2x && p1.cp2y === p2.cp2y;
}

function getClickedPoint(x, y, view) {
    let pos = this.globalViewMatrixInverted().transformPoint2(x, y);

    let zoom = view.scale();
    for (let i = 0, len = this.points.length; i < len; ++i) {
        let pt = this.points[i];
        pt.idx = i;
        let x2 = pos.x - pt.x
            , y2 = pos.y - pt.y
        if (x2 * x2 + y2 * y2 < CP_RADIUS2 * view.contextScale / (zoom * zoom)) {
            return pt;
        }
    }
    return null;
};

function getClickedHandlePoint(x, y, view) {
    let pos = this.globalViewMatrixInverted().transformPoint2(x, y);

    let zoom = view.scale();

    for (let i = 0, len = this.points.length; i < len; ++i) {
        let pt = this.points[i];
        pt.idx = i;
        if (isLinePoint(pt)) {
            continue;
        }
        let x2 = pos.x - pt.cp1x
            , y2 = pos.y - pt.cp1y
        if (x2 * x2 + y2 * y2 < CP_HANDLE_RADIUS2 * view.contextScale / (zoom * zoom)) {
            pt._selectedHandle = 1;
            return pt;
        }

        x2 = pos.x - pt.cp2x
        y2 = pos.y - pt.cp2y
        if (x2 * x2 + y2 * y2 < CP_HANDLE_RADIUS2 * view.contextScale / (zoom * zoom)) {
            pt._selectedHandle = 2;
            return pt;
        }
    }

    return null;
};

function setLinePoint(pt) {
    pt.cp1x = pt.cp2x = pt.x;
    pt.cp1y = pt.cp2y = pt.y;
};

function scalePointsToNewSize() {
    let bb = this.getBoundingBox();
    let m = this.viewMatrix();
    for (let i = 0; i < this.points.length; ++i) {
        let pt = this.points[i];
        let xy = m.transformPoint2(pt.x, pt.y);
        let cp1 = m.transformPoint2(pt.cp1x, pt.cp1y);
        let cp2 = m.transformPoint2(pt.cp2x, pt.cp2y);
        pt.x = xy.x - bb.x;
        pt.y = xy.y - bb.y;
        pt.cp1x = cp1.x - bb.x;
        pt.cp1y = cp1.y - bb.y;
        pt.cp2x = cp2.x - bb.x;
        pt.cp2y = cp2.y - bb.y;
        this._roundPoint(pt);
    }
    this.setTransform(Matrix.create().translate(bb.x, bb.y));
    this.setProps({ br: bb.withPosition(0, 0) });
};

function moveAllPoints(dx, dy) {
    for (let i = 0, len = this.points.length; i < len; ++i) {
        let pt = this.points[i];
        pt.x -= dx;
        pt.y -= dy;
        pt.cp1x -= dx;
        pt.cp2x -= dx;
        pt.cp1y -= dy;
        pt.cp2y -= dy;
        // this._roundPoint(pt);
    }
}

function drawArc(path, x, y, coords, matrix) {
    let rx = coords[0];
    let ry = coords[1];
    let rot = coords[2];
    let large = coords[3];
    let sweep = coords[4];
    let ex = coords[5];
    let ey = coords[6];
    let segs = arcToSegments(ex, ey, rx, ry, large, sweep, rot, x, y);
    for (let i = 0; i < segs.length; i++) {
        let bez = segmentToBezier.apply(this, segs[i]);

        let cp1 = matrix.transformPoint2(bez[0], bez[1]);
        let cp2 = matrix.transformPoint2(bez[2], bez[3]);
        let p = matrix.transformPoint2(bez[4], bez[5]);

        path.curveToPoint(p, cp1, cp2);
    }
}

let arcToSegmentsCache = {},
    segmentToBezierCache = {},
    _join = Array.prototype.join,
    argsString;

// Generous contribution by Raph Levien, from libsvg-0.1.0.tar.gz
function arcToSegments(x, y, rx, ry, large, sweep, rotateX, ox, oy) {
    argsString = _join.call(arguments);
    if (arcToSegmentsCache[argsString]) {
        return arcToSegmentsCache[argsString];
    }

    let th = rotateX * (Math.PI / 180);
    let sin_th = Math.sin(th);
    let cos_th = Math.cos(th);
    rx = Math.abs(rx);
    ry = Math.abs(ry);
    let px = cos_th * (ox - x) * 0.5 + sin_th * (oy - y) * 0.5;
    let py = cos_th * (oy - y) * 0.5 - sin_th * (ox - x) * 0.5;
    let pl = (px * px) / (rx * rx) + (py * py) / (ry * ry);
    if (pl > 1) {
        pl = Math.sqrt(pl);
        rx *= pl;
        ry *= pl;
    }

    let a00 = cos_th / rx;
    let a01 = sin_th / rx;
    let a10 = (-sin_th) / ry;
    let a11 = (cos_th) / ry;
    let x0 = a00 * ox + a01 * oy;
    let y0 = a10 * ox + a11 * oy;
    let x1 = a00 * x + a01 * y;
    let y1 = a10 * x + a11 * y;

    let d = (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0);
    let sfactor_sq = 1 / d - 0.25;
    if (sfactor_sq < 0) {
        sfactor_sq = 0;
    }
    let sfactor = Math.sqrt(sfactor_sq);
    if (sweep === large) {
        sfactor = -sfactor;
    }

    let xc = 0.5 * (x0 + x1) - sfactor * (y1 - y0);
    let yc = 0.5 * (y0 + y1) + sfactor * (x1 - x0);

    let th0 = Math.atan2(y0 - yc, x0 - xc);
    let th1 = Math.atan2(y1 - yc, x1 - xc);

    let th_arc = th1 - th0;
    if (th_arc < 0 && sweep === 1) {
        th_arc += 2 * Math.PI;
    } else if (th_arc > 0 && sweep === 0) {
        th_arc -= 2 * Math.PI;
    }

    let segments = Math.ceil(Math.abs(th_arc / (Math.PI * 0.5 + 0.001)));
    let result = [];
    for (let i = 0; i < segments; i++) {
        let th2 = th0 + i * th_arc / segments;
        let th3 = th0 + (i + 1) * th_arc / segments;
        result[i] = [xc, yc, th2, th3, rx, ry, sin_th, cos_th];
    }

    return (arcToSegmentsCache[argsString] = result);
}

function segmentToBezier(cx, cy, th0, th1, rx, ry, sin_th, cos_th) {
    argsString = _join.call(arguments);
    if (segmentToBezierCache[argsString]) {
        return segmentToBezierCache[argsString];
    }

    let a00 = cos_th * rx;
    let a01 = -sin_th * ry;
    let a10 = sin_th * rx;
    let a11 = cos_th * ry;

    let th_half = 0.5 * (th1 - th0);
    let t = (8 / 3) * Math.sin(th_half * 0.5) * Math.sin(th_half * 0.5) / Math.sin(th_half);
    let x1 = cx + Math.cos(th0) - t * Math.sin(th0);
    let y1 = cy + Math.sin(th0) + t * Math.cos(th0);
    let x3 = cx + Math.cos(th1);
    let y3 = cy + Math.sin(th1);
    let x2 = x3 + t * Math.sin(th1);
    let y2 = y3 - t * Math.cos(th1);

    return (segmentToBezierCache[argsString] = [
        a00 * x1 + a01 * y1, a10 * x1 + a11 * y1,
        a00 * x2 + a01 * y2, a10 * x2 + a11 * y2,
        a00 * x3 + a01 * y3, a10 * x3 + a11 * y3
    ]);
}

class Path extends Shape {
    public props: (IContainerProps | IUIElementProps) & {
        points: IPathPoint[];
        closed: boolean;
        mode: ElementState;
    }

    constructor() {
        super();
        this.points = [];
        this._lastPoints = [];
        this._lastBr = this.props.br;
        this._lastM = this.props.m;
    }

    _refreshComputedProps() {
        this.propsUpdated({
            currentPointPosition: { x: this.runtimeProps.currentPointX, y: this.runtimeProps.currentPointY },
            currentPointType: this.runtimeProps.currentPointType
        }, {}); // refresh properties
    }

    save() {
        if (this._saving) {
            return;
        }

        if (this._lastPoints && this._lastPoints.length === this.props.points.length) {
            let allEqual = true;
            for (var i = this._lastPoints.length - 1; i >= 0; --i) {
                var p1 = this._lastPoints[i];
                var p2 = this.props.points[i];
                if (!pointsEqual(p1, p2)) {
                    allEqual = false;
                    break;
                }
            }
            if (allEqual) {
                return;
            }
        }

        this._saving = true;
        let newPoints = this.points;
        let newBr = this.props.br;
        let newM = this.props.m;
        this.props.points = this._lastPoints;
        this.props.br = this._lastBr;
        this.props.m = this._lastM;
        this.setProps({ points: newPoints, br: newBr, m: newM });
        this.adjustBoundaries();
        this._lastBr = this.props.br.clone();
        this._lastM = this.props.m.clone();
        this._saving = false;
    }

    lastSegmentStartPoint() {
        var points = this.points;
        if (!points.length) {
            return null;
        }

        for (var i = points.length - 1; i > 0; i--) {
            var p = points[i];
            if (p.moveTo) {
                break;
            }
        }

        return points[i];
    }

    cloneProps() {
        let props = super.cloneProps();
        props.points = props.points.map(x => Object.assign({}, x));
        return props;
    }

    get points(): IPathPoint[] {
        return this.props.points;
    }

    set points(value: IPathPoint[]) {
        this.setProps({ points: value });
    }

    controlPointForPosition(event) {
        return getClickedPoint.call(this, event.x, event.y, event.view);
    }

    handlePointForPosition(event) {
        return getClickedHandlePoint.call(this, event.x, event.y, event.view);
    }

    pointAtIndex(idx) {
        return this.points[idx];
    }

    get firstPoint() {
        return this.points[0];
    }
    get lastPoint() {
        return this.points[this.points.length - 1];
    }

    expandRectWithBorder(rect) {
        let border = this.getMaxOuterBorder() * 1.5;
        if (border !== 0) {
            return rect.expand(border);
        }
        return rect;
    }

    expandWidthMitterLimits() {
        for (let i = 1; i < this.points.length - 1; ++i) {
            var p1 = this.points[i - 1];
            var p2 = this.points[i];
            var p3 = this.points[i + 1];
            var v1 = Point.allocate(p2.x - p1.x, p2.y - p1.y);
            var v2 = Point.allocate(p2.x - p3.x, p2.y - p3.y);

            v1.free();
            v2.free();
        }
    }

    removeControlPoint(pt) {
        for (let i = 0; i < this.points.length; ++i) {
            if (this.points[i] === pt) {
                this.points.splice(i, 1);
                return;
            }
        }
    }

    _roundPoint(pt) {
        let x, y;
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

        return pt;
    }

    indexOfPoint(pt) {
        for (let i = 0; i < this.points.length; ++i) {
            if (this.points[i] === pt) {
                return i;
            }
        }

        return -1;
    }

    removePointAtIndex(idx) {
        var point = this.points.splice(idx, 1)[0];
        if (point.closed && idx > 0) {
            var prevPoint = this.points[idx - 1];
            prevPoint.closed = true;
            this.changePointAtIndex(prevPoint, idx - 1);
        }
    }

    removeLastPoint() {
        let length = this.length();
        this.removePointAtIndex(length - 1);
    }

    mode(value?) {
        if (arguments.length > 0) {
            this.setProps({ mode: value });
        }

        return this.props.mode;
    }

    enter(a, b, c, { view, controller }) {
        if (this.mode() !== ElementState.Edit) {
            this.edit(view, controller);
        }
    }

    switchToEditMode(edit: boolean, view?, controller?) {
        if (edit) {
            this.addDecorator(new PathManipulationDecorator(view, controller));

            scalePointsToNewSize.call(this);
            this.mode(ElementState.Edit);
            this.save();
        } else {
            this.removeDecoratorByType(PathManipulationDecorator)
            this.mode(ElementState.Resize);
        }

        this.runtimeProps.selectedPointIdx = -1;

        Selection.reselect();
    }

    commitMatrixChanges() {
        scalePointsToNewSize.call(this);
    }

    _initPoint(point) {
        this._roundPoint(point);
        if (point.type === undefined) {
            if (point.cp1x === undefined && point.cp2x === undefined) {
                point.type = PointType.Straight;
                point.cp1x = point.x;
                point.cp1y = point.y;
                point.cp2x = point.x;
                point.cp2y = point.y;
            } else if (point.cp1x === undefined) {
                point.type = PointType.Assymetric;
                point.cp1x = point.x;
                point.cp1y = point.y;
            } else if (point.cp2x === undefined) {
                point.type = PointType.Assymetric;
                point.cp2x = point.x;
                point.cp2y = point.y;
            } else {
                point.type = PointType.Assymetric;
            }
        }

    }

    addPoint(point) {
        if (!point) {
            return;
        }

        this._initPoint(point);
        this.points.push(point);

        if (!this.runtimeProps.importing) {
            this.save();
        }

        return point;
    }

    insertPointAtIndex(point, idx) {
        this._initPoint(point);
        this.points.splice(idx, 0, point);

        this.save();

        return point;
    }

    changePointAtIndex(point, idx, changeMode: ChangeMode = ChangeMode.Model) {
        this.points.splice(idx, 1, point);

        if (changeMode !== ChangeMode.Self) {
            this.save();
        }
    }

    length() {
        return this.points.length;
    }

    select(multiSelect: boolean, view, controller) {
        if (!multiSelect) {
            this._enterBinding = controller.actionManager.subscribe('enter', this.enter.bind(this));
        }
    }

    unselect() {
        if (this._enterBinding) {
            this._enterBinding.dispose();
            delete this._enterBinding;
        }
    }

    selectFrameVisible(value?) {
        var res = super.selectFrameVisible(value);
        return res && this.mode() !== ElementState.Edit;
    }

    edit(view, controller) {
        this.switchToEditMode(true, view, controller);
    }

    dblclick(event, scale?) {
        if (this.mode() !== ElementState.Edit) {
            this.edit(event.view, event.controller);
        }
    }

    bendPoints(newPos, data) {
        // p2 = (Bc - (Ac + Iij)*p0 - (Ec - Kij)*p3 - Bdtij  ) / DD;
        let Bc = multiplyVectorConst(newPos, 1 / data.C);
        let p2 = multiplyVectorConst(
            addVectors(
                Bc,
                multiplyVectorConst(data.p0, -(data.Ac + data.Iij)),
                multiplyVectorConst(data.p3, -(data.Ec - data.Kij)),
                multiplyVectorConst(data.Bdtij, -1),
            ),
            1 / data.DD
        );

        // p1 = Bc - Ac*p0 - Dc*p2 -Ec*p3
        let p1 = addVectors(
            Bc,
            multiplyVectorConst(data.p0, -data.Ac),
            multiplyVectorConst(p2, -data.Dc),
            multiplyVectorConst(data.p3, -data.Ec)
        );

        let len = this.length();
        let p1idx = (data.idx - 1 + len) % len;
        let p0 = clone(this.points[p1idx]);
        let p3 = clone(this.points[data.idx]);

        p0.cp2x = p1.x;
        p0.cp2y = p1.y;
        p3.cp1x = p2.x;
        p3.cp1y = p2.y;
        p0.type = PointType.Disconnected;
        p3.type = PointType.Disconnected;
        this.changePointAtIndex(p0, p1idx, ChangeMode.Self);
        this.changePointAtIndex(p3, data.idx, ChangeMode.Self);
        this._saveOnMouseUp = true;
    }

    calculateOriginalBendingData(point) {
        let len = this.length();
        let p1idx = (point.idx - 1 + len) % len;
        let p0 = this.points[p1idx];
        let p3 = this.points[point.idx];
        let p1 = { x: p0.cp2x, y: p0.cp2y };
        let p2 = { x: p3.cp1x, y: p3.cp1y };
        let t = point.t;
        let t_2 = t * t;
        let t_3 = t_2 * t;
        let tm1 = 1 - t;
        let tm1_2 = tm1 * tm1;
        let tm1_3 = tm1_2 * tm1;

        let A = tm1_3;
        let C = 3 * tm1_2 * t;
        let D = 3 * tm1 * t_2;
        let E = t_3;

        let Bt = addVectors(
            multiplyVectorConst(p0, A),
            multiplyVectorConst(p1, C),
            multiplyVectorConst(p2, D),
            multiplyVectorConst(p3, E)
        );

        let I = 3 * tm1_2;
        let J = 6 * tm1 * t;
        let K = 3 * t_2;

        let Bdt = addVectors(
            multiplyVectorConst(subVectors(p1, p0), I),
            multiplyVectorConst(subVectors(p2, p1), J),
            multiplyVectorConst(subVectors(p3, p2), K)
        );
        let IJ = I - J;
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


    closed(value?) {
        if (value !== undefined) {
            this.setProps({ closed: value });
        }
        return this.props.closed || (this.points.length && this.points[this.points.length - 1].closed);
    }

    hitTest(point, view, boundaryRectOnly = false) {
        if (this.hasBadTransform()) {
            return false;
        }

        if ((getClickedPoint.call(this, point.x, point.y, view))
            || (getClickedHandlePoint.call(this, point.x, point.y, view))) {
            return true;
        }
        let res = UIElement.prototype.hitTest.apply(this, arguments);
        if (res) {
            if (boundaryRectOnly) {
                return true;
            }

            let brush = this.fill;
            if (!brush || !brush.type) {
                let p = this.getPointIfClose(point, view, 8);
                if (p) {
                    return true;
                } else {
                    return false;
                }
            }
            else {
                let matrix = this.parent.globalViewMatrixInverted();
                point = matrix.transformPoint(point);

                let graph = BezierGraph.fromPath(this, this.viewMatrix());

                let count = 0;
                let ray = BezierCurve.bezierCurveWithLine(point, { x: point.x + 100000, y: point.y })
                for (let curve of graph.contours) {
                    for (let edge of curve.edges) {
                        edge.intersectionsWithBezierCurve(ray, makeRef<IIntersectionRange>(), () => {
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
        return (this.mode() === ElementState.Resize ? ResizeDimension.Both : ResizeDimension.None);
    }

    applySizeScaling(s, o, options, changeMode) {
        this.applyMatrixScaling(s, o, options, changeMode);
    }

    skew(): void {
    }

    shouldApplyViewMatrix() {
        return false;
    }

    removed(mode: ChangeMode) {
        this.switchToEditMode(false);
        super.removed(mode);
    }

    propsUpdated(newProps, oldProps, mode?) {
        super.propsUpdated(newProps, oldProps, mode);
        if (newProps.points !== undefined) {
            this.adjustBoundaries();
        }
    }

    _drawSegment(context, pt, prevPt, closing?) {
        let m = this.globalViewMatrix();
        let xy = m.transformPoint(pt);

        if (!this._firstPoint) {
            this._firstPoint = pt;
        }

        if ((pt.moveTo || this._firstPoint === pt) && !closing) {
            context.moveTo(xy.x, xy.y);
        }
        else if (isLinePoint(pt) && (isLinePoint(prevPt))) { // line segment
            context.lineTo(xy.x, xy.y);
        } else { // cubic bezier segment
            let cp1x = prevPt.cp2x
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

            let cp1 = m.transformPoint2(cp1x, cp1y);
            let cp2 = m.transformPoint2(cp2x, cp2y);
            context.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, xy.x, xy.y);
        }

        if (pt.closed && !closing) {
            this._drawSegment(context, this._firstPoint, pt, true);
            context.closePath();
            this._firstPoint = null;
        }
    }

    drawPath(context, w, h) {
        if (this.points.length === 0) {
            return;
        }

        let pt;
        let points = this.points;
        this._firstPoint = null;
        let prevPt = null;// = pt = points[0];
        for (let i = 0, len = points.length; i < len; ++i) {
            pt = points[i];
            this._drawSegment(context, pt, prevPt);
            prevPt = pt;
        }
        if (this.closed() && !prevPt.closed) {
            this._drawSegment(context, points[0], prevPt, true);
            context.closePath();
        }
    }

    getBoundingBoxGlobal(includeMargin: boolean = false): Rect {
        if (!this.runtimeProps.globalClippingBox) {
            this.runtimeProps.globalClippingBox = this.getGlobalBoundingBox();
        }

        return this.runtimeProps.globalClippingBox;
    }

    getBoundingBox() {
        if (this.points.length <= 1) {
            return Rect.Zero;
        }

        if (!this.runtimeProps.bb) {
            let graph = new BezierGraph();
            graph.initWithBezierPath(this, this.viewMatrix());
            this.runtimeProps.bb = Rect.fromObject(graph.bounds);
        }

        return this.runtimeProps.bb;
    }

    getGlobalBoundingBox() {
        if (this.points.length <= 1) {
            let gm = this.globalViewMatrix();
            return new Rect(gm.tx, gm.ty, 0, 0);
        }
        let graph = new BezierGraph();
        graph.initWithBezierPath(this, this.globalViewMatrix());
        return Rect.fromObject(graph.bounds);
    }

    adjustBoundaries() {
        //happens when all add-point commands are rolled back
        if (this.points.length <= 1) {
            return;
        }

        let graph = new BezierGraph();
        graph.initWithBezierPath(this, Matrix.Identity);

        this.prepareAndSetProps({ br: Rect.fromObject(graph.bounds) });
    }

    getInsertPointData(pointInfo) {
        let pt: any = { x: pointInfo.x, y: pointInfo.y, idx: pointInfo.idx };
        let t = pointInfo.t;
        let len = this.length();
        let p4 = clone(this.points[pointInfo.idx]);
        p4.idx = pointInfo.idx;
        let p1idx = (pointInfo.idx - 1 + len) % len;
        let p1 = clone(this.points[p1idx]);
        p1.idx = p1idx;

        if (isLinePoint(p4) && isLinePoint(p1)) {
            setLinePoint(pt);
            return [pt];
        } else {
            if (isLinePoint(p1)) {
                p1.cp2x = p1.x;
                p1.cp2y = p1.y;
            } else if (isLinePoint(p4)) {
                p4.cp1x = p4.x;
                p4.cp1y = p4.y;
            }
            let p3 = { x: p4.cp1x, y: p4.cp1y };
            let p2 = { x: p1.cp2x, y: p1.cp2y };

            let p11 = {
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
            this.setProps({ joinMode: value });
        }

        return this.props.joinMode;
    }

    getPointIfClose(pos, view, dist?) {
        let matrix = this.globalViewMatrixInverted();
        pos = matrix.transformPoint(pos);
        let resPt = null;
        let prevPt = this.points[0];
        dist = (dist || 4) / view.scale() * view.contextScale;

        function checkDistance(pt, prevPt, idx) {
            let pr = { x: 0, y: 0, idx: idx, t: undefined };
            let d;
            if (isLinePoint(pt) && isLinePoint(prevPt)) {
                d = nearestPoint.onLine(prevPt, pt, pos, pr);
                setLinePoint(pr);
            } else {
                let p1 = { x: prevPt.x, y: prevPt.y };
                let p2 = { x: pt.x, y: pt.y };
                let cp2 = { x: pt.cp1x, y: pt.cp1y };
                let cp1 = { x: prevPt.cp2x, y: prevPt.cp2y };
                if (isLinePoint(prevPt)) {
                    cp1.x = prevPt.x;//cp2.x;
                    cp1.y = prevPt.y;//cp2.y;
                } else if (isLinePoint(pt)) {
                    cp2.x = pt.x;//cp1.x;
                    cp2.y = pt.y;//cp1.y;
                }

                d = nearestPoint.onCurve(p1, cp1, cp2, p2, pos, pr);
            }

            d = Math.abs(d);
            if (d < dist) {
                dist = d;
                resPt = { x: pr.x, y: pr.y, idx: idx, t: pr.t };
            }
        }

        for (let i = 1; i < this.points.length; ++i) {
            let pt = this.points[i];
            checkDistance(pt, prevPt, i);
            prevPt = pt;
        }

        if (this.closed()) {
            checkDistance(this.points[0], prevPt, 0);
        }

        return resPt;
    }

    polygonArea() {
        let area = 0;
        let points = this.points;

        for (let i = 0, len = points.length; i < len; i++) {
            let j = (i + 1) % len;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        return area / 2;
    }

    isClockwise() {
        return this.polygonArea() > 0;
    }

    fromJSON(data) {
        this.points.length = 0;

        let current = UIElement.prototype.fromJSON.call(this, data);

        return current;
    }

    elements(matrix, offset, angle, origin) {
        let points = this.points;
        let res = [];
        if (!points.length) {
            return res;
        }


        offset = offset || { x: 0, y: 0 };

        let pt;
        let prevPt = pt = points[0];
        let p = matrix.transformPoint(prevPt);
        res.push({ kind: "M", point: p });

        function buildSegment(pt, prevPt, matrix, nomove?) {
            if (pt.moveTo && !nomove) {
                p = matrix.transformPoint(pt);
                res.push({ kind: "M", point: p });
            }

            if (isLinePoint(pt) && isLinePoint(prevPt)) { // line segment
                p = matrix.transformPoint(pt);
                res.push({ kind: "L", point: p });
            } else { // cubic bezier segment
                let cp1x = prevPt.cp2x
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
                let p1 = matrix.transformPoint2(cp1x, cp1y);
                let p2 = matrix.transformPoint2(cp2x, cp2y);
                res.push({ kind: "C", point: p, controlPoints: [p1, p2] });
            }

            if (pt.closed && !nomove) {
                buildSegment(points[0], pt, matrix, true);
                res.push({ kind: "Z" });
            }
        }

        for (let i = 1, len = points.length; i < len; ++i) {
            pt = points[i];
            buildSegment(pt, prevPt, matrix);
            prevPt = pt;
        }

        if (!prevPt.closed && !prevPt.moveTo) {
            buildSegment(points[0], prevPt, matrix, true);
            res.push({ kind: "Z" });
        }

        return res;
    }

    moveToPoint(point) {
        this._lastPoint = this.addPoint(point);
        this._lastPoint.moveTo = true;
    }

    moveTo(x, y) {
        this._lastPoint = this.addPoint({ x, y });
        this._lastPoint.moveTo = true;
    }

    closeAtPoint() {
        this._lastPoint.closed = true;
    }

    lineToPoint(point) {
        this._lastPoint = this.addPoint(point);
    }

    lineTo(x, y) {
        this._lastPoint = this.addPoint({ x, y });
    }

    curveToPoint(point, cp1, cp2) {
        this._lastPoint.cp2x = cp1.x;
        this._lastPoint.cp2y = cp1.y;
        this._lastPoint.type = PointType.Disconnected;
        this._lastPoint = this.addPoint(point);
        this._lastPoint.cp1x = cp2.x;
        this._lastPoint.cp1y = cp2.y;
        this._lastPoint.type = PointType.Disconnected;
    }

    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
        this._lastPoint.cp2x = cp1x;
        this._lastPoint.cp2y = cp1y;
        this._lastPoint.type = PointType.Assymetric;
        this._lastPoint = this.addPoint({ x, y });
        this._lastPoint.cp1x = cp2x;
        this._lastPoint.cp1y = cp2y;
        this._lastPoint.type = PointType.Assymetric;
    }

    quadraticCurveToPoint(c, p) {
        var x0 = this._lastPoint.x;
        var y0 = this._lastPoint.y;
        var x1 = c.x;
        var y1 = c.y;
        var x2 = p.x;
        var y2 = p.y;
        var c1 = {
            x: x0 + 2 * (x1 - x0) / 3,
            y: y0 + 2 * (y1 - y0) / 3
        }

        var c2 = {
            x: x1 + (x2 - x1) / 3,
            y: y1 + (y2 - y1) / 3
        }

        this.curveToPoint(p, c1, c2);
    }

    get currentPointX(): number {
        return this.runtimeProps.currentPointX;
    }

    set currentPointX(value: number) {
        this._currentPointX(value);
    }

    _currentPointX(value: number, changeMode?: ChangeMode) {
        this.runtimeProps.currentPointX = this._roundValue(value);
        this._refreshComputedProps();
        Invalidate.request();
    }

    get currentPointY(): number {
        return this.runtimeProps.currentPointY;
    }

    set currentPointY(value: number) {
        this._currentPointY(value);
    }

    _currentPointY(value: number, changeMode?: ChangeMode) {
        this.runtimeProps.currentPointY = this._roundValue(value);
        this._refreshComputedProps();
        Invalidate.request();
    }

    get currentPointPosition() {
        return { x: this.runtimeProps.currentPointX, y: this.runtimeProps.currentPointY };
    }

    _currentPointPosition(value: ICoordinate, changeMode?: ChangeMode) {
        this.runtimeProps.currentPointX = this._roundValue(value.x);
        this.runtimeProps.currentPointY = this._roundValue(value.y);
        var pt = this.points[this.runtimeProps.selectedPointIdx];
        if (pt) {
            var newPt = Object.assign({}, pt);
            newPt.x = this.runtimeProps.currentPointX;
            newPt.y = this.runtimeProps.currentPointY;
            this.changePointAtIndex(newPt, this.runtimeProps.selectedPointIdx, changeMode);
        }

        this._refreshComputedProps();
        Invalidate.request();
    }

    get currentPointType(): PointType {
        return this.runtimeProps.currentPointType;
    }

    set currentPointType(value: PointType) {
        this._currentPointType(value);
    }

    _currentPointType(value: PointType, changeMode?: ChangeMode) {
        this.runtimeProps.currentPointType = value;
        var pt = this.points[this.runtimeProps.selectedPointIdx];
        if (pt) {
            var newPt = Object.assign({}, pt);
            newPt.type = this.runtimeProps.currentPointType;
            this.changePointAtIndex(newPt, this.runtimeProps.selectedPointIdx, changeMode);
        }
        this._refreshComputedProps();
        Invalidate.request();
    }

    fromSvgString(d, matrix) {
        let path = d.match(/[mzlhvcsqta][^mzlhvcsqta]*/gi);
        let svgCommands = this._parsePath(path);
        this._renderSvgCommands(svgCommands, matrix);
        this.setProps({ m: matrix });
        this.adjustBoundaries();
        this.save();
    }

    _splitPoints(path) {
        let state = 0;
        let res = [];
        let pos = 0;

        for (let i = 0; i < path.length; ++i) {
            let c = path[i];
            switch (state) {
                case 0: // begining of number
                    if (c >= '0' && c <= '9') {
                        state = 1;
                        pos = i;
                    }
                    else if (c === '.') {
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
                    else if (c === '.') {
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
        let result = [],
            currentPath,
            chunks,
            parsed;

        for (let i = 0, chunksParsed, len = path.length; i < len; i++) {
            currentPath = path[i];
            chunks = this._splitPoints(currentPath.slice(1).trim());
            chunksParsed = [currentPath.charAt(0)];

            for (let j = 0, jlen = chunks.length; j < jlen; j++) {
                parsed = parseFloat(chunks[j]);
                if (!isNaN(parsed)) {
                    chunksParsed.push(parsed);
                }
            }

            let command = chunksParsed[0].toLowerCase(),
                commandLength = commandLengths[command];

            if (chunksParsed.length - 1 > commandLength) {
                for (let k = 1, klen = chunksParsed.length; k < klen; k += commandLength) {
                    result.push([chunksParsed[0]].concat(chunksParsed.slice(k, k + commandLength)));
                }
            }
            else {
                result.push(chunksParsed);
            }
        }

        return result;
    }

    snapElements() {
        let m = this.globalViewMatrix();

        var points = this.points;
        return points.map(p => {
            var pt = m.transformPoint(p);
            return new PathPoint(pt.x, pt.y);
        });
    }

    transform(matrix) {
        let points = this.points;
        for (let i = 0; i < points.length; ++i) {
            let point = points[i];
            let p = matrix.transformPoint2(point.x, point.y);
            point.x = p.x;
            point.y = p.y;
            if (point.cp1x !== undefined) {
                let cp1 = matrix.transformPoint2(point.cp1x, point.cp1y);
                point.cp1x = cp1.x;
                point.cp1y = cp1.y;
            }
            if (point.cp2x !== undefined) {
                let cp2 = matrix.transformPoint2(point.cp2x, point.cp2y);
                point.cp2x = cp2.x;
                point.cp2y = cp2.y;
            }
        }
        this.adjustBoundaries();
        this.save();
    }

    resetGlobalViewCache() {
        super.resetGlobalViewCache.apply(this, arguments);
        delete this.runtimeProps.bb;
    }

    _renderSvgCommands(commands, matrix) {
        let current, // current instruction
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
            l = 0,
            t = 0;

        let startX, startY, segmentStarted = false;

        for (let i = 0, len = commands.length; i < len; ++i) {

            current = commands[i];

            switch (current[0]) { // first letter

                case 'l': // lineto, relative
                    x += current[1] * scaleX;
                    y += current[2] * scaleY;
                    this.lineToPoint({ x: x + l, y: y + t });
                    controlX = null;
                    controlY = null;
                    break;

                case 'L': // lineto, absolute
                    x = current[1] * scaleX;
                    y = current[2] * scaleY;
                    this.lineToPoint({ x: x + l, y: y + t });
                    controlX = null;
                    controlY = null;
                    break;

                case 'h': // horizontal lineto, relative
                    x += current[1] * scaleX;
                    this.lineToPoint({ x: x + l, y: y + t });
                    controlX = null;
                    controlY = null;
                    break;

                case 'H': // horizontal lineto, absolute
                    x = current[1] * scaleX;
                    this.lineToPoint({ x: x + l, y: y + t });
                    controlX = null;
                    controlY = null;
                    break;

                case 'v': // vertical lineto, relative
                    y += current[1] * scaleY;
                    this.lineToPoint({ x: x + l, y: y + t });
                    controlX = null;
                    controlY = null;
                    break;

                case 'V': // verical lineto, absolute
                    y = current[1] * scaleY;
                    this.lineToPoint({ x: x + l, y: y + t });
                    controlX = null;
                    controlY = null;
                    break;

                case 'm': // moveTo, relative
                    x += current[1] * scaleX;
                    y += current[2] * scaleY;
                    // draw a line if previous command was moveTo as well (otherwise, it will have no effect)
                    this[(previous && (previous[0] === 'm' || previous[0] === 'M')) ? 'lineToPoint' : 'moveToPoint']({ x: x + l, y: y + t });
                    controlX = null;
                    controlY = null;
                    break;

                case 'M': // moveTo, absolute
                    x = current[1] * scaleX;
                    y = current[2] * scaleY;
                    // draw a line if previous command was moveTo as well (otherwise, it will have no effect)
                    this[(previous && (previous[0] === 'm' || previous[0] === 'M')) ? 'lineToPoint' : 'moveToPoint']({ x: x + l, y: y + t });
                    controlX = null;
                    controlY = null;
                    break;

                case 'c': // bezierCurveTo, relative
                    tempX = x + current[5] * scaleX;
                    tempY = y + current[6] * scaleY;
                    controlX = x + current[3] * scaleX;
                    controlY = y + current[4] * scaleY;
                    this.curveToPoint(
                        {
                            x: tempX + l,
                            y: tempY + t
                        },
                        {
                            x: x + current[1] * scaleX + l, // x1
                            y: y + current[2] * scaleY + t
                        }, // y1
                        {
                            x: controlX + l, // x2
                            y: controlY + t
                        }
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
                        { x: x + l, y: y + t },
                        { x: current[1] * scaleX + l, y: current[2] * scaleY + t },
                        { x: controlX + l, y: controlY + t }
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
                        { x: tempX + l, y: tempY + t },
                        { x: controlX + l, y: controlY + t },
                        { x: x + current[1] * scaleX + l, y: y + current[2] * scaleY + t }
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
                        { x: tempX + l, y: tempY + t },
                        { x: controlX + l, y: controlY + t },
                        { x: current[1] * scaleX + l, y: current[2] * scaleY + t }
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
                        { x: controlX + l, y: controlY + t },
                        { x: tempX + l, y: tempY + t }
                    );
                    x = tempX;
                    y = tempY;
                    break;

                case 'Q': // quadraticCurveTo, absolute
                    tempX = current[3] * scaleX;
                    tempY = current[4] * scaleY;

                    this.quadraticCurveToPoint(
                        { x: current[1] * scaleX + l, y: current[2] * scaleY + t },
                        { x: tempX + l, y: tempY + t }
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
                        { x: controlX + l, y: controlY + t },
                        { x: tempX + l, y: tempY + t }
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
                        { x: controlX + l, y: controlY + t },
                        { x: tempX + l, y: tempY + t }
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
                    ], Matrix.Identity);
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
                    ], Matrix.Identity);
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
                    x = startX;
                    y = startY;
                    segmentStarted = false;
                    break;
            }
            previous = current;
            if (!segmentStarted && current[0] !== 'z' && current[0] !== 'Z') {
                segmentStarted = true;
                startX = x;
                startY = y;
            }
        }
    }

    static smoothPoint = function (p, p1, p2, eps) {
        let vx = p2.x - p1.x
            , vy = p2.y - p1.y
            , d = Math.sqrt(vx * vx + vy * vy)
            , res: any = { x: p.x, y: p.y };
        vx = vx / d * eps;
        vy = vy / d * eps;

        res.cp1x = p.x - vx;
        res.cp2x = p.x + vx;
        res.cp1y = p.y - vy;
        res.cp2y = p.y + vy;

        return res;
    }

    static splitPointsString(points) {
        let values = points
            .replace(/\n/g, ' ')
            .replace(/\r/g, ' ')
            .replace(/,/g, ' ')
            .replace(/  /g, ' ')
            .trim();
        let oldValues = values;
        do {
            oldValues = values;
            values = values.replace(/  /g, ' ');
        } while (values !== oldValues);
        values = values.split(' ');

        return values;
    }

    static fromSvgPathElement(element, parsedAttributes, matrix?) {
        // let parsedAttributes = svgParser.parseAttributes(element, ATTRIBUTE_NAMES);
        let path = new Path();

        App.Current.activePage.nameProvider.assignNewName(path);

        path.runtimeProps.importing = true;
        setElementPropertiesFromAttributes(path, parsedAttributes);

        // polygon
        if (parsedAttributes.points) {
            let values = Path.splitPointsString(parsedAttributes.points);

            for (let i = 0; i < values.length; i += 2) {
                let point = { x: parseFloat(values[i + 0]), y: parseFloat(values[i + 1]) };
                point = matrix.transformPoint(point);
                path.addPoint(point);
            }
            path.closed(true);
        }

        if (parsedAttributes.d) {
            path.fromSvgString(parsedAttributes.d, matrix);
        }

        path.runtimeProps.importing = false;
        path.adjustBoundaries();
        path.save();

        return path;
    }

    static fromSvgLineElement(element, parsedAttributes, matrix?) {
        // let parsedAttributes = svgParser.parseAttributes(element, ATTRIBUTE_NAMES);
        let path = new Path();

        App.Current.activePage.nameProvider.assignNewName(path);

        path.runtimeProps.importing = true;
        setElementPropertiesFromAttributes(path, parsedAttributes);

        path.addPoint(matrix.transformPoint({ x: parsedAttributes.x1 || 0, y: parsedAttributes.y1 || 0 }));
        path.addPoint(matrix.transformPoint({ x: parsedAttributes.x2 || 0, y: parsedAttributes.y2 || 0 }));

        path.runtimeProps.importing = false;
        path.adjustBoundaries();
        path.save();

        return path;
    }

    static fromSvgPolylineElement(element, parsedAttributes, matrix?) {
        // let parsedAttributes = svgParser.parseAttributes(element, ATTRIBUTE_NAMES);
        let path = new Path();
        App.Current.activePage.nameProvider.assignNewName(path);

        path.runtimeProps.importing = true;
        setElementPropertiesFromAttributes(path, parsedAttributes);

        if (parsedAttributes.points) {
            let pairs = Path.splitPointsString(parsedAttributes.points);
            for (let i = 0; i < pairs.length; i += 2) {
                path.addPoint(matrix.transformPoint({ x: parseFloat(pairs[i + 0]), y: parseFloat(pairs[i + 1]) }));
            }
        }

        path.runtimeProps.importing = false;
        path.adjustBoundaries();
        path.save();

        return path;
    }

    static translatePoints(points, left, top) {
        let newPoints = [];
        for (let i = 0, l = points.length; i < l; ++i) {
            let pt = clone(points[i]);
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
        let d = "";
        if (!points.length) {
            return d;
        }
        d = "M " + points[0].x + "," + points[0].y;
        for (let i = 1, len = points.length; i < len; ++i) {
            d += "\r\n" + svgCommand(points[i], points[i - 1]);
        }
        if (closed) {
            d += "\r\n" + " Z";
        }
        return d;
    }

    static circleAtPoint(center, radius) {

        const MagicNumber = 0.55228475;
        let controlPointLength = radius * MagicNumber;
        let path = new Path();
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
        path.save();

        return path;
    }

    static rectangle(x, y, width, height) {
        let path = new Path();
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
        path.save();

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
    currentPointPosition: {
        displayName: "@position",
        type: "position",
        computed: true
    },
    currentPointType: {
        displayName: "Point type",
        type: "multiSwitch",
        defaultValue: null,
        computed: true,
        options: {
            items: [
                { value: PointType.Straight, icon: "point_straight" },
                { value: PointType.Mirrored, icon: "point_mirrored" },
                { value: PointType.Assymetric, icon: "point_assymetric" },
                { value: PointType.Disconnected, icon: "point_disconnected" }
            ],
            size: 3 / 4
        }
    },
    mode: {
        editable: false,
        useInModel: false,
        defaultValue: ElementState.Resize
    },
    points: {
        defaultValue: []
    },
    groups(path) {
        let baseGroups = PropertyMetadata.findAll(Types.Shape).groups();

        if (path && path.mode() === ElementState.Edit) {
            return [
                {
                    label: "@selectedPoint",
                    properties: ["currentPointPosition", "currentPointType"]
                },
                {
                    label: path.displayType(),
                    properties: ["pointRounding"]
                },
                baseGroups.find(x => x.label === "Appearance"),
                baseGroups.find(x => x.label === "@shadow")
            ];
        }

        return baseGroups;
    },

    prepareVisibility(path: Path) {
        let editMode = path.props.mode === ElementState.Edit;
        let pointSelected = path.runtimeProps.selectedPointIdx !== -1;
        return {
            currentPointPosition: editMode && pointSelected,
            currentPointType: editMode && pointSelected,
            pointRounding: editMode
        };
    }
});

function setElementPropertiesFromAttributes(element, parsedAttributes) {
    element.setProps({ pointRounding: 0 });

    if (parsedAttributes.fill !== undefined) {
        if (!parsedAttributes.fill || parsedAttributes.fill === "none") {
            element.fill = (Brush.Empty);
        } else {
            element.fill = (Brush.createFromCssColor(parsedAttributes.fill));
        }
    }
    else {
        element.fill = (Brush.Black);
    }

    if (parsedAttributes.stroke) {
        element.stroke = (Brush.createFromCssColor(parsedAttributes.stroke/*, parsedAttributes.strokeWidth, 0*/));
    } else {
        element.stroke = (Brush.Empty);
    }

    if (parsedAttributes.opacity) {
        element.opacity = (parsedAttributes.opacity);
    }

    if (parsedAttributes.miterLimit !== undefined) {
        element.miterLimit = parsedAttributes.miterLimit;
    }

    if (parsedAttributes.lineJoin) {
        element.lineJoin = parsedAttributes.lineJoin;
    }

    if (parsedAttributes.lineCap) {
        element.lineCap = parsedAttributes.lineCap;
    }

    if (parsedAttributes.id) {
        element.name = (parsedAttributes.id);
    }
}


function svgCommand(pt, prevPt) {
    if (isLinePoint(pt) && isLinePoint(prevPt)) { // line segment
        return "L " + pt.x + "," + pt.y;
    }
    // cubic bezier segment
    let cp1x = prevPt.cp2x
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
