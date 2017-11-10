import { Types, ArrangeStrategies, Overflow, DropPositioning } from "./Defs";
import ArrangeStrategy from "./arrangeStrategy/ArrangeStrategy";
import ContextPool from "./render/ContextPool";
import CorruptedElement from "./CorruptedElement";
import Environment from "../environment";
import PropertyMetadata from "./PropertyMetadata";
import UIElement from './UIElement';
import QuadAndLock from './QuadAndLock';
import logger from '../logger';
import Matrix from '../math/matrix';
import Rect from '../math/rect';
import Brush from './Brush';
import Box from './Box';
import NullContainer from './NullContainer';
import UserSettings from '../UserSettings';
import { KeyboardState, ChangeMode, HorizontalConstraint, VerticalConstraint } from "carbon-basics";
import { IContainerProps, IUIElement, IContainer } from "carbon-model";
import { IMatrix } from "carbon-geometry";
import ExtensionPoint from "./ExtensionPoint";
import RenderPipeline from "./render/RenderPipeline";
import params from "params";
import BoundaryPathDecorator from "../decorators/BoundaryPathDecorator";
import GlobalMatrixModifier from "./GlobalMatrixModifier";
import { RenderEnvironment, RenderFlags, IContext } from "carbon-core";

export default class Container<TProps extends IContainerProps = IContainerProps> extends UIElement<TProps> implements IContainer<IContainerProps> {
    props: TProps;
    children: UIElement[];

    constructor() {
        super();
        this.children = [];
    }
    performArrange(event?: any, mode?: ChangeMode) {
        let e = event || {};
        e.newRect = this.boundaryRect();
        e.oldRect = e.oldRect || e.newRect;
        this.arrange(e, mode);
    }
    arrangeStrategy(value) {
        if (value !== undefined) {
            this.setProps({ arrangeStrategy: value })
        }
        return this.props.arrangeStrategy;
    }
    arrangeStrategyInstance() {
        return ArrangeStrategy.findStrategy(this);
    }
    applySizeScaling(s, o, options, mode) {
        let oldRect = this.boundaryRect();
        super.applySizeScaling.apply(this, arguments);
        this.performArrange({ oldRect, options }, mode);
    }

    skew(): void {
        this.children.forEach(x => x.skew());
    }

    fillBackground(context, l, t, w, h, environment: RenderEnvironment) {
        if (Brush.canApply(this.fill())) {
            context.save();
            this.globalViewMatrix().applyToContext(context);
            context.beginPath();
            context.rect(l, t, w, h);
            Brush.fill(this.fill(), context, l, t, w, h);
            context.restore();
        }
    }
    strokeBorder(context, w, h, environment: RenderEnvironment) {
        let stroke = this.stroke();
        if (Brush.canApply(stroke)) {
            context.save();
            this.globalViewMatrix().applyToContext(context);
            context.beginPath();
            let dash = this.dashPattern();
            if (dash) {
                context.setLineDash(dash);
            }
            context.lineWidth = this.strokeWidth();
            let br = this.boundaryRect();
            context.rect(br.x, br.y, br.width, br.height);
            Brush.stroke(stroke, context, 0, 0, w, h);
            context.restore();
        }
        else {
            if (!Brush.canApply(this.fill()) && this.showBoundaryWhenTransparent()) {
                let scale = Environment.view.scale();
                GlobalMatrixModifier.pushPrependScale();
                context.save();
                context.scale(1/scale, 1/scale);
                context.setLineDash(UserSettings.general.boundaryDash);
                context.strokeStyle = UserSettings.general.boundaryStroke;
                context.beginPath();
                BoundaryPathDecorator.drawBoundaryPath(context, this);
                context.stroke();
                context.restore();
                GlobalMatrixModifier.pop();
            }
        }
    }

    showBoundaryWhenTransparent(): boolean {
        return false;
    }

    shouldApplyViewMatrix() {
        return false;
    }
    saveOrResetLayoutProps(changeMode): boolean {
        let res = UIElement.prototype.saveOrResetLayoutProps.apply(this, arguments);
        this.children.forEach(e => e.saveOrResetLayoutProps(changeMode));
        return res;
    }
    clearSavedLayoutProps() {
        super.clearSavedLayoutProps();
        this.children.forEach(e => e.clearSavedLayoutProps());
    }

