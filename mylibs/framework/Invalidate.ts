import EventHelper from "framework/EventHelper";
import { IEvent2, IRect, IInvalidate } from "carbon-core";
import { LayerType } from "carbon-app";

class Invalidate implements IInvalidate{
    requested:IEvent2<LayerType, number>;

    constructor(){
        this.requested = EventHelper.createEvent2<LayerType, number>();
    }

    request(layer?, mask?){
        this.requested.raise(layer, mask);
    }

    requestInteractionOnly(){
        this.requested.raise(LayerType.Interaction, null);
    }
}

export default new Invalidate();