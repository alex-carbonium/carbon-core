import { Types, ArrangeStrategies, DropPositioning, Overflow, HorizontalAlignment, VerticalAlignment } from "./Defs";
import PropertyMetadata from "./PropertyMetadata";
import PropertyTracker from "./PropertyTracker";
import UserSettings from "../UserSettings";
import InteractiveContainer from "./InteractiveContainer";
import UIElement from "./UIElement";
import Point from "../math/point";
import Environment from "../environment";
import { IGroupContainer, ChangeMode, IIsolatable, IMouseEventData, PropDescriptor, IView } from "carbon-core";
import GlobalMatrixModifier from "./GlobalMatrixModifier";
import { IPoint } from "carbon-geometry";
import CommonPropsManager from "./CommonPropsManager";
import Isolate from "../commands/Isolate";
import Selection from "./SelectionModel";

require("./arrangeStrategy/GroupArrangeStrategy");

const ownProperties: string[] = PropertyMetadata.findForType(InteractiveContainer)
    .groups()
    .find(x => x.id === "layout")
    .properties
    .concat(["name", "opacity", "locked", "constraints", "arrangeStrategy", "shadows"]);

interface IGroupContainerRuntimeProps {
    cpm: CommonPropsManager;
}

export default class GroupContainer extends InteractiveContainer implements IGroupContainer, IIsolatable {
    runtimeProps: IGroupContainerRuntimeProps;

    hitTest(point: IPoint, view: IView, boundaryRectOnly = false) {
        if (!super.hitTest(point, view)) {
            return false;
        }
        if (boundaryRectOnly) {
            return true;
        }
        for (var i = this.children.length - 1; i >= 0; --i) {
            var el = this.children[i];
            if (el.hitTest(point, view)) {
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

    drawPath(context) {
        for (var i = this.children.length - 1; i >= 0; --i) {
            var el = this.children[i];
            el.drawBoundaryPath(context);
        }
    }

    allowRearrange() {
        return false;
    }

    applySizeScaling(s, o, options?, changeMode?) {
        UIElement.prototype.applySizeScaling.apply(this, arguments);
        //if group is flipped, scale children normally
        var absScale = s.abs();
        var round = this.children.length === 1;
        var resizeOptions = options && options.forChildResize(round && options.round);
        this.children.forEach(e => e.applyScaling(absScale, Point.Zero, resizeOptions, changeMode));
    }

    dblclick(event: IMouseEventData) {
        if (this.primitiveRoot().isEditable()) {
            if (UserSettings.group.editInIsolationMode && !event.view.isolationLayer.isActivatedFor(this)) {
                Isolate.run(event.view, [this]);
                event.handled = true;
            }
        }
        else {
            this.unlockGroup();
            var element = this.hitElement(event, event.view);
            if (element && element !== this) {
                Selection.makeSelection([element]);
            }
        }
    }

    getDisplayPropValue(propertyName: string, descriptor: PropDescriptor) {
        if (ownProperties.indexOf(propertyName) !== -1) {
            return super.getDisplayPropValue(propertyName, descriptor);
        }
        return this.commonPropsManager().getDisplayPropValue(this.children, propertyName, descriptor);
    }

    getAffectedDisplayProperties(changes): string[] {
        //no own logic for affected properties, so common implementation should cover groups
        return this.commonPropsManager().getAffectedDisplayProperties(this.children, changes);
    }

    setDisplayProps(changes: any, changeMode: ChangeMode) {
        var own = null;
        var common = null;
        var keys = Object.keys(changes);
        for (var i = 0; i < keys.length; i++) {
            var prop = keys[i];
            if (ownProperties.indexOf(prop) !== -1) {
                own = own || {};
                own[prop] = changes[prop];
            }
            else {
                common = common || {};
                common[prop] = changes[prop];
            }
        }

        if (changeMode === ChangeMode.Model) {
            if (own) {
                super.setDisplayProps(own, changeMode);
            }
            if (common) {
                this.commonPropsManager().updateDisplayProps(this.children, common);
            }
        }
        else {
            if (own) {
                super.setDisplayProps(own, changeMode);
            }
            if (common) {
                this.commonPropsManager().previewDisplayProps(this.children, common);
            }
        }
    }

    findPropertyDescriptor(propName: string) {
        if (ownProperties.indexOf(propName) !== -1) {
            return super.findPropertyDescriptor(propName);
        }

        let descriptor = null;
        for (var i = 0; i < this.children.length; i++) {
            var element = this.children[i];
            descriptor = element.findPropertyDescriptor(propName);
            if (!descriptor) {
                break;
            }
        }

        return descriptor;
    }

    select(multi: boolean) {
        super.select(multi);
        if (!multi) {
            PropertyTracker.propertyChanged.bind(this, this.onChildPropsChanged);
            this.children.forEach(x => x.enablePropsTracking());
        }
    }

    unselect() {
        PropertyTracker.propertyChanged.unbind(this, this.onChildPropsChanged);
        this.children.forEach(x => x.disablePropsTracking());
        this.commonPropsManager(null);
    }

    private onChildPropsChanged(element: UIElement, newProps) {
        if (this.children.indexOf(element) !== -1) {
            if (newProps.hasOwnProperty("br") || newProps.hasOwnProperty("m")) {
                newProps = Object.assign({}, newProps);
                delete newProps.br;
                delete newProps.m;
            }
            if (!Object.keys(newProps).length) {
                return;
            }

            if (this.count() === 1) {
                PropertyTracker.changeProps(this, newProps, {});
                return;
            }
            this.commonPropsManager().onChildPropsChanged(newProps, this.onChildrenPropsChanged);
        }
    }
    private onChildrenPropsChanged = mergedProps => {
        if (this.isDisposed()) {
            return;
        }
        PropertyTracker.changeProps(this, mergedProps, {});
    };

    commonPropsManager(value?): CommonPropsManager {
        if (arguments.length) {
            this.runtimeProps.cpm = value;
            return;
        }
        if (!this.runtimeProps.cpm) {
            this.runtimeProps.cpm = new CommonPropsManager();
        }
        return this.runtimeProps.cpm;
    }

    remove(element, mode = ChangeMode.Model) {
        var res = super.remove(element, mode);

        if (mode === ChangeMode.Model && !this.count()) {
            if (!Environment.view.isolationLayer.isActivatedFor(this)) {
                this.parent.remove(this);
            }
        }

        return res;
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

GroupContainer.prototype.t = Types.GroupContainer;

PropertyMetadata.registerForType(GroupContainer, {
    allowMoveOutChildren: {
        defaultValue: false
    },
    arrangeStrategy: {
        defaultValue: ArrangeStrategies.Group
    },
    groups(group: GroupContainer) {
        return group.commonPropsManager().createGroups(group.children);
    }
});
