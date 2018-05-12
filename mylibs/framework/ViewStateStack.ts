import EventHelper from "./EventHelper";
import { IEvent, ViewState, ICommand, IEvent2, IDisposable, IView, IApp } from "carbon-core";
import Environment from "../environment";

var debug = require("DebugUtil")("carb:viewState");

export class ViewStateStack {
    stateChanged: IEvent2<boolean, boolean> = EventHelper.createEvent2<boolean, boolean>();

    private index: number = -1;
    private stack: ViewState[] = [];
    private _disposables:IDisposable[] = [];

    constructor(private app:IApp, private view:IView) {
    }

    attach() {
        this._disposables.push(this.view.viewStateChanged.bind(this, this.onViewStateChanged));

        this._disposables.push(this.app.actionManager.subscribe("undoViewport", ()=>{
            this.undo();
        }));

        this._disposables.push(this.app.actionManager.subscribe("redoViewport", ()=>{
            this.redo();
        }));
    }

    detach() {
        this._disposables.forEach(d=>d.dispose());
        this._disposables = [];
    }

    private onViewStateChanged(newState: ViewState) {
        debug("viewState changed %o", newState);
        this.stack[++this.index] = newState;
        this.stack.length = this.index + 1;
        this.changeState(true, false);
    }

    undo() {
        if (this.index < 1) {
            return;
        }

        var state = this.stack[this.index-- - 1];
        debug("viewState undo %o", state);
        App.Current.actionManager.invoke("changeViewState", { newState: state, silent: true });

        this.changeState(this.index >= 1, true);
    }

    redo() {
        if (this.index >= this.stack.length - 1) {
            return;
        }

        var state = this.stack[++this.index];
        debug("viewState redo %o", state);
        App.Current.actionManager.invoke("changeViewState", { newState: state, silent: true });

        this.changeState(true, this.index < this.stack.length - 1);
    }

    clear() {
        this.stack.length = 0;
        this.index = -1;
        debug("clear");
    }

    private changeState(canUndo, canRedo) {
        this.stateChanged.raise(canRedo, canRedo);
    }
}
