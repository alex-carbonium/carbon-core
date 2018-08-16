import EventHelper from "./EventHelper";
import { IEvent2, IRect, IInvalidate, RenderFlags, IEvent } from "carbon-core";
import { LayerType } from "carbon-app";
import { debounce } from "../util";

class Invalidate implements IInvalidate {
    requested: IEvent2<LayerType, number>;
    requestedViewRedraw: IEvent<void>;
    private debouncedRequest: any;
    public draftMode: boolean = false;

    constructor() {
        this.requested = EventHelper.createEvent2<LayerType, number>();
        this.requestedViewRedraw = EventHelper.createEvent();

        this.debouncedRequest = debounce(() => {
            this.draftMode = false;
            this.request();
        }, 250, false);
    }

    request(layer?, mask?) {
        this.requested.raise(layer, mask);
    }

    requestInteractionOnly() {
        this.requested.raise(LayerType.Interaction, null);
    }

    requestViewRedraw() {
        this.requestedViewRedraw.raise();
    }

    requestDraftWithDebounce() {
        this.draftMode = true;
        this.request();
        this.debouncedRequest();
    }
}

export default new Invalidate();