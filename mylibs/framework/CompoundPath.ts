import Container from "framework/Container";
import Brush from "framework/Brush";
import BezierGraph from "math/bezierGraph";
import UIElement from "framework/UIElement";
import BezierCurve from "math/bezierCurve";
import Point from "math/point";
import PropertyMetadata from "framework/PropertyMetadata";
import PropertyTracker from "framework/PropertyTracker";
import { Overflow, Types } from "framework/Defs";
import Path from "framework/Path";
import GroupArrangeStrategy from "framework/arrangeStrategy/GroupArrangeStrategy";
import { combineRectArray } from "math/math";
import Rect from "math/rect";
import { IGroupContainer, ChangeMode, IMouseEventData, IIsolatable, RenderFlags, RenderEnvironment, LineCap, LineJoin, StrokePosition } from "carbon-core";
import Shape from "framework/Shape";
import UserSettings from "UserSettings";
import Selection from "framework/SelectionModel";
import Isolate from "commands/Isolate";
import ContextPool from "./render/ContextPool";
import GroupContainer from "./GroupContainer";

function propertyChanged(element, newProps) {
    if (!this._internalChange && this._itemIds && this._itemIds[element.id]) {
        if (newProps.width !== undefined || newProps.height !== undefined || newProps.m !== undefined) {
            this.recalculate();
        }
    }
}
class CompoundPath extends Container implements IGroupContainer, IIsolatable {

    static bezierPathsFromGraph(graph) {
        // Convert this graph into a bezier path. This is straightforward, each contour
        //  starting with a move to and each subsequent edge being translated by doing
        //  a curve to.
        // Be sure to mark the winding rule as even odd, or interior contours (holes)
        //  won't get filled/left alone properly.

        let res = [];

        for (let i = 0, l = graph.contours.length; i < l; ++i) {
            let contour = graph.contours[i];
            let firstPoint = true;
            let path;
            for (let edge of contour.edges) {
                if (firstPoint) {
                    path = new Path();
                    path.moveToPoint(clone(edge.endPoint1));
                    firstPoint = false;
                }

                if (edge.isStraightLine) {
                    path.lineToPoint(clone(edge.endPoint2));
                }
                else {
                    path.curveToPoint(clone(edge.endPoint2), clone(edge.controlPoint1), clone(edge.controlPoint2));
                }
            }

            path.closed(true);
            path.adjustBoundaries();
            res.push(path);
        }


        return res;
    }

    get lineCap() {
        switch (this.props.lineCap) {
            case LineCap.Round:
                return 'round';
            case LineCap.Square:
                return 'square';
            default:
                return 'butt';
        }
    }
    set lineCap(value: LineCap | "round" | "square" | "butt") {
        let cap;
        if (value === 'round' || value === LineCap.Round) {
            cap = LineCap.Round;
        } else if (value === 'square' || value === LineCap.Square) {
            cap = LineCap.Square;
        } else {
            cap = LineCap.Butt;
        }

        this.setProps({ lineCap: cap });
    }

    set lineJoin(value: LineJoin | "round" | "bevel" | "miter") {
        if (value === 'round' || value === LineJoin.Round) {
            value = LineJoin.Round;
        } else if (value === 'bevel' || value === LineJoin.Bevel) {
            value = LineJoin.Bevel;
        } else {
            value = LineJoin.Miter;
        }

        this.setProps({ lineJoin: value });
    }
    get lineJoin() {
        switch (this.props.lineJoin) {
            case LineJoin.Round:
                return 'round';
            case LineJoin.Bevel:
                return 'bevel';
            default:
                return 'miter';
        }
    }

