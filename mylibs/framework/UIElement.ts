import TypeDefaults from "./TypeDefaults";
import ObjectFactory from "./ObjectFactory";
import PropertyMetadata from "./PropertyMetadata";
import Box from "./Box";
import Brush from "./Brush";
import AnimationGroup from "./animation/AnimationGroup";
import Matrix from "../math/matrix";
import Point from "../math/point";
import { isRectInRect, areRectsIntersecting } from "../math/math";
//import stopwatch from "../Stopwatch";
import Constraints from "./Constraints";
import GlobalMatrixModifier from "./GlobalMatrixModifier";
import params from "params";
import {
    Types,
    DockStyle,
    ArrangeStrategies,
    Overflow,
    HorizontalAlignment,
    VerticalAlignment,
    PointDirection,
    StrokePosition
} from "./Defs";
import RotateFramePoint from "../decorators/RotateFramePoint";
import ResizeFramePoint from "../decorators/ResizeFramePoint";
import DefaultFrameType from "../decorators/DefaultFrameType";
import styleManager from "./style/StyleManager";
import NullContainer from "./NullContainer";
import Invalidate from "./Invalidate";
import Environment from "../environment";
import DataNode from "./DataNode";
import { createUUID, deepEquals } from "../util";
import Rect from "../math/rect";
import ResizeOptions from "../decorators/ResizeOptions";
import { PropertyDescriptor } from './PropertyMetadata';
import { IKeyboardState, IConstraints } from "carbon-basics";
import { IUIElementProps, IUIElement, IContainer } from "carbon-model";
import { ICoordinate, ISize } from "carbon-geometry";
import { ChangeMode, LayerTypes, IPrimitiveRoot, IRect, IMatrix, ResizeDimension, IDataNode, IPoint } from "carbon-core";
import DecoratableChain from "./DecoratableChain";

require("../migrations/All");

export interface IUIElementRuntimeProps {
    primitivePath: string[];
    primitiveRootKey: string;
}

// constructor
export default class UIElement<TProps extends IUIElementProps = IUIElementProps> extends DataNode<TProps> implements IUIElement<TProps> {
    [name: string]: any;
    props: TProps;
    decorators: any[];

    constructor() {
        super(false);

        //this.stopwatch = new stopwatch();

        if (DEBUG) {
            this.id(createUUID(this.t));
        }
        else {
            this.id(createUUID());
        }
        this.parent(NullContainer);
    }
    invalidate() {
        let parent = this.parent();
        if (parent) {
            parent.invalidate();
        }
    }
    resetRuntimeProps() {
        this.runtimeProps = {
            boundaryRectGlobal: null,
            globalViewMatrix: null,
            globalViewMatrixInverted: null,
            globalClippingBox: null,
            primitiveRoot: null,
            snapPoints: null,
        }
    }
    _roundValue(value) {
        return Math.round(value);
    }
    prepareProps(changes) {
        super.prepareProps.apply(this, arguments);
        if (changes.styleId !== undefined) {
            extend(changes, styleManager.getStyle(changes.styleId, 1).props);
        }

        let hasBr = changes.hasOwnProperty("br");
        if (hasBr && !(changes.br instanceof Rect)) {
            changes.br = Rect.fromObject(changes.br);
        }
    }

    hasPendingStyle() {
        if (!this.props.styleId) {
            return false;
        }
        let baseStyle = styleManager.getStyle(this.props.styleId, 1);

        for (let p in baseStyle.props) {
            if (!deepEquals(this.props[p], baseStyle.props[p])) {
                return true;
            }
        }
        return false;
    }

    allowNameTranslation() {
        return true;
    }

    setProps(props, mode?: ChangeMode) {
        let hasBr = props.hasOwnProperty("br");

        if (!hasBr) {
            let hasW = props.hasOwnProperty("width");
            let hasH = props.hasOwnProperty("height");
            if (hasW || hasH) {
                let br = this.boundaryRect();
                let w = hasW ? props.width : br.width;
                let h = hasH ? props.height : br.height;
                props.br = br.withSize(w, h);
            }
        }
        super.setProps.apply(this, arguments);
    }

    propsUpdated(newProps, oldProps, mode?) {
        if (newProps.hasOwnProperty("m") || newProps.hasOwnProperty("br")) {
            this.resetGlobalViewCache();
            if (mode === ChangeMode.Model) {
                this.saveLastGoodTransformIfNeeded(oldProps);
            }
        }

        //raise events after all caches are updated
        super.propsUpdated.apply(this, arguments);
        this.invalidate();
    }
    propsPatched(patchType, propName, item) {
        super.propsPatched.apply(this, arguments);
        this.invalidate();
    }

    selectLayoutProps(global?: boolean): Partial<IUIElementProps> {
        let m = global ? this.globalViewMatrix() : this.viewMatrix();
        return {
            br: this.boundaryRect(),
            m
        };
    }
    saveOrResetLayoutProps(): boolean {
        //this happens only for clones, so no need to clear origLayout
        if (!this.runtimeProps.origLayout) {
            this.runtimeProps.origLayout = this.selectLayoutProps();
            return true;
        }
        if (this.hasBadTransform()) {
            this.setProps({ bad: false, lgbr: null, lgm: null });
        }
        this.setProps(this.runtimeProps.origLayout);
        return false;
    }

    selectDisplayProps(names, metadata = this.findMetadata()): any {
        let values = {};
        for (let i = 0; i < names.length; i++) {
            let propertyName = names[i];
            let descriptor: PropertyDescriptor = metadata[names[i]];
            if (descriptor.computed) {
                values[propertyName] = this[propertyName]();
            }
            else {
                values[propertyName] = this.props[propertyName];
            }
        }
        return values;
    }
    getDisplayPropValue(propertyName: string, descriptor: PropertyDescriptor = null): any {
        if (!descriptor) {
            let metadata = this.findMetadata();
            if (metadata) {
                descriptor = metadata[propertyName];
            }
        }
        if (descriptor && descriptor.computed) {
            return this[propertyName]();
        }

        return this.props[propertyName];
    }
    setDisplayProps(changes, changeMode, metadata = this.findMetadata()) {
        let names = Object.keys(changes);
        for (let i = 0; i < names.length; i++) {
            let propertyName = names[i];
            let descriptor: PropertyDescriptor = metadata[propertyName];
            if (descriptor.computed) {
                DecoratableChain.invoke(this, propertyName, [changes[propertyName], changeMode]);
                delete changes[propertyName];
            }
        }

        this.prepareAndSetProps(changes, changeMode);
    }
    getAffectedDisplayProperties(changes): string[] {
        let properties = Object.keys(changes);
        if (changes.hasOwnProperty("br") || changes.hasOwnProperty("m")) {
            if (properties.indexOf("x") === -1) {
                properties.push("x");
            }
            if (properties.indexOf("y") === -1) {
                properties.push("y");
            }
            if (properties.indexOf("width") === -1) {
                properties.push("width");
            }
            if (properties.indexOf("height") === -1) {
                properties.push("height");
            }
            if (properties.indexOf("angle") === -1) {
                properties.push("angle");
            }

            let i = properties.indexOf("br");
            if (i !== -1) {
                properties.splice(i, 1);
            }
            i = properties.indexOf("m");
            if (i !== -1) {
                properties.splice(i, 1);
            }
        }
        return properties;
    }
    isChangeAffectingLayout(changes): boolean {
        return changes.hasOwnProperty("br")
            || changes.hasOwnProperty("m")
            || changes.hasOwnProperty("x")
            || changes.hasOwnProperty("y")
            || changes.hasOwnProperty("width")
            || changes.hasOwnProperty("height");
    }
    getAffectedProperties(displayChanges): string[] {
        let properties = Object.keys(displayChanges);
        let result = [];
        let layoutPropsAdded = false;
        for (let i = 0; i < properties.length; ++i) {
            let p = properties[i];
            if (p === 'x' || p === 'y' || p === 'width' || p === 'height' || p === 'angle') {
                if (!layoutPropsAdded) {
                    result.push('br');
                    result.push('m');
                    layoutPropsAdded = true;
                }
            }
            else {
                result.push(p);
            }
        }
        return result;
    }

