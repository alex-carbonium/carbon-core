import Container from "framework/Container";
import Brush from "framework/Brush";
import BezierGraph from "math/bezierGraph";
import {unionRect} from "math/geometry";
import UIElement from "framework/UIElement";
import BezierCurve from "math/bezierCurve";
import PropertyMetadata from "framework/PropertyMetadata";
import PropertyTracker from "framework/PropertyTracker";
import {Overflow, Types} from "framework/Defs";
import Path from "ui/common/Path";

function propertyChanged(element, newProps) {
    if (!this._internalChange && this._itemIds && this._itemIds[element.id()]) {
        if (newProps.width !== undefined || newProps.height !== undefined
            || newProps.x !== undefined || newProps.y !== undefined
            || newProps.angle !== undefined) {
            this.recalculate();
        }
    }
}
class CompoundPath extends Container {

    static bezierPathsFromGraph(graph) {
        // Convert this graph into a bezier path. This is straightforward, each contour
        //  starting with a move to and each subsequent edge being translated by doing
        //  a curve to.
        // Be sure to mark the winding rule as even odd, or interior contours (holes)
        //  won't get filled/left alone properly.

        //path.setWindingRule(NSEvenOddWindingRule);
        var res = [];

        for (var contour of graph._contours) {
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


    propsUpdated(newProps, oldProps) {
        Container.prototype.propsUpdated.apply(this, arguments);
        if (this._internalChange || !this.result) {
            return;
        }
        if (newProps.width !== undefined || newProps.height !== undefined) {
            var sw = (newProps.width || 1) / (oldProps.width || 1);
            var sh = (newProps.height || 1) / (oldProps.height || 1);

            for (var p of this.children) {
                p.setProps({width: p.width() * sw, height: p.height() * sh, x: p.x() * sw, y: p.y() * sh});
            }
            this.resetGlobalViewCache();
            this.recalculate();
        }
    }

    dispose() {
        Container.prototype.dispose.apply(this, arguments);
        if (this._trackerSubscription) {
            this._trackerSubscription.dispose();
            delete this._trackerSubscription;
        }
    }

    recalculate() {
        this._itemIds = {};


        var items = this.children;
        for(var i = 0; i < items.length; ++i){
            items[i].resetGlobalViewCache();
        }
        var result = BezierGraph.fromPath(items[0], items[0].viewMatrix());
        this._itemIds[items[0].id()] = true;
        for (var i = 1; i < items.length; ++i) {
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
        var rect = this.result[0].getBoundaryRect();
        for (var p of this.result) {
            rect = unionRect(rect, p.getBoundaryRect());
        }

        var dx = rect.x;
        var dy = rect.y;
        var newRect = this.getBoundaryRect();
        newRect.width = rect.width;
        newRect.height = rect.height;
        newRect.x += dx;
        newRect.y += dy;

        this._internalChange = true;

        for (var p of this.result) {
            var pos = p.position();
            p.setProps({x: pos.x - (dx), y: pos.y - (dy)});
        }

        for (var p of items) {
            var pos = p.position();
            p.setProps({x: pos.x - (dx), y: pos.y - (dy)});
        }

        this.resize(newRect);

        this._updateGraph();

        if (this.parent() instanceof CompoundPath) {
            this.parent().recalculate();
        }

        delete this._internalChange;
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
        path.setProps({x:this.x(), y:this.y(), width:this.width(), height:this.height()});
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
        for (var p of this.result) {
            this._graph.initWithBezierPath(p, p.viewMatrix());
        }
    }

    offsetGraph() {
        var graph = new BezierGraph();
        for (var p of this.result) {
            //TODO
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

    hitTest(point, scale) {
        if (this._activeGroup) {
            return true;
        }

        var res = UIElement.prototype.hitTest.apply(this, arguments);

        if (res) {
            if (this.parent() != null) {
                point = this.global2local(point);
            }

            var brush = this.fill();
            if (this.lockedGroup() && (!brush || !brush.type)) {
                for (var path of this.result) {
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
                var ray = BezierCurve.bezierCurveWithLine(point, {x: point.x + 100000, y: point.y})
                for (var curve of graph.contours) {
                    for (var edge of curve.edges) {
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
            context.lineCap = "round";

            context.beginPath();
            for (var i = 0; i < items.length; ++i) {
                var child = items[i];
                context.save();
                child.viewMatrix().applyToContext(context);
                child.drawPath(context, child.width(), child.height());
                context.restore();
            }
        }
    }

    unselect() {
        this.lockGroup();
    }

    drawSelf(context, w, h, environment) {
        if (!this.result) {
            this.recalculate();
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
                child.viewMatrix().applyToContext(context);
                child.drawPath(context, child.width(), child.height());
                context.stroke();
                context.restore();
            }
            context.restore();
        }


        if (this.result) {
            this.drawPath(context, w, h);

            Brush.fill(this.fill(), context, 0, 0, w, h);
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
        })
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
        return true;
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