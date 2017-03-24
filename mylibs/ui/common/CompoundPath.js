import Container from "framework/Container";
import Brush from "framework/Brush";
import BezierGraph from "math/bezierGraph";
import UIElement from "framework/UIElement";
import BezierCurve from "math/bezierCurve";
import Point from "../../math/point";
import PropertyMetadata from "framework/PropertyMetadata";
import PropertyTracker from "framework/PropertyTracker";
import {Overflow, Types, LineCap, LineJoin, ChangeMode} from "framework/Defs";
import Path from "ui/common/Path";
import GroupArrangeStrategy from "../../framework/GroupArrangeStrategy";
import {combineRectArray} from "../../math/math";
import Rect from "../../math/rect";
import {IGroupContainer} from "carbon-core";

function propertyChanged(element, newProps) {
    if (!this._internalChange && this._itemIds && this._itemIds[element.id()]) {
        if (newProps.width !== undefined || newProps.height !== undefined || newProps.m !== undefined) {
            this.recalculate();
        }
    }
}
class CompoundPath extends Container implements IGroupContainer{

    static bezierPathsFromGraph(graph) {
        // Convert this graph into a bezier path. This is straightforward, each contour
        //  starting with a move to and each subsequent edge being translated by doing
        //  a curve to.
        // Be sure to mark the winding rule as even odd, or interior contours (holes)
        //  won't get filled/left alone properly.

        //path.setWindingRule(NSEvenOddWindingRule);
        var res = [];

        for (var i = 0, l = graph._contours.length; i < l; ++i) {
            var contour = graph._contours[i];
            var firstPoint = true;
            for (var edge of contour.edges) {
                if (firstPoint) {
                    var path = new Path();
                    path.moveToPoint(clone(edge.endPoint1));
                    firstPoint = false;
                }

                if (edge.isStraightLine)
                    path.lineToPoint(clone(edge.endPoint2));
                else
                    path.curveToPoint(clone(edge.endPoint2), clone(edge.controlPoint1), clone(edge.controlPoint2));
            }
            path.closed(true);
            path.adjustBoundaries();
            res.push(path);
        }


        return res;
    }

    lineCap(value) {
        if (arguments.length > 0) {
            if(value === 'round' || value === LineCap.Round){
                value = LineCap.Round;
            } else if (value === 'square'  || value === LineCap.Square) {
                value = LineCap.Square;
            } else {
                value = LineCap.Butt;
            }
            this.setProps({lineCap: value});
        }

        switch(this.props.lineCap){
            case LineCap.Round:
                return 'round';
            case LineCap.Square:
                return 'square';
            default:
                return 'butt';
        }
    }

    lineJoin(value) {
        if (arguments.length > 0) {
            if(value === 'round' || value === LineJoin.Round){
                value = LineJoin.Round;
            } else if (value === 'bevel'  || value === LineJoin.Bevel) {
                value = LineJoin.Bevel;
            } else {
                value = LineJoin.Miter;
            }
            this.setProps({lineJoin: value});
        }

        switch(this.props.lineJoin){
            case LineJoin.Round:
                return 'round';
            case LineJoin.Bevel:
                return 'bevel';
            default:
                return 'miter';
        }
    }


    propsUpdated(newProps, oldProps) {
        super.propsUpdated.apply(this, arguments);
        if (this._internalChange || !this.result) {
            return;
        }
        // if (newProps.width !== undefined || newProps.height !== undefined) {
        //     var sw = (newProps.width || 1) / (oldProps.width || 1);
        //     var sh = (newProps.height || 1) / (oldProps.height || 1);
        //
        //     for (var p of this.children) {
        //         p.setProps({width: p.width() * sw, height: p.height() * sh, x: p.x() * sw, y: p.y() * sh});
        //     }
        //     this.resetGlobalViewCache();
        //     this.recalculate();
        // }
    }

    dispose() {
        super.dispose.apply(this, arguments);
        if (this._trackerSubscription) {
            this._trackerSubscription.dispose();
            delete this._trackerSubscription;
        }
    }

