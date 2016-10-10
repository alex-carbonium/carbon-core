import ViewBase from "./ViewBase";
import EventHelper from "framework/EventHelper";

export default class PreviewView extends ViewBase {
    constructor() {
        super();
        this.displayClickSpots = EventHelper.createEvent();
    }

    prototyping(){
        return false;
    }
}
