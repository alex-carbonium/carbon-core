import EventHelper from "framework/EventHelper";
import { IEvent2, IRect, IInvalidate } from "carbon-core";
import { LayerTypes } from "carbon-app";

class Invalidate implements IInvalidate{
    requested:IEvent2<LayerTypes, number>;

    constructor(){
        this.requested = EventHelper.createEvent2<LayerTypes, number>();
    }

    request(layer?, mask?){
        this.requested.raise(layer, mask);
    }

    requestInteractionOnly(){
        this.requested.raise(LayerTypes.Interaction, null);
    }
}

export default new Invalidate();