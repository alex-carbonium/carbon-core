import EventHelper from "framework/EventHelper";

class Invalidate {
    constructor(){
        this.requested = EventHelper.createEvent();
    }

    request(layer, rect){
        this.requested.raise(layer, rect);
    }
    requestUpperOnly(rect){
        this.requested.raise(1, rect);
    }
}

export default new Invalidate();