    restoreLastGoodTransformIfNeeded() {
        super.restoreLastGoodTransformIfNeeded();
        this.children.forEach(x => x.restoreLastGoodTransformIfNeeded());
    }

    drawSelf(context, w, h, environment: RenderEnvironment) {
        this.fillBackground(context, 0, 0, w, h, environment);
        this.drawChildren(context, w, h, environment);
        this.strokeBorder(context, w, h, environment);
    }

    minWidth() {
        if (this.runtimeProps.minWidth === undefined) {
            this._calculateMinSize();
        }

        return this.runtimeProps.minWidth;
    }

    minHeight() {
        if (this.runtimeProps.minHeight === undefined) {
            this._calculateMinSize();
        }

        return this.runtimeProps.minHeight;
    }

    _calculateMinSize() {
        var minWidth = 0;
        var minHeight = 0;
        var width = this.width();
        var height = this.height();

        for (var c of this.children) {
            let childMinSize = this._calculateChildMinSize(c, width, height);
            if (childMinSize.width) {
                minWidth = Math.max(minWidth, childMinSize.width);
            }

            if (childMinSize.height) {
                minHeight = Math.max(minHeight, childMinSize.height);
            }
        }

        this.runtimeProps.minWidth = minWidth;
        this.runtimeProps.minHeight = minHeight;
    }

    _calculateChildMinSize(child, width, height) {
        var br = child.boundaryRect();
        var mw = child.minWidth();
        var mh = child.minHeight();
        let c = child.constraints();

        if (c.h === HorizontalConstraint.LeftRight) {
            mw += br.x;
            mw += (width - br.x - br.width);
        }

        if (c.v === VerticalConstraint.TopBottom) {
            mh += br.y;
            mh += (height - br.y - br.height);
        }

        return { width: mw, height: mh };
    }

    autoGrow(dw, dh, mode: ChangeMode, exclude?: IUIElement) {
        let br = this.props.br;
        let nbr = br.withSize(br.width + dw, br.height + dh);
        var c = this.constraints();
        if (c.h !== HorizontalConstraint.LeftRight) {
            dw = 0;
        }

        if (c.v !== VerticalConstraint.TopBottom) {
            dh = 0;
        }

        if (dw || dh) {
            this.parent().autoGrow(dw, dh, mode, this);
        }

        this.setProps({ br: nbr }, mode);
        this.performArrange({ newRect: nbr, oldRect: br, exclude, autoGrow: true }, mode);
    }

    modifyContextBeforeDrawChildren(context) {

    }

    renderMaskedElements(context, mask, i, items, environment: RenderEnvironment) {
        if (!(environment.flags && RenderFlags.Final) && mask.drawPath) {
            context.beginPath();
            if (mask.shouldApplyViewMatrix()) {
                mask.globalViewMatrix().applyToContext(context);
            }

            mask.drawPath(context, mask.width(), mask.height());
            context.clip("evenodd");
            if (mask.shouldApplyViewMatrix()) {
                mask.globalViewMatrixInverted().applyToContext(context);
            }

            this.renderAfterMask(context, items, i, environment);
            return;
        }

        let clipingRect = mask.getBoundingBoxGlobal(false, true);
        let p1 = environment.pageMatrix.transformPoint2(clipingRect.x, clipingRect.y);
        let p2 = environment.pageMatrix.transformPoint2(clipingRect.x + clipingRect.width, clipingRect.y + clipingRect.height);
        p1.x = Math.max(0, 0 | p1.x * environment.contextScale);
        p1.y = Math.max(0, 0 | p1.y * environment.contextScale);
        p2.x = 0 | p2.x * environment.contextScale + .5;
        p2.y = 0 | p2.y * environment.contextScale + .5;

        let sw = p2.x - p1.x;
        let sh = p2.y - p1.y;

        let offContext = ContextPool.getContext(sw, sh, environment.contextScale, true);
        offContext.relativeOffsetX = -p1.x;
        offContext.relativeOffsetY = -p1.y;

        offContext.save();
        offContext.translate(-p1.x, -p1.y);
        environment.setupContext(offContext);

        this.renderAfterMask(offContext, items, i, environment);

        offContext.beginPath();
        if (mask.shouldApplyViewMatrix()) {
            mask.globalViewMatrix().applyToContext(offContext);
        }
        offContext.globalCompositeOperation = "destination-in";
        if (mask.drawPath) {
            mask.drawPath(offContext, mask.width(), mask.height());
            offContext.fillStyle = "black";
            offContext.fill2();
        } else {
            mask.drawSelf(offContext, mask.width(), mask.height(), environment);
        }

        offContext.restore();

        context.resetTransform();
        context.drawImage(offContext.canvas, 0, 0, sw, sh, p1.x, p1.y, sw, sh);
        ContextPool.releaseContext(offContext)
    }

