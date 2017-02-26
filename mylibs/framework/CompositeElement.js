import PropertyMetadata, { PropertyDescriptor } from "./PropertyMetadata";
import PropertyTracker from "./PropertyTracker";
import { leaveCommonProps } from "../util";
import { Types, ChangeMode } from "./Defs";
import Brush from "./Brush";
import Font from "./Font";
import UIElement from "./UIElement";
import ArrangeStrategy from "./ArrangeStrategy";
import { IGroupContainer } from "./CoreModel";
import Box from "./Box";
import Rect from "../math/rect";
import Phantom from "./Phantom";
import Environment from "../environment";
import Selection from "./SelectionModel";
import { IUIElementProps, IPoint, IRect, IComposite } from "../framework/CoreModel";

export default class CompositeElement extends UIElement implements IComposite {
    constructor() {
        super();

        this._types = [];
        this.children = [];
        this._origPropValues = [];
        this._affectingLayout = false;
        this._inPreview = false;

        PropertyTracker.propertyChanged.bind(this, this._onPropsChanged);
    }

    get elements(): UIElement[] {
        return this.children;
    }

    add(element: UIElement) {
        var systemType = element.systemType();
        if (this._types.indexOf(systemType) === -1) {
            this._types.push(systemType);
        }
        element.enablePropsTracking();
        this.children.push(element);
    }
    remove(element: UIElement) {
        element.disablePropsTracking();

        var systemType = element.systemType();
        var canRemoveType = true;

        var elementIndex = -1;
        for (var i = 0; i < this.children.length; i++) {
            var e = this.children[i];
            if (canRemoveType && e !== element && e.systemType() === systemType) {
                canRemoveType = false;
            }
            if (e === element) {
                elementIndex = i;
            }
        }

        this.children.splice(i, 1);

        if (canRemoveType) {
            this._types.splice(this._types.indexOf(systemType), 1);
        }
    }

    applyScaling(s, o, options, changeMode) {
        var resizeOptions = options && options.forChildResize(false);
        this.elements.forEach(e => e.applyScaling(s, o, resizeOptions, changeMode));
        this.performArrange();
    }

    performArrange() {
        if (this.elements.length > 1) {
            this.resetTransform();

            var items = this.children;
            var xMax = Number.NEGATIVE_INFINITY;
            var yMax = Number.NEGATIVE_INFINITY;
            var xMin = Number.POSITIVE_INFINITY;
            var yMin = Number.POSITIVE_INFINITY;

            for (let i = 0, l = items.length; i < l; ++i) {
                let child = items[i];
                let bb = child.getBoundingBoxGlobal();
                xMax = Math.max(xMax, bb.x + bb.width);
                xMin = Math.min(xMin, bb.x);
                yMax = Math.max(yMax, bb.y + bb.height);
                yMin = Math.min(yMin, bb.y);
            }

            var w = xMax - xMin;
            var h = yMax - yMin;
            this.prepareAndSetProps({ br: new Rect(xMin, yMin, w, h) });
        }
    }

    getBoundingBoxGlobal(includeMargin: ?boolean): IRect {
        if (this.count() === 1) {
            return this.elements[0].getBoundingBoxGlobal(includeMargin);
        }
        return super.getBoundingBoxGlobal(includeMargin);
    }

    elementAt(index: number) {
        return this.elements[index];
    }
    singleOrDefault() {
        return this.count() === 1 ? this.elements[0] : null;
    }
    singleOrSelf() {
        return this.count() === 1 ? this.elements[0] : this;
    }
    has(element: UIElement) {
        for (var i = 0, j = this.elements.length; i < j; ++i) {
            if (this.elements[i] === element) {
                return true;
            }
        }
        return false;
    }
    clear() {
        this.each(x => x.disablePropsTracking());
        this._types = [];
        //do not clear, selection model stores this by reference
        this.children = [];
        this.resetTransform();
    }
    count() {
        return this.elements.length;
    }

    propsUpdated(newProps: IUIElementProps, oldProps: IUIElementProps, mode: ChangeMode) {
        super.propsUpdated.apply(this, arguments);

        //not sure if it is safe to propagate other properties, so taking only what's needed for now
        if (newProps.visible !== oldProps.visible) {
            for (var i = 0; i < this.elements.length; i++) {
                this.elements[i].setProps({ visible: newProps.visible }, mode);
            }
        }
    }