    getTranslation() {
        return this.dm().translation;
    }
    applyTranslation(t: ICoordinate, withReset?: boolean, mode?: ChangeMode) {
        if (withReset) {
            this.saveOrResetLayoutProps();
        }
        this.applyTransform(Matrix.create().translate(t.x, t.y), false, mode);
    }
    applyDirectedTranslation(t, mode?: ChangeMode) {
        this.applyTransform(Matrix.create().translate(t.x, t.y), true, mode);
    }
    applyGlobalTranslation(t, changeMode?: ChangeMode) {
        let m = this.globalViewMatrix().prependedWithTranslation(t.x, t.y);
        m = this.parent().globalViewMatrixInverted().appended(m);
        this.setTransform(m, changeMode);
    }

    getRotation(global: boolean = false) {
        let decomposed = global ? this.gdm() : this.dm();
        return -decomposed.rotation;
    }
    applyRotation(angle, o, withReset?: boolean, mode?: ChangeMode) {
        if (withReset) {
            this.saveOrResetLayoutProps();
        }
        this.applyTransform(Matrix.create().rotate(-angle, o.x, o.y), false, mode);
    }
    isRotated(global: boolean = false): boolean {
        return this.getRotation(global) % 360 !== 0;
    }
    isFlipped(global: boolean = false): boolean {
        let decomposed = global ? this.gdm() : this.dm();
        //it is more complex to check if element is flipped vertically or horizontally.
        //y scaling is always -1 for flipped matrix, and angle changes depending on whether it is x or y flip.
        return Math.round(decomposed.scaling.y) === -1;
    }
    canRotate(): boolean {
        var root = this.primitiveRoot();
        return root && root.isEditable();
    }

    applyScaling(s, o, options?, changeMode?: ChangeMode) {
        if (options && options.reset) {
            this.saveOrResetLayoutProps();
        }

        if ((options && options.sameDirection) || !this.isRotated()) {
            this.applySizeScaling(s, o, options, changeMode);
            return true;
        }

        this.applyMatrixScaling(s, o, options, changeMode);

        if (!options || options.final) {
            this.skew();
        }

        return false;
    }
    applyMatrixScaling(s, o, options, changeMode: ChangeMode) {
        if (options && options.sameDirection) {
            let localOrigin = this.viewMatrixInverted().transformPoint(o);
            this.applyTransform(Matrix.create().scale(s.x, s.y, localOrigin.x, localOrigin.y), true, changeMode);
        }
        else {
            this.applyTransform(Matrix.create().scale(s.x, s.y, o.x, o.y), false, changeMode);
        }
    }

    skew(): void {
    }

    first(): UIElement {
        return this;
    }

    /**
     * This function must produce exactly the same visual result as
     * calling UIElement.applyTransform(Matrix.create().scale(s.x, s.y, o.x, oy)),
     * but instead of changing the matrix, width and height are updated.
     *
     * For respecting the origin, first width and height are changed, new origin is calculated
     * and translated to the original position if necessary.
     *
     * Flip is detected by negative width/height, in which case the matrix is reflected relative to origin.
     */
    applySizeScaling(s, o, options, changeMode: ChangeMode) {
        var br = this.boundaryRect();
        var newWidth = br.width * s.x;
        var newHeight = br.height * s.y;

        if (options && options.round) {
            newWidth = Math.round(newWidth);
            newHeight = Math.round(newHeight);
        }

        let localOrigin = this.viewMatrixInverted().transformPoint(o);
        let newX = s.x * br.x;
        let newY = s.y * br.y;
        if (options && options.round) {
            newX = Math.round(newX);
            newY = Math.round(newY);
        }
        let newProps: Partial<IUIElementProps> = {};
        newProps.br = new Rect(Math.abs(newX), Math.abs(newY), Math.abs(newWidth), Math.abs(newHeight));

        let fx = s.x < 0 ? -1 : 1;
        let fy = s.y < 0 ? -1 : 1;
        let dx = s.x * (br.x - localOrigin.x) + localOrigin.x - newX;
        let dy = s.y * (br.y - localOrigin.y) + localOrigin.y - newY;
        if (options && options.round) {
            dx = Math.round(dx);
            dy = Math.round(dy);
        }

        if (fx === -1 || fy === -1 || dx !== 0 || dy !== 0) {
            let matrix = this.viewMatrix();
            if (fx === -1 || fy === -1) {
                if (fx === -1) {
                    dx = -dx;
                }
                if (fy === -1) {
                    dy = -dy;
                }
                matrix = matrix.appended(Matrix.create().scale(fx, fy));
            }
            newProps.m = matrix.appended(Matrix.create().translate(dx, dy));
        }
        if (options && options.round) {
            newProps.m = newProps.m || this.viewMatrix().clone();
            //set directly to avoid floating point results
            newProps.m.tx = Math.round(newProps.m.tx);
            newProps.m.ty = Math.round(newProps.m.ty);
        }

        this.prepareAndSetProps(newProps, changeMode);
    }

    applyTransform(matrix, append?: boolean, mode?: ChangeMode) {
        this.prepareAndSetProps({ m: append ? this.props.m.appended(matrix) : this.props.m.prepended(matrix) }, mode);
    }
    setTransform(matrix, mode?: ChangeMode) {
        this.setProps({ m: matrix }, mode);
    }
    resetTransform(mode?: ChangeMode) {
        let props: any = { m: Matrix.Identity };
        if (this.hasBadTransform()) {
            props.bad = false;
            props.lgbr = null;
            props.lgm = null;
        }
        this.setProps(props, mode);
    }

    hasBadTransform(): boolean {
        return this.props.bad;
    }
    isBadBoundaryRect(br) {
        return br.width < 1 || br.height < 1;
    }
    isBadMatrix(m: IMatrix) {
        return m.isSingular();
    }

    saveLastGoodTransformIfNeeded(oldProps): void {
        let lastGoodProps = null;

        var saveBr = !this.props.lgbr && oldProps.br && this.isBadBoundaryRect(this.boundaryRect()) && !this.isBadBoundaryRect(oldProps.br);
        var saveMatrix = !this.props.lgm && oldProps.m && this.isBadMatrix(this.viewMatrix()) && !this.isBadMatrix(oldProps.m);

        if (saveBr || saveMatrix) {
            lastGoodProps = {
                lgbr: oldProps.br || this.boundaryRect(),
                lgm: oldProps.m || this.viewMatrix(),
                bad: true
            };
        } else if (this.props.bad) {
            lastGoodProps = {
                bad: false
            };
        }

        if (lastGoodProps !== null) {
            this.setProps(lastGoodProps);
        }
    }