    _renderDraft(context, w, h) {
        var stroke = this.stroke;
        var strokePosition = this.strokePosition();

        context.beginPath();
        this.drawPath(context, w, h);
        var dashPattern = this.dashPattern();
        if (dashPattern) {
            context.setLineDash(dashPattern);
        }

        this.fillSelf(context, w, h);
        if (!stroke || !stroke.type || strokePosition === StrokePosition.Center) {
            context.lineWidth = this.strokeWidth();
            this.strokeSelf(context, w, h);
        }
        else if (strokePosition === StrokePosition.Inside) {
            context.clip();
            context.lineWidth = this.strokeWidth() * 2;
            this.strokeSelf(context, w, h);
        }
        else if (strokePosition === StrokePosition.Outside) {
            context.beginPath();
            var bb = this.getBoundingBoxGlobal();
            context.rect(bb.x + 2 * bb.width, bb.y - bb.height, -3 * bb.width, 3 * bb.height);
            this.drawPath(context, w, h);
            context.clip();
            context.beginPath();
            this.drawPath(context, w, h);
            context.lineWidth = this.strokeWidth() * 2;
            this.strokeSelf(context, w, h);
        }
    }

    fillSelf(context, w, h) {
        Brush.fill(this.fill, context, 0, 0, w, h);
    }

    strokeSelf(context, w, h) {
        Brush.stroke(this.stroke, context, 0, 0, w, h);
    }

    _renderFinal(context, w, h, environment: RenderEnvironment) {
        var stroke = this.stroke;
        var strokePosition = this.strokePosition();

        context.beginPath();
        this.drawPath(context, w, h);
        this.fillSelf(context, w, h);
        if (!stroke || !stroke.type || strokePosition === StrokePosition.Center) {
            context.lineWidth = this.strokeWidth();
            this.strokeSelf(context, w, h);
        }
        else {
            var clippingRect = this.getBoundingBoxGlobal();
            clippingRect = this.expandRectWithBorder(clippingRect);
            if (true || !(environment.flags & RenderFlags.Offscreen)) {
                var p1 = environment.pageMatrix.transformPoint2(clippingRect.x, clippingRect.y);
                var p2 = environment.pageMatrix.transformPoint2(clippingRect.x + clippingRect.width, clippingRect.y + clippingRect.height);
                p1.x = Math.max(0, 0 | p1.x * environment.contextScale);
                p1.y = Math.max(0, 0 | p1.y * environment.contextScale);
                p2.x = 0 | p2.x * environment.contextScale + .5;
                p2.y = 0 | p2.y * environment.contextScale + .5;
                var sw = (p2.x - p1.x);
                var sh = (p2.y - p1.y);
            }
            // else {
            //     sw = 0 | clippingRect.width * environment.contextScale + .5;
            //     sh = 0 | clippingRect.height * environment.contextScale + .5;
            //     p1 = {x:0, y:0};
            // }
            sw = Math.max(sw, 1);
            sh = Math.max(sh, 1);

            var offContext = ContextPool.getContext(sw, sh, environment.contextScale);
            offContext.clearRect(0, 0, sw, sh);
            offContext.relativeOffsetX = -p1.x;
            offContext.relativeOffsetY = -p1.y;

            offContext.save();
            offContext.translate(-p1.x, -p1.y);
            environment.setupContext(offContext);

            var dashPattern = this.dashPattern();
            if (dashPattern) {
                offContext.setLineDash(dashPattern);
            }

            // if(!(environment.flags & RenderFlags.Offscreen)) {
            this.applyViewMatrix(offContext);
            // }

            offContext.beginPath();
            this.drawPath(offContext, w, h);

            offContext.lineWidth = this.strokeWidth() * 2;
            this.strokeSelf(offContext, w, h);
            if (strokePosition === StrokePosition.Inside) {
                offContext.globalCompositeOperation = "destination-in";
            }
            else {
                offContext.globalCompositeOperation = "destination-out";
            }
            offContext.fillStyle = "black";
            offContext.fill();

            // if(!(environment.flags & RenderFlags.Offscreen)) {
            context.resetTransform();
            // }

            context.drawImage(offContext.canvas, p1.x, p1.y);

            offContext.restore();

            ContextPool.releaseContext(offContext);
        }
    }

    propsUpdated(newProps, oldProps) {
        super.propsUpdated.apply(this, arguments);
        if (this._internalChange || !this.result) {
            return;
        }
    }

    dispose() {
        super.dispose.apply(this, arguments);
        if (this._trackerSubscription) {
            this._trackerSubscription.dispose();
            delete this._trackerSubscription;
        }
    }

