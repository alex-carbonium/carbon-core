import Tool from "./Tool";
import angleAdjuster from "../../math/AngleAdjuster";
import RemovePathPointCommand from "../../commands/path/RemovePathPointCommand";
import AddPathPointCommand from "../../commands/path/AddPathPointCommand";
import commandManager from "../../framework/commands/CommandManager";
import UIElement from "../../framework/UIElement";
import Path from "./Path";
import SystemConfiguration from "../../SystemConfiguration";
import Selection from "../../framework/SelectionModel";
import Cursor from "../../framework/Cursor";
import Invalidate from "../../framework/Invalidate";
import { ViewTool } from "../../framework/Defs";
import SnapController from "../../framework/SnapController";
import Environment from "../../environment";
import UserSettings from "UserSettings";
import { IKeyboardState, IMouseEventData, IContext, ElementState, ICoordinate, ChangeMode } from "carbon-core";
import { IPathPoint } from "carbon-geometry";
import Cursors from "Cursors";

var closeCurrentPath = function (pt) {
    var points = this._pathElement.props.points;
    var lastPoint = points[points.length - 1];
    lastPoint.closed = true;
    this._pathElement.changePointAtIndex(lastPoint, points.length - 1);
    this._startSegmentPoint = null;
};

var completePath = function () {
    if (this._pathElement) {
        if (this._pathElement.length() > 1) {
            this._pathElement.adjustBoundaries();
        }
        else {
            this._changeMode(this._pathElement, ElementState.Resize);
            commandManager.execute(new RemovePathPointCommand(this._pathElement, this._pathElement.pointAtIndex(0)));
        }
        this._pathElement.nextPoint = null;
    }
    this._currentPoint = null;
    this._completedPath = true;
    setTimeout(function () {
        if (SystemConfiguration.ResetActiveToolToDefault) {
            this._app.resetCurrentTool();
        }
    }, 0);
};

var checkIfElementAvailable = function () {
    if (this._pathElement && this._pathElement.isOrphaned()) {
        this._pathElement = null;
    }

    return !!this._pathElement;
};


export default class GraphicalPathCreator extends Tool {
    _selectedPoint:IPathPoint;
    _originalPointBeforeMove:IPathPoint;
    _startSegmentPoint:IPathPoint;
    _currentPoint:IPathPoint;
    _startPoint:ICoordinate;
    _pathElement: Path;
    _shouldHandleByPath: boolean;
    _handlingByPath: boolean;
    _type:any;
    _parameters:any;
    _editTextToken:any;
    _cancelBinding:any;
    _mousepressed:boolean;
    _completedPath:boolean;

    constructor(app, type, parameters?) {
        super(ViewTool.Path);

        this._type = type;
        this._parameters = parameters;
        this._pathElement = null;
        this._shouldHandleByPath = false;
        this._handlingByPath = false;
        this._editTextToken = app.actionManager.subscribe("enter", this.onEditAction.bind(this));
    }

    onEditAction() {
        var element = Selection.selectedElement();
        if (element instanceof Path) {
            element.edit();
            if (!element.closed()) {
                this._pathElement = element;
                this._startSegmentPoint = null;
            }
        }
    }

    dispose() {
        if (this._editTextToken) {
            this._editTextToken.dispose();
            this._editTextToken = null;
        }
    }

    cancel() {
        if (this._pathElement) {
            this._pathElement.adjustBoundaries();
            this._pathElement = null;
        }
    }

    detach() {
        completePath.call(this);
        super.detach.apply(this, arguments);
        var selection = Selection.selectedElements();
        if (selection.length === 1 && selection[0] instanceof Path) {
            this._changeMode(selection[0], ElementState.Resize);
        }
        if (this._cancelBinding) {
            this._cancelBinding.dispose();
            delete this._cancelBinding;
        }
    }

    _attach() {
        super._attach.apply(this, arguments);
        Cursor.setGlobalCursor("pen_add_point");
        this._cancelBinding = this._app.actionManager.subscribe('cancel', this.cancel.bind(this));
        var element = Selection.selectedElement();
        if (element instanceof Path) {
            this._pathElement = element;
            this._startSegmentPoint = null;
        }
    }

