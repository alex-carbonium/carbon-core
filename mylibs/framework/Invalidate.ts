import EventHelper from "framework/EventHelper";
import { LayerTypes, IEvent2, IRect, IInvalidate} from "carbon-core";

class Invalidate implements IInvalidate{
    requested:IEvent2<LayerTypes, IRect>;

    constructor(){
        this.requested = EventHelper.createEvent();
    }

    request(layer?, rect?){
        this.requested.raise(layer, rect);
    }

    requestInteractionOnly(rect?){
        this.requested.raise(LayerTypes.Interaction, rect);
    }
}

export default new Invalidate();