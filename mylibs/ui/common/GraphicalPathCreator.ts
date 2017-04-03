import Tool from "./Tool";
import angleAdjuster from "../../math/AngleAdjuster";
import RemovePathPointCommand from "../../commands/path/RemovePathPointCommand";
import AddPathPointCommand from "../../commands/path/AddPathPointCommand";
import commandManager from "../../framework/commands/CommandManager";
import UIElement from "../../framework/UIElement";
import Path from  "./Path";
import SystemConfiguration from "../../SystemConfiguration";
import Selection from "../../framework/SelectionModel";
import Cursor from "../../framework/Cursor";
import Invalidate from "../../framework/Invalidate";
import {ViewTool} from "../../framework/Defs";
import SnapController from "../../framework/SnapController";
import Environment from "../../environment";
import {IKeyboardState, IMouseEventData} from "carbon-core";

var closeCurrentPath = function (pt) {
    this._element.closed(true);
    completePath.call(this);
};

var completePath = function() {
    if (this._element) {
        if (this._element.length() > 1) {
            this._element.adjustBoundaries();
        }
        else {
            this._changeMode(this._element, "resize");
            commandManager.execute(new RemovePathPointCommand(this._element, this._element.pointAtIndex(0)));
        }
        this._element.nextPoint = null;
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
    if (this._element && this._element.isOrphaned()) {
        this._element = null;
    }
    return this._element != null;
};


export default class GraphicalPathCreator extends Tool {
    [name: string]: any;
    _element: Path;
    _shouldHandleByPath: boolean;
    _handlingByPath: boolean;

    constructor(app, type, parameters?) {
        super(ViewTool.Path);

        this._type = type;
        this._parameters = parameters;
        this.points = [];
        this._element = null;
        this._shouldHandleByPath = false;
        this._handlingByPath = false;
        this._editTextToken = app.actionManager.subscribe("enter", this.onEditAction.bind(this));
    }

    onEditAction() {
        var element = Selection.selectedElement();
        if (element instanceof Path) {
            element.edit();
            if(!element.closed()){
                this._element = element;
            }
        }
    }

    dispose() {
        if (this._editTextToken) {
            this._editTextToken.dispose();
            this._editTextToken = null;
        }
    }

    cancel(){
        if(this._element){
            this._element.adjustBoundaries();
            this._element = null;
        }
    }

    detach() {
        completePath.call(this);
        super.detach.apply(this, arguments);
        var selection = Selection.selectedElements();
        if (selection.length === 1 && selection[0] instanceof Path){
            this._changeMode(selection[0], "resize");
        }
        if(this._cancelBinding){
            this._cancelBinding.dispose();
            delete this._cancelBinding;
        }
    }

    _attach() {
        super._attach.apply(this, arguments);
        Cursor.setGlobalCursor("pen_add_point");
        this._cancelBinding = this._app.actionManager.subscribe('cancel', this.cancel.bind(this));
        var element = Selection.selectedElement();
        if (element instanceof Path){
            this._element = element;
        }
    }

    _detach() {
        super._detach.apply(this, arguments);
        Cursor.removeGlobalCursor();
    }

    mousedown(event: IMouseEventData, keys: IKeyboardState) {
        var eventData = {handled: false, x: event.x, y: event.y};
        Environment.controller.startDrawingEvent.raise(eventData);
        if (eventData.handled){
            return true;
        }

        this._mousepressed = true;
        event.handled = true;

        if (this._shouldHandleByPath){
            this._element.mousedown(event, keys);
            this._handlingByPath = true;
            return;
        }

        if (this._element){
            var pt = this._element.controlPointForPosition(event);
            if (pt != null) {
                this._closeOrRemovePoint(pt);
                return;
            }

            if (this._element.closed() || this._completedPath){
                this._changeMode(this._element, "resize");
                this._element = null;
            }
        }

        if (!checkIfElementAvailable.call(this)) {
            this._createNewPath(event, keys);
        }

        this._addNewPathPoint(event, keys);
    }

    _createNewPath(event: IMouseEventData, keys: IKeyboardState){
        Selection.unselectAll();
        this._element = UIElement.fromType(this._type, this._parameters);
        this._app.activePage.nameProvider.assignNewName(this._element);
        var defaultSettings = this._app.defaultShapeSettings();
        if (defaultSettings) {
            this._element.setProps(defaultSettings);
        }

        this._app.activePage.dropToPage(event.x, event.y, this._element);
        this._changeMode(this._element, "edit");
        Selection.makeSelection([this._element]);

        this._completedPath = false;
    }
    _addNewPathPoint(event: IMouseEventData, keys: IKeyboardState){
        var pos;
        if (!keys.ctrl) {
            pos = SnapController.applySnappingForPoint(event);
        } else {
            pos = event;
        }
        pos = this._element.globalViewMatrixInverted().transformPoint(pos);
        this._currentPoint = {x: pos.x, y: pos.y};
        commandManager.execute(new AddPathPointCommand(this._element, this._currentPoint));
        SnapController.calculateSnappingPointsForPath(this._element);
        Invalidate.request();
    }
    _closeOrRemovePoint(pt){
        if (!this._element.closed() && pt === this._element.pointAtIndex(0)) {
            closeCurrentPath.call(this, pt);
        }
        else if (!this._element.closed() && pt === this._element.pointAtIndex(this._element.length() - 1)) {
            completePath.call(this);
            this._currentPoint = null;
        }
        else {
            commandManager.execute(new RemovePathPointCommand(this._element, pt));
            if (this._element.length() === 1) {
                this._element = null;
            } else {
                SnapController.calculateSnappingPointsForPath(this._element);
            }
        }

        Invalidate.request();
    }

    mouseup(event: IMouseEventData, keys: IKeyboardState) {
        if (this._handlingByPath){
            this._element.mouseup(event, keys);
        }

        this._mousepressed = false;
        this._handlingByPath = false;
        this._shouldHandleByPath = false;

        Invalidate.request();
        SnapController.clearActiveSnapLines();
    }

    mousemove(event: IMouseEventData, keys: IKeyboardState) {
        var x = event.x
            , y = event.y;
        var view = this.view();

        event.handled = true; // do not let the path receive events since they are propagated by the tool when needed
        event.cursor = "pen_add_point";

        if (!checkIfElementAvailable.call(this)) {
            return;
        }

        this._element.mousemove(event, keys);

        if (this._handlingByPath){
            return;
        }

        event.cursor = "pen_add_point";

        this._shouldHandleByPath = false;
        if (this._element.isHoveringOverPoint()){
            if (keys.ctrl){
                event.cursor = "pen_move_point";
                this._shouldHandleByPath = true;
            }
            else if (keys.alt){
                event.cursor = "pen_move_handle";
                this._shouldHandleByPath = true;
            }
        }
        else if (keys.alt && this._element.isHoveringOverHandle()){
            event.cursor = "pen_move_handle";
            this._shouldHandleByPath = true;
        }
        else if (keys.shift && this._element.isHoveringOverSegment()){
            event.cursor = "pen_add_point";
            this._shouldHandleByPath = true;
        }

        if (this._shouldHandleByPath){
            this._element.nextPoint = null;
            Invalidate.request();
            return;
        }

        if (this._element.isHoveringOverPoint()){
            if (!this._element.closed() && (this._element.hoverPoint === this._element.firstPoint || this._element.hoverPoint === this._element.lastPoint)) {
                event.cursor = "pen_close_path";
            }
            else {
                event.cursor = "pen_remove_point";
                this._element.nextPoint = null;
            }
            Invalidate.request();
            SnapController.clearActiveSnapLines();
            return;
        }

        this._element.resetHover();

        if (this._completedPath){
            return;
        }

        var pos = this._element.globalViewMatrixInverted().transformPoint(event);

        if (!keys.ctrl) {
            pos = SnapController.applySnappingForPoint(pos);
        }

        x = pos.x;
        y = pos.y;

        this._element.nextPoint = {x, y};

        if (this._currentPoint && keys.shift) {
            var point = angleAdjuster.adjust({x: this._currentPoint.x, y: this._currentPoint.y}, {x: x, y: y});
            x = point.x;
            y = point.y;
        }

        if (this._mousepressed) {
            this._element.nextPoint = null;
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

    _changeMode(element, mode){
        if (element.mode() !== mode){
            element.mode(mode);
        }
    }
}