    allowCaching() {
        return !!this.runtimeProps.allowCache && super.allowCaching();
    }

    allowColorOverride(){
        return false;
    }

    draw(context: IContext, environment: RenderEnvironment) {
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

        if (environment && (environment.flags & RenderFlags.CheckViewport) && !this.isInViewport()) {
            if (params.perf) {
                performance.measure(markName, markName);
            }
            return;
        }

        if(!context.beginElement(this, environment)) {
            context.save();
            if (this.children) {
                this.drawChildren(context, w, h, environment);
            }

            context.restore();
            context.endElement(this)

            if (params.perf) {
                performance.measure(markName, markName);
            }
            return;
        }

        let oldFill = this.props.fill;
        let oldStroke = this.props.stroke;
        if(this.allowColorOverride()){
            if (environment.fill) {
                this.props.fill = environment.fill;
            }
            if (environment.stroke) {
                this.props.stroke = environment.stroke;
            }
        }

        context.save();
        context.globalAlpha = this.opacity();

        var pipeline = RenderPipeline.createFor(this, context, environment);

        if(this.opacity() !== 1) {
            pipeline.bufferOutput();
        }

        if(environment.flags & RenderFlags.DisableCaching) {
            pipeline.disableCache();
        }

        pipeline.out((context, environment)=>{
            this.clip(context);
            this.drawSelf(context, w, h, environment);
        });

        pipeline.done();

        context.restore();

        if(this.allowColorOverride()) {
            if (environment.fill) {
                this.props.fill = oldFill;
            }
            if (environment.stroke) {
                this.props.stroke = oldStroke;
            }
        }

        this.drawExtras(context, environment);

        context.endElement(this);

        if (params.perf) {
            performance.measure(markName, markName);
        }
    }
    renderAfterMask(context, items, i, environment: RenderEnvironment) {
        for (; i < items.length; ++i) {
            let child = items[i];

            if (child.visible()) {
                this.drawChildSafe(child, context, environment);
            }
        }
    }

    clone() {
        if (this._cloning) {
            throw "Can't clone, chain contains recursive references";
        }
        this._cloning = true;
        let clone = UIElement.prototype.clone.apply(this, arguments);

        for (let i = 0; i < this.children.length; i++) {
            let e = this.children[i];
            clone.add(e.clone(), ChangeMode.Self);
        }
        delete this._cloning;
        return clone;
    }

    mirrorClone() : Container {
        let clone = UIElement.prototype.mirrorClone.apply(this, arguments);

        for (let i = 0; i < this.children.length; i++) {
            let e = this.children[i];
            clone.add(e.mirrorClone(), ChangeMode.Self);
        }

        return clone;
    }

    drawChildren(context, w, h, environment: RenderEnvironment) {
        this.modifyContextBeforeDrawChildren(context);
        this.runtimeProps.mask = null;
        if (this.children) {
            let items = this.children;
            for (let i = 0; i < items.length; ++i) {
                let child = items[i];
                if (child.clipMask()) {
                    this.drawWithMask(context, child, i, environment);
                    this.runtimeProps.mask = child;
                    break;
                }
                if (child.visible()) {
                    this.drawChildSafe(child, context, environment);
                }
            }
        }
    }

    // getBoundingBoxGlobal(includeMargin: boolean = false): IRect {
    //     if(this.runtimeProps.mask && this.lockedGroup()) {
    //         return this.runtimeProps.mask.getBoundingBoxGlobal(includeMargin);
    //     }

    //     return super.getBoundingBoxGlobal(includeMargin);
    // }

    // getBoundingBox(includeMargin: boolean = false) : IRect {
    //     if(this.runtimeProps.mask && this.lockedGroup()) {
    //         return this.runtimeProps.mask.getBoundingBox(includeMargin);
    //     }

