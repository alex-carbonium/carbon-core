import DefaultFrameType from "decorators/DefaultFrameType";
import CompositeElement from "./CompositeElement";
import Environment from "environment";

define(["decorators/ActiveFrame", "framework/ResizeDimension"], function (ActiveFrame, ResizeDimension) {
    var fwk = sketch.framework;

    var SelectCompositeFrame = {
        hitPointIndex: function (frame, point) {
            point = {x: point.x - frame.element.x(), y: point.y - frame.element.y()};
            return DefaultFrameType.hitPointIndex(frame, point);
        },
        updateFromElement: function (frame) {
            return DefaultFrameType.updateFromElement(frame);
        },

        movePoint: function (frame, point, event) {
            event.x -= frame.element.x();
            event.y -= frame.element.y();
            return DefaultFrameType.movePoint(frame, point, event);
        },
        draw: function (frame, context) {
            context.save();
            var rect = frame.element.getBoundaryRectGlobal();
            context.translate(rect.x, rect.y);
            DefaultFrameType.draw(frame, context);
            context.restore();

            var scale = Environment.view.scale();
            fwk.CrazyScope.push(false);
            context.save();
            context.strokeStyle = '#22c1ff';
            context.lineWidth = 1;
            context.setLineDash([1, 1]);
            frame.element.each(function (e) {
                context.save();
                var r = e.getBoundaryRectGlobal();
                var origin = e.rotationOrigin(true);
                context.translate(origin.x, origin.y);
                context.rotate(e.angle() * Math.PI / 180);
                context.translate(-origin.x, -origin.y);
                context.scale(1 / scale, 1 / scale);
                context.rectPath(~~(r.x * scale), ~~(r.y * scale), ~~(e.width() * scale), ~~(e.height() * scale));
                context.stroke();
                context.restore();
            })
            fwk.CrazyScope.pop();
            context.restore();
        }
    }

    var SelectComposite = klass2("SelectComposite", CompositeElement, {
        _constructor: function () {
            this._activeFrame = new ActiveFrame();

            this._angleEditable = false;
            this._initialized = true;
        },
        selected: function (value) {
            if (arguments.length === 1) {
                if (value === this._selected) {
                    return;
                }

                this._selected = value;
                var multiselect = this.count() > 1;

                if (value) {
                    if (!multiselect) {
                        this.each(element => {
                            element.addDecorator(this._activeFrame);
                            element.select(multiselect);
                        });
                    } else {
                        this.addDecorator(this._activeFrame);
                        this.each(element => element.select(multiselect));
                    }
                } else {
                    this.removeDecorator(this._activeFrame);
                    this.each(element => {
                        element.unselect();
                        element.removeDecorator(this._activeFrame);
                    });
                }
            }

            return this._selected;
        },
        selectionFrameType: function () {
            return SelectCompositeFrame;
        },
        resizeDimensions: function () {
            var parent = this.first().parent();
            var canResize = true;
            this.each(function (e) {
                if (e.parent() !== parent) {
                    canResize = false;
                    return false;
                }
            });
            return canResize ? ResizeDimension.Both : ResizeDimension.None;
        },
        add: function (element, multiSelect, refreshOnly) {
            for (var i = this.elements.length - 1; i >= 0; --i) {
                var e = this.elements[i];
                if (e.isDescendantOrSame(element) || element.isDescendantOrSame(e)) {
                    this.remove(e);
                }
            }
            if(!refreshOnly && this._selected) {
                element.select(multiSelect);
            }
            CompositeElement.prototype.add.apply(this, arguments);
        },
        remove: function(element, refreshOnly){
            if(!refreshOnly && this._selected) {
                element.unselect();
            }
            CompositeElement.prototype.remove.apply(this, arguments);
        },
        clear: function(refreshOnly){
            if(!refreshOnly && this._selected) {
                this.each(x => x.unselect());
            }
            CompositeElement.prototype.clear.apply(this, arguments);
        }
    });

    fwk.PropertyMetadata.registerForType(SelectComposite, {});

    return SelectComposite;
});
