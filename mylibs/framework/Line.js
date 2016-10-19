import Shape from "framework/Shape";
import Brush from "framework/Brush";
import Path from "ui/common/Path";
import {PointDirection} from "framework/Defs";
import Invalidate from "framework/Invalidate";
import Environment from "environment";
import Selection from "framework/SelectionModel";
import SnapController from "framework/SnapController";

var fwk = sketch.framework;

var PointSize = 5
    , PointSize2 = 2;

var LinePoint = {
    hitTest (frame, point, hitPoint, scale) {
        return Math.abs(point.x - hitPoint.x) < PointSize / scale && Math.abs(point.y - hitPoint.y) < PointSize / scale;
    },

    draw (p, frame, scale, context) {
        context.fillStyle = '#fff';
        context.strokeStyle = '#22c1ff';
        context.beginPath();
        context.rect(~~(p.x * scale - PointSize2), ~~(p.y * scale - PointSize2), PointSize, PointSize);
        context.fill();
        context.stroke();
    },
    capture (frame) {
        var resizingElement = frame.element.clone();
        var rect = frame.element.getBoundaryRectGlobal();
        resizingElement.opacity(0.6);
        resizingElement.stopTrackingResize();
        resizingElement.resize(Object.assign({}, rect));
        resizingElement.trackResize();
        resizingElement.forceDrawClone = true;
        frame.resizingElement = resizingElement;
        frame.globalViewMatrix = frame.element.globalViewMatrix();

        var container = frame.element.primitiveRoot();
        if (!container && frame.element instanceof SelectComposite) {
            container = frame.element.first().primitiveRoot();
        }

        SnapController.calculateSnappingPoints(container);

        Environment.view.layer3.add(resizingElement);
    },
    release (frame) {
        var e = frame.resizingElement;
        SnapController.clearActiveSnapLines();
        if (e) {
            var minX = Math.min(e.x1(), e.x2());
            var maxX = Math.max(e.x1(), e.x2());
            var minY = Math.min(e.y1(), e.y2());
            var maxY = Math.max(e.y1(), e.y2());

            var pos = {x: e.x() + minX, y: e.y() + minY};
            pos = frame.element.parent().global2local(pos);
            var props = {
                x1: e.x1() - minX,
                x2: e.x2() - minX,
                y1: e.y1() - minY,
                y2: e.y2() - minY,
                width: maxX - minX,
                height: maxY - minY,
                x: pos.x,
                y: pos.y
            };
            frame.element.prepareProps(props);
            fwk.commandManager.execute(
                frame.element.constructPropsChangedCommand(props,
                    {
                        x1: frame.element.x1(),
                        x2: frame.element.x2(),
                        y1: frame.element.y1(),
                        y2: frame.element.y2(),
                        width: frame.element.width(),
                        height: frame.element.height(),
                        x: frame.element.x(),
                        y: frame.element.y()
                    })
            );

            Environment.view.layer3.remove(e);
            e.dispose();
            Selection.refreshSelection();
        }
    },
    rotateCursorPointer (index, angle) {
        return index;
    },
    change (frame, dx, dy, point, event) {
        if (!frame.resizingElement) {
            return;
        }

        var oldx = event.x;
        var oldy = event.y;
        if ((event.event.ctrlKey || event.event.metaKey)) {
            var newPoint = event;
        } else {
            newPoint = SnapController.applySnappingForPoint(event, frame.element.getSnapPoints());
            dx += newPoint.x - oldx;
            dy += newPoint.y - oldy;
        }

        point.x += dx;
        point.y += dy;

        point.updateElement(frame.resizingElement, dx, dy);
        Invalidate.requestUpperOnly();
    }
}


class Line extends Shape {

    constructor() {
        super();
        this.trackResize();
    }

    propsUpdated(props, oldProps) {
        Shape.prototype.propsUpdated.apply(this, arguments);
        if (!this._reactToReszie || this.__state) {
            return;
        }

        if (props.width) {
            var x2 = this.x2();
            if (x2) {
                this.x2(props.width);
            } else {
                this.x1(props.width);
            }

        }
        if (props.height) {
            var y2 = this.y2();
            if (y2) {
                this.y2(props.height);
            }
            else {
                this.y1(props.height);
            }
        }
    }

    hitTest(/*Point*/point, scale) {
        var r = this.getBoundaryRectGlobal();
        var l = r.x;
        var t = r.y;
        var x1 = l + this.x1(),
            y1 = t + this.y1(),
            x2 = l + this.x2(),
            y2 = t + this.y2();
        var minx = Math.min(x1, x2);
        var miny = Math.min(y1, y2);
        var maxx = Math.max(x1, x2);
        var maxy = Math.max(y1, y2);
        var d = ((4 + this.getMaxOuterBorder()) / 2) / scale;

        if (!(point.x + d > minx && point.x - d < maxx && point.y + d > miny && point.y - d < maxy)) {
            return false;
        }

        var distance = sketch.math2d.pointToLineDistance(point, x1, y1, x2, y2);
        return Math.abs(distance) < d;
    }

