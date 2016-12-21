import {Types, Overflow, ArrangeStrategies} from "./Defs";
import PropertyMetadata from "./PropertyMetadata";
import UserSettings from "../UserSettings";
import Container from "./Container";
import UIElement from "./UIElement";
import Point from "../math/point";

require("./GroupArrangeStrategy");

export default class GroupContainer extends Container {
    applySizeScaling(s, o, sameDirection, withReset){
        UIElement.prototype.applySizeScaling.apply(this, arguments);

        //if group is flipped, scale children normally
        var absScale = s.abs();
        this.children.forEach(e => e.applyScaling(absScale, Point.Zero, false, withReset));
    }

    drawSelf(context, w, h, environment){
        if (!this.lockedGroup()){
            context.save();
            context.strokeStyle = UserSettings.group.active_stroke;
            context.strokeRect(0, 0, w, h);
            context.restore();

        }
        super.drawSelf.apply(this, arguments);
    }

    _roundValue(value){
        return value;
    }

    allowMoveOutChildren(value, event){
        return super.allowMoveOutChildren.apply(this, arguments) || (event && event.ctrlKey);
    }

    canAccept(elements, autoInsert, allowMoveInOut){
        return allowMoveInOut;
    }

    lockAutoresize(){
        this._lockAutoresize = true;
    }

    unlockAutoresize(){
        delete this._lockAutoresize;
    }

    iconType(){
        return 'group';
    }
}

GroupContainer.prototype.t = Types.GroupContainer;

Container.GroupContainerType = GroupContainer;

PropertyMetadata.registerForType(GroupContainer, {
    allowMoveOutChildren: {
        defaultValue: false
    },
    enableGroupLocking: {
        defaultValue: true
    },
    arrangeStrategy: {
        defaultValue: ArrangeStrategies.Group
    }
});
