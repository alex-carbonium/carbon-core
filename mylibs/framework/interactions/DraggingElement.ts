import PropertyMetadata from "../PropertyMetadata";
import { Types } from "../Defs";
import SnapController from "../SnapController";
import Artboard from "../Artboard";
import Invalidate from "../Invalidate";
import { areRectsIntersecting } from "../../math/math";
import Point from "../../math/point";
import TransformationElement from "./TransformationElement";
import Brush from "../Brush";
import Environment from "../../environment";
import UserSettings from "../../UserSettings";
import Matrix from "../../math/matrix";
import { ChangeMode } from "carbon-core";
import Selection from "framework/SelectionModel";
import CompositeElement from "../CompositeElement";
import Duplicate from "commands/Duplicate";
import UIElement from "../UIElement";

var debug = require("DebugUtil")("carb:draggingElement");

function applyOrthogonalMove(pos) {
    if (Math.abs(this._initialPosition.x - pos.x) > Math.abs(this._initialPosition.y - pos.y)) {
        pos.y = this._initialPosition.y;
    } else {
        pos.x = this._initialPosition.x;
    }
}

class DraggingElement extends CompositeElement {
    constructor(elementOrComposite, event) {
        super();

        var elements: UIElement[] = elementOrComposite instanceof CompositeElement ? elementOrComposite.elements : [elementOrComposite];
        this.children = [];

        for (var e of elements) {
            e.clearSavedLayoutProps();
            this.register(e);
        }

        if(!Selection.isElementSelected(e)) {
            Selection.makeSelection(this.children);
        }

        this.performArrange();

        var initialPosition = this.getBoundingBox();
        var initialPositionGlobal = this.getBoundingBoxGlobal();

        this._globalOffsetX = initialPositionGlobal.x - initialPosition.x;
        this._globalOffsetY = initialPositionGlobal.y - initialPosition.y;
        this._initialPosition = initialPositionGlobal;

        let snappingTarget = elementOrComposite.first().parent().primitiveRoot() || Environment.view.page.getActiveArtboard();
        this._snappingTarget = snappingTarget;

        var holdPcnt = Math.round((event.x - this.x()) * 100 / this.width());
        this._ownSnapPoints = SnapController.prepareOwnSnapPoints(this, holdPcnt);

        this._translation = new Point(0, 0);
        this._currentPosition = new Point(0, 0);

        this._propSnapshot = this.getPropSnapshot();

        this.altChanged(event.event.altKey);// it will also update snapping
    }

    wrapSingleChild() {
        return false;
    }

    createClone(element) {
        if (element.cloneWhenDragging()) {
            return element.clone();
        }
        return super.createClone(element);
    }

    displayName() {
        return "DraggingElement";
    }

    detach() {
        //  super.detach();

        debug("Detached");
        SnapController.clearActiveSnapLines();

        this.parent().remove(this, ChangeMode.Self);
    }

    stopDragging(event, draggingOverElement, page) {
        var artboards = page.getAllArtboards();
        var elements = [];

        for (var i = 0; i < this.children.length; ++i) {
            var phantom = this.children[i];
            var element = phantom.original || phantom;

            var phantomTarget = artboards.find(a => areRectsIntersecting(phantom.getBoundingBoxGlobal(), a.getBoundaryRectGlobal()));
            if (!phantomTarget) {
                phantomTarget = page;
            }

            var parent = null;
            let index = null;
            if (element instanceof Artboard) {
                parent = page;
            }
            else if (!draggingOverElement) {
                parent = element.parent();
                if (parent.allowRearrange()) {
                    var dropData = parent.getDropData(event, element);
                    index = dropData.index;
                }
            }
            else if (draggingOverElement.primitiveRoot() === phantomTarget.primitiveRoot()) {
                parent = draggingOverElement;
            }
            else {
                parent = phantomTarget;
            }

            if (index === null) {
                index = parent.positionOf(element) + 1 || parent.count();
            }

            this.dropElementOn(event, parent, element, phantom, index);

            elements.push(element);
        }

        Selection.refreshSelection();

        var newSnapshot = this.getPropSnapshot();
        this.applySnapshot(this._propSnapshot, ChangeMode.Self);

        var copyClones = this._clones;
        if (copyClones) {
            copyClones.forEach(e => {
                var parent = e.parent();
                var index = parent.positionOf(e);
                parent.remove(e, ChangeMode.Self);
                if (e.visible()) {
                    parent.insert(e, index);
                }
            })
        }

        this.applySnapshot(newSnapshot, ChangeMode.Model);

        return elements;
    }