    hitTest(point: IPoint, scale: number) {
        var count = this.count();
        if (count === 0) {
            return false;
        }

        for (var i = count - 1; i >= 0; i--) {
            var el = this.elements[i];
            if (el.hitTest(point, scale)) {
                return true;
            }
        }
        return false;
    }
    hitVisible() {
        return true;
    }
    canAccept() {
        return false;
    }
    each(callback: (e: UIElement) => boolean | void) {
        this.elements.forEach(callback);
    }
    map(callback: (e: UIElement) => any) {
        return this.elements.map(callback);
    }
    first() {
        return this.elements[0];
    }
    resizeDimensions() {
        return 0;
    }
    canDrag(): boolean {
        var canDrag = true;
        this.each(function (element) {
            if (!element.canDrag()) {
                canDrag = false;
                return false;
            }
        })
        return canDrag;
    }

    isDescendantOrSame(element: UIElement): boolean {
        var res = false;

        for (let i = 0; i < this.elements.length; ++i) {
            let e = this.elements[i];
            res = res || e.isDescendantOrSame(element);
            if (res) {
                break;
            }
        }

        return res;
    }
    displayName() {
        if (this.allHaveSameType()) {
            return this.elements[0].displayName();
        }
        return "";
    }
    findPropertyDescriptor(propName: string) {
        if(this.elements.length === 1){
            return this.elements[0].findPropertyDescriptor(propName);
        }

        return PropertyMetadata.find(this._types[0], propName);
    }
    allHaveSameType() {
        return this._types.length === 1;
    }
    allHaveSameParent() {
        var result = true;
        var parent;

        this.each(function (e) {
            if (parent && e.parent() !== parent) {
                result = false;
                return false;
            }
            parent = e.parent();
        });

        return result;
    }
    parents() {
        var parents = [];
        for (var i = 0; i < this.elements.length; i++) {
            var parent = this.elements[i].parent();
            if (parents.indexOf(parent) === -1) {
                parents.push(parent);
            }
        }
        return parents;
    }

    createPropertyGroups() {
        if (this.count() === 0) {
            return [];
        }

        if (this._types.length === 1) {
            let type = this._types[0];
            let metadata = PropertyMetadata.findAll(type);
            let element = this.count() === 1 ? this.elements[0] : null;
            let groups = metadata ? metadata.groups(element) : [];
            return groups;
        }

        let baseMetadata = PropertyMetadata.findAll(this._types[0]);
        let baseGroups = baseMetadata.groups();
        for (var i = 1; i < this._types.length; i++) {
            var type = this._types[i];
            var otherMetadata = PropertyMetadata.findAll(type);

            for (var i = 0; i < baseGroups.length; i++) {
                var group = baseGroups[i];
                for (var j = group.properties.length - 1; j >= 0; --j) {
                    var propertyName = group.properties[j];
                    if (!this._matchingPropertyExists(baseMetadata, otherMetadata, propertyName)){
                        group.properties.splice(j, 1);
                    }
                }
            }
        }

        return baseGroups;
    }

    _matchingPropertyExists(metadata1, metadata2, propertyName): boolean {
        var propertyMetadata1 = metadata1[propertyName];
        if (!propertyMetadata1){
            return false;
        }
        var propertyMetadata2 = metadata2[propertyName];
        if (!propertyMetadata2){
            return false;
        }

        return propertyMetadata1.type === propertyMetadata2.type;
    }

    getDisplayPropValue(propertyName: string, descriptor: PropertyDescriptor) {
        if (this.count() === 1) {
            return this.elements[0].getDisplayPropValue(propertyName, descriptor);
        }

        var values = this.elements.map(x => x.getDisplayPropValue(propertyName, descriptor));
        var base = values[0];
        for (let i = 1; i < values.length; ++i) {
            let next = values[i];
            let isComplex = typeof next === "object" || Array.isArray(next);
            if (isComplex) {
                base = clone(base);
                leaveCommonProps(base, next);
            }
            else if (next !== base) {
                base = undefined;
                break;
            }
        }

        return base;
    }

