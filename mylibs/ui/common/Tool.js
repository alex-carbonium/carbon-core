import Selection from "../../framework/SelectionModel"
import Invalidate from "../../framework/Invalidate";
import {IApp, IView, IController} from "../../framework/CoreModel";

function changeSelectionMode(elements, mode) {
    if (elements) {
        for (var i = 0, l = elements.length; i < l; ++i) {
            var el = elements[i];
            if (typeof el.mode === 'function') {
                el.mode(mode);
            }
        }
        Invalidate.request();
    }
}

function refreshSelection(mode) {
    var selection = Selection.selectedElements();
    if (selection) {
        changeSelectionMode(selection, mode);
        // Selection.refreshSelection();
        Invalidate.requestUpperOnly();
    }
};

var insideElementSelected = false;
var elementSelected = function (selection, oldSelection) {
    if (!insideElementSelected) {
        insideElementSelected = true;
        changeSelectionMode(oldSelection, this._detachMode);
        refreshSelection(this._attachMode);
        insideElementSelected = false;
    }
};

export default class Tool {
    _app: IApp;
    _view: IView;
    _controller: IController;
    _toolId: string;

    constructor(toolId: string) {
        this._attachMode = "edit";
        this._detachMode = "resize";
        this._toolId = toolId;
    }

    attach(app, view, controller) {
        console.log("attaching", this);
        this._app = app;
        this._view = view;
        this._controller = controller;
        refreshSelection(this._attachMode);
        Selection.onElementSelected.bind(this, elementSelected);
        this._attach();        
        this._app.currentTool = this._toolId;
    }
    detach() {
        Selection.onElementSelected.unbind(this, elementSelected);
        refreshSelection(this._detachMode);
        this._detach();
    }
    pause() {
        Selection.onElementSelected.unbind(this, elementSelected);
        this._detach();
    }
    resume() {
        Selection.onElementSelected.bind(this, elementSelected);
        this._attach();
        this._app.currentTool = this._toolId;
    }
    _attach() {
        var controller = this._controller;
        if (controller) {
            this._mouseDownBinding = controller.mousedownEvent.bindHighPriority(this, this.mousedown);
            this._mouseUpBinding = controller.mouseupEvent.bindHighPriority(this, this.mouseup);
            this._mouseMoveBinding = controller.mousemoveEvent.bindHighPriority(this, this.mousemove);
            this._clickBinding = controller.clickEvent.bindHighPriority(this, this.click);
        }
        if (this._view.layer3) {
            this._drawBinding = this._view.layer3.ondraw.bind(this, this.layerdraw);            
        }                
    }
    _detach() {
        if (this._mouseDownBinding) {
            this._mouseDownBinding.dispose();
        }
        if (this._mouseUpBinding) {
            this._mouseUpBinding.dispose();
        }
        if (this._mouseMoveBinding) {
            this._mouseMoveBinding.dispose();
        }
        if (this._drawBinding) {
            this._drawBinding.dispose();
        }
        if (this._clickBinding) {
            this._clickBinding.dispose();
        }
    }
    view() {
        return this._view;
    }
    mousedown(event) {
    }
    mouseup(event) {
    }
    mousemove(event) {
    }
    click(event) {
    }
    layerdraw(context) {
    }
}