    recalculate(mode?) {
        GroupArrangeStrategy.arrange(this);

        this._itemIds = {};

        let items = this.children;

        let result = BezierGraph.fromPath(items[0], items[0].viewMatrix());
        this._itemIds[items[0].id] = true;
        for (let i = 1; i < items.length; ++i) {
            let path = items[i];
            this._itemIds[path.id] = true;
            let otherGraph;
            if (path instanceof CompoundPath) {
                otherGraph = path.offsetGraph();
            } else {
                otherGraph = BezierGraph.fromPath(path, path.viewMatrix());
            }
            switch (path.joinMode()) {
                case "union":
                    result = result.unionWithBezierGraph(otherGraph);
                    break;
                case "intersect":
                    result = result.intersectWithBezierGraph(otherGraph);
                    break;
                case "difference":
                    result = result.differenceWithBezierGraph(otherGraph);
                    break;
                case "xor":
                    result = result.xorWithBezierGraph(otherGraph);
                    break;
            }
        }

        this.result = CompoundPath.bezierPathsFromGraph(result);
        if (!this.result || !this.result.length) {
            return;
        }

        let boxes = this.result.map(x => x.getBoundingBox());
        let rect = combineRectArray(boxes);

        this._internalChange = true;
        this.boundaryRect(rect);
        this._updateGraph();

        if (this.parent instanceof CompoundPath) {
            this.parent.recalculate();
        }

        delete this._internalChange;
    }

    applySizeScaling(s, o, options, changeMode) {
        this.applyMatrixScaling(s, o, options, changeMode);
    }

    flatten() {
        this.recalculate();
        let path;
        if (this.result.length === 1) {
            path = this.result[0].clone();
            path.fill = (this.fill);
            path.stroke = (this.stroke);
            path.setProps(this.selectLayoutProps());
        }
        else {
            let tmppath: any = new CompoundPath();
            for (let i = 0; i < this.result.length; ++i) {
                let p = this.result[i].clone();
                p.joinMode("union");
                p.fill = (this.fill);
                p.stroke = (this.stroke);
                tmppath.add(p);
            }
            tmppath.recalculate();

            path = new GroupContainer();
            for (let i = 0, len = tmppath.children.length; i < len; ++i) {
                let child = tmppath.children[0];
                tmppath.remove(child);
                path.add(child);
            }
        }
        path.name = (this.displayName());
        path.styleId(this.styleId());

        let parent: any = this.parent;
        let index = parent.positionOf(this);
        parent.remove(this);
        parent.insert(path, index);
        Selection.makeSelection([path]);
    }

    _updateGraph() {
        this._graph = new BezierGraph();
        for (let i = 0; i < this.result.length; i++) {
            let p = this.result[i];
            this._graph.initWithBezierPath(p, p.viewMatrix());
        }
    }

    offsetGraph() {
        let graph = new BezierGraph();
        for (let i = 0; i < this.result.length; i++) {
            let p = this.result[i];
            graph.initWithBezierPath(p, this.viewMatrix());
        }

        return graph;
    }

    joinMode(value) {
        if (arguments.length > 0) {
            this.setProps({ joinMode: value });
        }

        return this.props.joinMode;
    }

    canAccept(elements) {
        if (elements.length !== 1) {
            return false;
        }
        if (!this._itemIds) {
            return false;
        }
        return this._itemIds[elements[0].id];
    }

    getHitTestBox() {
        if (this.lockedGroup()) {
            return this.boundaryRect();
        }
        return this.runtimeProps.fullBoundaryRect;
    }

