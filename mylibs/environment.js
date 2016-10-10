import EventHelper from "framework/EventHelper";

class Environment {
    constructor(){
        this.detaching = EventHelper.createEvent();
        this.attached = EventHelper.createEvent();
    }

    set(view, controller){
        if(this.view){
            this.detaching.raise(this.view, this.controller);
        }
        this.view = view;
        this.controller = controller;
        this.attached.raise(view, controller);
    }
}

export default new Environment();