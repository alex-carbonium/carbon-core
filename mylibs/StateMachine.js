import EventHelper from "./framework/EventHelper";
import logger from "./logger";

export default class StateMachine {
    constructor(){
        this.state = "";
        this.stateChanged = EventHelper.createEvent();
    }

    changeState(newState, arg){
        var changed = newState !== this.state;
        this.state = newState;
        if (changed){
            logger.info(this.__type__ + ": " + newState + (arg ? " (" + JSON.stringify(arg) + ")" : ""));
            this.stateChanged.raise(newState, arg);
        }
    }
}