    restoreLastGoodTransformIfNeeded(): void {
        if (this.hasBadTransform()) {
            this.setProps({
                br: Rect.fromObject(this.props.lgbr),
                lgbr: null,
                m: Matrix.fromObject(this.props.lgm),
                lgm: null,
                bad: false
            });
        }
    }
    roundBoundingBoxToPixelEdge(): boolean {
        let rounded = false;
        let bb = this.getBoundingBox();
        let bb1 = bb.roundPosition();
        if (bb1 !== bb) {
            let t = bb1.topLeft().subtract(bb.topLeft());
            this.applyTranslation(t);
            bb1 = bb1.translate(t.x, t.y);
            rounded = true;
        }
        let bb2 = bb1.roundSize();
        if (bb2 !== bb1) {
            let s = new Point(bb2.width / bb1.width, bb2.height / bb1.height);
            let canRound = this.shouldApplyViewMatrix();
            this.applyScaling(s, bb1.topLeft(), ResizeOptions.Default.withRounding(canRound).withReset(false));
            rounded = true;
        }
        return rounded;
    }

    arrange() {
    }
    performArrange(oldRect) {
    }
    _init() {

    }
    // lastDrawnRect(value) {
    //     if (arguments.length !== 0) {
    //         this._lastDrawnRect = value;
    //     }
    //
    //     return this._lastDrawnRect;
    // },
    draggingEnter(event) {
    }
    draggingLeft(event) {
    }
    getDropData(pos, element) {
        return null;
    }
    startResizing(eventData) {
        Environment.controller.startResizingEvent.raise(eventData);
    }
    stopResizing(eventData) {
        Environment.controller.stopResizingEvent.raise(eventData);
    }
    canHandleCorruption() {
        return false;
    }
    getSnapPoints(local) {
        if (!this.allowSnapping()) {
            return null;
        }

        if (this.runtimeProps.snapPoints) {
            return this.runtimeProps.snapPoints;
        }

        let rect = this.getBoundaryRectGlobal();
        let x = rect.x,
            y = rect.y,
            width = rect.width,
            height = rect.height;
        let origin = this.rotationOrigin(true);

        if (local) {
            x = 0;
            y = 0;
            origin.x -= rect.x;
            origin.y -= rect.y;
        }

        return this.runtimeProps.snapPoints = {
            xs: [x, x + width],
            ys: [y, y + height],
            center: { x: origin.x, y: origin.y }
        };
    }

    hasPath() {
        return this.drawPath !== undefined;
    }

    position() {
        return this.getBoundingBox().topLeft();
    }
    centerPositionGlobal() {
        let rect = this.getBoundaryRectGlobal();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }
    addDecorator(decorator) {
        if (!this.decorators) {
            this.decorators = [];
        }
        if (this.decorators.indexOf(decorator) === -1) {
            this.decorators.push(decorator);
            decorator.attach(this);
            Invalidate.requestInteractionOnly();
        }
    }
    removeDecorator(decorator) {
        if (!this.decorators) {
            return;
        }
        for (let i = 0, max = this.decorators.length; i < max; i++) {
            if (this.decorators[i] === decorator) {
                this.decorators[i].detach();
                this.decorators.splice(i, 1);
                Invalidate.requestInteractionOnly();
                break;
            }
        }
    }

    removeAllDecorators(): any[] {
        let decorators = this.decorators;
        if (decorators) {
            decorators.forEach(x => x.detach());
            this.decorators = [];
            Invalidate.requestInteractionOnly();
        }
        return decorators;
    }

    removeDecoratorByType(type) {
        if (!this.decorators) {
            return;
        }
        for (let i = 0, max = this.decorators.length; i < max; i++) {
            if (this.decorators[i].t === type.prototype.t) {
                this.decorators[i].detach();
                this.decorators.splice(i, 1);
                Invalidate.requestInteractionOnly();
                break;
            }
        }
    }

    removed() {
        this.removeAllDecorators();
    }

    removing() {

    }
    autoSelectOnPaste() {
        return true;
    }

    size(value?: ISize): ISize {
        if (arguments.length) {
            //TODO: handle for paths based on shouldApplyViewMatrix
            this.boundaryRect(this.boundaryRect().withSize(value.width, value.height));
        }
        return {
            width: this.width(),
            height: this.height()
        }
    }
    getBoundaryRectGlobal(includeMargin = false) {
        return this.getBoundingBoxGlobal(includeMargin);
    }

    getBoundingBox(includeMargin: boolean = false): Rect {
        var rect = this.boundaryRect();
        return this.transformBoundingRect(rect, this.viewMatrix());
    }

    getBoundingBoxGlobal(includeMargin: boolean = false): Rect {
        if (this.runtimeProps.globalClippingBox) {
            return this.runtimeProps.globalClippingBox;
        }

        var rect = this.boundaryRect();
        var bb = this.transformBoundingRect(rect, this.globalViewMatrix());
        this.runtimeProps.globalClippingBox = bb;
        return bb;
    }
    getBoundingBoxRelativeToRoot(): Rect {
        var m = this.rootViewMatrix();
        var rect = this.boundaryRect();
        return this.transformBoundingRect(rect, m);
    }

    transformBoundingRect(rect, matrix) {
        if (matrix.isTranslatedOnly()) {
            return rect.translate(matrix.tx, matrix.ty);
        }

        let p1 = matrix.transformPoint2(rect.x, rect.y);
        let p2 = matrix.transformPoint2(rect.x + rect.width, rect.y);
        let p3 = matrix.transformPoint2(rect.x + rect.width, rect.y + rect.height);
        let p4 = matrix.transformPoint2(rect.x, rect.y + rect.height);

        let l = Math.min(p1.x, p2.x, p3.x, p4.x);
        let r = Math.max(p1.x, p2.x, p3.x, p4.x);
        let t = Math.min(p1.y, p2.y, p3.y, p4.y);
        let b = Math.max(p1.y, p2.y, p3.y, p4.y);

        return new Rect(l, t, r - l, b - t);
    }

    getMaxOuterBorder() {
        if (!this.stroke()) {
            return 0;
        }
        let strokeWidth = this.strokeWidth();
        if (strokeWidth === 0) {
            return 0;
        }
        let strokePosition = this.strokePosition();
        if (strokePosition === StrokePosition.Center) {
            return strokeWidth / 2 + .5 | 0;
        }
        if (strokePosition === StrokePosition.Inside) {
            return 0;
        }
        return strokeWidth;
    }

    expandRectWithBorder(rect) {
        let border = this.getMaxOuterBorder();
        if (border !== 0) {
            return rect.expand(border);
        }
        return rect;
    }

    getHitTestBox(scale: number, includeMargin: boolean = false, includeBorder: boolean = true): IRect {
        var rect = this.boundaryRect();
        var goodScaleW = rect.width * scale > 10;
        var goodScaleH = rect.height * scale > 10;
        if (!includeBorder && goodScaleW && goodScaleW) {
            return rect;
        }

        let border = this.getMaxOuterBorder();
        if (border === 0 && goodScaleW && goodScaleH) {
            return rect;
        }

        let x = rect.x - border;
        let y = rect.y - border;
        let width = rect.width + border;
        let height = rect.height + border;

        if (!goodScaleW) {
            x -= 5;
            width += 10;
        }
        if (goodScaleH) {
            y -= 5;
            height += 10;
        }
        return new Rect(x, y, width, height);
    }

