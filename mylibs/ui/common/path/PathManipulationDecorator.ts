import Container from "framework/Container";
import Path from "framework/Path";
import { IIsolatable, ChangeMode, LayerTypes, ElementState, PointType, IMouseEventHandler, IKeyboardState, IMouseEventData, IPathPoint, IDisposable } from "carbon-core";
import UIElementDecorator from "framework/UIElementDecorator";
import Environment from "environment";
import Selection from "framework/SelectionModel";
import UserSettings from "UserSettings";
import SnapController from "framework/SnapController";
import Invalidate from "framework/Invalidate";
import Cursors from "Cursors";
import PropertyTracker from "framework/PropertyTracker";
import UIElement from "framework/UIElement";
import angleAdjuster from "math/AngleAdjuster";

export const enum PathManipulationMode {
    Create = 0,
    Edit = 1
}

function pointsEqual(p1, p2) {
    if (p1 === p2) {
        return true;
    }
    return p1.type === p2.type && p1.x === p2.x && p1.y === p2.y
        && p1.cp1x === p2.cp1x && p1.cp1y === p2.cp1y
        && p1.cp2x === p2.cp2x && p1.cp2y === p2.cp2y;
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

function moveCurrentPoint(dx, dy) {
    let path: Path = this.element;
    let keys = Object.keys(this._selectedPoints);

    if (keys.length > 1) {
        for (let i = 0; i < keys.length; ++i) {
            let p = this._selectedPoints[keys[i]];
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
        path.runtimeProps.currentPointX = this._currentPoint.x;
        path.runtimeProps.currentPointY = this._currentPoint.y;
        this._saveOnMouseUp = true;
        path._refreshComputedProps();
    }
}

const CP_HANDLE_RADIUS = UserSettings.path.editHandleSize;
const CP_HANDLE_RADIUS2 = CP_HANDLE_RADIUS * 2;
const CP_RADIUS = UserSettings.path.editPointSize;
const CP_RADIUS2 = CP_RADIUS * 2;

const POINT_STROKE = UserSettings.path.pointStroke;
const POINT_FILL = UserSettings.path.pointFill;
const POINT_FILL_FIRST_OPEN = UserSettings.path.pointFillFirstPoint;

export default class PathManipulationObject extends UIElementDecorator implements IMouseEventHandler {
    private _altPressed: boolean;
    private _bendingData: any;
    private _currentPoint: IPathPoint;
    private _handlePoint: any;
    private _groupMove: boolean;
    private _cancelBinding: IDisposable;
    private _selectedPoints: any;

    constructor(public constructMode: boolean = false) {
        super();
        this._selectedPoints = {};
    }

    attach(element: Path) {
        super.attach(element);
        Environment.view.registerForLayerDraw(LayerTypes.Interaction, this);
        Environment.controller.captureMouse(this);
        SnapController.calculateSnappingPointsForPath(this.element);
        this._cancelBinding = Environment.controller.actionManager.subscribe('cancel', this.cancel.bind(this));

        Invalidate.request();
    }

    detach() {
        if (this._cancelBinding) {
            this._cancelBinding.dispose();
            this._cancelBinding = null;
        }

        Environment.view.unregisterForLayerDraw(LayerTypes.Interaction, this);
        Environment.controller.releaseMouse(this);
        Invalidate.request();

        // todo: clear all segments with less then 2 points

        if (this.path.points.length < 2) {
            this.path.parent().remove(this.path);
            Selection.makeSelection([]);
        } else {
            this.element.adjustBoundaries();
            this.element.resetGlobalViewCache();
        }

        SnapController.clearActiveSnapLines();
        super.detach();
    }

    cancel() {
        this.element.mode(ElementState.Resize);
        return false;// stop propagation
    }

    mouseup(event: IMouseEventData, keys: IKeyboardState) {
        delete this._altPressed;
        let path: Path = this.element;
        if (this._saveOnMouseUp) {
            path.save();
            this._saveOnMouseUp = false;
        }

        if (this._bendingData) {
            this._bendingData = null;
            SnapController.clearActiveSnapLines();
            this._currentPoint = null;
            this._handlePoint = null;
            path.adjustBoundaries();
            path.invalidate();

            PropertyTracker.resumeAndFlush();
            return;
        }

        if (this.constructMode) {
            this._mousepressed = false;
            if (this.selectedPoint) {
                this.path.changePointAtIndex(this._originalPointBeforeMove, this.selectedPoint.idx, ChangeMode.Self);
                this.path.changePointAtIndex(this.selectedPoint, this.selectedPoint.idx);
            }

            Invalidate.request();
            SnapController.clearActiveSnapLines();
            this._handlePoint = null;
            this._currentPoint = null;
            return;
        }

        let pt = this._currentPoint || this._handlePoint;
        if (pt) {
            SnapController.clearActiveSnapLines();
            this._currentPoint = null;
            this._handlePoint = null;
            if (!pointsEqual(pt, this._originalPoint)) {
                path.changePointAtIndex(pt, pt.idx);
                path.adjustBoundaries();
            }
            PropertyTracker.resumeAndFlush();
        }
    }


    get selectedPoint() {
        var keys = Object.keys(this._selectedPoints);
        if (keys.length !== 1) {
            return null;
        }

        return this._selectedPoints[keys[0]];
    }

    set selectedPoint(pt) {
        if (this.selectedPoint !== pt) {
            if (pt) {
                this._selectedPoints = { [pt.idx]: pt };
                this.path.runtimeProps.currentPointX = pt.x;
                this.path.runtimeProps.currentPointY = pt.y;
                this.path.runtimeProps.currentPointType = pt.type;
                this.path.runtimeProps.selectedPointIdx = pt.idx;
            } else {
                this.clearSelectedPoints();
            }

            this.path._refreshComputedProps();
        }
    }

    clearSelectedPoints() {
        this._selectedPoints = {};
        this.path.runtimeProps.selectedPointIdx = -1;
    }

    addToSelectedPoints(pt) {
        // if (!this._selectedPoints) {
        //     this._selectedPoints = {}
        // }
        if (this._selectedPoints[pt.idx]) {
            delete this._selectedPoints[pt.idx];
        } else {
            this._selectedPoints[pt.idx] = pt;
        }

        if (this.path.runtimeProps.selectedPointIdx !== -1 && Object.keys(this._selectedPoints).length > 1) {
            this.path.runtimeProps.selectedPointIdx = -1;
        }

        Invalidate.requestInteractionOnly();
    }

    mousedown(event: IMouseEventData, keys: IKeyboardState) {
        let x = event.x,
            y = event.y;

        this._groupMove = false;
        let path: Path = this.element;

        let pt = path.controlPointForPosition(event);

        if (pt && keys.shift) {
            this.addToSelectedPoints(pt);
            event.handled = true;
        } else if (!pt || !this._selectedPoints[pt.idx]) {
            this.clearSelectedPoints();
        }

        if (!event.handled && pt && !this._selectedPoints[pt.idx]) {
            this.selectedPoint = pt;
        }

        // 1. select point if clicked to move
        // 2. choose handle if clicked to move
        // 3. else if in construct mode, add new point
        // 4.1. else if consttruct mode, click to edge (split edge)
        // 4. else if in bending mode click on edge (prepare for bending move)

        if (!event.handled && pt) {
            if (!event.handled && this.constructMode && (!this.path.closed() && pt === this._startSegmentPoint)) {
                this._closeCurrentPath(pt);
            } else if (keys.alt) {
                this._altPressed = true;
                this._handlePoint = pt;
                this._handlePoint._selectedPoint = 0;
            } else {
                this._currentPoint = pt;
            }

            this._originalPoint = clone(pt);
            this._pointOnPath = null;
            event.handled = true;
        }

        pt = path.handlePointForPosition(event);
        if (!event.handled && pt) {
            event.handled = true;
            this._handlePoint = pt;
            this._originalPoint = clone(pt);
            this._pointOnPath = null;
        }

        if (!event.handled && this._pointOnPath) {
            event.handled = true;
            if (keys.shift) {
                let data = path.getInsertPointData(this._pointOnPath);
                let newPoint = null;
                if (data.length === 1) {
                    newPoint = path.insertPointAtIndex(data[0], data[0].idx);
                } else {
                    path.changePointAtIndex(data[0], data[0].idx);
                    path.changePointAtIndex(data[1], data[1].idx);
                    newPoint = path.insertPointAtIndex(data[2], data[2].idx);
                }

                this._startSegmentPoint = this._lastSegmentStartPoint();

                this._currentPoint = newPoint;
                this._originalPoint = clone(newPoint);

                this._pointOnPath = null;
                Invalidate.request();
            }
            else {
                this._bendingData = path.calculateOriginalBendingData(this._pointOnPath);
                // set bending handler
                this._pointOnPath = null;
            }
        }

        if (!event.handled && this.constructMode) {
            let eventData = { handled: false, x: event.x, y: event.y };
            this.selectedPoint = null;
            Environment.controller.startDrawingEvent.raise(eventData);
            if (eventData.handled) {
                return true;
            }

            this._mousepressed = true;
            event.handled = true;

            this._addNewPathPoint(event, keys);
        }

        // if (Object.keys(this._selectedPoints).length <= 1) { // ??????
        //     this.selectedPoint = pt;
        // }

        if (event.handled) {
            PropertyTracker.suspend();
        }
    }

    isHoveringOverSegment(): boolean {
        return !!this._pointOnPath;
    }
    isHoveringOverHandle(): boolean {
        return !!this._hoverHandlePoint;
    }
    isHoveringOverPoint(): boolean {
        return !!this._hoverPoint;
    }
    get hoverPoint() {
        return this._hoverPoint;
    }
    resetHover(): void {
        this._pointOnPath = null;
        this._hoverHandlePoint = null;
        this._hoverPoint = null;
    }

    get path(): Path {
        return this.element;
    }

    mousemove(event: IMouseEventData, keys: IKeyboardState) {
        let pos = { x: event.x, y: event.y };
        let path: Path = this.element;
        let view = Environment.view;

        if (!keys.ctrl) {
            pos = SnapController.applySnappingForPoint(pos);
        }
        pos = path.globalViewMatrixInverted().transformPoint(pos);

        if (this._bendingData) {
            event.handled = true;
            path.bendPoints(pos, this._bendingData);
            Invalidate.request();
            return;
        }

        // 1. move selected point
        // bend if selected

        // 3. else if in construct mode, add new point
        // 4.1. else if consttruct mode, click to edge (split edge)
        // 4. else if in bending mode click on edge (prepare for bending move)

        if (this._currentPoint) {
            // pos = SnapController.applySnappingForPoint(pos);

            // pos = path.globalViewMatrixInverted().transformPoint(pos);

            path._roundPoint(pos);

            let newX = pos.x
                , newY = pos.y
                , dx = this._currentPoint.x - newX
                , dy = this._currentPoint.y - newY;
            if (dx || dy) {
                moveCurrentPoint.call(this, dx, dy);

                Invalidate.request();
            }
            this._saveOnMouseUp = true;
            return;
        }

        if (this._handlePoint) {
            // pos = SnapController.applySnappingForPoint(pos);
            // pos = path.globalViewMatrixInverted().transformPoint(pos);
            let pt = this._handlePoint;
            let newX = pos.x,
                newY = pos.y;
            let x = pt.x,
                y = pt.y;
            let x2, y2;

            if (this._currentPoint && keys.shift) {
                let point = angleAdjuster.adjust({ x: pt.x, y: pt.y }, { x: x, y: y });
                x = point.x;
                y = point.y;
            }

            if (pt._selectedPoint === 1) {
                pt.cp1x = newX;
                pt.cp1y = newY;
                x2 = pt.cp2x;
                y2 = pt.cp2y;
            } else {
                pt.cp2x = newX;
                pt.cp2y = newY;
                x2 = pt.cp1x;
                y2 = pt.cp1y;
            }

            if (pt.type !== PointType.Disconnected) {
                let len2 = Math.sqrt((x - x2) * (x - x2) + (y - y2) * (y - y2));
                let len1 = Math.sqrt((x - newX) * (x - newX) + (y - newY) * (y - newY));

                if (this._altPressed || pt._selectedPoint === 0 || pt.type === PointType.Mirrored) { // move both handles
                    len2 = len1;
                    pt.type = PointType.Mirrored;
                } else {
                    pt.type = PointType.Assymetric;
                }

                if (len1 > 0) {
                    let vx = (newX - x) * len2 / len1;
                    let vy = (newY - y) * len2 / len1;

                    if (pt._selectedPoint === 1) {
                        pt.cp2x = x - vx;
                        pt.cp2y = y - vy;
                    } else {
                        pt.cp1x = x - vx;
                        pt.cp1y = y - vy;
                    }
                }
            }
            this._saveOnMouseUp = true;
            Invalidate.request();
            return;
        }

        if (this.constructMode) {
            event.handled = true; // do not let the path receive events since they are propagated by the tool when needed

            if (!this._startSegmentPoint) {
                this._startPoint = { x: event.x, y: event.y };
                path._roundPoint(this._startPoint);
            } else {
                this._startPoint = null;
            }

            this.nextPoint = { x: pos.x, y: pos.y };
        }

        let pt = path.getPointIfClose(event);
        if (this._pointOnPath !== pt) {
            this._pointOnPath = pt;
            Invalidate.requestInteractionOnly();
        }

        this._updateCursor(event, keys);
    }

    _updateCursor(event, keys) {
        let x = event.x, y = event.y;
        let path = this.path;
        let pt = path.controlPointForPosition(event);

        //this.resetHover();
        if (!updateHoverPoint.call(this, pt)) {
            pt = path.handlePointForPosition(event);
            updateHoverHandlePoint.call(this, pt);
        }

        if (!this.path.closed() && (this.hoverPoint === this._startSegmentPoint)) {
            event.cursor = Cursors.Pen.ClosePath;
        }
        else if (this.isHoveringOverHandle() || (this.isHoveringOverPoint() && keys.alt)) {
            event.cursor = Cursors.Pen.MoveHandle;
            this.nextPoint = null;
            this._startPoint = null;
        }
        else if (this.isHoveringOverPoint()) {
            event.cursor = Cursors.Pen.MovePoint;
            this.nextPoint = null;
            this._startPoint = null;
        }
        else if (this.isHoveringOverSegment()) {
            event.cursor = keys.shift ? Cursors.Pen.AddPoint : Cursors.Pen.MoveSegment;
            this.nextPoint = null;
            this._startPoint = null;
        }
        else if (this.constructMode) {
            event.cursor = Cursors.Pen.AddPoint;
        }
        else {
            event.cursor = Environment.controller.defaultCursor();
        }
    }

    _lastSegmentStartPoint() {
        var points = this.path.points;
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

    dblclick(event, scale: number) {
        let pt = this.path.controlPointForPosition(event);
        if (pt) {
            if (pt.type !== PointType.Straight) {
                pt.type = PointType.Straight;
            } else {
                pt.type = PointType.Assymetric;
            }

            this.path.runtimeProps.currentPointType = pt.type;
            this.path._refreshComputedProps();

            Invalidate.request();

            return;
        }

        if (!this.element.hitTest(event, scale)) {
            this.cancel();
        }
    }
    click(event) {

    }

    set nextPoint(value) {
        if (value !== this._nextPoint) {
            Invalidate.requestInteractionOnly();
        }
        this._nextPoint = value;
        if (this._nextPoint) {
            this.element._initPoint(value);
        }
    }

    get nextPoint() {
        return this._nextPoint;
    }

    onLayerDraw(layer, context, environment) {
        let path = this.element;
        let scale = environment.view.scale();

        if (Selection.selectedElement() === path && path.mode() === ElementState.Edit) {
            context.save();

            context.lineWidth = 1 / scale;

            context.strokeStyle = UserSettings.path.editPathStroke;
            context.beginPath();

            let matrix = path.globalViewMatrix();
            let w = path.props.width,
                h = path.props.height;

            let handlePoint = this._handlePoint || this._hoverHandlePoint;
            let hoverPoint = this._currentPoint || this._hoverPoint;

            path.drawPath(context, w, h);
            if (this.nextPoint && path.points.length && !path.closed() && !path.points[path.points.length - 1].closed) {
                let nextPt;
                if (hoverPoint === path.points[0]) {
                    nextPt = hoverPoint;
                } else {
                    nextPt = this.nextPoint;
                }

                path._drawSegment(context, nextPt, path.points[path.points.length - 1], true);
            }
            context.stroke();

            let needClearStyle = true;

            function clearStyle() {
                if (needClearStyle) {
                    context.strokeStyle = POINT_STROKE;
                    context.fillStyle = POINT_FILL;
                    needClearStyle = false;
                }
            }
            let points = path.points;
            function hasClosePointAfterIndex(idx) {
                for (let i = idx + 1; i < points.length; ++i) {
                    if (points[i].closed) {
                        return true;
                    }
                }

                return false;
            }

            for (let i = 0, len = points.length; i < len; ++i) {
                let pt = points[i];
                let tpt = matrix.transformPoint(pt);

                clearStyle();

                if (pt.type !== PointType.Straight) {
                    let cp1 = matrix.transformPoint2(pt.cp1x, pt.cp1y);
                    let cp2 = matrix.transformPoint2(pt.cp2x, pt.cp2y);
                    context.beginPath();
                    context.moveTo(cp1.x, cp1.y);
                    context.lineTo(tpt.x, tpt.y);
                    context.lineTo(cp2.x, cp2.y);
                    context.stroke();

                    if (pt === handlePoint && (handlePoint._selectedPoint === 1 || this._altPressed)) {
                        context.fillStyle = POINT_STROKE;
                        needClearStyle = true;
                    }

                    let r = CP_HANDLE_RADIUS / scale;
                    context.beginPath();
                    context.moveTo(cp1.x - r, cp1.y);
                    context.lineTo(cp1.x, cp1.y - r);
                    context.lineTo(cp1.x + r, cp1.y);
                    context.lineTo(cp1.x, cp1.y + r);
                    context.closePath();
                    context.fill();
                    context.stroke();

                    clearStyle();

                    if (pt === handlePoint && (handlePoint._selectedPoint === 2 || path._altPressed)) {
                        context.fillStyle = POINT_STROKE;
                        needClearStyle = true;
                    }
                    context.beginPath();
                    context.moveTo(cp2.x - r, cp2.y);
                    context.lineTo(cp2.x, cp2.y - r);
                    context.lineTo(cp2.x + r, cp2.y);
                    context.lineTo(cp2.x, cp2.y + r);
                    context.closePath();
                    context.fill();
                    context.stroke();

                    clearStyle();
                }
                if (pt === hoverPoint || this._selectedPoints[pt.idx]) {
                    context.fillStyle = POINT_STROKE;
                    needClearStyle = true;
                } else if (i === path.points.length - 1 && !path.closed() && !pt.closed) {
                    context.fillStyle = POINT_FILL_FIRST_OPEN;
                    needClearStyle = true;
                }

                let r = CP_RADIUS;
                if ((i === 0 && !(path.closed() || hasClosePointAfterIndex(i)) && !pt.closed) || (pt.moveTo && !hasClosePointAfterIndex(i))) {
                    r--;
                    context.circle(tpt.x, tpt.y, (r + 2) / scale);
                    context.stroke();
                }

                context.circle(tpt.x, tpt.y, r / scale);
                context.fill();
                context.stroke();
            }

            if (this._pointOnPath) {
                context.fillStyle = POINT_STROKE;
                let pp = path.globalViewMatrix().transformPoint(this._pointOnPath);
                context.circle(pp.x, pp.y, CP_RADIUS / scale);
                context.fill2();
            }
            context.restore();
        }

        if (this._startPoint) {
            context.save();
            context.fillStyle = UserSettings.path.pointFill;
            context.strokeStyle = UserSettings.path.pointStroke;
            context.lineWidth = 1 / scale;
            context.circle(this._startPoint.x, this._startPoint.y, 4 / scale);

            context.fill();
            context.stroke();
            context.restore();
        }
    }

    _addNewPathPoint(event: IMouseEventData, keys: IKeyboardState) {
        let pos;

        if (!keys.ctrl) {
            pos = SnapController.applySnappingForPoint(event);
        } else {
            pos = event;
        }

        pos = this.path.globalViewMatrixInverted().transformPoint(pos);
        let pt = { x: pos.x, y: pos.y, moveTo: this._startSegmentPoint === null };

        this.path.insertPointAtIndex(pt, this.path.points.length);

        SnapController.calculateSnappingPointsForPath(this.path);
        Invalidate.request();

        if (!this._startSegmentPoint) {
            this._startSegmentPoint = pt;
        }

        this.selectedPoint = null;
        this._handlePoint = pt;
        this._originalPoint = clone(pt);
        this._handlePoint._selectedPoint = 0;
        this.nextPoint = null;
        this._startPoint = null;
    }

    _closeOrRemovePoint(pt) {
        if (!this.path.closed() && pt === this._startSegmentPoint) {
            this._closeCurrentPath(pt);
        }
        else {
            this.selectedPoint = pt;
            this._originalPointBeforeMove = clone(pt);
        }

        Invalidate.request();
    }

    _closeCurrentPath(pt) {
        var points = this.path.props.points;
        var lastPoint = points[points.length - 1];
        lastPoint.closed = true;
        this.path.changePointAtIndex(lastPoint, points.length - 1);
        this._startSegmentPoint = null;
    }

    currentPointType(value: PointType, changeMode: ChangeMode) {
        let points = this._selectedPoints;
        var keys = Object.keys(points);
        if (keys.length === 0) {
            return;
        }

        for (var key of Object.keys(points)) {
            var pt = points[key];
            let newPoint = Object.assign({}, pt);
            newPoint.type = value;
            this.path.changePointAtIndex(newPoint, newPoint.idx, changeMode);
            this._selectedPoints[newPoint.idx] = newPoint;
        }

        this.path.save();
    }

    currentPointX(value: PointType, changeMode: ChangeMode) {
        let points = this._selectedPoints;
        var keys = Object.keys(points);
        if (keys.length === 0) {
            return;
        }

        for (var key of Object.keys(points)) {
            var pt = points[key];
            let newPoint = Object.assign({}, pt);
            newPoint.x = value;
            this.path.changePointAtIndex(newPoint, newPoint.idx, changeMode);
            this._selectedPoints[newPoint.idx] = newPoint;
        }

        this.path.save();
    }

    currentPointY(value: PointType, changeMode: ChangeMode) {
        let points = this._selectedPoints;
        var keys = Object.keys(points);
        if (keys.length === 0) {
            return;
        }

        for (var key of Object.keys(points)) {
            var pt = points[key];
            let newPoint = Object.assign({}, pt);
            newPoint.y = value;
            this.path.changePointAtIndex(newPoint, newPoint.idx, changeMode);
            this._selectedPoints[newPoint.idx] = newPoint;
        }

        this.path.save();
    }
}