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
        defaultValue: "click"
    },
    type: {
        defaultValue: ActionType.GoToPage
    },
    artboardId: {defaultValue: null},
    animation: {
        defaultValue: {
            type: AnimationType.SlideLeft,
            curve: EasingType.EaseOutQuad,
            duration: 200
        }
    }
});

export default StoryAction;