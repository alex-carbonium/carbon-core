import PropertyMetadata from "./PropertyMetadata";
import PropertyTracker from "./PropertyTracker";
import { leaveCommonProps } from "../util";
import { Types } from "./Defs";
import Brush from "./Brush";
import Font from "./Font";
import UIElement from "./UIElement";
import { IGroupContainer, IView } from "carbon-core";
import Box from "./Box";
import Rect from "../math/rect";
import Matrix from "../math/matrix";
import Selection from "./SelectionModel";
import { IUIElementProps, IPoint, IRect, IComposite, ChangeMode, PatchType, ICoordinate, RenderEnvironment, PropDescriptor, IUIElement } from "carbon-core";
import CommonPropsManager from "./CommonPropsManager";
import Point from "../math/point";

export default class CompositeElement extends UIElement implements IComposite {
    private _commonPropsManager: CommonPropsManager;

    children: UIElement[];

    constructor() {
        super();

        this._types = [];
        this.children = [];
        this._origPropValues = [];
        this._affectingLayout = false;
        this._inPreview = false;
        this._commonPropsManager = new CommonPropsManager();

        PropertyTracker.propertyChanged.bind(this, this._onPropsChanged);
    }

    get elements(): UIElement[] {
        return this.children as UIElement[];
    }

    contains(element) {
        return this.children.indexOf(element) !== -1;
    }

    register(element: IUIElement) {
        var systemType = element.systemType();
        if (this._types.indexOf(systemType) === -1) {
            this._types.push(systemType);
        }
        element.enablePropsTracking();
        this.children.push(element as UIElement);
    }
    registerAll(elements: IUIElement[]) {
        for (let i = 0, j = elements.length; i < j; ++i) {
            let element = elements[i];
            this.register(element);
        }
    }

    unregister(element: UIElement) {
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

        if (elementIndex !== -1) {
            this.children.splice(elementIndex, 1);
        }

        if (canRemoveType) {
            this._types.splice(this._types.indexOf(systemType), 1);
        }
    }
    unregisterAll() {
        this.each(x => x.disablePropsTracking());
        this._types = [];
        //do not clear, selection model stores this by reference
        this.children = [];
        this.resetTransform();
    }

    autoPositionChildren(): boolean {
        return true;
    }

    applyScaling(s: IPoint, o: IPoint, options, changeMode) {
        var resizeOptions = options && options.forChildResize(false);
        for (let i = 0; i < this.elements.length; ++i){
            let element = this.elements[i];
            let localOrigin = Point.allocate(o.x, o.y);
            (element.parent as any).globalViewMatrixInverted().transformPointMutable(localOrigin);
            element.applyScaling(s, localOrigin, resizeOptions, changeMode)
            localOrigin.free();
        }
        this.performArrange();
        return true;
    }

    getMaxOuterBorder() {
        let border = this.children[0].getMaxOuterBorder();
        for (let i = 1; i < this.children.length; ++i){
            border = Math.max(border, this.children[i].getMaxOuterBorder());
        }
        return border;
    }

    get angle() {
        if (this.elements.length === 1) {
            return this.elements[0].angle;
        }
        return super.angle;
    }

    hasBadTransform(): boolean {
        return this.elements.some(x => x.hasBadTransform());
    }

    restoreLastGoodTransformIfNeeded() {
        this.elements.forEach(x => x.restoreLastGoodTransformIfNeeded());
    }

    performArrange() {
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
        this.prepareAndSetProps({ br: new Rect(0, 0, w, h), m: new Matrix(1, 0, 0, 1, xMin, yMin) });
    }

    draw(context, environment: RenderEnvironment) {
        return;
    }

    getBoundingBoxGlobal(includeMargin?: boolean): Rect {
        if (this.count() === 1) {
            return this.elements[0].getBoundingBoxGlobal(includeMargin);
        }
        return super.getBoundingBoxGlobal(includeMargin);
    }

    dm() {
        if (this.count() === 1) {
            return this.elements[0].dm();
        }
        return super.dm();
    }

    getBoundingBox(includeMargin?: boolean) {
        if (this.count() === 1) {
            return this.elements[0].getBoundingBox();
        }
        return super.getBoundingBox(includeMargin);
    }

    boundaryRect(value?) {
        if (this.count() === 1) {
            return this.elements[0].boundaryRect();
        }
        return super.boundaryRect(value);
    }

    gdm() {
        if (this.count() === 1) {
            return this.elements[0].gdm();
        }
        return super.gdm();
    }

    globalViewMatrix() {
        if (this.count() === 1) {
            return this.elements[0].globalViewMatrix();
        }
        return super.globalViewMatrix();
    }

    clearSavedLayoutProps() {
        super.clearSavedLayoutProps();
        this.elements.forEach(e=>e.clearSavedLayoutProps());
    }

    get width() {
        if (this.count() === 1) {
            return this.elements[0].width;
        }
        return super.width;
    }

