import UIElement from "framework/UIElement";
import ResizeDimension from "framework/ResizeDimension";
import Matrix from "math/matrix";
import CompositeElement from "framework/CompositeElement";
import SelectComposite from "framework/SelectComposite";
import PropertyMetadata from "framework/PropertyMetadata";
import Container from "framework/Container";
import {createUUID} from "../util";
import {ChangeMode, Types} from "./Defs";
import Selection from "framework/SelectionModel";
import Environment from "environment";
import SnapController from "./SnapController";
import UserSettings from "../UserSettings";
import Artboard from "./Artboard";
import {areRectsIntersecting} from "../math/math";
import Page from "./Page";

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

function onMouseMove(event) {
    this._lastPoint = event;
}

class DraggingElement extends UIElement {
    constructor(element, holdOffset, resize) {
        super();
        this._element = element;
        //this._origProps = element.selectProps(["visible"]);
        this._clone = null;
        // if (element.cloneWhenDragging()){
        //     var primitiveRoot = element.primitiveRoot();
        //     if (primitiveRoot) {
        //         this._clone = primitiveRoot.createDragClone(element);
        //     }
        //     else {
        //         this._clone = element.clone();
        //     }
        //
        //     this._element.setProps({visible: this._element.visibleWhenDrag()}, ChangeMode.Self);
        //     this._clone.setProps({id: element.id()}, ChangeMode.Self); // need to have the same id for active frame
        // }
        // else{
        //     this._clone = this._element;
        // }

        //this._clone._canDraw = true;
        this._resize = resize;
        // var parent = element.parent();
        // var pos = element.position();
        // if (!(element instanceof CompositeElement)) {
        //     pos = parent.local2global(pos);
        // }

        // this.setProps(element.selectProps([
        //     "x", "y", "width", "height", "angle", "flipVertical", "flipHorizontal"]),
        //     ChangeMode.Self);

        this.canDrag(false);
        this.isTemporary(true);

        var root = element.children[0].element.primitiveRoot();
        SnapController.calculateSnappingPoints(root);

        var holdPcnt = holdOffset ? (~~(holdOffset.x * 100 / element.width())) : 50;
        this._ownSnapPoints = SnapController.prepareOwnSnapPoints(element, holdPcnt);

        this._mouseMoveHandler = Environment.controller.mousemoveEvent.bind(this, onMouseMove);

        this._decorators = element.decorators;
        if (this._decorators){
            this._decorators.forEach(x => x.visible(false));
        }

        this.strokeFrame = true;
    }

    showOriginal(value){
        if (value){
            //this._element.setProps({visible: true}, ChangeMode.Self);
        }
        else{
            //this._element.setProps({visible: false}, ChangeMode.Self);
        }
    }

    canBeAccepted(element) {
        return false;
    }

    displayName() {
        return "DraggingElement";
    }

    draw(context, environment) {
        var scaleX, scaleY, scale = environment.view.scale();

        // function fillBackground() {
        //     context.save();
        //     context.fillStyle = 'rgba(160, 180, 200, 0.1)';
        //     context.fillRect(0, 0, w, h);
        //     context.restore();
        // }

        var x = this.x();
        var y = this.y();
        debug("Drawing at: x=%d y=%d", this._element.x(), this._element.y());

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

        //context.globalAlpha = 0.8;

        //var oldSize = this._clone.getBoundaryRect();
        //var newPos = this._element.parent().global2local({x: x, y: y});
        //var rect = {x: newPos.x, y: newPos.y, width: w, height: h, angle: this.angle()};
        //this._clone.prepareProps(rect);
        //this._clone.setProps(rect, ChangeMode.Root);

        // if (this._clone instanceof Container) {
        //     this._clone.arrange({oldValue: oldSize, newValue: rect});
        // }

        //rect.width = this._clone.width();
        //rect.height = this._clone.height();

        // var parent = this._element.parent();
        //
        // if (parent !== NullContainer) {
        //     var globalViewMatrix = parent.globalViewMatrix().clone().append(this._clone.viewMatrix());
        // } else {
        //     globalViewMatrix = this._clone.viewMatrix();
        // }

        var sh = 1, sv = 1;
        // if (this.flipHorizontal() !== this._clone.flipHorizontal()) {
        //     sh = -1;
        // }
        // if (this.flipVertical() !== this._clone.flipVertical()) {
        //     sv = -1;
        // }
        if (sh !== 1 || sv !== 1) {
            //var origin = {x: this._clone.width() / 2, y: this._clone.height() / 2};
            //globalViewMatrix.scale(sh, sv, origin.x, origin.y);
        }
        var isComposite = this._element instanceof SelectComposite;

        if (isComposite) {
            //globalViewMatrix.translate(this.x(), this.y());
        }
        //globalViewMatrix.applyToContext(context);

        if (this.strokeFrame){
            this._drawFrame(context, scale);
        }

        if (true || this._element.clipSelf() && this._element.clipDragClone()) {
            //context.rectPath(0, 0, w, h);
            //context.clip();
        }

        //fillBackground();
        context.beginPath();

        // if (isComposite) {
        //     context.translate(-this._clone.x(), -this._clone.y());
        // }
        this._element.draw(context, environment);
        // if (rect.width !== w || rect.height !== h) {
        //     var props = {
        //         width: rect.width,
        //         height: rect.height
        //     };
        //     this.prepareProps(props);
        //     this.setProps(props);
        // }

        context.restore();
    }

