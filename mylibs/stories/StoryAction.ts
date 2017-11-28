import DataNode from "../framework/DataNode";
import PropertyMetadata from "../framework/PropertyMetadata";
import {Types, ActionEvents, ActionType} from "../framework/Defs";
import { AnimationType, EasingType } from "carbon-runtime";

class StoryAction extends DataNode {
    constructor() {
        super(false);
    }
}
StoryAction.prototype.t = Types.StoryAction;

PropertyMetadata.registerForType(StoryAction, {
    event: {
        defaultValue: ActionEvents.click
    },
    type: {
        defaultValue: ActionType.GoToPage
    },
    artboardId: {defaultValue: null},
    animation: {
        defaultValue: {
            segue: AnimationType.SlideLeft,
            easing: EasingType.EaseOut,
            duration: .2
        }
    }
});

export default StoryAction;