    hitTest(/*Point*/point, scale, boundaryRectOnly = false) {
        if (!this.visible() || this.hasBadTransform()) {
            return false;
        }
        let rect = this.getHitTestBox(scale, false);

        let matrix = this.globalViewMatrixInverted();
        point = matrix.transformPoint(point);

        return point.x >= rect.x && point.x < rect.x + rect.width && point.y >= rect.y && point.y < rect.y + rect.height;
    }
    hitTestGlobalRect(rect: Rect, directSelection: boolean) {
        if (!this.hitVisible(directSelection)) {
            return false;
        }

        let bb = this.getBoundingBoxGlobal();
        if (!areRectsIntersecting(bb, rect)) {
            return false;
        }

        let m = this.globalViewMatrix();
        if (m.isTranslatedOnly()) {
            return true;
        }

        if (isRectInRect(bb, rect)) {
            return true;
        }

        var br = this.boundaryRect();
        var segments1 = m.transformRect(br);
        var segments2 = rect.segments();

        for (let i = 0; i < segments1.length; i++) {
            let s1 = segments1[i];
            for (let j = 0; j < segments2.length; j++) {
                let s2 = segments2[j];
                if (s1.intersects(s2)) {
                    return true;
                }
            }
        }
        return false;
    }
    // pageLink(value) {
    //     let action = this.action();
    //     if (action.type === 0/*PageLink*/) {
    //         return action.pageId;
    //     }
    //     return null;
    // },

    resetGlobalViewCache(resetPrimitiveRoot = false) {
        delete this.runtimeProps.boundaryRectGlobal;
        delete this.runtimeProps.globalViewMatrix;
        delete this.runtimeProps.globalViewMatrixInverted;
        delete this.runtimeProps.viewMatrixInverted;
        delete this.runtimeProps.globalClippingBox;
        delete this.runtimeProps.snapPoints;
        delete this.runtimeProps.dm;
        delete this.runtimeProps.gdm;
        //primitive root should be changed only when changing parent, it is needed for repeater clones
        if (resetPrimitiveRoot) {
            delete this.runtimeProps.primitiveRoot;
        }
    }
    viewMatrix() {
        return this.props.m;
    }
    dm() {
        if (!this.runtimeProps.dm) {
            this.runtimeProps.dm = this.props.m.decompose();
        }
        return this.runtimeProps.dm;
    }
    gdm() {
        if (!this.runtimeProps.gdm) {
            this.runtimeProps.gdm = this.globalViewMatrix().decompose();
        }
        return this.runtimeProps.gdm;
    }
    viewMatrixInverted() {
        if (!this.runtimeProps.viewMatrixInverted) {
            this.runtimeProps.viewMatrixInverted = this.viewMatrix().clone().invert();
        }
        return this.runtimeProps.viewMatrixInverted;
    }
    shouldApplyViewMatrix() {
        return true;
    }
    applyViewMatrix(context) {
        if (this.shouldApplyViewMatrix()) {
            this.globalViewMatrix().applyToContext(context);
        }
    }
    draw(context, environment) {
        if (this.hasBadTransform()) {
            return;
        }
        let markName;
        if (params.perf) {
            markName = "draw " + this.displayName() + " - " + this.id();
            performance.mark(markName);
        }

        var br = this.boundaryRect(),
            w = br.width,
            h = br.height;

        context.save();
        context.globalAlpha = context.globalAlpha * this.opacity();

        this.applyViewMatrix(context);

        this.clip(context);
        this.drawSelf(context, w, h, environment);

        context.restore();

        this.drawDecorators(context, w, h, environment);

        if (params.perf) {
            performance.measure(markName, markName);
        }
    }

    drawSelf(context, w, h, environment) {
    }

    drawDecorators(context, w, h, environment) {
        if (this.decorators) {
            context.save();
            for (let i = 0, j = this.decorators.length; i < j; ++i) {
                this.decorators[i].draw(context, w, h, environment);
            }
            context.restore();
        }
    }
    drawBoundaryPath(context, round = true) {
        var matrix = this.globalViewMatrix();
        var r = this.boundaryRect();
        const roundFactor = 2;

        let p = matrix.transformPoint2(r.x, r.y);
        if (round) {
            p.roundMutableBy(roundFactor);
        }
        context.moveTo(p.x, p.y);

        p = matrix.transformPoint2(r.x + r.width, r.y);
        if (round) {
            p.roundMutableBy(roundFactor);
        }
        context.lineTo(p.x, p.y);

        p = matrix.transformPoint2(r.x + r.width, r.y + r.height);
        if (round) {
            p.roundMutableBy(roundFactor);
        }
        context.lineTo(p.x, p.y);

        p = matrix.transformPoint2(r.x, r.y + r.height);
        if (round) {
            p.roundMutableBy(roundFactor);
        }
        context.lineTo(p.x, p.y);

        context.closePath();
    }

    primitiveRoot(): IPrimitiveRoot & UIElement {
        if (this.runtimeProps.primitiveRoot) {
            return this.runtimeProps.primitiveRoot;
        }
        let parent = this.parent();
        let root = parent ? parent.primitiveRoot() : null;
        this.runtimeProps.primitiveRoot = root;
        return root;
    }
    isFinalRoot(): boolean {
        return true;
    }
    _findFinalRoot() {
        let root = this.primitiveRoot();
        while (root && !root.isFinalRoot() && root.parent()) {
            root = root.parent().primitiveRoot();
        }
        return root;
    }

    primitivePath() {
        let path = this.primitiveRoot().primitivePath().slice();
        path[path.length - 1] = this.id();
        return path;
    }

    globalViewMatrix(): IMatrix {
        if (!this.runtimeProps.globalViewMatrix) {
            let parent = this.parent();
            if (!parent || parent === NullContainer) {
                return GlobalMatrixModifier.applyToMatrix(this.viewMatrix());
            }

            let matrix = parent.globalViewMatrix().clone();
            matrix.append(this.viewMatrix());
            this.runtimeProps.globalViewMatrix = Object.freeze(matrix);
        }

        return GlobalMatrixModifier.applyToMatrix(this.runtimeProps.globalViewMatrix);
    }
    globalViewMatrixInverted(): Matrix {
        if (!this.runtimeProps.globalViewMatrixInverted) {
            this.runtimeProps.globalViewMatrixInverted = this.globalViewMatrix().clone().invert();
        }

        return this.runtimeProps.globalViewMatrixInverted;
    }
    rootViewMatrix(): IMatrix {
        let root = this._findFinalRoot();
        if (!root || root === this) {
            return this.viewMatrix();
        }
        let current = this;
        let matrices = [];
        while (current !== root) {
            matrices.push(current.viewMatrix());
            current = current.parent();
        }

        let m = matrices[matrices.length - 1];
        for (let i = matrices.length - 2; i >= 0; --i) {
            m = m.appended(matrices[i]);
        }
        return m;
    }

