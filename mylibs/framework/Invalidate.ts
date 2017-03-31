import EventHelper from "framework/EventHelper";
import { IEvent2, IRect, IInvalidate } from "carbon-core";
import { LayerTypes } from "carbon-app";

class Invalidate implements IInvalidate{
    requested:IEvent2<LayerTypes, IRect>;

    constructor(){
        this.requested = EventHelper.createEvent2<LayerTypes, IRect>();
    }

    request(layer?, rect?){
        this.requested.raise(layer, rect);
    }

    requestInteractionOnly(rect?){
        this.requested.raise(LayerTypes.Interaction, rect);
    }
}

export default new Invalidate();