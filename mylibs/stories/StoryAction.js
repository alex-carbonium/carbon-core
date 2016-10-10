import DataNode from "../framework/DataNode";
import PropertyMetadata from "../framework/PropertyMetadata";
import {ActionEvents, ActionType, AnimationType, EasingType} from "../framework/Defs";

class StoryAction extends DataNode {
    constructor() {
        super(false);
    }
}

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