    _drawFrame(context, scale){
        context.save();
        context.scale(1/scale, 1/scale);
        context.strokeStyle = UserSettings.frame.stroke;
        context.strokeRect(
            Math.round(this._element.x()/scale),
            Math.round(this._element.y()/scale),
            this._element.width() * scale + .5|0,
            this._element.height() * scale + .5|0
        );
        context.restore();
    }

    element() {
        return this._element;
    }

    detach() {
        debug("Detached");
        // if (this._clone) {
        //     if (this._element.cloneWhenDragging()){
        //         this._clone.dispose();
        //     }
        //     delete this._clone;
        // }

        if (this._mouseMoveHandler) {
            this._mouseMoveHandler.dispose();
            delete this._mouseMoveHandler;
        }
        SnapController.clearActiveSnapLines();

        if (this._decorators){
            this._decorators.forEach(x => x.visible(true));
            delete this._decorators;
        }
        this.parent().remove(this, ChangeMode.Root);
        //this._element && this._element.updateViewMatrix();
    }

    drop(event, draggingOverElement, page){
        var artboards = page.getAllArtboards();

        for (var i = 0; i < this._element.children.length; ++i){
            var phantom = this._element.children[i];
            var element = phantom.element;

            var phantomTarget = artboards.find(a => areRectsIntersecting(phantom.getBoundaryRectGlobal(), a.getBoundaryRectGlobal()));
            if (!phantomTarget){
                phantomTarget = page;
            }

            var parent = null;
            if (draggingOverElement.primitiveRoot() === phantomTarget.primitiveRoot()){
                parent = draggingOverElement;
            }
            else{
                parent = phantomTarget;
            }

            var index = parent.positionOf(element) + 1 || parent.count();
            var source = event.altKey ? element.clone() : element;
            this.dropElementOn(event, parent, source, phantom.getBoundaryRectGlobal(), index);
        }

        return this._element.children;
    }

