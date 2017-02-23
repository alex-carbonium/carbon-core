import Selection from "../../framework/SelectionModel"
import Invalidate from "../../framework/Invalidate";
import { IApp, IView, IController, IMouseEventData, IKeyboardState, IDisposable } from "../../framework/CoreModel";

export default class Tool {
    _app: IApp;
    _view: IView;
    _controller: IController;
    _toolId: string;
    _disposables: IDisposable[];

    constructor(toolId: string) {
        this._toolId = toolId;
        this._disposables = [];
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
            this.registerForDisposal(controller.mousedownEvent.bindHighPriority(this, this.mousedown));
            this.registerForDisposal(controller.mouseupEvent.bindHighPriority(this, this.mouseup));
            this.registerForDisposal(controller.mousemoveEvent.bindHighPriority(this, this.mousemove));
            this.registerForDisposal(controller.clickEvent.bindHighPriority(this, this.click));
            this.registerForDisposal(controller.startDraggingEvent.bindHighPriority(this, this.dragElementStarted));
            this.registerForDisposal(controller.stopDraggingEvent.bindHighPriority(this, this.dragElementEnded));
        }
        if (this._view.layer3) {
            this.registerForDisposal(this._view.layer3.ondraw.bind(this, this.layerdraw));
        }
    }
    _detach() {
        this._disposables.forEach(x => x.dispose());
        this._disposables.length = 0;
    }

    registerForDisposal(disposable: IDisposable) {
        this._disposables.push(disposable);
    }

    view() {
        return this._view;
    }
    mousedown(event: IMouseEventData, keys: IKeyboardState) {
    }
    mouseup(event: IMouseEventData, keys: IKeyboardState) {
    }
    mousemove(event: IMouseEventData, keys: IKeyboardState) {
    }

    dragElementStarted() {
    }
    dragElementEnded() {
    }
    click(event) {
    }
    layerdraw(context) {
    }
}