    _detach() {
        super._detach.apply(this, arguments);
        Cursor.removeGlobalCursor();
    }

    mousedown(event: IMouseEventData, keys: IKeyboardState) {
        var eventData = { handled: false, x: event.x, y: event.y };
        this._selectedPoint = null;
        Environment.controller.startDrawingEvent.raise(eventData);
        if (eventData.handled) {
            return true;
        }

        this._mousepressed = true;
        event.handled = true;

        if (this._shouldHandleByPath && this._pathElement) {
            this._pathElement.mousedown(event, keys);
            this._handlingByPath = true;
            return;
        }

        if (this._pathElement) {
            var pt = this._pathElement.controlPointForPosition(event);
            if (pt) {
                this._closeOrRemovePoint(pt);
                return;
            }

            if (this._pathElement.closed() || this._completedPath) {
                this._changeMode(this._pathElement, ElementState.Resize);
                this._pathElement = null;
            }
        }

        if (!checkIfElementAvailable.call(this)) {
            this._createNewPath(event, keys);
        }

        this._addNewPathPoint(event, keys);
    }

    _createNewPath(event: IMouseEventData, keys: IKeyboardState) {
        Selection.unselectAll();
        this._pathElement = UIElement.fromType(this._type, this._parameters);
        this._startSegmentPoint = null;
        this._app.activePage.nameProvider.assignNewName(this._pathElement);
        var defaultSettings = this._app.defaultShapeSettings();
        if (defaultSettings) {
            this._pathElement.setProps(defaultSettings);
        }

        Environment.view.dropToLayer(event.x, event.y, this._pathElement);
        this._changeMode(this._pathElement, ElementState.Edit);
        Selection.makeSelection([this._pathElement]);

        this._completedPath = false;
    }