    trackPropertyState(name) {
        return null;
    }
    clip(context) {
        if (this.clipSelf()) {
            GlobalMatrixModifier.push(m => this.shouldApplyViewMatrix() ? Matrix.Identity : m);
            try {
                context.beginPath();
                this.drawBoundaryPath(context);
                context.clip();
            }
            finally {
                GlobalMatrixModifier.pop();
            }
        }
    }
    mousemove(event, keys: IKeyboardState) {
        if (this.editor !== null) {
            event.handled = true;
        }
    }
    mouseup(event, keys: IKeyboardState) {
    }
    mousedown(event, keys: IKeyboardState) {
    }
    dblclick(event, scale) {
    }
    click(event) {
    }
    // mouseLeaveElement(event) {
    // },
    // mouseEnterElement(event) {
    // },
    setDefaultAction(defaultAction) {
        this._defaultAction = defaultAction;
    }
    select(multiSelect, view?) {

    }
    unselect() {
    }
    captureMouse() {
        Environment.controller.captureMouse(this);
    }
    releaseMouse() {
        Environment.controller.releaseMouse(this);
    }
    canMultiSelect() {
        return true;
    }
    canAlign() {
        return true;
    }
    canGroup() {
        return true;
    }
    canChangeOrder() {
        return true;
    }
    zOrder() {
        if (arguments.length > 0) {
            throw "zOrder is readonly";
        }
        let parent = this.parent();
        if (!parent || parent === NullContainer) {
            return null;
        }

        return parent.children.indexOf(this);
    }

    mode(value?: any): any {

    }

    x(value?: number, changeMode?: ChangeMode) {
        if (arguments.length !== 0) {
            let t = Point.create(value - this.x(), 0);
            this.applyGlobalTranslation(t, changeMode);

            return;
        }

        let root = this._findFinalRoot();
        if (!root || root === this) {
            return this.getBoundingBox().x;
        }
        let m = root.globalViewMatrixInverted().appended(this.globalViewMatrix());
        return this.transformBoundingRect(this.boundaryRect(), m).x;
    }
    y(value?: number, changeMode?: ChangeMode) {
        if (arguments.length !== 0) {
            let t = Point.create(0, value - this.y());
            this.applyGlobalTranslation(t, changeMode);

            return;
        }

        let root = this._findFinalRoot();
        if (!root || root === this) {
            return this.getBoundingBox().y;
        }
        let m = root.globalViewMatrixInverted().appended(this.globalViewMatrix());
        return this.transformBoundingRect(this.boundaryRect(), m).y;
    }
    width(value?: number, changeMode?: ChangeMode) {
        if (arguments.length !== 0) {
            var s = new Point(value / this.width(), 1);
            var o = this.viewMatrix().transformPoint(this.boundaryRect().centerLeft());
            var resizeOptions = new ResizeOptions(true, false, false, true);
            this.applyScaling(s, o, resizeOptions, changeMode);
        }

        if (this.hasBadTransform()) {
            return 0;
        }

        let gm = this.globalViewMatrix();
        let scaling = 1;
        if (!gm.isTranslatedOnly()) {
            scaling = this.gdm().scaling.x || 1;
        }
        return Math.abs(this.boundaryRect().width * scaling);
    }
    height(value?: number, changeMode?: ChangeMode) {
        if (arguments.length !== 0) {
            var s = new Point(1, value / this.height());
            var o = this.viewMatrix().transformPoint(this.boundaryRect().centerTop());
            var resizeOptions = new ResizeOptions(true, false, false, true);
            this.applyScaling(s, o, resizeOptions, changeMode);
        }

        if (this.hasBadTransform()) {
            return 0;
        }

        let gm = this.globalViewMatrix();
        let scaling = 1;
        if (!gm.isTranslatedOnly()) {
            scaling = this.gdm().scaling.y || 1;
        }
        return Math.abs(this.boundaryRect().height * scaling);
    }
    angle(value?: number, changeMode?: ChangeMode) {
        if (arguments.length !== 0) {
            this.applyRotation(value - this.angle(), this.center(), false, changeMode);
        }
        return this.getRotation(true);
    }
    boundaryRect(value?: IRect): IRect {
        if (value !== undefined) {
            this.setProps({ br: value });
        }
        return this.props.br;
    }
    right() {
        return this.position().x + this.width();
    }
    bottom() {
        return this.position().y + this.height();
    }
    outerHeight() {
        let margin = this.margin();
        return this.height() + margin.top + margin.bottom;
    }
    outerWidth() {
        let margin = this.margin();
        return this.width() + margin.left + margin.right;
    }
    locked(value?: boolean) {
        if (value !== undefined) {
            this.setProps({ locked: value });
        }
        return this.props.locked;
    }
    clipDragClone(value) {
        return this.field("_clipDragClone", value, false);
    }
    isTemporary(value?) {
        return this.field("_isTemporary", value, false);
    }
    hitVisible(directSelection: boolean) {
        if (this.locked() || !this.visible() || this.hasBadTransform()) {
            return false;
        }
        let parent = this.parent();
        if (!parent) {
            return false;
        }
        if (directSelection) {
            return true;
        }
        return !parent.lockedGroup() || parent.activeGroup();
    }
    hitTransparent() {
        return false;
    }
    canSelect(value?: boolean) {
        return this.field("_canSelect", value, true);
    }
    visible(value?: boolean, mode?: ChangeMode) {
        if (arguments.length) {
            this.setProps({ visible: value }, mode);
        }
        return this.props.visible;
    }
    autoPosition(value?: string) {
        return this.field("_autoPosition", value, "center");
    }
    allowSnapping(value?: boolean) {
        return this.field("_allowSnapping", value, true);
    }
    tags(value) {
        return this.field("_tags", value, '');
    }
    crazySupported(value) {
        return this.field("_crazySupported", value, true);
    }
    customScale(value) {
        let res = this.field("_customScale", value, false);
        if (value !== undefined) {
            this.resetGlobalViewCache();
        }

        return res;
    }
    fill(value?: Brush) {
        if (value !== undefined) {
            this.setProps({ fill: value });
        }
        return this.props.fill;
    }
    stroke(value?: Brush): Brush {
        if (value !== undefined) {
            this.setProps({ stroke: value });
        }
        return this.props.stroke;
    }
    strokePosition(value?: StrokePosition): StrokePosition {
        if (value !== undefined) {
            this.setProps({ strokePosition: value });
        }
        return this.props.strokePosition;
    }
    strokeWidth(value?: number): number {
        if (value !== undefined) {
            this.setProps({ strokeWidth: value });
        }
        return this.props.strokeWidth;
    }
    dashPattern(value?: any) {
        if (value !== undefined) {
            this.setProps({ dashPattern: value });
        }
        if (typeof this.props.dashPattern === 'string') {
            switch (this.props.dashPattern) {
                case 'solid':
                    return null;
                case 'dotted':
                    return [1, 1];
                case 'dashed':
                    return [4, 2];
            }
        }
        return this.props.dashPattern;
    }
    selectFrameVisible() {
        return true;
    }
    field(name, value, defaultValue?: any) {
        if (value !== undefined) {
            this.runtimeProps[name] = value;
        }
        var res = this.runtimeProps[name];
        return res !== undefined ? res : defaultValue;
    }
    clipSelf(value?: boolean) {
        if (value !== undefined) {
            this.setProps({ overflow: Overflow.Clip });
        }
        return this.props.overflow === Overflow.Clip;
    }
    overflow(value?: Overflow) {
        if (value !== undefined) {
            this.setProps({ overflow: value });
        }
        return this.props.overflow;
    }
    parent(value?: IDataNode): any {
        var parent = super.parent.apply(this, arguments);
        if (arguments.length) {
            this.resetGlobalViewCache(true);
        }
        return parent;
    }
    opacity(value?: number) {
        if (value !== undefined) {
            this.setProps({ opacity: value });
        }
        return this.props.opacity;
    }
    minWidth(/*Number*/value: number) {
        if (value !== undefined) {
            this.setProps({ minWidth: value });
        }
        return this.props.minWidth;
    }
    minHeight(/*Number*/value: number) {
        if (value !== undefined) {
            this.setProps({ minHeight: value });
        }
        return this.props.minHeight;
    }
    maxWidth(/*Number*/value: number) {
        if (value !== undefined) {
            this.setProps({ maxWidth: value });
        }
        return this.props.maxWidth;
    }
    maxHeight(/*Number*/value) {
        if (value !== undefined) {
            this.setProps({ maxHeight: value });
        }
        return this.props.maxHeight;
    }
    canDrag(value?) {
        return this.field("_canDrag", value, true);
    }
    flipVertical(value) {
        if (value !== undefined) {
            this.setProps({ flipVertical: value });
        }
        return this.props.flipVertical;
    }
    flipHorizontal(value) {
        if (value !== undefined) {
            this.setProps({ flipHorizontal: value });
        }
        return this.props.flipHorizontal;
    }
    clipMask(value?: boolean) {
        if (value !== undefined) {
            this.setProps({ clipMask: value });
        }
        return this.props.clipMask;
    }