    onIsolationExited() {
        if (!this.count()) {
            this.parent.remove(this);
        } else {
            this.recalculate();
        }
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
            let element = this.hitElement(event, event.view);
            if (element && element !== this) {
                Selection.makeSelection([element]);
            }
        }
    }

    hitTest(point, view) {
        if (this._activeGroup) {
            return true;
        }

        let res = super.hitTest.apply(this, arguments);

        if (res) {
            if (this.parent !== null) {
                point = this.global2local(point);
            }

            let brush = this.fill;
            if (this.lockedGroup() && (!brush || !brush.type)) {
                for (let i = 0; i < this.result.length; i++) {
                    let path = this.result[i];
                    let p = path.getPointIfClose(point, view, 8);
                    if (p) {
                        return true;
                    }
                }
                return false;
            }
            else {
                let graph;
                if (this._graph) {
                    graph = this._graph;
                } else {
                    return false;
                }
                let count = 0;
                let ray = BezierCurve.bezierCurveWithLine(point, { x: point.x + 100000, y: point.y });
                for (let i = 0, l = graph.contours.length; i < l; ++i) {
                    let curve = graph.contours[i];
                    for (let j = 0, k = curve.edges.length; j < k; ++j) {
                        let edge = curve.edges[j];
                        edge.intersectionsWithBezierCurve(ray, {}, () => {
                            count++;
                        }
                        )
                    }
                }
                return (count & 1) === 1;
            }
        }
        return res;
    }

    drawPath(context, w, h) {
        if (this.result) {
            let items = this.result;
            context.lineCap = this.lineCap;
            context.lineJoin = this.lineJoin;
            context.miterLimit = this.props.miterLimit;
            let matrix = this.globalViewMatrix();

            context.beginPath();
            for (let i = 0; i < items.length; ++i) {
                let child = items[i];
                context.save();
                //quick assignment
                child.props.m = matrix;
                child.drawPath(context, child.width, child.height);
                context.restore();
            }
        }
    }

    drawSelf(context, w, h, environment: RenderEnvironment) {
        if (!this.result) {
            this.recalculate(ChangeMode.Self);
        }
        context.save();

        if (!this.lockedGroup()) {
            let items = this.children;
            context.save();
            context.lineCap = "round";
            context.strokeStyle = "gray";

            context.setLineDash([1, 2]);
            for (let i = 0; i < items.length; ++i) {
                let child = items[i];
                context.save();
                context.beginPath();
                child.drawPath(context, child.width, child.height);
                context.stroke();
                context.restore();
            }
            context.restore();
        }


        if (this.result) {
            this.drawPath(context, w, h);

            Brush.fill(this.fill, context, 0, 0, w, h);
            context.lineWidth = this.strokeWidth();
            Brush.stroke(this.stroke, context, 0, 0, w, h);
        }

        // if(this.result) {
        //     if (environment.flags & RenderFlags.Final) {
        //         this._renderFinal(context, w, h, environment);
        //     } else {
        //         this._renderDraft(context, w, h);
        //     }

        // }
        context.restore();
    }

    adjustBoundaries() {

    }

    hitTransparent(value?): boolean {
        if (value !== undefined) {
            this._hitTransparent = value;
        }
        return this._hitTransparent;
    }

    lockGroup() {
        super.lockGroup();
        this.hitTransparent(false);
        if (this._trackerSubscription) {
            this._trackerSubscription.dispose();
            delete this._trackerSubscription;
        }
        this.applyVisitor(e => {
            e.disablePropsTracking();
        });
        delete this.runtimeProps.fullBoundaryRect;
    }

    unlockGroup() {
        super.unlockGroup();
        this.hitTransparent(true);
        if (!this._trackerSubscription) {
            this._trackerSubscription = PropertyTracker.propertyChanged.bind(this, propertyChanged);
        }
        this.applyVisitor(e => {
            e.enablePropsTracking();
        });

        let boxes = this.children.map(x => x.getBoundingBox());
        let r = combineRectArray(boxes);
        this.runtimeProps.fullBoundaryRect = r;

        return true;
    }

    wrapSingleChild() {
        return true;
    }

    translateChildren() {
        return false;
    }

    enableGroupLocking() {
        return true;
    }
}
CompoundPath.prototype.t = Types.CompoundPath;

PropertyMetadata.registerForType(CompoundPath, {
    allowMoveOutChildren: {
        defaultValue: false,
    },
    overflow: {
        defaultValue: Overflow.Visible
    },

    groups() {
        return PropertyMetadata.findAll(Types.Shape).groups();
    }
});

export default CompoundPath;