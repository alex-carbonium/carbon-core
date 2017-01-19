import {Types, ArrangeStrategies} from "./Defs";
import PropertyMetadata from "./PropertyMetadata";
import DefaultSettings from "../DefaultSettings";
import Container from "./Container";
import UIElement from "./UIElement";
import Point from "../math/point";
import Environment from "../environment";

require("./GroupArrangeStrategy");

export default class GroupContainer extends Container {
    applySizeScaling(s, o, options){
        UIElement.prototype.applySizeScaling.apply(this, arguments);

        //if group is flipped, scale children normally
        var absScale = s.abs();
        var round = this.children.length === 1;
        var resizeOptions = options && options.forChildResize(round && options.round);
        this.children.forEach(e => e.applyScaling(absScale, Point.Zero, resizeOptions));
    }

    strokeBorder(context, w, h){
        if (!this.lockedGroup()){
            context.save();
            context.strokeStyle = DefaultSettings.group.active_stroke;

            var scale = Environment.view.scale();
            context.scale(1/scale, 1/scale);

            this.drawBoundaryPath(context, this.globalViewMatrix().prependedWithScale(scale, scale));
            context.stroke();
            context.restore();
        }
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

    wrapSingleChild(){
        return true;
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
