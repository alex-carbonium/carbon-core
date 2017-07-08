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

var debug = require("DebugUtil")("carb:draggingElement");

function applyOrthogonalMove(pos) {
    if (Math.abs(this._initialPosition.x - pos.x) > Math.abs(this._initialPosition.y - pos.y)) {
        pos.y = this._initialPosition.y;
    } else {
        pos.x = this._initialPosition.x;
    }
}

class DraggingElement extends TransformationElement {
    constructor(elementOrComposite, event) {
        super(elementOrComposite);

        this._initialPosition = this.getBoundingBoxGlobal().topLeft();

        let snappingTarget = elementOrComposite.first().parent().primitiveRoot() || Environment.view.page.getActiveArtboard();
        this._snappingTarget = snappingTarget;
        this._altPressed = undefined;

        var holdPcnt = Math.round((event.x - this.x()) * 100 / this.width());
        this._ownSnapPoints = SnapController.prepareOwnSnapPoints(this, holdPcnt);

        this._translation = new Point(0, 0);
        this._currentPosition = new Point(0, 0);

        this.translationMatrix = Matrix.create();
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
        super.detach();

        debug("Detached");
        SnapController.clearActiveSnapLines();
    }

    stopDragging(event, draggingOverElement, page) {
        this.saveChanges();
        this.showOriginal(true);

        var artboards = page.getAllArtboards();
        var elements = [];

        for (var i = 0; i < this.children.length; ++i) {
            var phantom = this.children[i];
            var element = phantom.original;

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

            var target = event.altKey ? element.clone() : element;
            this.dropElementOn(event, parent, target, phantom, index);

            elements.push(target);
        }

        this.refreshSelection();

        return elements;
    }

    dropElementOn(event, newParent, element, phantom, index) {
        debug("drop %s on %s[%d]", element.displayName(), newParent.displayName(), index);

        if (newParent !== element.parent()) {
            newParent.insert(element, index);
        } else if(newParent.allowRearrange() && element.zOrder() !== index) {
            newParent.changePosition(element, index);
        }

        if (!newParent.autoPositionChildren()) {
            //must set new coordinates after parent is changed so that global caches are updated properly
            element.setTransform(newParent.globalMatrixToLocal(phantom.globalViewMatrix()));
        }
    }

    dragTo(event) {
        debug("Drag to x=%d y=%d", event.x, event.y);
        this._translation.set(event.x, event.y);

        if(event.event.altKey !== this._altPressed) {
            SnapController.clearActiveSnapLines();
            SnapController.calculateSnappingPoints(this._snappingTarget);
            this._altPressed = event.event.altKey;
        }

        if (event.event.shiftKey) {
            applyOrthogonalMove.call(this, this._translation);
        }

        this._currentPosition.set(this._translation.x, this._translation.y);

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
        this.translationMatrix.tx = this._translation.x;
        this.translationMatrix.ty = this._translation.y;

        this.applyTranslation(this._translation, true);
        Invalidate.requestInteractionOnly();
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

    parentAllowSnapping(pos) {
        return this._elements.every(x => x.parent() === this || x.parent().getDropData(x, pos) === null);
    }

    isDropSupported() {
        return this._elements.every(x => x.isDropSupported());
    }

    allowMoveOutChildren(event) {
        return this._elements.every(x => x.parent() === this || x.parent().allowMoveOutChildren(undefined, event));
    }
}
DraggingElement.prototype.t = Types.DraggingElement;

PropertyMetadata.registerForType(DraggingElement, {});

export default DraggingElement;