    //     return super.getBoundingBox(includeMargin);
    // }

    // hitTest(/*Point*/point, scale, boundaryRectOnly = false) {
    //      if(this.runtimeProps.mask && this.lockedGroup()) {
    //         return this.runtimeProps.mask.hitTest(point, scale, boundaryRectOnly);
    //     }

    //     return super.hitTest(point, scale, boundaryRectOnly);
    // }

    // getBoundaryRect(includeMargin: boolean = false) : IRect {
    //     let  mask = this.runtimeProps.mask;
    //     if(mask && this.lockedGroup()) {
    //         let  rect = mask.boundaryRect(includeMargin);
    //         let  pos = mask.position();
    //         return new Rect(pos.x, pos.y, rect.width, rect.height);
    //     }

    //     return super.boundaryRect(includeMargin);
    // }

    drawWithMask(context, mask, i, environment: RenderEnvironment) {
        if (mask.visible()) {
            let b = mask.props.stroke;
            mask.props.stroke = null;
            this.drawChildSafe(mask, context, environment);
            mask.props.stroke = b;
        }
        context.save();
        this.renderMaskedElements(context, mask, i, this.children, environment);
        context.restore();
        if (mask.visible()) {
            let b = mask.fill();
            mask.props.fill = null;//({ fill: null }, ChangeMode.Self);
            this.drawChildSafe(mask, context, environment);
            mask.props.fill = b;
        }
    }


    drawChildSafe(child, context, environment: RenderEnvironment) {
        try {
            ExtensionPoint.invoke(child, 'draw', [context, environment]);
        } catch (e) {
            logger.error("Draw error", e);
            if (child.canHandleCorruption()) {
                child.makeCorrupted();
                return;
            }
            let data;
            try {
                data = child.toJSON(true);
            }
            catch (e2) {
                logger.error("toJSON error", e2);
                data = {
                    props: {
                        width: child.width(),
                        height: child.height(),
                        y: child.y(),
                        x: child.x(),
                        id: child.id()
                    }
                }
            }
            let newChild = new CorruptedElement(data);
            newChild.parent(child.parent());
            let items = this.children;
            for (let i = 0; i < items.length; ++i) {
                let c = items[i];
                if (c === child) {
                    items.splice(i, 1, newChild);
                    break;
                }
            }

            ExtensionPoint.invoke(newChild, 'draw', [context, environment]);
        }
    }
    padding(value?: Box) {
        if (value !== undefined) {
            this.setProps({ padding: value })
        }
        return this.props.padding;
    }
    innerHeight() {
        let padding = this.padding();
        return this.height() - padding.top - padding.bottom;
    }
    innerWidth() {
        let padding = this.padding();
        return this.width() - padding.left - padding.right;
    }

    allowMoveOutChildren(value) {
        //should not check on args length
        if (value !== undefined) {
            this.setProps({ allowMoveOutChildren: value })
        }
        return this.props.allowMoveOutChildren;
    }

    /**
     * Defines whether container controls position of all children so that dragging element would not attempt to set it.
     */
    autoPositionChildren(): boolean {
        return false;
    }

    add(/*UIElement*/element, mode?: ChangeMode) {
        return this.insert(element, this.children.length, mode);
    }

    insert(/*UIElement*/element, /*int*/index, mode?: ChangeMode): IUIElement {
        this.acquiredChild(element, mode);

        this.insertChild(element, index, mode);

        return element;
    }

    acquiredChild(child, mode) {
        let oldParent = child.parent();
        if (oldParent && !(oldParent === NullContainer)) {
            oldParent.remove(child, mode);
        }

        child.parent(this);

        this.clearRenderingCache();
        this.invalidate(this.runtimeProps.ctxl);
    }

    flatten() {
        let parent = this.parent();
        let index = this.index();

        for (let i = this.children.length - 1; i >= 0; --i) {
            let e = this.children[i];
            let gm = e.globalViewMatrix();
            this.remove(e);
            parent.insert(e, index);
            e.setTransform(parent.globalMatrixToLocal(gm));
        }

        parent.remove(this);
    }

    /**
     * Moves element from its parent by keeping the global matrix so that element is visually in the same position.
     */
    transferElement(element: IUIElement, index: number, mode?: ChangeMode) {
        let gm = element.globalViewMatrix();
        element.parent().remove(element);
        element.setTransform(this.globalMatrixToLocal(gm));
        this.insert(element, index, mode);
    }

