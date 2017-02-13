import Selection from "../../framework/SelectionModel"
import Invalidate from "../../framework/Invalidate";
import {IApp, IView, IController} from "../../framework/CoreModel";

export default class Tool {
    _app: IApp;
    _view: IView;
    _controller: IController;
    _toolId: string;

    constructor(toolId: string) {
        this._toolId = toolId;
    }

    attach(app, view, controller) {
        this._app = app;
        this._view = view;
        this._controller = controller;
        this._attach();        
        this._app.currentTool = this._toolId;
    }
    detach() {                
        this._detach();
    }
    pause() {        
        this._detach();
    }
    resume() {        
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