    dropElementOn(event, newParent, element, globalPos, index) {
        debug("drop %s on %s[%d]", element.displayName(), newParent.displayName(), index);
        //var pos = newParents.global2localDropPosition(this.position());
        //var indexes = [];

        // if (event) {
        //     var dropData = newParents.getDropData({x: event.x, y: event.y}, this._element);
        //     if (dropData !== null) {
        //         indexes = dropData.indexes;
        //     }
        // }


        // if (this.angle() !== target.angle()) {
        //     props.angle = this.angle();
        // }
        // if (this.flipVertical() !== target.flipVertical()) {
        //     props.flipVertical = this.flipVertical();
        // }
        // if (this.flipHorizontal() !== target.flipHorizontal()) {
        //     props.flipHorizontal = this.flipHorizontal();
        // }

        var localPos = newParent.global2local(globalPos);

        if (newParent !== element.parent()) {
            newParent.insert(element, index);
        }

        //hack: shapes and frames resize children themselves, think how to do it better
        if (!element.runtimeProps.resized){
            //must set new coordinates after parent is changed so that global caches are updated properly
            element.prepareAndSetProps(localPos);
        }

        // if (target instanceof CompositeElement) {
        //     var sw = ~~target.width() / ~~this._clone.width();
        //     var sh = ~~target.height() / ~~this._clone.height();
        //     pos.x -= target.x();
        //     pos.y -= target.y();
        //
        //     if (this._resize) {
        //         var x = target.x();
        //         var y = target.y();
        //         target.each(function (element) {
        //             var width = ~~(element.width() / sw),
        //                 height = ~~(element.height() / sh);
        //             var p = element.position();
        //             var gp = element.parent().global2local({x: x, y: y});
        //             var elementGlobal = {x: (p.x - gp.x) / sw + gp.x + pos.x, y: (p.y - gp.y) / sh + gp.y + pos.y};
        //
        //             element.setProps({
        //                 x: elementGlobal.x,
        //                 y: elementGlobal.y,
        //                 width: (element.resizeDimensions() & ResizeDimension.Horizontal) ? width : element.width(),
        //                 height: (element.resizeDimensions() & ResizeDimension.Vertical) ? height : element.height()
        //             });
        //             //when does _resize can cause changePosition?
        //             // if (indexes !== undefined) {
        //             //     element.parent().changePosition(element, indexes);
        //             // }
        //             //commands.push(element.constructMoveCommand(element.parent(), indexes));
        //         });
        //
        //         var props = {
        //             x: this._clone.x(),
        //             y: this._clone.y(),
        //             width: this._clone.width(),
        //             height: this._clone.height()
        //         }
        //
        //         target.prepareProps(props);
        //         target.setProps(props);
        //     }
        //     else {
        //         target.each(function (element) {
        //             var width = element.width(),
        //                 height = element.height();
        //
        //             var elementGlobal = element.parent().local2global(element.position());
        //             var rect = {x: pos.x + elementGlobal.x, y: pos.y + elementGlobal.y, width: width, height: height};
        //             if (!element.id()) {
        //                 element.id(createUUID());
        //                 element.move(rect);
        //                 newParents.insert(element, indexes);
        //             } else {
        //                 if (element.parent() !== newParents) {
        //                     newParents.insert(element, indexes);
        //                 }
        //                 element.setProps(rect);
        //             }
        //         });
        //
        //         var props = {
        //             x: target.x() + pos.x,
        //             y: target.x() + pos.y,
        //             width: target.width(),
        //             height: target.height()
        //         };
        //
        //         target.prepareProps(props);
        //         target.setProps(props);
        //     }
        // } else {
        //     if (!target.id()) {
        //         target.setProps({id: createUUID(), x: pos.x, y: pos.y}, ChangeMode.Root);
        //         newParents.insert(target, indexes);
        //     } else {
        //         var props = {x: pos.x, y: pos.y, width: this.width(), height: this.height()};
        //
        //         if (this.angle() !== target.angle()) {
        //             props.angle = this.angle();
        //         }
        //         if (this.flipVertical() !== target.flipVertical()) {
        //             props.flipVertical = this.flipVertical();
        //         }
        //         if (this.flipHorizontal() !== target.flipHorizontal()) {
        //             props.flipHorizontal = this.flipHorizontal();
        //         }
        //
        //         if (target.parent() !== newParents) {
        //             newParents.insert(target, indexes);
        //         }
        //
        //         //hack: shapes and frames resize children themselves, think how to do it better
        //         if (!target.runtimeProps.resized){
        //             //must set new coordinates after parent is changed so that global caches are updated properly
        //             target.prepareAndSetProps(props);
        //         }
        //     }
        // }
    }

    dropOn(event, oldParents, newParents) {
        // debug("dropOn: %s", newParents.map(x => x.displayName() + " (" + x.id() + ")").join(", "));
        // // if (this._element.cloneWhenDragging()){
        // //     this._element.setProps(this._origProps, ChangeMode.Self);
        // // }
        // dropElementOn.call(this, event, oldParents, newParents, this._element.elements, this._element.elements);
    }

    dropCopyOn(event, oldParents, newParents) {
        // if (this._element.cloneWhenDragging()){
        //     this._element.setProps(this._origProps, ChangeMode.Self);
        // }
        //var clone = this._element.clone();
        //dropElementOn.call(this, event, oldParents, newParents, this._element.elements, clone.elements);
    }

    dragTo(event) {
        debug("Drag to x=%d y=%d", event.x, event.y);
        var position = {x: event.x, y: event.y};

        if (event.event.shiftKey) {
            position = applyOrthogonalMove.call(this, position);
        }

        if (this.parentAllowSnapping(event) && !(event.event.ctrlKey || event.event.metaKey)) {
            position = SnapController.applySnapping(position, this._ownSnapPoints);
        } else {
            SnapController.clearActiveSnapLines();
        }

        //UIElement.prototype.dragTo.call(this, position);
        this._element.setProps(position);
    }

    parentAllowSnapping(pos) {
        var dragData = this._element.parent().getDropData(this._element, pos);
        return dragData === null;
    }

    hitTest() {
        return false;
    }

    startResizing(){
        if(this._clone){
            this._clone.startResizing();
        } else {
            this._element.startResizing();
        }
    }

    stopResizing(){
        if(this._clone){
            this._clone.stopResizing();
        } else {
            this._element.stopResizing();
        }
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
        if(this._clone){
            this._clone.resize(rect);
        }
        this.updateViewMatrix();
        this._clone && this._clone.updateViewMatrix();
        this._element && this._element.updateViewMatrix();
    }
}
DraggingElement.prototype.t = Types.DraggingElement;

PropertyMetadata.registerForType(DraggingElement, {});


export default DraggingElement;
