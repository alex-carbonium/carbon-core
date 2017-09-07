import Selection from "../../framework/SelectionModel"
import Invalidate from "../../framework/Invalidate";
import { IApp, IView, IController, IMouseEventData, KeyboardState, IDisposable } from "carbon-core";

//TODO: if selection is made in layers after tool is set, active frame starts to react to mouse events before the tool
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

    attach(app, view, controller, mousePressed) {
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
            this.registerForDisposal(controller.dblclickEvent.bindHighPriority(this, this.dblclick));
            this.registerForDisposal(controller.startDraggingEvent.bindHighPriority(this, this.dragElementStarted));
            this.registerForDisposal(controller.stopDraggingEvent.bindHighPriority(this, this.dragElementEnded));
        }
        if (this._view.interactionLayer) {
            this.registerForDisposal(this._view.interactionLayer.ondraw.bind(this, this.layerdraw));
        }

        //allow the tool to update cursor immediately
        controller.repeatLastMouseMove();
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
    mousedown(event: IMouseEventData, keys: KeyboardState) {
    }
    mouseup(event: IMouseEventData, keys: KeyboardState) {
    }
    mousemove(event: IMouseEventData, keys: KeyboardState) {
        if (!event.handled) {
            var cursor = this.defaultCursor();
            if (cursor) {
                event.cursor = cursor;
            }
        }
    }

    dragElementStarted() {
    }

    dragElementEnded() {
    }

    click(event: IMouseEventData, keys: KeyboardState) {
        event.handled = true;
    }

    dblclick(event: IMouseEventData) {
        //by default tools should probably handle all events and do not let elements react to double clicks, etc
        event.handled = true;
    }

    layerdraw(context, environment) {
    }

    defaultCursor(): string {
        return null;
    }
}