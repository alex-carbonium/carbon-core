import Tool from "./Tool";
import UIElement from "../../framework/UIElement";
import Path from "framework/Path";
import SystemConfiguration from "../../SystemConfiguration";
import Selection from "../../framework/SelectionModel";
import Cursor from "../../framework/Cursor";
import { IMouseEventData, ElementState, IApp, IController, IView } from "carbon-core";
import PathManipulationDecorator from "ui/common/path/PathManipulationDecorator";
import NullContainer from "framework/NullContainer";
import Point from "../../math/point";


export default class PathTool extends Tool {
    _pathElement: Path;
    _type: any;
    _parameters: any;
    _editTextToken: any;
    _cancelBinding: any;

    constructor(app: IApp, view: IView, controller: IController, type: string, parameters?: object) {
        super("pathTool", app, view, controller);

        this._type = type;
        this._parameters = parameters;
        this._pathElement = null;
        this._editTextToken = app.actionManager.subscribe("enter", this.onEditAction.bind(this));
    }

    onEditAction() {
        var element = Selection.selectedElement();
        if (element instanceof Path) {
            element.edit(this.view, this.controller);
            if (!element.closed()) {
                this._pathElement = element;
                this._pathElement.addDecorator(new PathManipulationDecorator(this.view, this.controller));
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

        setTimeout(() => {
            if (SystemConfiguration.ResetActiveToolToDefault) {
                this.controller.resetCurrentTool();
            }
        }, 0);
    }

    cancel() {
        if (this._pathElement) {
            this._changeMode(this._pathElement, ElementState.Resize);
        }
        this._createNewPath();
    }

    _attach() {
        super._attach.apply(this, arguments);
        this._cancelBinding = this.controller.actionManager.subscribe('cancel', this.cancel.bind(this));
        var element = Selection.selectedElement();
        if (element instanceof Path && element.mode() === ElementState.Edit) {
            this._pathElement = element;
            this._pathElement.removeDecoratorByType(PathManipulationDecorator);
            this._pathElement.addDecorator(new PathManipulationDecorator(this.view, this.controller, true));
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

    mousedown(event: IMouseEventData) {
        if (this._pathElement.runtimeProps.inserted && (!this._pathElement.parent || this._pathElement.parent === NullContainer)) {
            this._createNewPath();
        }

        if (!this._pathElement.runtimeProps.inserted) {
            this._pathElement.applyGlobalTranslation(new Point(event.x, event.y));
            event.view.dropElement(this._pathElement);
            Selection.makeSelection([this._pathElement]);
            this._pathElement.runtimeProps.inserted = true;
        }
    }

    _createNewPath() {
        this._pathElement = UIElement.fromType(this._type, this._parameters);
        this.app.activePage.nameProvider.assignNewName(this._pathElement);
        var defaultSettings = this.app.defaultShapeSettings();
        if (defaultSettings) {
            this._pathElement.setProps(defaultSettings);
        }

        this._changeMode(this._pathElement, ElementState.Edit);
        this._pathElement.removeDecoratorByType(PathManipulationDecorator);
        this._pathElement.addDecorator(new PathManipulationDecorator(this.view, this.controller, true));
    }

    _changeMode(element, mode: ElementState) {
        element.switchToEditMode(mode === ElementState.Edit, this.view, this.controller);
    }
}
