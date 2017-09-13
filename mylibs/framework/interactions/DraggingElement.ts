import PropertyMetadata from "../PropertyMetadata";
import { Types } from "../Defs";
import SnapController from "../SnapController";
import Artboard from "../Artboard";
import Invalidate from "../Invalidate";
import { areRectsIntersecting } from "../../math/math";
import Point from "../../math/point";
import Brush from "../Brush";
import Environment from "../../environment";
import UserSettings from "../../UserSettings";
import Matrix from "../../math/matrix";
import { ChangeMode, IMatrix, IContainer } from "carbon-core";
import Selection from "framework/SelectionModel";
import CompositeElement from "../CompositeElement";
import Duplicate from "commands/Duplicate";
import UIElement from "../UIElement";
import GlobalMatrixModifier from "../GlobalMatrixModifier";

var debug = require("DebugUtil")("carb:draggingElement");

function applyOrthogonalMove(pos) {
    if (Math.abs(this._initialPosition.x - pos.x) > Math.abs(this._initialPosition.y - pos.y)) {
        pos.y = this._initialPosition.y;
    } else {
        pos.x = this._initialPosition.x;
    }
}

class DraggingElement extends CompositeElement {
    private activeDecorators = [];

    constructor(elementOrComposite, event) {
        super();

        var elements: UIElement[] = elementOrComposite instanceof CompositeElement ? elementOrComposite.elements : [elementOrComposite];
        this.children = [];

        if (!Selection.isElementSelected(e)) {
            Selection.makeSelection(elements);
        }

        for (var e of elements) {
            e.clearSavedLayoutProps();
            this.register(e);
            this.saveDecorators(e);
        }

        this.saveDecorators(elementOrComposite);

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

        this.altChanged(event.event.altKey); // it will also update snapping
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

    private saveDecorators(e) {
        if (e.decorators) {
            e.decorators.forEach(x => {
                if (x.visible() && this.activeDecorators.indexOf(x) === -1) {
                    this.activeDecorators.push(x);
                    x.visible(false);
                }
            });
        }
    }

    detach() {
        debug("Detached");

        this.activeDecorators.forEach(x => x.visible(true));
        this.activeDecorators.length = 0;

        SnapController.clearActiveSnapLines();

        this.parent().remove(this, ChangeMode.Self);
    }

    stopDragging(event, draggingOverElement, page) {
        var artboards = page.getAllArtboards();
        var elements = [];

        for (var i = 0; i < this.children.length; ++i) {
            var element = this.children[i];
            element.clearSavedLayoutProps();

            var target = artboards.find(a => areRectsIntersecting(element.getBoundingBoxGlobal(), a.getBoundaryRectGlobal()));
            if (!target) {
                target = page;
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
            else if (draggingOverElement.primitiveRoot() === target.primitiveRoot()) {
                parent = draggingOverElement;
            }
            else {
                parent = target;
            }

            if (index === null) {
                index = parent.positionOf(element) + 1 || parent.count();
            }

            let source = element;
            if (this._clones) {
                source = this._clones[i];
                source.parent().remove(source, ChangeMode.Self);
            }

            this.applyElementSnapshot(this._propSnapshot, element, ChangeMode.Self);
            this.dropElementOn(event, parent, source, element.globalViewMatrix(), index);

            elements.push(source);
        }

        Selection.refreshSelection();

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
    dropElementOn(event, newParent: IContainer, element: UIElement, globalMatrix: IMatrix, index: number) {
        debug("drop %s on %s[%d]", element.displayName(), newParent.displayName(), index);

        if (newParent !== element.parent()) {
            element.parent().remove(element);
        }

        if (!newParent.autoPositionChildren()) {
            var gm = globalMatrix.clone().prependedWithTranslation(this._translation.x, this._translation.y);
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
            this._clones.forEach(e => e.visible(alt, ChangeMode.Self));
        }

        SnapController.clearActiveSnapLines();
        SnapController.calculateSnappingPoints(this._snappingTarget, this);
    }

    _updateCurrentPosition(event) {
        this._translation.set(event.x + this._globalOffsetX, event.y + this._globalOffsetY);

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
    }

    dragTo(event) {
        debug("Drag to x=%d y=%d", event.x, event.y);

        this._updateCurrentPosition(event);

        for (var e of this.children) {
            e.applyTranslation(this._translation, true, ChangeMode.Self);
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

    draw(context) {
        context.save();

        var scale = Environment.view.scale();
        context.scale(1 / scale, 1 / scale);

        GlobalMatrixModifier.pushPrependScale();
        context.beginPath();
        for (var i = 0; i < this.children.length; i++) {
            var child = this.children[i];
            child.drawBoundaryPath(context);
        }

        context.lineWidth = this.strokeWidth();
        Brush.stroke(this.stroke(), context);
        GlobalMatrixModifier.pop();

        context.restore();
    }
}

DraggingElement.prototype.t = Types.DraggingElement;

PropertyMetadata.registerForType(DraggingElement, {
    stroke: {
        defaultValue: Brush.createFromColor(UserSettings.frame.stroke)
    }
});

export default DraggingElement;
