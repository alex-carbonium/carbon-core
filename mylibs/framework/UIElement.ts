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
import { Event as RuntimeEvent } from "../code/runtime/Event"
import {
    Types,
    DockStyle,
    ArrangeStrategies,
    Overflow,
    HorizontalAlignment,
    VerticalAlignment,
    PointDirection
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
import { KeyboardState, IConstraints } from "carbon-basics";
import { IUIElementProps, IUIElement, IContainer } from "carbon-model";
import { ICoordinate, ISize } from "carbon-geometry";
import { ChangeMode, LayerType, IPrimitiveRoot, IRect, IMatrix, ResizeDimension, IDataNode, IPoint, UIElementFlags, LayoutProps, RenderFlags, RenderEnvironment, IContext, PropDescriptor, Origin, StrokePosition, IProxySource, ProxyDefinition, DataBag, IDisposable, IView } from "carbon-core";
import ExtensionPoint from "./ExtensionPoint";
import CoreIntl from "../CoreIntl";
import BoundaryPathDecorator from "../decorators/BoundaryPathDecorator";
import RenderPipeline from "./render/RenderPipeline";
import ContextCacheManager from "./render/ContextCacheManager";
import { RuntimeProxy } from "../code/runtime/RuntimeProxy";
import { ModelFactory } from "../code/runtime/ModelFactory";
import { PropertyAnimation } from "./animation/PropertyAnimation";

require("../migrations/All");

export interface IUIElementRuntimeProps {
    ctxl: number;
    primitivePath: string[];
    primitiveRootKey: string;
}

const PointDistanceVisibleLevel2 = 15;
const PointDistanceVisibleLevel1 = 30;

// constructor
export default class UIElement<TProps extends IUIElementProps = IUIElementProps> extends DataNode<TProps> implements IUIElement<TProps>, IProxySource {
    [name: string]: any;
    props: TProps;
    decorators: any[];

    constructor() {
        super(false);

        //this.stopwatch = new stopwatch();

        if (DEBUG) {
            this.id = (createUUID(this.t));
        }
        else {
            this.id = (createUUID());
        }
        this.parent = NullContainer;
        this.runtimeProps.ctxl = 1;
    }
    invalidate(layerMask?) {
        if (layerMask === undefined) {
            layerMask = this.runtimeProps.ctxl;
        }

        let parent = this.parent;
        if (parent) {
            parent.invalidate(layerMask);
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
            ctxl: 1
        }
    }
    _roundValue(value) {
        return Math.round(value);
    }
    prepareProps(changes, mode?) {
        super.prepareProps.apply(this, arguments);
        if (changes.styleId !== undefined) {
            extend(changes, styleManager.getStyle(changes.styleId, 1).props);
        }

        if (changes.fill && typeof changes.fill === 'string') {
            changes.fill = Brush.createFromCssColor(changes.fill);
        }

        if (changes.stroke && typeof changes.stroke === 'string') {
            changes.stroke = Brush.createFromCssColor(changes.stroke);
        }

        let hasBr = changes.hasOwnProperty("br");
        if (hasBr && !(changes.br instanceof Rect)) {
            changes.br = Rect.fromObject(changes.br);
        }
    }

    setProperties(props) {
        this.prepareAndSetProps(clone(props), ChangeMode.Self);
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

    hasFlags(flags: UIElementFlags): boolean {
        return (this.props.flags & flags) !== 0;
    }
    addFlags(flags: UIElementFlags) {
        this.setProps({ flags: this.props.flags | flags });
    }
    removeFlags(flags: UIElementFlags) {
        if (this.hasFlags(flags)) {
            this.setProps({ flags: this.props.flags & ~flags });
        }
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

    getPropertiesSnapshot(props) {
        let keys = Object.keys(props);
        let snapshot = {};
        for (var key of keys) {
            snapshot[key] = this.props[key];
        }

        return snapshot;
    }

    refreshMinSizeConstraints() {
        delete this.runtimeProps.minWidth;
        delete this.runtimeProps.minHeight;

        var parent: any = this.parent;
        if (parent && parent !== NullContainer) {
            parent.refreshMinSizeConstraints();
        }
    }

    propsUpdated(newProps, oldProps, mode?) {
        if (newProps.hasOwnProperty("m") || newProps.hasOwnProperty("br")) {
            this.resetGlobalViewCache();
            if (mode === ChangeMode.Model) {
                this.saveLastGoodTransformIfNeeded(oldProps);
            }
        }

        if (newProps.hasOwnProperty("constraints")) {
            this.refreshMinSizeConstraints();
        }

        this.clearRenderingCache();

        //raise events after all caches are updated
        super.propsUpdated.apply(this, arguments);
        this.invalidate(this.runtimeProps.ctxl);
    }
    propsPatched(patchType, propName, item) {
        super.propsPatched.apply(this, arguments);
        this.clearRenderingCache();
        this.invalidate(this.runtimeProps.ctxl);
    }

    clearRenderingCache() {
        if (this.runtimeProps.rc) {
            ContextCacheManager.free(this);
        }
        var parent: any = this.parent;
        parent && parent.clearRenderingCache();
    }

    hasCachedRender() {
        return !!this.runtimeProps.rc;
    }

    selectLayoutProps(global?: boolean): LayoutProps {
        let m = global ? this.globalViewMatrix() : this.viewMatrix();
        return {
            br: this.boundaryRect(),
            m
        };
    }
    saveOrResetLayoutProps(mode: ChangeMode): boolean {
        if (!this.runtimeProps.origLayout) {
            this.runtimeProps.origLayout = this.selectLayoutProps();
            return true;
        }
        if (this.hasBadTransform()) {
            this.setProps({ bad: false, lgbr: null, lgm: null }, mode);
        }
        this.setProps(this.runtimeProps.origLayout, mode);
        return false;
    }

    clearSavedLayoutProps() {
        delete this.runtimeProps.origLayout;
    }

    selectDisplayProps(names, metadata = this.findMetadata()): any {
        let values = {};
        for (let i = 0; i < names.length; i++) {
            let propertyName = names[i];
            let descriptor: PropDescriptor = metadata[names[i]];
            if (descriptor.computed) {
                values[propertyName] = this[propertyName];
            }
            else {
                values[propertyName] = this.props[propertyName];
            }
        }
        return values;
    }
    getDisplayPropValue(propertyName: string, descriptor: PropDescriptor = null): any {
        if (!descriptor) {
            let metadata = this.findMetadata();
            if (metadata) {
                descriptor = metadata[propertyName];
            }
        }
        if (descriptor && descriptor.computed) {
            return this[propertyName];
        }

        return this.props[propertyName];
    }
    setDisplayProps(changes, changeMode, metadata = this.findMetadata()) {
        let names = Object.keys(changes);
        for (let i = 0; i < names.length; i++) {
            let propertyName = names[i];
            let descriptor: PropDescriptor = metadata[propertyName];
            if (descriptor.computed) {
                ExtensionPoint.invoke(this, "_" + propertyName, [changes[propertyName], changeMode]);
                delete changes[propertyName];
            }
        }

        this.prepareAndSetProps(changes, changeMode);
    }
    getAffectedDisplayProperties(changes): string[] {
        let properties = Object.keys(changes);
        if (changes.hasOwnProperty("br") || changes.hasOwnProperty("m")) {
            if (properties.indexOf("position") === -1) {
                properties.push("position");
            }
            if (properties.indexOf("size") === -1) {
                properties.push("size");
            }
            if (properties.indexOf("rotation") === -1) {
                properties.push("rotation");
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
            || changes.hasOwnProperty("height")
            || changes.hasOwnProperty("margin")
            || changes.hasOwnProperty("padding")
            || changes.hasOwnProperty("size")
            || changes.hasOwnProperty("position")
            || changes.hasOwnProperty("arrangeStrategy")
            || changes.hasOwnProperty("visible");
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
    translate(deltaX: number, deltaY: number, mode?: ChangeMode) {
        let vector = Point.allocate(deltaX, deltaY);
        this.applyTranslation(vector, false, mode);
        vector.free();
    }
    translateInRotationDirection(deltaX: number, deltaY: number, mode?: ChangeMode) {
        let vector = Point.allocate(deltaX, deltaY);
        this.applyDirectedTranslation(vector, mode);
        vector.free();
    }
    translateInWorld(deltaX: number, deltaY: number, mode?: ChangeMode) {
        let vector = Point.allocate(deltaX, deltaY);
        this.applyGlobalTranslation(vector, false, mode);
        vector.free();
    }
    applyTranslation(t: ICoordinate, withReset?: boolean, mode?: ChangeMode) {
        if (withReset) {
            this.saveOrResetLayoutProps(ChangeMode.Self);
        }
        this.applyTransform(Matrix.create().translate(t.x, t.y), false, mode);
    }

    applyDirectedTranslation(t, mode?: ChangeMode) {
        this.applyTransform(Matrix.create().translate(t.x, t.y), true, mode);
    }

    applyGlobalTranslation(t, withReset?: boolean, changeMode?: ChangeMode) {
        if (withReset) {
            this.saveOrResetLayoutProps(ChangeMode.Self);
        }
        let m = this.globalViewMatrix().prependedWithTranslation(t.x, t.y);
        m = this.parent.globalViewMatrixInverted().appended(m);
        this.setTransform(m, changeMode);
    }

    rotate(angle: number, origin: Origin, mode?: ChangeMode) {
        let originPoint = this.allocateOriginPoint(origin);
        this.applyRotation(angle, originPoint, false, mode);
        originPoint.free();
    }
    getRotation(global: boolean = false) {
        let decomposed = global ? this.gdm() : this.dm();
        return -decomposed.rotation;
    }
    applyRotation(angle, o, withReset?: boolean, mode?: ChangeMode) {
        if (withReset) {
            this.saveOrResetLayoutProps(ChangeMode.Self);
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

    applyScaling2(scaleX: number, scaleY: number, origin: Origin, mode?: ChangeMode) {
        let vector = Point.allocate(scaleX, scaleY);
        let originPoint = this.allocateOriginPoint(origin);
        this.applyScaling(vector, originPoint, null, mode);
        vector.free();
        originPoint.free();
    }

    get scaleX(): number {
        return this.props.scaleX;
    }

    set scaleX(value: number) {
        this.prepareAndSetProps({ scaleX: value });
    }

    get scaleY(): number {
        return this.props.scaleY;
    }

    set scaleY(value: number) {
        this.prepareAndSetProps({ scaleY: value });
    }

    get scale(): number {
        return this.props.scaleX;
    }

    set scale(value: number) {
        this.prepareAndSetProps({ scaleX: value, scaleY: value });
    }

    applyScaling(s, o, options?: ResizeOptions, changeMode?: ChangeMode) {
        options = options || ResizeOptions.Once;
        if (options.reset) {
            this.saveOrResetLayoutProps(ChangeMode.Self);
        }

        if (options.sameDirection || !this.isRotated()) {
            this.applySizeScaling(s, o, options, changeMode);
            return true;
        }

        this.applyMatrixScaling(s, o, options, changeMode);

        if (options.final) {
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

    private allocateOriginPoint(origin: Origin) {
        let br = this.boundaryRect();
        let o = Point.allocate(0, 0);
        switch (origin) {
            case Origin.TopLeft:
                o.x = br.x;
                o.y = br.y;
                break;
            case Origin.TopCenter:
                o.x = br.x + br.width / 2;
                o.y = br.y;
                break;
            case Origin.TopRight:
                o.x = br.x + br.width;
                o.y = br.y;
                break;
            case Origin.MiddleLeft:
                o.x = br.x;
                o.y = br.y + br.height / 2;
                break;
            case Origin.Center:
                o.x = br.x + br.width / 2;
                o.y = br.y + br.height / 2;
                break;
            case Origin.MiddleRight:
                o.x = br.x + br.width;
                o.y = br.y + br.height / 2;
                break;
            case Origin.BottomLeft:
                o.x = br.x;
                o.y = br.y + br.height;
                break;
            case Origin.BottomCenter:
                o.x = br.x + br.width / 2;
                o.y = br.y + br.height;
                break;
            case Origin.BottomRight:
                o.x = br.x + br.width;
                o.y = br.y + br.height;
                break;
            default:
                throw new Error("Unsupported origin " + origin);
        }

        let m = this.viewMatrix() as Matrix;
        m.transformPointMutable(o);
        return o;
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
    roundBoundingBoxToPixelEdge(mode?: ChangeMode): boolean {
        let rounded = false;
        let bb = this.getBoundingBox();
        let bb1 = bb.roundPosition();
        if (bb1 !== bb) {
            let t = bb1.topLeft().subtract(bb.topLeft());
            this.applyTranslation(t, false, mode);
            bb1 = bb1.translate(t.x, t.y);
            rounded = true;
        }
        let bb2 = bb1.roundSize();
        if (bb2 !== bb1) {
            let s = new Point(bb2.width / bb1.width, bb2.height / bb1.height);
            let canRound = this.shouldApplyViewMatrix();
            this.applyScaling(s, bb1.topLeft(), ResizeOptions.Default.withRounding(canRound).withReset(false), mode);
            rounded = true;
        }
        return rounded;
    }

    arrange() {
    }
    performArrange(event?, mode?: ChangeMode) {
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
    // draggingEnter(event) {
    // }
    // draggingLeft(event) {
    // }
    getDropData(pos, element) {
        return null;
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
            xs: [Math.round(x), Math.round(origin.x), Math.round(x + width)],
            ys: [Math.round(y), Math.round(origin.y), Math.round(y + height)],
        };
    }

    hasPath() {
        return this.drawPath !== undefined;
    }

    allowRearrange() {
        return false;
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

        for (let i = this.decorators.length - 1; i >= 0; i--) {
            if (this.decorators[i].t === type.prototype.t) {
                this.decorators[i].detach();
                this.decorators.splice(i, 1);
            }
        }

        Invalidate.requestInteractionOnly();
    }

    removed(mode: ChangeMode) {
    }

    removing() {
        return true;
    }
    autoSelectOnPaste() {
        return true;
    }

    get position() {
        return this.getBoundingBox().topLeft();
    }

    set position(value: ICoordinate) {
        this._position(value, ChangeMode.Model);
    }

    _position(value?: ICoordinate, changeMode?: ChangeMode) {
        let t = Point.create(value.x - this.x, value.y - this.y);
        this.applyGlobalTranslation(t, false, changeMode);
    }

    get size(): ISize {
        return {
            width: this.width,
            height: this.height
        }
    }

    set size(value: ISize) {
        this._size(value, ChangeMode.Model);
    }

    _size(value:ISize, changeMode?:ChangeMode) {
        this.setProps({ br:(this.boundaryRect()
            .withSize(
                value.width === undefined ? this.width : value.width,
                value.height === undefined ? this.height : value.height))
            }, changeMode);
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
        if (!this.stroke) {
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

    getHitTestBox(view: IView, includeMargin: boolean = false, includeBorder: boolean = true): IRect {
        var rect = this.boundaryRect();
        let scale = view.scale();
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

    hitTest(/*Point*/point, view, boundaryRectOnly = false) {
        if (!this.visible || this.hasBadTransform()) {
            return false;
        }
        let rect = this.getHitTestBox(view, false);
        return this.hitTestLocalRect(rect, point, view);
    }

    protected hitTestLocalRect(rect: IRect, point: IPoint, view: IView) {
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

        this.refreshMinSizeConstraints();
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
    viewMatrixInverted(): Matrix {
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
    isInViewport() {
        return areRectsIntersecting(Environment.view.viewportRect(), this.getBoundingBoxGlobal(true));
    }

    drawExtras(context: IContext, environment: RenderEnvironment) {
    }

    draw(context: IContext, environment: RenderEnvironment) {
        if (this.hasBadTransform()) {
            return;
        }
        let markName;
        if (params.perf) {
            markName = "draw " + this.displayName() + " - " + this.id;
            performance.mark(markName);
        }

        var br = this.boundaryRect(),
            w = br.width,
            h = br.height;

        if (environment && (environment.flags & RenderFlags.CheckViewport) && !this.isInViewport()) {
            if (params.perf) {
                performance.measure(markName, markName);
            }
            return;
        }

        if (!context.beginElement(this, environment)) {
            context.endElement(this);

            if (params.perf) {
                performance.measure(markName, markName);
            }
            return;
        }

        var saveCount = context.saveCount;

        let oldFill = this.props.fill;
        let oldStroke = this.props.stroke;
        if (environment.fill) {
            this.props.fill = environment.fill;
        }
        if (environment.stroke) {
            this.props.stroke = environment.stroke;
        }

        context.save();
        context.globalAlpha = this.opacity;

        // this.applyViewMatrix(context);

        var pipeline = RenderPipeline.createFor(this, context, environment);

        if (environment.flags & RenderFlags.DisableCaching) {
            pipeline.disableCache();
        }

        pipeline.out((context, environment) => {
            this.clip(context);
            this.drawSelf(context, w, h, environment);
        });

        pipeline.done();

        context.restore();

        if (environment.fill) {
            this.props.fill = oldFill;
        }
        if (environment.stroke) {
            this.props.stroke = oldStroke;
        }

        context.endElement(this);
        // this.drawDecorators(context, w, h, environment);

        if (params.perf) {
            performance.measure(markName, markName);
        }

        if (context.saveCount !== saveCount) {
            throw "Unbalanced save/restore";
        }
    }

    drawSelf(context, w, h, environment: RenderEnvironment) {
    }

    drawBoundaryPath(context, round = true) {
        BoundaryPathDecorator.drawBoundaryPath(context, this, round);
    }

    primitiveRoot(): IPrimitiveRoot & IUIElement {
        if (this.runtimeProps.primitiveRoot) {
            return this.runtimeProps.primitiveRoot;
        }
        let parent = this.parent;
        let root = parent ? parent.primitiveRoot() : null;
        this.runtimeProps.primitiveRoot = root;
        return root;
    }
    isFinalRoot(): boolean {
        return true;
    }
    _findFinalRoot() {
        let root = this.primitiveRoot();
        while (root && !root.isFinalRoot() && root.parent) {
            root = root.parent.primitiveRoot();
        }
        return root;
    }
    protected findNextRoot(): IPrimitiveRoot & IUIElement {
        var parent = this.parent;
        if (!parent) {
            return null;
        }
        return parent.primitiveRoot();
    }

    primitivePath() {
        let path = this.primitiveRoot().primitivePath().slice();
        path[path.length - 1] = this.id;
        return path;
    }

    globalViewMatrix(): IMatrix {
        if (!this.runtimeProps.globalViewMatrix) {
            let parent = this.parent;
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
        let current: any = this;
        let matrices = [];
        while (current !== root) {
            matrices.push(current.viewMatrix());
            current = current.parent;
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
                this.drawBoundaryPath(context, false);
                context.clip();
            }
            finally {
                GlobalMatrixModifier.pop();
            }
        }
    }
    mousemove(event) {
        if (this.editor !== null) {
            event.handled = true;
        }
    }
    mouseup(event) {
    }
    mousedown(event) {
    }
    dblclick(event, scale: number) {
    }
    click(event) {
    }
    allowCaching() {
        return this.runtimeProps.ctxl !== 2 && !this.disableRenderCaching();
    }
    disableRenderCaching(value?: boolean) {
        if (arguments.length) {
            this.runtimeProps.disableRenderCaching = value;
        }

        return this.runtimeProps.disableRenderCaching;
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
        let parent = this.parent;
        if (!parent || parent === NullContainer) {
            return null;
        }

        return parent.children.indexOf(this);
    }

    mode(value?: any): any {

    }

    get x() {
        let root = this._findFinalRoot();
        if (!root || root === this) {
            return this.getBoundingBox().x;
        }
        let m = root.globalViewMatrixInverted().appended(this.globalViewMatrix());
        return this.transformBoundingRect(this.boundaryRect(), m).x;
    }

    set x(value: number) {
        this._x(value);
    }

    _x(value?: number, changeMode?: ChangeMode) {
        let t = Point.create(value - this.x, 0);
        this.applyGlobalTranslation(t, false, changeMode);
    }

    get y() {
        let root = this._findFinalRoot();
        if (!root || root === this) {
            return this.getBoundingBox().y;
        }
        let m = root.globalViewMatrixInverted().appended(this.globalViewMatrix());
        return this.transformBoundingRect(this.boundaryRect(), m).y;
    }

    set y(value: number) {
        this._y(value);
    }

    _y(value: number, changeMode?: ChangeMode) {
        let t = Point.create(0, value - this.y);
        this.applyGlobalTranslation(t, false, changeMode);
    }

    set width(value: number) {
        this._width(value);
    }

    _width(value: number, changeMode?: ChangeMode) {
        var s = new Point(value / this.width, 1);
        var o = this.viewMatrix().transformPoint(this.boundaryRect().centerLeft());
        var resizeOptions = new ResizeOptions(true, false, false, true);
        this.applyScaling(s, o, resizeOptions, changeMode);
    }

    get width(): number {
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



    set height(value: number) {
        this._height(value);
    }

    _height(value: number, changeMode?: ChangeMode) {
        var s = new Point(1, value / this.height);
        var o = this.viewMatrix().transformPoint(this.boundaryRect().centerTop());
        var resizeOptions = new ResizeOptions(true, false, false, true);
        this.applyScaling(s, o, resizeOptions, changeMode);
    }

    get height() {
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

    get angle() {
        return this.getRotation(true);
    }

    set angle(value: number) {
        this._angle(value);
    }

    _angle(value?: number, changeMode?: ChangeMode) {
        this.applyRotation(value - this.angle, this.center(), false, changeMode);
    }

    set rotation(value:any) {
        this._rotation(value, ChangeMode.Model)
    }

    get rotation() {
        return {angle:this.angle};
    }

    _rotation(value:any, changeMode?:ChangeMode) {
        this._angle(value.angle, changeMode);
    }

    boundaryRect(value?: IRect): IRect {
        if (value !== undefined) {
            this.setProps({ br: value });
        }
        return this.props.br;
    }
    right() {
        return this.position.x + this.width;
    }
    bottom() {
        return this.position.y + this.height;
    }
    outerHeight() {
        let margin = this.margin();
        return this.height + margin.top + margin.bottom;
    }
    outerWidth() {
        let margin = this.margin();
        return this.width + margin.left + margin.right;
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
    hitVisible(directSelection?: boolean, forceLocked?: boolean) {
        if ((this.locked() && !forceLocked) || !this.visible || this.hasBadTransform()) {
            return false;
        }
        let parent = this.parent;
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

    get visible(): boolean {
        return this.props.visible;
    }

    set visible(value: boolean) {
        this._visible(value)
    }

    _visible(value?: boolean, mode?: ChangeMode) {
        this.prepareAndSetProps({ visible: value }, mode);
    }

    get useInCode(): boolean {
        return this.props.useInCode;
    }

    set useInCode(value: boolean) {
        this._useInCode(value)
    }

    _useInCode(value?: boolean, mode?: ChangeMode) {
        this.prepareAndSetProps({ useInCode: value }, mode);
    }

    visibleInChain() {
        var e: any = this;
        while (e && e !== NullContainer) {
            if (!e.visible) {
                return false;
            }

            e = e.parent;
        }

        return true;
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
    get fill(): Brush {
        return this.props.fill as any;
    }

    set fill(value: Brush) {
        this.prepareAndSetProps({ fill: value });
    }

    get stroke(): Brush {
        return this.props.stroke as any;
    }

    set stroke(value: Brush) {
        this.prepareAndSetProps({ stroke: value });
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
    canFill() {
        return true;
    }
    canStroke() {
        return true;
    }
    dashPattern(value?: any) {
        if (value !== undefined) {
            this.prepareAndSetProps({ dashPattern: value });
        }
        return this.props.dashPattern;
    }
    selectFrameVisible(value?) {
        if (value !== undefined) {
            this.runtimeProps.frameVisible = value;
        }

        if (this.runtimeProps.hasOwnProperty("frameVisible")) {
            return this.runtimeProps.frameVisible;
        }

        return true;
    }
    field(name, value?, defaultValue?: any) {
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

    get parent(): IContainer {
        return super.parent as any;
    }

    set parent(value: IContainer) {
        super.parent = value;
        this.resetGlobalViewCache(true);
    }

    get opacity(): number {
        return this.props.opacity;
    }

    set opacity(value: number) {
        this.prepareAndSetProps({ opacity: value });
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
        if (arguments.length === 1) {
            return this.field("_canDrag", value);
        }
        let canDrag = this.field("_canDrag", value, true);
        let primitiveRoot = this.primitiveRoot();
        if (!primitiveRoot) {
            return canDrag;
        }
        return primitiveRoot.isEditable() && canDrag;
    }
    // flipVertical(value) {
    //     if (value !== undefined) {
    //         this.setProps({ flipVertical: value });
    //     }
    //     return this.props.flipVertical;
    // }
    // flipHorizontal(value) {
    //     if (value !== undefined) {
    //         this.setProps({ flipHorizontal: value });
    //     }
    //     return this.props.flipHorizontal;
    // }
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
    showResizeHint() {
        return true;
    }
    activeInPreview(value) {
        return this.field("_activeInPreview", value, false);
    }
    visibleWhenDrag(value) {
        if (value !== undefined) {
            this.setProps({ visibleWhenDrag: value });
        }
        return this.props.visibleWhenDrag;
    }
    set name(value: string) {
        this.prepareAndSetProps({ name: value });
    }

    get name(): string {
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
                this.width = parent.width;
                break;
        }
    }
    getType() {
        return "UIElement";
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
    onLayerDraw(layer, context, environment: RenderEnvironment) {

    }
    registerForLayerDraw(layerNum: LayerType) {
        Environment.view.registerForLayerDraw(layerNum, this);
    }
    unregisterForLayerDraw(layerNum: LayerType) {
        Environment.view.unregisterForLayerDraw(layerNum, this);
    }
    margin(value?: Box) {
        if (value !== undefined) {
            this.setProps({ margin: value });
        }
        return this.props.margin;
    }

    isDescendantOrSame(element: IUIElement): boolean {
        let current: any = this;
        do {
            if (current.isSameAs(element)) {
                return true;
            }
            current = current.parent;
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
        return this.parent.children.indexOf(this);
    }
    each(callback) {
        each([this], callback);
    }
    clone() {
        let newProps = this.cloneProps();
        newProps.id = createUUID();
        let clone = ObjectFactory.fromType(this.t, newProps);
        clone.applyVisitor(e => e.runtimeProps.ctxl = this.runtimeProps.ctxl);
        clone.runtimeProps.allowCache = this.runtimeProps.allowCache;
        clone.runtimeProps.rc = this.runtimeProps.rc;
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
        clone.applyVisitor(e => e.runtimeProps.ctxl = this.runtimeProps.ctxl);
        clone.runtimeProps.allowCache = this.runtimeProps.allowCache;
        clone.runtimeProps.rc = this.runtimeProps.rc;
        return clone;
    }

    runtimeProxy() {
        return RuntimeProxy.wrap(this);
    }

    cursor() {
        return null;
    }
    resizeDimensions(value?: any) {
        return this.field("_resizeDimensions", value, ResizeDimension.Both);
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
        var name = this.name || CoreIntl.label(this.displayType());

        if (this.hasFlags(UIElementFlags.SymbolBackground)) {
            name += " (background)";
        }
        if (this.hasFlags(UIElementFlags.SymbolText)) {
            name += " (text)";
        }

        return name;
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
    findPropertyDescriptor(propName): PropDescriptor {
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
        while (typeof e.parent === "function" && e.parent) {
            path.push(e.parent);
            e = e.parent;
        }
        return this.id + ': ' + map(path.reverse(), function (x) {
            return x.t;
        }).join("->");
    }

    dispose() {
        if (this._isDisposed) {
            return;
        }

        if (this.runtimeProps.disposables) {
            this.runtimeProps.disposables.dispose();
        }

        RuntimeProxy.release(this);

        delete this.props;
        delete this.runtimeProps;

        super.dispose();
    }
    rotationOrigin(global) {
        return this.center(global);
    }
    center(global?: boolean): ICoordinate {
        let m = global ? this.globalViewMatrix() : this.viewMatrix();
        return m.transformPoint(this.boundaryRect().center());
    }

    hitElement(position, view, predicate?, directSelection?): IUIElement {
        if (!this.hitVisible(directSelection)) {
            return null;
        }
        if (predicate) {
            if (!predicate(this, position, view)) {
                return null;
            }
        }
        else if (!this.hitTest(position, view)) {
            return null;
        }

        return this;
    }

    hasParent() {
        let parent = this.parent;
        return parent && parent !== NullContainer;
    }

    isAncestor(element) {
        let parent = this.parent;
        while (parent) {
            if (parent === element) {
                return true;
            }

            parent = parent.parent;
        }

        return false;
    }
    isInTree() {
        let primitiveRoot = this.primitiveRoot();
        return primitiveRoot && primitiveRoot !== NullContainer;
    }
    canBeRemoved() {
        return true;
    }

    page() {
        let element;
        let nextParent: any = this;
        do {
            element = nextParent;
            nextParent = !nextParent.isDisposed() ? nextParent.parent : null;
        } while (nextParent && (nextParent instanceof UIElement) && !(nextParent === NullContainer as DataNode));

        if (element && (element.t === Types.ArtboardPage)) {
            return element;
        }
        return null;
    }

    contextMenu(context, menu) {
    }

    delete() {
        this.parent.remove(this);
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
                    },
                    visible: function (p, frame, w, h, scale) {
                        return (w * scale > PointDistanceVisibleLevel2 || h * scale > PointDistanceVisibleLevel2);
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
                    },
                    visible: function (p, frame, w, h, scale) {
                        return (w * scale > PointDistanceVisibleLevel2 && h * scale > PointDistanceVisibleLevel2);
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
                    },
                    visible: function (p, frame, w, h, scale) {
                        return true;
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
                    },
                    visible: function (p, frame, w, h, scale) {
                        return (w * scale > PointDistanceVisibleLevel2 && h * scale > PointDistanceVisibleLevel2);
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
                        },
                        visible: function (p, frame, w, h, scale) {
                            return true;
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
                        },
                        visible: function (p, frame, w, h, scale) {
                            return (w * scale > PointDistanceVisibleLevel2 || h * scale > PointDistanceVisibleLevel2)
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
                        },
                        visible: function (p, frame, w, h, scale) {
                            return (w * scale > PointDistanceVisibleLevel2 && h * scale > PointDistanceVisibleLevel2)
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
                        },
                        visible: function (p, frame, w, h, scale) {
                            return (w * scale > PointDistanceVisibleLevel2 && h * scale > PointDistanceVisibleLevel2)
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
                        },
                        visible: function (p, frame, w, h, scale) {
                            return (w * scale > PointDistanceVisibleLevel1 && h * scale > PointDistanceVisibleLevel2);
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
                        },
                        visible: function (p, frame, w, h, scale) {
                            return (w * scale > PointDistanceVisibleLevel2 && h * scale > PointDistanceVisibleLevel1);
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
                        },
                        visible: function (p, frame, w, h, scale) {
                            return (w * scale > PointDistanceVisibleLevel1 && h * scale > PointDistanceVisibleLevel2);
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
                        },
                        visible: function (p, frame, w, h, scale) {
                            return (w * scale > PointDistanceVisibleLevel2 && h * scale > PointDistanceVisibleLevel1);
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
                        ,
                        visible: function (p, frame, w, h, scale) {
                            return (w * scale > PointDistanceVisibleLevel1 && h * scale > PointDistanceVisibleLevel2);
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
                        },
                        visible: function (p, frame, w, h, scale) {
                            return true;
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
                        },
                        visible: function (p, frame, w, h, scale) {
                            return (w * scale > PointDistanceVisibleLevel2 && h * scale > PointDistanceVisibleLevel1);
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
                        },
                        visible: function (p, frame, w, h, scale) {
                            return true;
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
    animate(properties, options, progressCallback) {
        let animation = new PropertyAnimation(this, properties, options, progressCallback);
        return animation.start();
    }

    get compilationUnitId() {
        return this.id;
    }

    registerEventHandler(name: string, callback: (data?: DataBag) => (void | boolean | Promise<void | boolean>)): IDisposable {
        let events = this.runtimeProps.events = this.runtimeProps.events || {};
        name = name.toLowerCase();
        let event: RuntimeEvent = events[name] = events[name] || new RuntimeEvent();
        return event.registerHandler(callback);
    }

    raiseEvent(name: string, data?: DataBag): Promise<void | boolean> {
        return this.raiseEventAsync(name, data);
    }

    private async raiseEventAsync(name: string, data?: DataBag): Promise<void | boolean> {
        let events = this.runtimeProps.events;
        let res;
        if (events) {
            name = name.toLowerCase();
            let event: RuntimeEvent = events[name];
            if (event) {
                res = await event.raise(data);
            }
        }

        if (res !== false) {
            let parent = this.parent;
            if (parent && parent !== NullContainer) {
                return await (parent as any).raiseEventAsync(name, data);
            }
        }

        return;
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

    proxyDefinition(): ProxyDefinition {
        var metadata = this.propertyMetadata();
        if (metadata.proxyDefinition) {
            return metadata.proxyDefinition();
        }

        return { props: [], rprops: [], methods: [], mixins: [] };
    }

    getNonRepeatableProps(newProps?: any) {
        return ["id", "name", "visible"];
    }

    toSVG() {
        // let ctx = new C2S(this.width, this.height);
        // this.draw(ctx);
        // return ctx.getSerializedSvg();
    }

    contextBarAllowed() {
        return true;
    }

    enableGroupLocking() {
        return false;
    }
    unlockGroup() {
        if (this.enableGroupLocking()) {
            this.activeGroup(false);
            this.runtimeProps.unlocked = true;
            return true;
        }
        return false;
    }
    lockGroup() {
        if (this.enableGroupLocking()) {
            this.activeGroup(false);
            this.runtimeProps.unlocked = false;
        }
    }
    activeGroup(value?) {
        if (arguments.length === 1) {
            this.runtimeProps.activeGroup = value;
        }
        return this.runtimeProps.activeGroup;
    }

    lockedGroup() {
        return this.enableGroupLocking() && !this.runtimeProps.unlocked;
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

    static getCombinedBoundingBoxGlobal(elements: IUIElement[]) {
        if (elements.length === 0) {
            return Rect.Zero;
        }
        if (elements.length === 1) {
            return elements[0].getBoundingBoxGlobal();
        }

        let rect = Rect.fromObject(elements[0].getBoundingBoxGlobal());
        for (let i = 1; i < elements.length; ++i) {
            rect.combineMutable(elements[i].getBoundingBoxGlobal());
        }
        return rect;
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
        defaultValue: HorizontalAlignment.Stretch
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
        defaultValue: VerticalAlignment.Stretch
    },
    visibleWhenDrag: {
        defaultValue: false
    },
    position: {
        displayName: "@position",
        type: "position",
        computed: true
    },
    size: {
        displayName: "@size",
        type: "size",
        computed: true
    },
    rotation: {
        displayName: "@rotation",
        type: "rotation",
        computed: true
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
        type: "opacity",
        defaultValue: 1,
        style: 1,
        customizable: true,
        options: {
            step: 0.01,
            min: 0,
            max: 1,
            uom: '%'
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
    // flipHorizontal: {
    //     defaultValue: false
    // },
    // flipVertical: {
    //     defaultValue: false
    // },
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
        type: "fills",
        defaultValue: Brush.Empty,
        style: 1,
        customizable: true
    },
    stroke: {
        displayName: "Stroke",
        type: "strokes",
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
        defaultValue: [],
        options: {},
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
    useInCode: {
        displayName: "@useInCode",
        type: "checkbox",
        defaultValue: false
    },
    flags: {
        defaultValue: 0
    },
    proxyDefinition(): ProxyDefinition {
        return {
            rprops: ["name", "id", "parent"], // readonly props
            props: ["x", "y", "width", "height", "angle", "visible", "fill", "stroke", "opacity"], // read/write props
            methods: ["animate", "boundaryRect", "clone", "center", "setProperties", "getPropertiesSnapshot", "registerEventHandler", "raiseEvent"],
            mixins: ["draggable"]
        }
    },
    groups: function () {
        return [
            {
                label: "",
                id: "layout",
                properties: ["position", "size", "rotation"]
            },
            {
                label: "@constraints",
                properties: ["constraints"]
            },
            // {
            //     label: "Style",
            //     properties: ["styleId"]
            // },
            {
                label: "Appearance",
                properties: ["opacity", "fill", "stroke"]
            },

            {
                label: "@advanced",
                properties: ["useInCode"]
            }
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
        var parent: any = element.parent;
        var strategy = parent.arrangeStrategy();
        return {
            dockStyle: strategy === ArrangeStrategies.Dock,
            constraints: strategy === ArrangeStrategies.Canvas
        };
    }
});