    convertToPath() {
        var path = new Path();
        var l = this.x(),
            t = this.y(),
            x1 = this.x1(),
            y1 = this.y1(),
            x2 = this.x2(),
            y2 = this.y2();

        path.addPoint({x: l + x1, y: t + y1});
        path.addPoint({x: l + x2, y: t + y2});

        path.borderWidth(this.borderWidth());
        path.borderBrush(this.borderBrush());
        path.angle(this.angle());
        path.adjustBoundaries();

        return path;
    }

    drawPath(context) {
        var x1 = this.x1(),
            y1 = this.y1(),
            x2 = this.x2(),
            y2 = this.y2();
        if (x1 == x2) {
            x1 += .5;
            x2 += .5;
        }
        if (y1 == y2) {
            y1 += .5;
            y2 += .5;
        }
        context.linePath(x1, y1, x2, y2);
    }

    drawSelf(context, w, h, environment) {
        context.save();

        var dashPattern = this.dashPattern();
        if (dashPattern) {
            context.setLineDash(dashPattern);
        }

        this.drawPath(context, w, h);
        
        Brush.fill(this.backgroundBrush(), context, 0, 0, w, h);
        Brush.stroke(this.borderBrush(), context, 0, 0, w, h);

        context.restore();
    }

    x1(value) {
        if (value !== undefined) {
            this.setProps({x1: value});
        }
        return this.props.x1;
    }

    y1(value) {
        if (value !== undefined) {
            this.setProps({y1: value});
        }
        return this.props.y1;
    }

    x2(value) {
        if (value !== undefined) {
            this.setProps({x2: value});
        }
        return this.props.x2;
    }

    y2(value) {
        if (value !== undefined) {
            this.setProps({y2: value});
        }
        return this.props.y2;
    }

    stopTrackingResize() {
        this._reactToReszie = false;
    }

    trackResize() {
        this._reactToReszie = true;
    }

    _roundValue(v) {
        return Math.round(v);
    }

    prepareProps(changes) {
        Shape.prototype.prepareProps.apply(this, arguments);
        if (changes.x1 !== undefined) {
            changes.x1 = this._roundValue(changes.x1);
        }
        if (changes.x2 !== undefined) {
            changes.x2 = this._roundValue(changes.x2);
        }
        if (changes.y1 !== undefined) {
            changes.y1 = this._roundValue(changes.y1);
        }
        if (changes.y2 !== undefined) {
            changes.y2 = this._roundValue(changes.y2);
        }
        if (changes.width !== undefined) {
            changes.width = Math.round(changes.width);
        }
        if (changes.height !== undefined) {
            changes.height = Math.round(changes.height);
        }
    }

    createSelectionFrame(view) {
        var that = this;
        var frame = {
            element: this,
            frame: false,
            points: [
                {
                    type: LinePoint,
                    moveDirection: PointDirection.Any,
                    x: 0,
                    y: 0,
                    cursor: 10,
                    update (p, x, y) {
                        p.x = x + that.x1();
                        p.y = y + that.y1();
                    },
                    updateElement (e, dx, dy) {
                        e.x1(e.x1() + dx);
                        e.y1(e.y1() + dy);
                    }
                },
                {
                    type: LinePoint,
                    moveDirection: PointDirection.Any,
                    x: 0,
                    y: 0,
                    cursor: 10,
                    update (p, x, y) {
                        p.x = x + that.x2();
                        p.y = y + that.y2();
                    },
                    updateElement (e, dx, dy) {
                        e.x2(e.x2() + dx);
                        e.y2(e.y2() + dy);
                    }
                }
            ]
        };

        return frame;
    }
}

Line.prototype.__type__ = 'sketch.framework.Line';

fwk.PropertyMetadata.registerForType(Line, {
    x1: {
        displayName: "start x",
        defaultValue: 0,
        useInModel: true
    },
    y1: {
        displayName: "start y",
        defaultValue: 0,
        useInModel: true
    } ,
    x2: {
        displayName: "end x",
        defaultValue: 0,
        useInModel: true
    },
    y2: {
        displayName: "end y",
        defaultValue: 0,
        useInModel: true
    },
    groups () {
        return [
            {
                label: "Page linking",
                properties: ["pageLink"]
            },
            {
                label: "Appearance",
                expanded: false,
                properties: ["visible", "opacity", "backgroundBrush", "borderBrush"]
            },
            {
                label: "Layout",
                properties: ["x", "y", "width", "height", "anchor"],
                expanded: true
            }
        ];
    }
});


export default Line;

