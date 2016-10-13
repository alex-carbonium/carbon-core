import UIElement from "framework/UIElement";
import ResizeDimension from "framework/ResizeDimension";
import Matrix from "math/matrix";
import CompositeElement from "framework/CompositeElement";
import SelectComposite from "framework/SelectComposite";
import PropertyMetadata from "framework/PropertyMetadata";
import Container from "framework/Container";
import {createUUID} from "../util";
import {ChangeMode} from "./Defs";
import Selection from "framework/SelectionModel";
import Environment from "environment";
import SnapController from "./SnapController";

var debug = require("DebugUtil")("carb:draggingElement");

function applyOrthogonalMove(pos) {
    var oldPos = this._element.position();
    oldPos = this._element.parent().local2global(oldPos);

    if (Math.abs(oldPos.x - pos.x) > Math.abs(oldPos.y - pos.y)) {
        pos.y = oldPos.y;
    } else {
        pos.x = oldPos.x;
    }

    return pos;
}

function dropElementOn(event, newParent, target) {

    var pos = newParent.global2localDropPosition(this.position());
    var index = undefined;
    if (event) {
        var dropData = newParent.getDropData({x: event.x, y: event.y}, this._element);
        if (dropData !== null) {
            index = dropData.index;
        }
    }

    if (target instanceof CompositeElement) {
        var sw = ~~target.width() / ~~this._clone.width();
        var sh = ~~target.height() / ~~this._clone.height();
        pos.x -= target.x();
        pos.y -= target.y();

        if (this._resize) {
            var x = target.x();
            var y = target.y();
            target.each(function (element) {
                var width = ~~(element.width() / sw),
                    height = ~~(element.height() / sh);
                var p = element.position();
                var gp = element.parent().global2local({x: x, y: y});
                var elementGlobal = {x: (p.x - gp.x) / sw + gp.x + pos.x, y: (p.y - gp.y) / sh + gp.y + pos.y};

                element.setProps({
                    x: elementGlobal.x,
                    y: elementGlobal.y,
                    width: (element.resizeDimensions() & ResizeDimension.Horizontal) ? width : element.width(),
                    height: (element.resizeDimensions() & ResizeDimension.Vertical) ? height : element.height()
                });
                if (index !== undefined) {
                    element.parent().changePosition(element, index);
                }
                //commands.push(element.constructMoveCommand(element.parent(), index));
            });

            var props = {
                x: this._clone.x(),
                y: this._clone.y(),
                width: this._clone.width(),
                height: this._clone.height()
            }

            target.prepareProps(props);
            target.setProps(props);
        } else {
            target.each(function (element) {
                var width = element.width(),
                    height = element.height();

                var elementGlobal = element.parent().local2global(element.position());
                var rect = {x: pos.x + elementGlobal.x, y: pos.y + elementGlobal.y, width: width, height: height};
                if (!element.id()) {
                    element.id(createUUID());
                    element.move(rect);
                    newParent.insert(element, index);
                } else {
                    if (element.parent() !== newParent) {
                        newParent.insert(element, index);
                    }
                    element.setProps(rect);
                }
            });

            var props = {
                x: target.x() + pos.x,
                y: target.x() + pos.y,
                width: target.width(),
                height: target.height()
            };

            target.prepareProps(props);
            target.setProps(props);
        }
    } else {
        if (!target.id()) {
            target.setProps({id: createUUID(), x: pos.x, y: pos.y}, ChangeMode.Root);
            if (target.__type__ === "PlaceholderElement") {//stragnge that instanceof doesn't work} instanceof PlaceholderElement){
                if (index !== undefined) {
                    newParent.insert(target, index, ChangeMode.Root);
                } else {
                    newParent.add(target, ChangeMode.Root);
                }
            } else {
                newParent.insert(target, index);
            }
        } else {
            var props = {x: pos.x, y: pos.y, width: this.width(), height: this.height()};

            if (this.angle() !== target.angle()) {
                props.angle = this.angle();
            }
            if (this.flipVertical() !== target.flipVertical()) {
                props.flipVertical = this.flipVertical();
            }
            if (this.flipHorizontal() !== target.flipHorizontal()) {
                props.flipHorizontal = this.flipHorizontal();
            }

            if (target.parent() !== newParent) {
                newParent.insert(target, index);
            }
            target.prepareAndSetProps(props);
        }
    }

    var elements = [];
    target.each(e => {
        if (e.peek) {
            var element = e.peek();
            elements.push(element);
        }
        else {
            elements.push(e);
        }
    });
    Selection.makeSelection(elements);
}