    layerdraw(context: IContext) {
        if (this._startPoint) {
            context.save();
            var scale = Environment.view.scale();
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
        var pos;
        if (!keys.ctrl) {
            pos = SnapController.applySnappingForPoint(event);
        } else {
            pos = event;
        }

        pos = this._pathElement.globalViewMatrixInverted().transformPoint(pos);
        this._currentPoint = { x: pos.x, y: pos.y, moveTo: this._startSegmentPoint === null };
        commandManager.execute(new AddPathPointCommand(this._pathElement, this._currentPoint));
        SnapController.calculateSnappingPointsForPath(this._pathElement);
        Invalidate.request();

        if (!this._startSegmentPoint) {
            this._startSegmentPoint = this._currentPoint;
        }

        this._pathElement.selectPoint(this._currentPoint);
    }
    _closeOrRemovePoint(pt) {
        if (!this._pathElement.closed() && pt === this._startSegmentPoint) {
            closeCurrentPath.call(this, pt);
        }
        // else if (!this._pathElement.closed() && pt === this._pathElement.pointAtIndex(this._pathElement.length() - 1)) {
        //     completePath.call(this);
        //     this._currentPoint = null;
        // }
        else {
            this._pathElement.selectPoint(pt);
            this._selectedPoint = pt;
            this._originalPointBeforeMove = clone(pt);
            // commandManager.execute(new RemovePathPointCommand(this._pathElement, pt));
            // if (this._pathElement.length() === 1) {
            //     this._pathElement = null;
            // } else {
            //     SnapController.calculateSnappingPointsForPath(this._pathElement);
            // }
        }

        Invalidate.request();
    }

    mouseup(event: IMouseEventData, keys: IKeyboardState) {
        if (this._handlingByPath) {
            this._pathElement.mouseup(event, keys);
        }

        this._mousepressed = false;
        this._handlingByPath = false;
        this._shouldHandleByPath = false;
        if(this._selectedPoint) {
            this._pathElement.changePointAtIndex(this._originalPointBeforeMove, this._selectedPoint.idx, ChangeMode.Self);
            this._pathElement.changePointAtIndex(this._selectedPoint, this._selectedPoint.idx);
            this._selectedPoint = null;
        }

        Invalidate.request();
        SnapController.clearActiveSnapLines();
    }

    mousemove(event: IMouseEventData, keys: IKeyboardState) {
        var x = event.x
            , y = event.y;
        var view = this.view();

        event.handled = true; // do not let the path receive events since they are propagated by the tool when needed

        if(this._selectedPoint) {
            event.cursor = Cursors.Pen.MovePoint;
            let pos = { x: event.x, y: event.y };
            pos = SnapController.applySnappingForPoint(pos);
            pos = this._pathElement.globalViewMatrixInverted().transformPoint(pos);
            this._selectedPoint.x = pos.x;
            this._selectedPoint.y = pos.y;
            this._pathElement.changePointAtIndex(this._selectedPoint, this._selectedPoint.idx, ChangeMode.Self);
            Invalidate.request();
            return;
        }

        event.cursor = Cursors.Pen.AddPoint;

        this._startPoint = null;

        if (!checkIfElementAvailable.call(this)) {
            this._startPoint = { x: Math.round(event.x * 2) / 2, y: Math.round(event.y * 2) / 2 };
            Invalidate.requestInteractionOnly();

            return;
        }

        this._pathElement.mousemove(event, keys);

        if (this._handlingByPath) {
            return;
        }

        event.cursor = Cursors.Pen.AddPoint;

        this._shouldHandleByPath = false;
        if (this._pathElement.isHoveringOverPoint()) {
            if (keys.ctrl) {
                event.cursor = Cursors.Pen.MovePoint;
                this._shouldHandleByPath = true;
            }
            else if (keys.alt) {
                event.cursor = Cursors.Pen.MoveHandle;
                this._shouldHandleByPath = true;
            }
        }
        else if (keys.alt && this._pathElement.isHoveringOverHandle()) {
            event.cursor = Cursors.Pen.MoveHandle;
            this._shouldHandleByPath = true;
        }
        else if (keys.shift && this._pathElement.isHoveringOverSegment()) {
            event.cursor = Cursors.Pen.AddPoint;
            this._shouldHandleByPath = true;
        }

        if (this._shouldHandleByPath) {
            this._pathElement.nextPoint = null;
            Invalidate.request();
            return;
        }

        if (this._pathElement.isHoveringOverPoint()) {
            if (!this._pathElement.closed() && (this._pathElement.hoverPoint === this._startSegmentPoint)) {
                event.cursor = Cursors.Pen.ClosePath;
            }
            else {
                event.cursor = Cursors.Pen.MovePoint;
                this._pathElement.nextPoint = null;
            }
            Invalidate.request();
            SnapController.clearActiveSnapLines();
            return;
        }

        this._pathElement.resetHover();

        if (this._completedPath) {
            return;
        }

        var pos = this._pathElement.globalViewMatrixInverted().transformPoint(event);

        if (!keys.ctrl) {
            pos = SnapController.applySnappingForPoint(pos);
        }

        x = pos.x;
        y = pos.y;

        this._pathElement.nextPoint = { x, y };

        if (this._currentPoint && keys.shift) {
            var point = angleAdjuster.adjust({ x: this._currentPoint.x, y: this._currentPoint.y }, { x: x, y: y });
            x = point.x;
            y = point.y;
        }

        if (this._mousepressed) {
            this._pathElement.nextPoint = null;
            if (this._currentPoint) { //there is no current point when closing the path and moving the 'closing' point without releasing mouse
                this._currentPoint.cp2x = x;
                this._currentPoint.cp2y = y;
                this._currentPoint.cp1x = this._currentPoint.x * 2 - x;
                this._currentPoint.cp1y = this._currentPoint.y * 2 - y;
                this._currentPoint.type = 1;
                Invalidate.request();
            }
        }
    }

    _changeMode(element, mode:ElementState) {
        if (element.mode() !== mode) {
            element.mode(mode);
        }
    }
}
