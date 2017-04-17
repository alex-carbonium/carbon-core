import EventHelper from "./framework/EventHelper";
import logger from "./logger";
import { IEvent2, IEvent } from "carbon-basics";

export default class StateMachine<TState extends {type: string}> {
    stateChanged: IEvent<TState>;

    constructor(public state: TState){
        this.stateChanged = EventHelper.createEvent();
    }

    changeState(newState: TState){
        var changed = newState.type !== this.state.type;
        this.state = newState;
        if (changed){
            logger.info(this.constructor.name + ": " + JSON.stringify(newState));
            this.stateChanged.raise(newState);
        }
    }
}