    scalableX(value) {
        return this.field("_scalableX", value, true);
    }
    scalableY(value) {
        return this.field("_scalableY", value, true);
    }
    isDropSupported(value) {
        return true;
    }
    showResizeHint() {
        return true;
    }
    showDropTarget() {
        return true;
    }
    activeInPreview(value) {
        return this.field("_activeInPreview", value, false);
    }
    cloneWhenDragging() {
        return false;
    }
    visibleWhenDrag(value) {
        if (value !== undefined) {
            this.setProps({ visibleWhenDrag: value });
        }
        return this.props.visibleWhenDrag;
    }
    standardBackground(value?: boolean) {
        return this.field("_standardBackground", value, true);
    }
    name(value?: string) {
        if (value !== undefined) {
            this.setProps({ name: value });
        }
        return this.props.name;
    }
    constraints(value?: IConstraints): IConstraints {
        if (value !== undefined) {
            this.setProps({ constraints: value });
        }
        return this.props.constraints;
    }
    resize(props) {
        this.prepareAndSetProps(props);
    }
    initialResize(parent) {
        switch (this.autoPosition()) {
            case "top":
            case "bottom":
            case "middle":
            case "fill":
                this.width(parent.width());
                break;
        }
    }
    getType() {
        return "UIElement";
    }
    getDescription() {
        return _(this.t);
    }
    applyVisitor(callback, useLogicalChildren?: boolean, parent?: any) {
        return callback(this);
    }
    canAccept(elements, autoInsert, allowMoveInOut?: boolean) {
        return false;
    }
    canBeAccepted(element) {
        return true;
    }
    canConvertToPath() {
        return false;
    }
    sizeProperties() {
        return {
            width: this.props.width,
            height: this.props.height
        };
    }
    onLayerDraw(layer, context, environment) {

    }
    registerForLayerDraw(layerNum: LayerTypes) {
        Environment.view.registerForLayerDraw(layerNum, this);
    }
    unregisterForLayerDraw(layerNum: LayerTypes) {
        Environment.view.unregisterForLayerDraw(layerNum, this);
    }
    margin(value?: Box) {
        if (value !== undefined) {
            this.setProps({ margin: value });
        }
        return this.props.margin;
    }

    isDescendantOrSame(element: UIElement): boolean {
        let current = this;
        do {
            if (current.isSameAs(element)) {
                return true;
            }
            current = current.parent();
        } while (current && current !== NullContainer as DataNode);

        return false;
    }
    isSameAs(element) {
        return element === this;
    }
    horizontalAlignment(value) {
        if (value !== undefined) {
            this.setProps({ horizontalAlignment: value });
        }
        return this.props.horizontalAlignment;
    }
    verticalAlignment(value) {
        if (value !== undefined) {
            this.setProps({ verticalAlignment: value });
        }
        return this.props.verticalAlignment;
    }
    dockStyle(value) {
        if (value !== undefined) {
            this.setProps({ dockStyle: value });
        }
        return this.props.dockStyle;
    }
    index() {
        return this.parent().children.indexOf(this);
    }
    each(callback) {
        each([this], callback);
    }
    clone() {
        let clone = ObjectFactory.fromType(this.t, this.cloneProps());
        clone.id(createUUID());
        return clone;
    }
    sourceId(id?) {
        if (arguments.length > 0) {
            this.setProps({ sourceId: id });
        }

        return this.props.sourceId || this.props.id;
    }
    mirrorClone() {
        let clone = ObjectFactory.fromType(this.t, this.cloneProps());
        return clone;
    }
    cursor() {
        return null;
    }
    resizeDimensions(value?: any) {
        if (value) {
            value = +value; // convert from string, to make it work with property editor
        }
        return this.field("_resizeDimensions", value, ResizeDimension.Both);
    }
    init(values, isDefault?, selector?) {
        let props = {};
        let that = this;
        for (let name in values) {
            if (name[0] === "_") {
                this.field(name, values[name]);
            } else if (name[0] === "#") {
                let elementName = name.substr(1);
                this.findSingleChildOrDefault(function (e) {
                    if (e.name() === elementName) {
                        e.init(values[name]);
                    }
                })
            } else if (name[0] === "$") {

            } else {
                let value = values[name];
                if (value && value.t) {
                    let type = value.t;
                    let defaultFunc = TypeDefaults[type];
                    let defaults = {};
                    if (defaultFunc) {
                        defaults = defaultFunc();
                    }
                    value = Object.assign(defaults, value);
                }

                props[name] = value;
            }
        }
        this.setProps(props);
        return this;
    }
    fromJSON(data) {
        //TODO: bring back migrations when necessary
        // if (data.props.version !== this.__version__) {
        //     if (!Migrations.runMigrations(this.t, data, this.__version__)) {
        //         throw "Migration not successful: " + this.t + " from " + data.props.version + " to " + this.__version__;
        //     }
        //     App.Current.migrationUpgradeNotifications.push(this);
        // }
        this.__state = 1;

        super.fromJSON.apply(this, arguments);

        delete this.__state;
        return this;
    }
    getEditableProperties(recursive) {
        return PropertyMetadata.getEditableProperties(this.systemType(), recursive);
    }
    displayName() {
        return this.name() || this.displayType();
    }
    displayType(): string {
        return UIElement.displayType(this.t);
    }
    static displayType(t: string): string {
        return "type." + t;
    }
    systemType() {
        return this.t;
    }
    findMetadata() {
        return PropertyMetadata.findAll(this.systemType());
    }
    findPropertyDescriptor(propName): PropertyDescriptor {
        return PropertyMetadata.find(this.systemType(), propName);
    }
    quickEditProperty(value) {
        return this.field("_quickEditProperty", value, "");
    }
    toString() {
        return this.t;
    }
    getPath() {
        let path = [this];
        let e = this;
        while (typeof e.parent === "function" && e.parent()) {
            path.push(e.parent());
            e = e.parent();
        }
        return this.id() + ': ' + map(path.reverse(), function (x) {
            return x.t;
        }).join("->");
    }