function onMouseMove(event) {
    this._lastPoint = event;
}

class DraggingElement extends UIElement {
    constructor(element, holdOffset, resize) {
        super();
        this._element = element;
        this._clone = null;
        var primitiveRoot = element.primitiveRoot();
        if (primitiveRoot) {
            this._clone = primitiveRoot.createDragClone(element);
        }
        else {
            this._clone = element.clone();
        }
        this._element.setProps({visible: this._element.visibleWhenDrag()}, ChangeMode.Self);

        this._clone._canDraw = true;
        this._resize = resize;
        var parent = element.parent();
        this._clone.setProps({id: element.id()}, ChangeMode.Self); // need to have the same id for active frame
        var pos = element.position();
        if (!(element instanceof CompositeElement)) {
            pos = parent.local2global(pos);
        }

        this.setProps({
            width: element.width(),
            height: element.height(),
            angle: element.angle(),
            flipVertical: element.flipVertical(),
            flipHorizontal: element.flipHorizontal(),
            x: pos.x,
            y: pos.y,
            opacity: 0.7
        }, ChangeMode.Root);

        this.canDrag(false);
        this.isTemporary(true);

        var container = element.primitiveRoot();
        if (!container && element instanceof SelectComposite) {
            container = element.first().primitiveRoot();
        }

        SnapController.calculateSnappingPoints(container);

        var holdPcnt = holdOffset ? (~~(holdOffset.x * 100 / element.width())) : 50;
        this._ownSnapPoints = SnapController.prepareOwnSnapPoints(element, holdPcnt);

        this._mouseMoveHandler = Environment.controller.mousemoveEvent.bind(this, onMouseMove);
    }

    canBeAccepted(element) {
        return false;
    }

    updateViewMatrix() {
        this.runtimeProps.viewMatrix = new Matrix();
    }

    displayName() {
        return "DraggingElement";
    }

    drawSelf(context, w, h, environment) {
        var scaleX, scaleY, scale = environment.view.scale();

        function fillBackground() {
            context.save();
            context.fillStyle = 'rgba(160, 180, 200, 0.1)';
            context.fillRect(0, 0, w, h);
            context.restore();
        }

        var x = this.x();
        var y = this.y();
        debug("Drawing at: x=%d y=%d", x, y);

        context.save();

        scaleX = scaleY = scale;
        if (this._element.scalableX()) {
            scaleX = 1;
        }
        else {
            x *= scale;
        }
        if (this._element.scalableY()) {
            scaleY = 1;
        } else {
            y *= scale;
        }

        context.scale(1 / scaleX, 1 / scaleY);

        context.globalAlpha = 0.6;

        var oldSize = this._clone.getBoundaryRect();
        var newPos = this._element.parent().global2local({x: x, y: y});
        var rect = {x: newPos.x, y: newPos.y, width: w, height: h, angle: this.angle()};
        debug("Resizing rect: x=%d y=%d w=%d h=%d", rect.x, rect.y, rect.width, rect.height);
        this._clone.prepareProps(rect);
        this._clone.setProps(rect, ChangeMode.Root);

        if (this._clone instanceof Container) {
            this._clone.arrange({oldValue: oldSize, newValue: rect});
        }

        rect.width = this._clone.width();
        rect.height = this._clone.height();

        var parent = this._element.parent();

        if (parent !== NullContainer) {
            var globalViewMatrix = parent.globalViewMatrix().clone().append(this._clone.viewMatrix());
        } else {
            globalViewMatrix = this._clone.viewMatrix();
        }

        var sh = 1, sv = 1;
        if (this.flipHorizontal() !== this._clone.flipHorizontal()) {
            sh = -1;
        }
        if (this.flipVertical() !== this._clone.flipVertical()) {
            sv = -1;
        }
        if (sh !== 1 || sv !== 1) {
            var origin = {x: this._clone.width() / 2, y: this._clone.height() / 2};
            globalViewMatrix.scale(sh, sv, origin.x, origin.y);
        }
        var isComposite = this._element instanceof SelectComposite;

        if (isComposite) {
            globalViewMatrix.translate(this.x(), this.y());
        }
        globalViewMatrix.applyToContext(context);

        if (this._element.clipSelf() && this._element.clipDragClone()) {
            context.rectPath(0, 0, w, h);
            context.clip();
        }

        fillBackground();

        if (isComposite) {
            context.translate(-this._clone.x(), -this._clone.y());
        }
        this._clone.drawSelf(context, rect.width, rect.height, environment);
        if (rect.width !== w || rect.height !== h) {
            var props = {
                width: rect.width,
                height: rect.height
            };
            this.prepareProps(props);
            this.setProps(props);
        }

        context.restore();
    }

