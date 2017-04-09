import { Types, ArrangeStrategies } from "./Defs";
import PropertyMetadata from "./PropertyMetadata";
import UserSettings from "../UserSettings";
import Container from "./Container";
import UIElement from "./UIElement";
import Point from "../math/point";
import Environment from "../environment";
import { IGroupContainer } from "carbon-core";
import GlobalMatrixModifier from "./GlobalMatrixModifier";
import { IPoint } from "carbon-geometry";

require("./GroupArrangeStrategy");

export default class GroupContainer extends Container implements IGroupContainer {
    hitTest(point: IPoint, scale: number, boundaryRectOnly = false) {
        if (!super.hitTest(point, scale)) {
            return false;
        }
        if (boundaryRectOnly){
            return true;
        }
        for (var i = this.children.length - 1; i >= 0; --i) {
            var el = this.children[i];
            if (el.hitTest(point, scale)) {
                return true;
            }
        }
        return false;
    }
    hitTestGlobalRect(rect) {
        if (!this.hitVisible(true)) {
            return false;
        }

        for (var i = this.children.length - 1; i >= 0; --i) {
            var el = this.children[i];
            if (el.hitTestGlobalRect(rect, true)) {
                return true;
            }
        }

        return false;
    }

    applySizeScaling(s, o, options, changeMode) {
        UIElement.prototype.applySizeScaling.apply(this, arguments);

        //if group is flipped, scale children normally
        var absScale = s.abs();
        var round = this.children.length === 1;
        var resizeOptions = options && options.forChildResize(round && options.round);
        this.children.forEach(e => e.applyScaling(absScale, Point.Zero, resizeOptions, changeMode));
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

    drawPath(context) {
        for (var i = this.children.length - 1; i >= 0; --i) {
            var el = this.children[i];
            el.drawBoundaryPath(context);
        }
    }

    _roundValue(value) {
        return value;
    }

    dblclick(event) {
        App.Current.actionManager.invoke("isolateSelection");
    }

    allowMoveOutChildren(value, event?) {
        return super.allowMoveOutChildren.apply(this, arguments) || (event && event.ctrlKey);
    }

    canAccept(elements, autoInsert, allowMoveInOut) {
        return allowMoveInOut;
    }

    wrapSingleChild() {
        return true;
    }

    translateChildren() {
        return true;
    }
}

GroupContainer.prototype.t = Types.GroupContainer;

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
