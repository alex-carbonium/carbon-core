import Tool from "./Tool";
import angleAdjuster from "../../math/AngleAdjuster";
import UIElement from "../../framework/UIElement";
import Path from "framework/Path";
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
import PathManipulationDecorator from "ui/common/path/PathManipulationDecorator";
import NullContainer from "framework/NullContainer";


export default class PathTool extends Tool {
    _pathElement: Path;
    _type: any;
    _parameters: any;
    _editTextToken: any;
    _cancelBinding: any;

    constructor(app, type, parameters?) {
        super(ViewTool.Path);

        this._type = type;
        this._parameters = parameters;
        this._pathElement = null;
        this._editTextToken = app.actionManager.subscribe("enter", this.onEditAction.bind(this));
    }

    onEditAction() {
        var element = Selection.selectedElement();
        if (element instanceof Path) {
            element.edit();
            if (!element.closed()) {
                this._pathElement = element;
                this._pathElement.addDecorator(new PathManipulationDecorator());
            }
        }
    }

    dispose() {
        if (this._editTextToken) {
            this._editTextToken.dispose();
            this._editTextToken = null;
        }
    }

    detach() {
        super.detach.apply(this, arguments);

        if (this._pathElement) {
            this._changeMode(this._pathElement, ElementState.Resize);
        }

        if (this._cancelBinding) {
            this._cancelBinding.dispose();
            this._cancelBinding = null;
        }

        setTimeout(function () {
            if (SystemConfiguration.ResetActiveToolToDefault) {
                this._app.resetCurrentTool();
            }
        }, 0);
    }

    cancel() {
        if (this._pathElement) {
            this._pathElement.mode(ElementState.Resize);
        }
        this._createNewPath();
    }

    _attach() {
        super._attach.apply(this, arguments);
        this._cancelBinding = Environment.controller.actionManager.subscribe('cancel', this.cancel.bind(this));
        var element = Selection.selectedElement();
        if (element instanceof Path && element.mode() === ElementState.Edit) {
            this._pathElement = element;
            this._pathElement.removeDecoratorByType(PathManipulationDecorator);
            this._pathElement.addDecorator(new PathManipulationDecorator(true));
        } else {
            this._createNewPath();
        }
    }

    _detach() {
        super._detach.apply(this, arguments);
        Cursor.removeGlobalCursor();
        if(this._pathElement) {
            this._pathElement.removeDecoratorByType(PathManipulationDecorator);
        }
    }

    mousedown(event: IMouseEventData, keys: IKeyboardState) {
        if (this._pathElement.runtimeProps.inserted && (!this._pathElement.parent() || this._pathElement.parent() === NullContainer)) {
            this._createNewPath();
        }

        if (!this._pathElement.runtimeProps.inserted) {
            Environment.view.dropToLayer(event.x, event.y, this._pathElement);
            Selection.makeSelection([this._pathElement]);
            this._pathElement.runtimeProps.inserted = true;
        }
    }

    _createNewPath() {
        this._pathElement = UIElement.fromType(this._type, this._parameters);
        this._app.activePage.nameProvider.assignNewName(this._pathElement);
        var defaultSettings = this._app.defaultShapeSettings();
        if (defaultSettings) {
            this._pathElement.setProps(defaultSettings);
        }

        this._changeMode(this._pathElement, ElementState.Edit);
        this._pathElement.removeDecoratorByType(PathManipulationDecorator);
        this._pathElement.addDecorator(new PathManipulationDecorator(true));
    }

    _changeMode(element, mode: ElementState) {
        if (element.mode() !== mode) {
            element.mode(mode);
        }
    }
}