    propsUpdated(newProps, oldProps, mode) {
        super.propsUpdated(newProps, oldProps, ChangeMode.Self);
    }

    /**
     * Dropping between parents ensures that the matrix is changed while element is detached.
     * This is needed for the both old and new parent to know "correct" element matrix.
     * Used for extended artboard hit-test box.
     */
    dropElementOn(event, newParent, element, phantom, index) {
        debug("drop %s on %s[%d]", element.displayName(), newParent.displayName(), index);

        let gm = phantom.globalViewMatrix();

        if (newParent !== element.parent()) {
            element.parent().remove(element);
        }

        if (!newParent.autoPositionChildren()) {
            element.setTransform(newParent.globalMatrixToLocal(gm));
        }

        if (newParent !== element.parent()) {
            newParent.insert(element, index);
        }
        else if (newParent.allowRearrange() && element.zOrder() !== index) {
            newParent.changePosition(element, index);
        }
    }

    altChanged(alt) {
        if (alt) {
            if (!this._clones) {
                var shanpshot = this.getPropSnapshot();
                this.applySnapshot(this._propSnapshot, ChangeMode.Self);
                this._clones = Duplicate.run(this.elements, ChangeMode.Self, true);
                this.applySnapshot(shanpshot, ChangeMode.Self);
            }
        }

        if (this._clones) {
            this._clones.forEach(e => e.visible(alt));
        }

        SnapController.clearActiveSnapLines();
        SnapController.calculateSnappingPoints(this._snappingTarget, this);
    }

    dragTo(event) {
        debug("Drag to x=%d y=%d", event.x, event.y);
        this._translation.set(event.x+ this._globalOffsetX, event.y + this._globalOffsetY);

        if (event.event.shiftKey) {
            applyOrthogonalMove.call(this, this._translation);
        }

        this._currentPosition.set(this._translation.x , this._translation.y);

        var roundToPixels = !event.event.ctrlKey && UserSettings.snapTo.enabled && UserSettings.snapTo.pixels;
        if (roundToPixels) {
            this._currentPosition.roundMutable();
        }

        if (this.parentAllowSnapping(event) && !(event.event.ctrlKey || event.event.metaKey)) {
            var snapped = SnapController.applySnapping(this._currentPosition, this._ownSnapPoints);
            if (this._currentPosition !== snapped) {
                this._currentPosition.set(snapped.x, snapped.y);
                if (roundToPixels) {
                    this._currentPosition.roundMutable();
                }
            }
        }
        else {
            SnapController.clearActiveSnapLines();
        }

        this._translation.set(this._currentPosition.x - this._initialPosition.x, this._currentPosition.y - this._initialPosition.y);

        for (var e of this.children) {
            e.applyTranslation(this._translation, true, ChangeMode.Self);
        }
    }

    strokeBorder(context, w, h) {
        if (Brush.canApply(this.stroke())) {
            context.save();

            var scale = Environment.view.scale();
            context.scale(1 / scale, 1 / scale);

            context.beginPath();
            for (var i = 0; i < this.children.length; i++) {
                var child = this.children[i];
                child.drawBoundaryPath(context);
            }

            context.lineWidth = this.strokeWidth();
            Brush.stroke(this.stroke(), context);
            context.restore();
        }
    }

    constraints() {
        if (this.children.length !== 1) {
            return null;
        }

        return this.children[0].constraints();
    }

    parentAllowSnapping(pos) {
        return this.children.every(x => x.parent() === this || x.parent().getDropData(x, pos) === null);
    }

    isDropSupported() {
        return this.children.every(x => x.isDropSupported());
    }

    allowMoveOutChildren(event) {
        return this.children.every(x => x.parent() === this || x.parent().allowMoveOutChildren(undefined, event));
    }
}

DraggingElement.prototype.t = Types.DraggingElement;

PropertyMetadata.registerForType(DraggingElement, {});

export default DraggingElement;