    prepareDisplayPropsVisibility() {
        if (this.count() === 0){
            return {};
        }

        var type = this.allHaveSameType() ?
            this.elements[0].systemType() :
            this.systemType();

        var metadata = PropertyMetadata.findAll(type);
        if (!metadata || !metadata.prepareVisibility) {
            return {};
        }

        var base = metadata.prepareVisibility(this.elements[0].props, this, Environment.view);
        for (let i = 1; i < this.elements.length; ++i) {
            let element = this.elements[i];
            let next = metadata.prepareVisibility(element.props, this, Environment.view);
            if (next) {
                for (let p in next) {
                    let visible = next[p];
                    if (!visible) {
                        base[p] = false;
                    }
                }
            }
        }
        return base;
    }

    previewDisplayProps(changes: any) {
        if (!this._inPreview) {
            if (!this._affectingLayout && this.isChangeAffectingLayout(changes)) {
                Selection.hideFrame();
                this._affectingLayout = true;
            }

            PropertyTracker.suspend();
        }
        this._inPreview = true;

        for (var i = 0; i < this.elements.length; i++) {
            var element = this.elements[i];
            var elementChanges = this._prepareElementChanges(element, changes);
            if (!this._origPropValues[i]) {
                var properties = element.getAffectedProperties(changes);
                this._origPropValues[i] = element.selectProps(properties);
            }
            element.setDisplayProps(elementChanges, ChangeMode.Root);
        }
    }

    updateDisplayProps(changes: any) {
        for (var i = 0; i < this.elements.length; i++) {
            var element = this.elements[i];

            var elementChanges = this._prepareElementChanges(element, changes);

            if (this._origPropValues.length) {
                var origProps = this._origPropValues[i];
                element.setProps(origProps, ChangeMode.Root);
            }
            element.setDisplayProps(elementChanges, ChangeMode.Model);
        }

        if (this._affectingLayout) {
            ArrangeStrategy.arrangeRoots(this.elements);
        }

        if (this._inPreview) {
            if (PropertyTracker.resume()) {
                PropertyTracker.flush();
            }
        }

        this._origPropValues.length = 0;
        this._affectingLayout = false;
        this._inPreview = false;
    }

    _prepareElementChanges(element: UIElement, changes: any) {
        var elementChanges = Object.assign({}, changes);
        for (var p in elementChanges) {
            if (p === 'fill' || p === 'stroke') {
                elementChanges[p] = Brush.extend(element.props[p], elementChanges[p])
            }
            else if (p === 'font') {
                elementChanges[p] = Font.extend(element.props[p], elementChanges[p])
            }
        }
        return elementChanges;
    }

    _onPropsChanged(element: UIElement, newProps: IUIElementProps) {
        if (this.has(element)) {
            if (newProps.hasOwnProperty("m") || newProps.hasOwnProperty("br")) {
                this.resetGlobalViewCache();
            }

            if (this.count() === 1) {
                PropertyTracker.changeProps(this, newProps, {});
                return;
            }
            //for multiselection, capture all changes within the current tick and fire a single update on next tick
            if (!this._newPropsForNextTick) {
                this._newPropsForNextTick = {};
            }

            this._newPropsForNextTick = Object.assign(this._newPropsForNextTick, newProps);

            if (this._propsChangedTimer) {
                clearTimeout(this._propsChangedTimer);
                this._propsChangedTimer = 0;
            }
            this._propsChangedTimer = setTimeout(() => this._onPropsChangedNextTick(), 1);
        }
    }
    _onPropsChangedNextTick() {
        if (this.isDisposed()) {
            return;
        }
        var newProps = this._newPropsForNextTick;
        this._newPropsForNextTick = null;

        this.performArrange();
        PropertyTracker.changeProps(this, newProps, {});
    }

    dispose() {
        super.dispose.apply(this, arguments);
        PropertyTracker.propertyChanged.unbind(this, this._onPropsChanged);
    }

    padding() {
        return Box.Default;
    }
}

CompositeElement.prototype.t = Types.CompositeElement;

PropertyMetadata.registerForType(CompositeElement, {
    groups(element) {
        return element.getCommonProperties();
    }
});