    element() {
        return this._element;
    }

    detach() {
        if (this._clone) {
            this._clone.dispose();
            delete this._clone;
        }

        if (this._mouseMoveHandler) {
            this._mouseMoveHandler.dispose();
            delete this._mouseMoveHandler;
        }
        SnapController.clearActiveSnapLines();
        this._element.setProps({visible: true}, ChangeMode.Self);
        this.parent().remove(this, ChangeMode.Root);
    }

    dropOn(event, newParent) {
        debug("dropOn: %s (%s)", newParent.displayName(), newParent.id());
        dropElementOn.call(this, event, newParent, this._element);
    }

    dropCopyOn(event, newParent) {
        var copyElement = this._element.clone();
        copyElement.each(function (x) {
            x.id(null);
        });
        dropElementOn.call(this, event, newParent, copyElement);
    }

    dragTo(event) {
        var position = this._element.beforeDragTo(event);

        if (event.event.shiftKey) {
            position = applyOrthogonalMove.call(this, position);
        }

        if (this.parentAllowSnapping(event) && !(event.event.ctrlKey || event.event.metaKey)) {
            position = SnapController.applySnapping(position, this._ownSnapPoints);
        } else {
            SnapController.clearActiveSnapLines();
        }

        UIElement.prototype.dragTo.call(this, position);
    }

    parentAllowSnapping(pos) {
        var dragData = this._element.parent().getDropData(this._element, pos);
        return dragData === null;
    }

    hitTest() {
        return false;
    }

    resize(/*Rect*/rect, /*bool*/ignoreSnapping) {
        var isComposite = this._element instanceof CompositeElement;

        if (isComposite) {
            var originalRect = this._element.getBoundaryRect();
            var sw = originalRect.width / rect.width;
            var sh = originalRect.height / rect.height;
            var rects = [];
            this._element.each(function (e) {
                var erect = e.getBoundaryRect();
                erect.x = ~~(erect.x / sw + 0.5);
                erect.y = ~~(erect.y / sh + 0.5);

                erect.width = ~~(erect.width / sw + 0.5);
                erect.height = ~~(erect.height / sh + 0.5);
                rects.push(erect);
            });

            if (this._clone) {
                this._clone.each(function (e, i) {
                    e.prepareProps(rects[i]);
                    e.setProps(rects[i], ChangeMode.Root);
                })
                this._clone.prepareProps(rect);
                this._clone.setProps(rect, ChangeMode.Root);
            }
        }

        UIElement.prototype.resize.call(this, rect);
    }
}

PropertyMetadata.registerForType(DraggingElement, {});


export default DraggingElement;
