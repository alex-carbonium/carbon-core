import EventHelper from "./framework/EventHelper";
import {IView, IController, IEnvironment, IEvent2} from "carbon-core";

class Environment implements IEnvironment {
    attached: any;
    detaching: any;
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