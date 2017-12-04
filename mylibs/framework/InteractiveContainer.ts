import { Types, ArrangeStrategies, Overflow, HorizontalAlignment, VerticalAlignment } from "./Defs";
import PropertyMetadata from "./PropertyMetadata";
import PropertyTracker from "./PropertyTracker";
import UserSettings from "../UserSettings";
import Container from "./Container";
import UIElement from "./UIElement";
import Point from "../math/point";
import Environment from "../environment";
import { IGroupContainer, ChangeMode, IIsolatable, IMouseEventData } from "carbon-core";
import GlobalMatrixModifier from "./GlobalMatrixModifier";
import { IPoint } from "carbon-geometry";
import Isolate from "../commands/Isolate";
import Selection from "./SelectionModel";

export default class InteractiveContainer extends Container implements IIsolatable {
    allowRearrange() {
        return this.props.arrangeStrategy === ArrangeStrategies.HorizontalStack ||
            this.props.arrangeStrategy === ArrangeStrategies.VerticalStack;
    }

    dblclick(event: IMouseEventData) {
        this.unlockGroup();
        var element = this.hitElement(event, Environment.view.scale());
        if (element && element !== this) {
            Selection.makeSelection([element]);
        }
    }

    strokeBorder(context, w, h) {
        if (!this.lockedGroup()) {
            context.save();
            context.strokeStyle = UserSettings.group.active_stroke;

            var scale = Environment.view.scale();
            context.scale(1 / scale, 1 / scale);

            context.beginPath();
            try {
                GlobalMatrixModifier.pushPrependScale();
                super.drawBoundaryPath(context);
                context.stroke();
                context.restore();
            }
            finally {
                GlobalMatrixModifier.pop();
            }
        }
    }

    _roundValue(value) {
        return value;
    }

    allowMoveOutChildren(value, event?) {
        return super.allowMoveOutChildren.apply(this, arguments) || (event && event.ctrlKey);
    }

    canAccept(elements, autoInsert, allowMoveInOut) {
        return this.primitiveRoot().isEditable() && allowMoveInOut;
    }

    wrapSingleChild() {
        return true;
    }

    translateChildren() {
        return true;
    }

    onIsolationExited() {
        if (!this.count()) {
            this.parent.remove(this);
        }
    }

    enableGroupLocking() {
        return true;
    }
}

InteractiveContainer.prototype.t = Types.InteractiveContainer;

PropertyMetadata.registerForType(InteractiveContainer, {
    allowMoveOutChildren: {
        defaultValue: false
    },
    arrangeStrategy: {
        defaultValue: ArrangeStrategies.Canvas
    }
});