    recalculate(mode) {
        GroupArrangeStrategy.arrange(this);

        this._itemIds = {};

        var items = this.children;
        // for (let i = 0; i < items.length; ++i){
        //     items[i].resetGlobalViewCache();
        // }

        var result = BezierGraph.fromPath(items[0], items[0].viewMatrix());
        this._itemIds[items[0].id()] = true;
        for (let i = 1; i < items.length; ++i) {
            var path = items[i];
            this._itemIds[path.id()] = true;
            var otherGraph;
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

        var boxes = this.result.map(x => x.getBoundingBox());
        var rect = combineRectArray(boxes);

        this._internalChange = true;
        this.br(rect);
        this._updateGraph();

        if (this.parent() instanceof CompoundPath) {
            this.parent().recalculate();
        }

        delete this._internalChange;
    }

    applySizeScaling(s, o, options, changeMode) {
        this.applyMatrixScaling(s, o, options, changeMode);
    }

    flatten(){
        this.recalculate();
        var path;
        if(this.result.length === 1){
            path = this.result[0].clone();
        }
        else {
            path = new CompoundPath();
            for(var i = 0; i < this.result.length; ++i) {
                var p = this.result[i].clone();
                p.joinMode("union");
                p.fill(this.fill());
                p.stroke(this.stroke());
                path.add(p);
            }
        }
        path.fill(this.fill());
        path.stroke(this.stroke());
        path.name(this.displayName());
        path.styleId(this.styleId());
        path.setProps(this.selectLayoutProps());
        if(this.result.length>1){
            path.recalculate();
        }
        var parent = this.parent();
        var index = parent.positionOf(this);
        parent.remove(this);
        parent.insert(path, index);
    }

    _updateGraph() {
        this._graph = new BezierGraph();
        for (var i = 0; i < this.result.length; i++){
            var p = this.result[i];
            this._graph.initWithBezierPath(p, p.viewMatrix());
        }
    }

    offsetGraph() {
        var graph = new BezierGraph();
        for (var i = 0; i < this.result.length; i++){
            var p = this.result[i];
            graph.initWithBezierPath(p, this.viewMatrix());
        }

        return graph;
    }

    joinMode(value) {
        if (arguments.length > 0) {
            this.setProps({joinMode: value});
        }

        return this.props.joinMode;
    }

    canAccept(elements) {
        if (elements.length !== 1){
            return false;
        }
        if (!this._itemIds) {
            return false;
        }
        return this._itemIds[elements[0].id()];
    }

    getHitTestBox(){
        if (this.lockedGroup()){
            return this.getBoundaryRect();
        }
        return this.runtimeProps.fullBoundaryRect;
    }
    hitTest(point, scale) {
        if (this._activeGroup) {
            return true;
        }

        var res = super.hitTest.apply(this, arguments);

        if (res) {
            if (this.parent() != null) {
                point = this.global2local(point);
            }

            var brush = this.fill();
            if (this.lockedGroup() && (!brush || !brush.type)) {
                for (var i = 0; i < this.result.length; i++){
                    var path = this.result[i];
                    var p = path.getPointIfClose(point, 8);
                    if (p) {
                        return true;
                    }
                }
                return false;
            }
            else {
                var graph;
                if (this._graph) {
                    graph = this._graph;
                } else {
                    return false;
                }
                var count = 0;
                var ray = BezierCurve.bezierCurveWithLine(point, {x: point.x + 100000, y: point.y});
                for (let i = 0, l = graph.contours.length; i < l; ++i) {
                    var curve = graph.contours[i];
                    for (var j = 0, k = curve.edges.length; j < k; ++j) {
                        var edge = curve.edges[j];
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

    drawPath(context) {
        if (this.result) {
            var items = this.result;
            context.lineCap = this.lineCap();
            context.lineJoin = this.lineJoin();
            context.mitterLimit = this.props.mitterLimit;
            var matrix = this.globalViewMatrix();

            context.beginPath();
            for (var i = 0; i < items.length; ++i) {
                var child = items[i];
                context.save();
                //quick assignment
                child.props.m = matrix;
                child.drawPath(context, child.width(), child.height());
                context.restore();
            }
        }
    }

    drawSelf(context, w, h, environment) {
        if (!this.result) {
            this.recalculate(ChangeMode.Self);
        }
        context.save();

        if (!this.lockedGroup()) {
            var items = this.children;
            context.save();
            context.lineCap = "round";
            context.strokeStyle = "gray";

            context.setLineDash([1, 2]);
            for (var i = 0; i < items.length; ++i) {
                var child = items[i];
                context.save();
                context.beginPath();
                child.drawPath(context, child.width(), child.height());
                context.stroke();
                context.restore();
            }
            context.restore();
        }


        if (this.result) {
            this.drawPath(context, w, h);

            Brush.fill(this.fill(), context, 0, 0, w, h);
            context.lineWidth = this.strokeWidth();
            Brush.stroke(this.stroke(), context, 0, 0, w, h);
        }
        context.restore();
    }

    adjustBoundaries() {

    }

    hitTransparent (value) {
        if (value !== undefined) {
            this._hitTransparent =  value;
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
        this.applyVisitor(e=>{
            e.disablePropsTracking();
        });
        delete this.runtimeProps.fullBoundaryRect;
    }

    unlockGroup() {
        super.unlockGroup();
        this.hitTransparent(true);
        if(!this._trackerSubscription) {
            this._trackerSubscription = PropertyTracker.propertyChanged.bind(this, propertyChanged);
        }
        this.applyVisitor(e=>{
            e.enablePropsTracking();
        });

        var boxes = this.children.map(x => x.getBoundingBox());
        var r = combineRectArray(boxes);
        //this.runtimeProps.fullBoundaryRect = new Rect(0, 0, r.width, r.height);
        this.runtimeProps.fullBoundaryRect = r;

        return true;
    }

    wrapSingleChild(){
        return true;
    }
    translateChildren(){
        return false;
    }
}
CompoundPath.prototype.t = Types.CompoundPath;

PropertyMetadata.registerForType(CompoundPath, {
    allowMoveOutChildren: {
        defaultValue: false,
    },
    enableGroupLocking: {
        defaultValue: true
    },
    overflow: {
        defaultValue: Overflow.Visible
    }
});

export default CompoundPath;