import EventHelper from "framework/EventHelper";
import {LayerTypes} from "framework/Defs";
import { IEvent2, IRect } from "carbon-core";

class Invalidate {
    requested:IEvent2<LayerTypes, IRect>;

    constructor(){
        this.requested = EventHelper.createEvent();
    }

    request(layer, rect){
        this.requested.raise(layer, rect);
    }

    requestInteractionOnly(rect){
        this.requested.raise(LayerTypes.Interaction, rect);
    }
}

export default new Invalidate();