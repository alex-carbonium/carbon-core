import EventHelper from "./framework/EventHelper";
import {IView, IController} from "./framework/CoreModel";

class Environment {
    view: IView;
    controller: IController;

    constructor(){
        this.detaching = EventHelper.createEvent();
        this.attached = EventHelper.createEvent();
    }

    set(view: IView, controller: IController){
        if(this.view){
            this.detaching.raise(this.view, this.controller);
        }
        this.view = view;
        this.controller = controller;
        this.attached.raise(view, controller);
    }
}

export default new Environment();