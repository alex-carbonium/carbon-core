import EventHelper from "./EventHelper";
import { IEvent, ViewState, ICommand, IEvent2 } from "carbon-core";
import Environment from "../environment";

var debug = require("DebugUtil")("carb:viewState");

export class ViewStateStack {
    stateChanged: IEvent2<boolean, boolean> = EventHelper.createEvent2<boolean, boolean>();

    private index: number = -1;
    private stack: ViewState[] = [];

    constructor() {
        Environment.attached.bind((view) => view.viewStateChanged.bind(this, this.onViewStateChanged));
        Environment.detaching.bind((view) => view.viewStateChanged.unbind(this, this.onViewStateChanged));

        if (Environment.view) {
            Environment.view.viewStateChanged.bind(this, this.onViewStateChanged);
        }
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
        Environment.view.changeViewState(state, true);

        this.changeState(this.index >= 1, true);
    }

    redo() {
        if (this.index >= this.stack.length - 1) {
            return;
        }

        var state = this.stack[++this.index];
        debug("viewState redo %o", state);
        Environment.view.changeViewState(state, true);

        this.changeState(true, this.index < this.stack.length - 1);
    }

    clear(){
        this.stack.length = 0;
        this.index = -1;
        debug("clear");
    }

    private changeState(canUndo, canRedo) {
        this.stateChanged.raise(canRedo, canRedo);
    }
}

export const viewStateStack = new ViewStateStack();