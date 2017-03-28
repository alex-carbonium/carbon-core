import EventHelper from "./framework/EventHelper";
import logger from "./logger";
import { IEvent2 } from "carbon-basics";

export default class StateMachine {
    stateChanged: IEvent2<string, any>;
    state: string;

    constructor(){
        this.state = "";
        this.stateChanged = EventHelper.createEvent();
    }

    changeState(newState, arg?){
        var changed = newState !== this.state;
        this.state = newState;
        if (changed){
            logger.info(this.constructor.name + ": " + newState + (arg ? " (" + JSON.stringify(arg) + ")" : ""));
            this.stateChanged.raise(newState, arg);
        }
    }
}