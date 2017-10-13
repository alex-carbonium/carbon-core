import Selection from "../../framework/SelectionModel"
import Invalidate from "../../framework/Invalidate";
import { IApp, IView, IController, IMouseEventData, KeyboardState, IDisposable, WorkspaceTool, InteractionType, IComposite, RenderEnvironment } from "carbon-core";

//TODO: if selection is made in layers after tool is set, active frame starts to react to mouse events before the tool
export default class Tool {
    protected _app: IApp;
    protected _view: IView;
    protected _controller: IController;
    _toolId: WorkspaceTool;
    _disposables: IDisposable[];

    constructor(toolId: WorkspaceTool) {
        this._toolId = toolId;
        this._disposables = [];
    }

    attach(app, view, controller: IController, mousePressed) {
        this._app = app;
        this._view = view;
        this._controller = controller;
        this._attach();
        this._controller.currentTool = this._toolId;
    }
    detach() {
        this._detach();
    }
    pause() {
        this._detach();
    }
    resume() {
        this._attach();
        this._controller.currentTool = this._toolId;
    }
    _attach() {
        var controller = this._controller;
        if (controller) {
            this.registerForDisposal(controller.mousedownEvent.bindHighPriority(this, this.mousedown));
            this.registerForDisposal(controller.mouseupEvent.bindHighPriority(this, this.mouseup));
            this.registerForDisposal(controller.mousemoveEvent.bindHighPriority(this, this.mousemove));
            this.registerForDisposal(controller.clickEvent.bindHighPriority(this, this.click));
            this.registerForDisposal(controller.dblclickEvent.bindHighPriority(this, this.dblclick));
            this.registerForDisposal(controller.interactionStarted.bindHighPriority(this, this.onInteractionStarted));
            this.registerForDisposal(controller.interactionStopped.bindHighPriority(this, this.onInteractionStopped));
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
    mousedown(event: IMouseEventData) {
    }
    mouseup(event: IMouseEventData) {
    }
    mousemove(event: IMouseEventData) {
        if (!event.handled) {
            var cursor = this.defaultCursor();
            if (cursor) {
                event.cursor = cursor;
            }
        }
    }

    onInteractionStarted(type: InteractionType, event: IMouseEventData, composite: IComposite) {
    }

    onInteractionStopped(type: InteractionType, event: IMouseEventData, composite: IComposite) {
    }

    click(event: IMouseEventData) {
        event.handled = true;
    }

    dblclick(event: IMouseEventData) {
        //by default tools should probably handle all events and do not let elements react to double clicks, etc
        event.handled = true;
    }

    layerdraw(context, environment: RenderEnvironment) {
    }

    defaultCursor(): string {
        return null;
    }

    dispose() {
    }
}