    contains(element) {
        return this.positionOf(element) !== -1;
    }

    positionOf(element) {
        return this.children.indexOf(element);
    }
    count() {
        return this.children.length;
    }
    changePosition(/*UIElement*/element, /*int*/index, mode?) {
        this.changeChildPosition(element, index, mode);
        this.invalidate(this.runtimeProps.ctxl);
    }
    remove(/*UIElement*/element, mode?: ChangeMode) {
        if (element.removing() === false) {
            return;
        }

        this.releasingChild(element);
        let idx = this.removeChild(element, mode);

        element.removed(mode);

        this.clearRenderingCache();
        this.invalidate(this.runtimeProps.ctxl);

        return idx;
    }
    replace(elementFrom, elementTo, mode) {
        let idx = this.positionOf(elementFrom);
        this.remove(elementFrom, mode);
        this.insert(elementTo, idx, mode);
    }
    clear(mode?: ChangeMode) {
        for (let i = 0; i < this.children.length; i++) {
            let child = this.children[i];
            this.releasingChild(child);
            child.trackDeleted(this, i, mode);
        }
        this.children.length = 0;
    }
    canAdd(element) {
        return true;
    }
    canRemove(element) {
        return true;
    }
    canInsert(element, index) {
        return true;
    }


    releasingChild(child) {
        //child.onresize.unbind(this._childResizeHandler);
        child.parent(NullContainer);
    }

    canAccept(elements, autoInsert, allowMoveInOut) {
        return this.primitiveRoot().isEditable() && elements.every(x => x.canBeAccepted(this));
    }
    mousedown(event) {
        super.mousedown.call(this, event); //to hide inplace editor
        this.delegateToChildren("mousedown", event);
    }
    mousemove(event) {
        this.delegateToChildren("mousemove", event);
    }
    mouseup(event) {
        this.delegateToChildren("mouseup", event);
    }
    dblclick(event, scale) {
        this.delegateToChildren("dblclick", event);
    }
    click(event) {
        if (!this.lockedGroup()) {
            this.delegateToChildren("click", event);
        }
    }
    delegateToChildren(name, event) {
        for (let i = this.children.length - 1; i >= 0; --i) {
            let element = this.children[i];
            if (element.hitTest(event, Environment.view.scale())) {
                element[name](event);
                if (event.handled) {
                    break;
                }
            }

        }
    }
    hitElement(/*Point*/position, scale, predicate?, directSelection?) {
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

        let hitElement: UIElement = this.hitTransparent() ? null : this;

        for (let i = this.children.length - 1; i >= 0; --i) {
            let element = this.children[i];
            let newHit = element.hitElement(position, scale, predicate, directSelection);
            if (newHit) {
                hitElement = newHit;
                break;
            }
        }

        return hitElement;
    }
    hitElements(/*Point*/position, scale) {
        let that = this;
        let elements = [];

        this.applyVisitor(function (element) {
            if (that !== element) {
                if (element.hitVisible() && element.hitTest(position, scale) && !element.hitTransparent() && element.canSelect() && !element.locked()) {
                    elements.push(element);
                }
            }
        });

        return elements;
    }
    hitElementDirect(position, scale, predicate?) {
        let result = this.hitElement(position, scale, predicate, true);
        return result;
    }
    select(multiselect?) {
    }
    captureMouse(/*UIElement*/element?: any) {
        Environment.controller.captureMouse(element);
    }
    releaseMouse(/*UIElement*/element?: any) {
        Environment.controller.releaseMouse(element);
    }
    applyVisitor(callback: (element: IUIElement, parent?: IContainer) => boolean | void, useLogicalChildren?: boolean, parent?: any) {
        let stop = false;
        for (let i = this.children.length - 1; i >= 0; --i) {
            let item = this.children[i];
            if (item.applyVisitor(callback, useLogicalChildren, this) === false) {
                stop = true;
                break;
            }
        }
        if (!stop) {
            return callback(this, parent);
        }
        return false;
    }