    dispose() {
        if (this._isDisposed) {
            return;
        }
        //this.onresize.clearSubscribers();
        //delete this.onresize;

        delete this.props;

        this._isDisposed = true;
    }
    isDisposed() {
        return this._isDisposed;
    }
    rotationOrigin(global) {
        return this.center(global);
    }
    center(global?: boolean): ICoordinate {
        let m = global ? this.globalViewMatrix() : this.viewMatrix();
        return m.transformPoint(this.boundaryRect().center());
    }
    hitElement(position, scale, predicate?, directSelection?): UIElement {
        if (!this.hitVisible(directSelection)) {
            return null;
        }
        if (predicate) {
            if (!predicate(this, position, scale)) {
                return null;
            }
        }
        else if (!this.hitTest(position, scale)) {
            return null;
        }

        return this;
    }
    isAncestor(element) {
        let parent = this.parent();
        while (parent) {
            if (parent === element) {
                return true;
            }

            parent = parent.parent();
        }

        return false;
    }
    isOrphaned() {
        return this.parent() === NullContainer;
    }
    /** Defines an element which is never added to the model, but is still drawn and could have visible properties */
    isPhantom(): boolean {
        return false;
    }
    canBeRemoved() {
        return true;
    }

    page() {
        let element;
        let nextParent = this;
        do {
            element = nextParent;
            nextParent = !nextParent.isDisposed() ? nextParent.parent() : null;
        } while (nextParent && (nextParent instanceof UIElement) && !(nextParent === NullContainer as DataNode));

        if (element && (element.t === Types.ArtboardPage)) {
            return element;
        }
        return null;
    }

    contextMenu(context, menu) {
    }
    tryDelete(): boolean {
        return true;
    }
    move(rect) {
        this.resize(rect);
    }
    exportPatch() {
    }
    applyPatch(data) {
    }
    selectionFrameType() {
        return DefaultFrameType;
    }
    createSelectionFrame(view) {
        if (!this.selectFrameVisible()) {
            return {
                element: this,
                frame: false,
                points: []
            }
        }

        if (view.prototyping()) {
            return {
                element: this,
                frame: true,
                fill: true,
                points: []
            }
        }

        let points = [];

        if (this.canRotate()) {
            points.push(
                {
                    type: RotateFramePoint,
                    moveDirection: PointDirection.Any,
                    x: 0,
                    y: 0,
                    offsetX: -RotateFramePoint.PointSize2,
                    offsetY: -RotateFramePoint.PointSize2,
                    cursor: 0,
                    update: function (p, x, y, w, h, element, scale) {
                        p.x = x;
                        p.y = y;
                    }
                },
                {
                    type: RotateFramePoint,
                    moveDirection: PointDirection.Any,
                    x: 0,
                    y: 0,
                    offsetX: RotateFramePoint.PointSize2,
                    offsetY: -RotateFramePoint.PointSize2,
                    cursor: 2,
                    update: function (p, x, y, w, h, element, scale) {
                        p.x = x + w;
                        p.y = y;
                    }
                },
                {
                    type: RotateFramePoint,
                    moveDirection: PointDirection.Any,
                    x: 0,
                    y: 0,
                    offsetX: RotateFramePoint.PointSize2,
                    offsetY: RotateFramePoint.PointSize2,
                    cursor: 4,
                    update: function (p, x, y, w, h, element, scale) {
                        p.x = x + w;
                        p.y = y + h;
                    }
                },
                {
                    type: RotateFramePoint,
                    moveDirection: PointDirection.Any,
                    x: 0,
                    y: 0,
                    offsetX: -RotateFramePoint.PointSize2,
                    offsetY: RotateFramePoint.PointSize2,
                    cursor: 6,
                    update: function (p, x, y, w, h, element, scale) {
                        p.x = x;
                        p.y = y + h;
                    }
                }
            );
        }

        switch (this.resizeDimensions()) {
            case ResizeDimension.Both:
                points.push(
                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Any,
                        x: 0,
                        y: 0,
                        cursor: 3,
                        rv: [1, 1],
                        update: function (p, x, y, w, h) {
                            p.x = x + w;
                            p.y = y + h;
                        }
                    },
                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Any,
                        x: 0,
                        y: 0,
                        cursor: 7,
                        rv: [-1, -1],
                        update: function (p, x, y, w, h) {
                            p.x = x;
                            p.y = y;
                        }
                    },
                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Any,
                        x: 0,
                        y: 0,
                        cursor: 1,
                        rv: [1, -1],
                        update: function (p, x, y, w, h) {
                            p.x = x + w;
                            p.y = y;
                        }
                    },

                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Any,
                        x: 0,
                        y: 0,
                        cursor: 5,
                        rv: [-1, 1],
                        update: function (p, x, y, w, h) {
                            p.x = x;
                            p.y = y + h;
                        }
                    },
                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Vertical,
                        x: 0,
                        y: 0,
                        cursor: 0,
                        rv: [0, -1],
                        update: function (p, x, y, w, h) {
                            p.x = x + w / 2;
                            p.y = y;
                        }
                    },
                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Horizontal,
                        x: 0,
                        y: 0,
                        cursor: 2,
                        rv: [1, 0],
                        update: function (p, x, y, w, h) {
                            p.x = x + w;
                            p.y = y + h / 2;
                        }
                    },
                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Vertical,
                        x: 0,
                        y: 0,
                        cursor: 4,
                        rv: [0, 1],
                        update: function (p, x, y, w, h) {
                            p.x = x + w / 2;
                            p.y = y + h;
                        }
                    },
                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Horizontal,
                        x: 0,
                        y: 0,
                        cursor: 6,
                        rv: [-1, 0],
                        update: function (p, x, y, w, h) {
                            p.x = x;
                            p.y = y + h / 2;
                        }
                    }
                );
                break;
            case ResizeDimension.Vertical:
                points.push(
                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Vertical,
                        x: 0,
                        y: 0,
                        cursor: 0,
                        rv: [0, -1],
                        update: function (p, x, y, w, h) {
                            p.x = x + w / 2;
                            p.y = y;
                        }
                    },
                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Vertical,
                        x: 0,
                        y: 0,
                        cursor: 4,
                        rv: [0, 1],
                        update: function (p, x, y, w, h) {
                            p.x = x + w / 2;
                            p.y = y + h;
                        }
                    }
                );
                break;
            case ResizeDimension.Horizontal:
                points.push(
                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Horizontal,
                        x: 0,
                        y: 0,
                        cursor: 2,
                        rv: [1, 0],
                        update: function (p, x, y, w, h) {
                            p.x = x + w;
                            p.y = y + h / 2;
                        }
                    },
                    {
                        type: ResizeFramePoint,
                        moveDirection: PointDirection.Horizontal,
                        x: 0,
                        y: 0,
                        cursor: 6,
                        rv: [-1, 0],
                        update: function (p, x, y, w, h) {
                            p.x = x;
                            p.y = y + h / 2;
                        }
                    }
                );
                break;
        }

        return {
            element: this,
            frame: true,
            points: points
        };
    }

    // returns deffered object
    animate(properties, duration, options, progressCallback) {
        let animationValues = [];
        options = extend({}, options);
        options.duration = duration || 0;
        let that = this;
        for (let propName in properties) {
            let newValue = properties[propName];
            let accessor = (function (name) {
                return function prop_accessor(value?: any) {
                    if (arguments.length > 0) {
                        that.setProps({ [name]: value });
                    }
                    return that.props[name];
                }
            })(propName);

            let currentValue = accessor();

            animationValues.push({ from: currentValue, to: newValue, accessor: accessor });
        }

        let group = new AnimationGroup(animationValues, options, progressCallback);
        Environment.view.animationController.registerAnimationGroup(group);

        return group.promise();
    }

    styleId(value?) {
        if (arguments.length > 0) {
            this.setProps({ styleId: value });
        }

        return this.props.styleId;
    }

    getStyleProps() {
        let stylePropNames = PropertyMetadata.getStylePropertyNamesMap(this.systemType(), 1);
        let res = {};
        for (let name in stylePropNames) {
            res[name] = this.props[name];
        }
        return res;
    }

    propertyMetadata() {
        return PropertyMetadata.findAll(this.t);
    }

    getNonRepeatableProps(newProps?: any) {
        return ["id", "name", "visible"];
    }

    toSVG() {
        // let ctx = new C2S(this.width(), this.height());
        // this.draw(ctx);
        // return ctx.getSerializedSvg();
    }

    contextBarAllowed() {
        return true;
    }

    static fromTypeString(type, parameters) {
        return ObjectFactory.fromType(type, parameters);
    }

    static construct(type, ...args: any[]) {
        return ObjectFactory.construct.apply(ObjectFactory, arguments);
    }

    static fromType(type, parameters) {
        return ObjectFactory.fromType(type, parameters);
    }

    static fromJSON(data) {
        return ObjectFactory.fromJSON(data);
    }
}