    get height() {
        if (this.count() === 1) {
            return this.elements[0].height;
        }
        return super.height;
    }

    get x() {
        if (this.count() === 1) {
            return this.elements[0].x;
        }
        return super.x;
    }

    get y() {
        if (this.count() === 1) {
            return this.elements[0].y;
        }
        return super.y;
    }

    rotationOrigin(global) {
        if (this.count() === 1) {
            return this.elements[0].rotationOrigin(global);
        }
        return super.rotationOrigin(global);
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

    getPropSnapshot() {
        var snapshot = {};
        for (var e of this.children) {
            snapshot[e.id] = e.selectLayoutProps();
        }

        return snapshot;
    }

    applySnapshot(snapshot, mode) {
        for (var e of this.children) {
            this.applyElementSnapshot(snapshot, e, mode);
        }
    }

    applyElementSnapshot(snapshot, element, mode) {
        let props = snapshot[element.id];
        if (props) {
            element.setProps(props, mode);
        }
    }

    hitTest(point: ICoordinate, view: IView, boundaryRectOnly: boolean = false) {
        var count = this.count();
        if (count === 0) {
            return false;
        }

        if (boundaryRectOnly && count > 1) {
            return super.hitTest(point, view, boundaryRectOnly);
        }

        for (var i = count - 1; i >= 0; i--) {
            var el = this.elements[i];
            if (el.hitTest(point, view)) {
                return true;
            }
        }
        return false;
    }
    hitVisible() {
        return true;
    }
    canAccept(elements, autoInsert, allowMoveIn) {
        return this.elements.every(x => x.canAccept(elements, autoInsert, allowMoveIn));
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

    showResizeHint() {
        return true;
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
        if (this._types.length === 1) {
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
            if (parent && e.parent !== parent) {
                result = false;
                return false;
            }
            parent = e.parent;
        });

        return result;
    }
    parents() {
        var parents = [];
        for (var i = 0; i < this.elements.length; i++) {
            var parent = this.elements[i].parent;
            if (parents.indexOf(parent) === -1) {
                parents.push(parent);
            }
        }
        return parents;
    }
    ensureSorted() {
        if (!this.elements.length) {
            return;
        }

        let sorted = true;
        let parent = this.elements[0].parent;
        let index = parent.children.indexOf(this.elements[0]);
        for (var i = 1; i < this.elements.length; i++) {
            if (this.elements[i].parent !== parent) {
                return;
            }
            let elementIndex = parent.children.indexOf(this.elements[i]);
            if (elementIndex < index) {
                sorted = false;
                break;
            }
            index = elementIndex;
        }
        if (!sorted) {
            this.elements.sort((a, b) => parent.children.indexOf(a) - parent.children.indexOf(b));
        }
    }

    createPropertyGroups() {
        return this._commonPropsManager.createGroups(this.elements);
    }

    getDisplayPropValue(propertyName: string, descriptor: PropDescriptor) {
        return this._commonPropsManager.getDisplayPropValue(this.elements, propertyName, descriptor);
    }

    prepareDisplayPropsVisibility() {
        return this._commonPropsManager.prepareDisplayPropsVisibility(this.elements, this.systemType());
    }

    getAffectedDisplayProperties(changes): string[] {
        return this._commonPropsManager.getAffectedDisplayProperties(this.elements, changes);
    }

    previewDisplayProps(changes: any) {
        return this._commonPropsManager.previewDisplayProps(this.elements, changes);
    }

    updateDisplayProps(changes: any) {
        return this._commonPropsManager.updateDisplayProps(this.elements, changes);
    }

    previewPatchDisplayProps(elements: UIElement[], propertyName: string, patchType: PatchType, value: any) {
        this._commonPropsManager.previewPatchProps(elements, propertyName, patchType, value);
    }

    patchDisplayProps(elements: UIElement[], propertyName: string, patchType: PatchType, value: any) {
        this._commonPropsManager.patchProps(elements, propertyName, patchType, value);
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
            this._commonPropsManager.onChildPropsChanged(newProps, this.onChildrenPropsChanged);
        }
    }
    private onChildrenPropsChanged = mergedProps => {
        if (this.isDisposed()) {
            return;
        }

        this.performArrange();
        PropertyTracker.changeProps(this, mergedProps, {});
    };

    dispose() {
        super.dispose.apply(this, arguments);
        PropertyTracker.propertyChanged.unbind(this, this._onPropsChanged);
    }

    padding() {
        return Box.Default;
    }

    get types() {
        return this._types;
    }

    canFill() {
        return this.children.every(x => x.canFill());
    }
    canStroke() {
        return this.children.every(x => x.canStroke());
    }
}

CompositeElement.prototype.t = Types.CompositeElement;

PropertyMetadata.registerForType(CompositeElement, {
    groups(element) {
        return element.getCommonProperties();
    }
});