    applyVisitorTLR(/*Visitor*/callback, useLogicalChildren?: boolean, parent?: any) {
        let stop = callback(this, parent);;
        if (stop === false) {
            return false;
        } else if (stop === true) {
            return;
        }

        for (let l = this.children.length, i = 0; i <l; ++i) {
            let item = this.children[i];
            if (item.applyVisitorTLR(callback, useLogicalChildren, this) === false) {
                stop = true;
                break;
            }
        }

        return !stop;
    }

    findActualParentForAncestorById(elementId) {
        let realParrent = null;
        this.applyVisitor(function (e, p) {
            if (e.id() === elementId) {
                realParrent = p;
                return false;
            }
        });

        return realParrent;
    }

    resetGlobalViewCache(resetPrimitiveRoot?: boolean) {
        UIElement.prototype.resetGlobalViewCache.apply(this, arguments);

        if (this.children) {
            for (let i = this.children.length - 1; i >= 0; --i) {
                let e = this.children[i];
                e.resetGlobalViewCache(resetPrimitiveRoot);
            }
        }
    }
    global2local(/*Point*/pos) {
        let parent = this.parent();
        if (parent === null || !this.globalViewMatrix) {
            return pos;
        }
        let matrix = this.globalViewMatrixInverted();
        return matrix.transformPoint(pos);
    }
    local2global(/*Point*/pos) {
        let parent = this.parent();
        if (parent === null || !this.globalViewMatrix) {
            return pos;
        }

        let matrix = this.globalViewMatrix();
        return matrix.transformPoint(pos);
    }
    globalMatrixToLocal(m: IMatrix): Matrix {
        return this.globalViewMatrixInverted().appended(m);
    }
    arrange(resizeEvent?: any, mode?: ChangeMode) {
        UIElement.prototype.arrange.apply(this, arguments);
        ArrangeStrategy.arrange(this, resizeEvent, mode);
    }
    autoWidth() {
        let overflow = this.overflow();
        return overflow === Overflow.AdjustHorizontal || overflow === Overflow.AdjustBoth || this.autoExpandWidth();
    }
    autoHeight() {
        let overflow = this.overflow();
        return overflow === Overflow.AdjustVertical || overflow === Overflow.AdjustBoth || this.autoExpandHeight();
    }
    autoExpandWidth() {
        let overflow = this.overflow();
        return overflow === Overflow.ExpandHorizontal || overflow === Overflow.ExpandBoth;
    }
    autoExpandHeight() {
        let overflow = this.overflow();
        return overflow === Overflow.ExpandVertical || overflow === Overflow.ExpandBoth;
    }
    autoGrowMode(value) {
        return this.field("_autoGrowMode", value, true);
    }
    dropPositioning(value?:DropPositioning) {
        if (value !== undefined) {
            this.setProps({ dropPositioning: value })
        }
        return this.props.dropPositioning;
    }

    getDropData(pos, element) {
        let width = this.width(),
            height = this.height();

        pos = this.global2local(pos);

        let intervals = [];
        let last = 0;
        let baseLine;

        function calculateBaseLine(intervals, pos, insertIndex?) {
            let minY = Number.MAX_VALUE;
            let lineY = 0;
            for (let i = 0; i < intervals.length; i++) {
                let itr = intervals[i];
                let minCandidate = Math.abs(itr - pos);
                if (minCandidate < minY) {
                    minY = minCandidate;
                    lineY = itr;
                    insertIndex = i;
                }
            }
            return { lineY: lineY, insertIndex: insertIndex };
        }

        let dropPositioning = this.dropPositioning();
        if (dropPositioning === DropPositioning.Vertical) {
            for (let _element of this.children) {
                if(!_element.visible()) {
                    continue;
                }

                if (_element !== element && element.contains && !element.contains(_element)) {
                    let gr = _element.getBoundingBox();
                    intervals.push((last + gr.y) / 2);
                    last = gr.y + gr.height;
                }
            }

            intervals.push((last + height) / 2);

            baseLine = calculateBaseLine(intervals, pos.y);

            let pt1 = this.globalViewMatrix().transformPoint({ x: 5, y: baseLine.lineY });
            let pt2 = this.globalViewMatrix().transformPoint({ x: width - 10, y: baseLine.lineY });
            return {
                x1: pt1.x,
                y1: pt1.y,
                x2: pt2.x,
                y2: pt2.y,
                index: baseLine.insertIndex,
                angle: 0//this.angle()
            }
        } else if (dropPositioning === DropPositioning.Horizontal) {
            for (let _element of this.children) {
                if(!_element.visible()) {
                    continue;
                }

                if (_element !== element && element.contains && !element.contains(_element)) {
                    let gr = _element.getBoundingBox();
                    intervals.push((last + gr.x) / 2);
                    last = gr.x + gr.width;
                }
            }

            intervals.push((last + width) / 2);

            baseLine = calculateBaseLine(intervals, pos.x);

            let pt1 = this.globalViewMatrix().transformPoint({ x: baseLine.lineY, y: 5 });
            let pt2 = this.globalViewMatrix().transformPoint({ x: baseLine.lineY, y: height - 10 });
            return {
                x1: pt1.x,
                y1: pt1.y,
                x2: pt2.x,
                y2: pt2.y,
                index: baseLine.insertIndex,
                angle: 0
            }
        }

        return null;
    }

