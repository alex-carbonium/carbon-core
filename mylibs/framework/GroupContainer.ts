import { Types, ArrangeStrategies } from "./Defs";
import PropertyMetadata, {PropertyDescriptor} from "./PropertyMetadata";
import PropertyTracker from "./PropertyTracker";
import UserSettings from "../UserSettings";
import Container from "./Container";
import UIElement from "./UIElement";
import Point from "../math/point";
import Environment from "../environment";
import { IGroupContainer, ChangeMode, IIsolatable, IMouseEventData } from "carbon-core";
import GlobalMatrixModifier from "./GlobalMatrixModifier";
import { IPoint } from "carbon-geometry";
import CommonPropsManager from "./CommonPropsManager";
import Isolate from "../commands/Isolate";

require("./GroupArrangeStrategy");

var ownProperties: string[] = PropertyMetadata.findForType(Container)
    .groups()
    .find(x => x.label === "Layout")
    .properties
    .concat(["name", "locked"]);

interface IGroupContainerRuntimeProps{
    cpm: CommonPropsManager
}

export default class GroupContainer extends Container implements IGroupContainer, IIsolatable {
    runtimeProps: IGroupContainerRuntimeProps;

    hitTest(point: IPoint, scale: number, boundaryRectOnly = false) {
        if (!super.hitTest(point, scale)) {
            return false;
        }
        if (boundaryRectOnly) {
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

    applySizeScaling(s, o, options?, changeMode?) {
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

    dblclick(event: IMouseEventData) {
        if (UserSettings.group.editInIsolationMode && !Environment.view.isolationLayer.isActivatedFor(this)) {
            Isolate.run([this]);
            event.handled = true;
        }
    }

    getDisplayPropValue(propertyName: string, descriptor: PropertyDescriptor) {
        if (ownProperties.indexOf(propertyName) !== -1){
            return super.getDisplayPropValue(propertyName, descriptor);
        }
        return this.commonPropsManager().getDisplayPropValue(this.children, propertyName, descriptor);
    }

    getAffectedDisplayProperties(changes): string[]{
        //no own logic for affected properties, so common implementation should cover groups
        return this.commonPropsManager().getAffectedDisplayProperties(this.children, changes);
    }

    setDisplayProps(changes: any, changeMode: ChangeMode){
        var own = null;
        var common = null;
        var keys = Object.keys(changes);
        for (var i = 0; i < keys.length; i++) {
            var prop = keys[i];
            if (ownProperties.indexOf(prop) !== -1){
                own = own || {};
                own[prop] = changes[prop];
            }
            else{
                common = common || {};
                common[prop] = changes[prop];
            }
        }

        if (changeMode === ChangeMode.Model){
            if (own){
                super.setDisplayProps(own, changeMode);
            }
            if (common){
                this.commonPropsManager().updateDisplayProps(this.children, common);
            }
        }
        else {
            if (own){
                super.setDisplayProps(own, changeMode);
            }
            if (common){
                this.commonPropsManager().previewDisplayProps(this.children, common);
            }
        }
    }

    findPropertyDescriptor(propName: string) {
        if (ownProperties.indexOf(propName) !== -1){
            return super.findPropertyDescriptor(propName);
        }

        for (var i = 0; i < this.children.length; i++) {
            var element = this.children[i];
            var descriptor = element.findPropertyDescriptor(propName);
            if (descriptor){
                return descriptor;
            }
        }

        return null;
    }

    select(multi: boolean){
        super.select(multi);
        if (!multi){
            PropertyTracker.propertyChanged.bind(this, this.onChildPropsChanged);
            this.children.forEach(x => x.enablePropsTracking());
        }
    }
    unselect(){
        PropertyTracker.propertyChanged.unbind(this, this.onChildPropsChanged);
        this.children.forEach(x => x.disablePropsTracking());
        this.commonPropsManager(null);
    }

    private onChildPropsChanged(element: UIElement, newProps) {
        if (this.children.indexOf(element) !== -1) {
            if (newProps.hasOwnProperty("br") || newProps.hasOwnProperty("m")){
                newProps = Object.assign({}, newProps);
                delete newProps.br;
                delete newProps.m;
            }
            if (!Object.keys(newProps).length){
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

    commonPropsManager(value?): CommonPropsManager{
        if (arguments.length){
            this.runtimeProps.cpm = value;
            return;
        }
        if (!this.runtimeProps.cpm){
            this.runtimeProps.cpm = new CommonPropsManager();
        }
        return this.runtimeProps.cpm;
    }

    remove(element, mode = ChangeMode.Model){
        var res = super.remove(element, mode);

        if (mode === ChangeMode.Model && !this.count()){
            if (!Environment.view.isolationLayer.isActivatedFor(this)){
                this.parent().remove(this);
            }
        }

        return res;
    }

    onIsolationExited(){
        if (!this.count()){
            this.parent().remove(this);
        }
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
    },
    groups: function(group: GroupContainer){
        return group.commonPropsManager().createGroups(group.children);
    }
});