UIElement.prototype.t = Types.Element;
UIElement.prototype.__version__ = 1;

PropertyMetadata.registerForType(UIElement, {
    margin: {
        displayName: "Margin",
        type: "box",
        defaultValue: Box.Default
    },
    dockStyle: {
        displayName: "Dock style",
        type: "dropdown",
        options: {
            size: 1 / 2,
            items: [
                { name: "Left", value: DockStyle.Left },
                { name: "Top", value: DockStyle.Top },
                { name: "Right", value: DockStyle.Right },
                { name: "Bottom", value: DockStyle.Bottom },
                { name: "Fill", value: DockStyle.Fill },
                { name: "None", value: DockStyle.None }
            ]
        },
        defaultValue: DockStyle.None
    },
    horizontalAlignment: {
        displayName: "Horizontal alignment",
        type: "dropdown",
        options: {
            size: 1,
            items: [
                { name: "Left", value: HorizontalAlignment.Left },
                { name: "Right", value: HorizontalAlignment.Right },
                { name: "Stretch", value: HorizontalAlignment.Stretch },
                { name: "Center", value: HorizontalAlignment.Center },
                { name: "None", value: HorizontalAlignment.None }
            ]
        },
        defaultValue: HorizontalAlignment.None
    },
    verticalAlignment: {
        displayName: "Vertical alignment",
        type: "dropdown",
        options: {
            size: 1,
            items: [
                { name: "Top", value: VerticalAlignment.Top },
                { name: "Bottom", value: VerticalAlignment.Bottom },
                { name: "Stretch", value: VerticalAlignment.Stretch },
                { name: "Middle", value: VerticalAlignment.Middle },
                { name: "None", value: VerticalAlignment.None }
            ]
        },
        defaultValue: VerticalAlignment.None
    },
    visibleWhenDrag: {
        defaultValue: false
    },
    width: {
        displayName: "Width",
        type: "numeric",
        computed: true,
        options: {
            step: 1,
            miniStep: .1
        }
    },
    height: {
        displayName: "Height",
        type: "numeric",
        computed: true,
        options: {
            step: 1,
            miniStep: .1
        }
    },
    name: {
        displayName: "Name",
        type: "text",
        defaultValue: ""
    },
    x: {
        displayName: "Left",
        type: "numeric",
        computed: true,
        options: {
            step: 1,
            miniStep: .1
        }
    },
    y: {
        displayName: "Top",
        type: "numeric",
        computed: true,
        options: {
            step: 1,
            miniStep: .1
        }
    },
    m: {
        defaultValue: Matrix.Identity
    },
    br: {
        defaultValue: Rect.Zero
    },
    locked: {
        displayName: "Locked",
        type: "toggle",
        options: {
            icon: "ico-prop_lock"
        },
        defaultValue: false
    },
    visible: {
        defaultValue: true
    },
    hitTransparent: {
        defaultValue: false
    },
    opacity: {
        displayName: "Opacity",
        type: "numeric",
        defaultValue: 1,
        style: 1,
        customizable: true,
        options: {
            step: .1,
            min: 0,
            max: 1
        }
    },
    angle: {
        displayName: "Angle",
        type: "numeric",
        options: {
            min: -360,
            max: 360,
            step: 1,
            miniStep: .1
        },
        customizable: true,
        computed: true
    },
    flipHorizontal: {
        defaultValue: false
    },
    flipVertical: {
        defaultValue: false
    },
    constraints: {
        displayName: "@constraints",
        type: "constraints",
        defaultValue: Constraints.Default
        // options: {
        //     items: [
        //         {field: "left", icon: "ico-prop_pin-left"},
        //         {field: "top", icon: "ico-prop_pin-top"},
        //         {field: "right", icon: "ico-prop_pin-right"},
        //         {field: "bottom", icon: "ico-prop_pin-bottom"}
        //     ],
        //     size: 3 / 4
        // }
    },
    overflow: {
        defaultValue: Overflow.Visible
    },
    fill: {
        displayName: "Fill",
        type: "brush",
        defaultValue: Brush.Empty,
        style: 1,
        customizable: true
    },
    stroke: {
        displayName: "Stroke",
        type: "brush",
        defaultValue: Brush.Empty,
        style: 1,
        customizable: true
    },
    strokePosition: {
        displayName: "@strokePosition",
        type: "multiSwitch",
        defaultValue: StrokePosition.Inside,
        style: 1,
        customizable: true,
        options: {
            items: [
                { value: StrokePosition.Center, icon: "ico-prop_stroke-center" },
                { value: StrokePosition.Inside, icon: "ico-prop_stroke-inside" },
                { value: StrokePosition.Outside, icon: "ico-prop_stroke-outside" },
            ],
            size: 1 / 2
        }
    },
    strokeWidth: {
        displayName: "@strokeWidth",
        type: "numeric",
        defaultValue: 1,
        style: 1,
        customizable: true,
        options: {
            step: 1,
            min: 0
        }
    },
    dashPattern: {
        displayName: "@strokePattern",
        type: "strokePattern",
        defaultValue: 'solid',
        options: {},
        items: [
            { value: 'solid' },
            { value: 'dashed' },
            { value: 'dotted' }
        ],
    },
    clipMask: {
        displayName: "Use as mask",
        type: "checkbox",
        defaultValue: false
    },
    prototyping: {
        defaultValue: false
    },
    styleId: {
        displayName: 'Shared style',
        type: "styleName",
        defaultValue: null
    },
    bad: {
        defaultValue: false
    },
    groups: function () {
        return [
            {
                label: "Layout",
                properties: ["x", "y", "width", "height", "angle"]
            },
            // {
            //     label: "Style",
            //     properties: ["styleId"]
            // },
            {
                label: "Appearance",
                properties: ["fill", "stroke", "opacity"]
            },
            {
                label: "@constraints",
                properties: ["constraints"]
            },
            // {
            //     label: "@advanced",
            //     properties: ["clipMask"]
            // }
            // ,
            // {
            //     label: "Margin",
            //     properties: ["margin"]
            // }
        ];
    },
    prepareVisibility: function (element: UIElement) {
        if (Environment.view.prototyping()) {
            let res = {};
            for (let name in element.props) {
                res[name] = false;
            }
            return res;
        }
        var parent = element.parent();
        var strategy = parent.arrangeStrategy();
        return {
            dockStyle: strategy === ArrangeStrategies.Dock,
            constraints: strategy === ArrangeStrategies.Canvas
        };
    }
});