    global2localDropPosition(pos) {
        return this.global2local(pos);
    }

    findElementByName(name) {
        let element;

        this.applyVisitor(function (el) {
            if (el.name() === name) {
                element = el;
                return false;
            }
        }, false);

        return element;
    }

    getElementById(id) {
        let res = null;
        if (this.id() === id) {
            return this;
        }
        this.applyVisitor(function (el) {
            if (el.id() === id) {
                res = el;
                return false;
            }
        }, false);

        return res;
    }

    findSingleChildOrDefault(predicate) {
        let result = null;
        this.applyVisitor(function (el) {
            if (predicate(el)) {
                result = el;
                return false;
            }
        }, false);

        return result;
    }
    dispose() {
        if (this.isDisposed()) {
            return;
        }

        for (let i = 0; i < this.children.length; i++) {
            let e = this.children[i];
            if (!e.isDisposed()) {
                e.dispose();
            }
        }

        super.dispose.apply(this, arguments)
    }
    toString() {
        return this.t;
    }

    static createCanvas = function () {
        let container = new Container();
        container.arrangeStrategy(ArrangeStrategies.Canvas);
        return container;
    }
    static createStackHorizontal = function () {
        let container = new Container();
        container.setProps({
            arrangeStrategy: ArrangeStrategies.HorizontalStack
        });
        return container;
    }
    static createStackVertical() {
        let container = new Container();
        container.arrangeStrategy(ArrangeStrategies.VerticalStack);
        return container;
    };
    static createDock() {
        let container = new Container();
        container.arrangeStrategy(ArrangeStrategies.Dock);
        return container;
    };
    static createAlign() {
        let container = new Container();
        container.arrangeStrategy(ArrangeStrategies.Align);
        return container;
    }
}

Container.prototype.t = Types.Container;

PropertyMetadata.registerForType(Container, {
    angle: {
        editorArgument: 0,
        useInModel: false,
        editable: false,
        validate: [{ minMax: [0, 0] }]
    },
    arrangeStrategy: {
        defaultValue: ArrangeStrategies.Canvas
    },
    padding: {
        displayName: "Padding",
        type: "box",
        useInModel: true,
        editable: false,
        defaultValue: Box.Default
    },
    dropPositioning: {
        displayName: "Drop position",
        type: "choice",
        possibleValues: { "none": "None", "vertical": "Vertical", "horizontal": "Horizontal" },
        useInModel: true,
        editable: false,
        defaultValue: "none"
    },
    overflow: {
        defaultValue: Overflow.Visible,
        displayName: "Overflow",
        type: "dropdown",
        options: {
            width: 1 / 2,
            items: [
                { name: "Clip", value: Overflow.Clip },
                { name: "Visible", value: Overflow.Visible },
                { name: "Grow and shrink horizontally", value: Overflow.AdjustHorizontal },
                { name: "Grow and shrink vertically", value: Overflow.AdjustVertical },
                { name: "Grow and shrink", value: Overflow.AdjustBoth },
                { name: "Grow horizontally", value: Overflow.ExpandHorizontal },
                { name: "Grow vertically", value: Overflow.ExpandVertical },
                { name: "Grow", value: Overflow.ExpandBoth }
            ]
        }
    },
    allowMoveOutChildren: {
        displayName: "Allow drag elements out",
        type: "checkbox",
        useInModel: true,
        editable: true,
        defaultValue: true,
    }
});