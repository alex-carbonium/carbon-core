import EventHelper from "./framework/EventHelper";
import {IView, IController, IEnvironment, IEvent2} from "carbon-core";

class Environment implements IEnvironment {
    view: IView;
    controller: IController;
    detaching: IEvent2<IView, IController>;
    attached: IEvent2<IView, IController>;

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