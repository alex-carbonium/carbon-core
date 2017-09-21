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
import { IUIElement, ChangeMode, IMatrix, IContainer, IMouseEventData, IPoint } from "carbon-core";
import Selection from "framework/SelectionModel";
import CompositeElement from "../CompositeElement";
import Duplicate from "commands/Duplicate";
import UIElement from "../UIElement";
import Container from "../Container";
import GlobalMatrixModifier from "../GlobalMatrixModifier";
import BoundaryPathDecorator from "../../decorators/BoundaryPathDecorator";

var debug = require("DebugUtil")("carb:draggingElement");

const DraggingDecorator = new BoundaryPathDecorator(true);

export class DraggingElement extends CompositeElement {
    private activeDecorators = [];
    private _capturePoint: IPoint;
    private _initialPosition: IPoint;
    private _translation: Point;

    constructor(elementOrComposite, event: IMouseEventData) {
        super();

        var elements: UIElement[] = elementOrComposite instanceof CompositeElement ? elementOrComposite.elements : [elementOrComposite];
        this.children = [];

        Selection.makeSelection(elements);

        for (var e of elements) {
            e.clearSavedLayoutProps();
            this.register(e);
            this.saveDecorators(e);
        }

        this.saveDecorators(elementOrComposite);
        this.addDecorator(DraggingDecorator);

        this.performArrange();

        this._capturePoint = new Point(event.x, event.y);
        this._initialPosition = this.getBoundingBoxGlobal().topLeft();
        this._translation = new Point(0, 0);

        let snappingTarget = elementOrComposite.first().parent().primitiveRoot()
            || Environment.view.page.getActiveArtboard()
            || Environment.view.page;

        this._snappingTarget = snappingTarget;

        var holdPcnt = Math.round((event.x - this.x()) * 100 / this.width());
        this._ownSnapPoints = SnapController.prepareOwnSnapPoints(this, holdPcnt);

        this._propSnapshot = this.getPropSnapshot();

        this.altChanged(event.altKey); // it will also update snapping
    }

    wrapSingleChild() {
        return false;
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

        this.elements.forEach(x => x.clearSavedLayoutProps());

        SnapController.clearActiveSnapLines();

        this.removeDecorator(DraggingDecorator);
        this.parent().remove(this, ChangeMode.Self);
    }

    stopDragging(event: IMouseEventData, draggingOverElement, page) {
        let artboards = page.getAllArtboards();
        let elements: IUIElement[] = [];

        for (var i = 0; i < this.children.length; ++i) {
            var element = this.children[i];

            var topIntersectingParent = artboards.find(a => areRectsIntersecting(element.getBoundingBoxGlobal(), a.getBoundaryRectGlobal()));
            if (!topIntersectingParent) {
                topIntersectingParent = page;
            }

            var parent: Container = null;
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
            else if (draggingOverElement.primitiveRoot() === topIntersectingParent.primitiveRoot()) {
                parent = draggingOverElement;
            }
            else {
                parent = topIntersectingParent;
            }

            //the case for elements which cannot be dropped - e.g., ImageContent
            if (parent !== element.parent() && !parent.canAccept([element], false, event.ctrlKey)) {
                elements.push(element);
                continue;
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

    _updateCurrentPosition(event: IMouseEventData) {
        //this._translation.set(event.x + this._globalOffsetX, event.y + this._globalOffsetY);
        let x = event.x;
        let y = event.y;

        if (event.shiftKey) {
            if (Math.abs(this._capturePoint.x - x) > Math.abs(this._capturePoint.y - y)) {
                y = this._capturePoint.y;
            }
            else {
                x = this._capturePoint.x;
            }
            //applyOrthogonalMove.call(this, this._translation);
        }

        //this._currentPosition.set(this._translation.x, this._translation.y);

        this._translation.set(x - this._capturePoint.x, y - this._capturePoint.y);

        let roundToPixels = !event.ctrlKey && UserSettings.snapTo.enabled && UserSettings.snapTo.pixels;
        if (roundToPixels) {
            this._translation.roundMutable();
        }

        let newPosition = Point.allocate(this._initialPosition.x + this._translation.x, this._initialPosition.y + this._translation.y);

        if (this.parentAllowSnapping(event) && !event.ctrlKey) {
            let snapped = SnapController.applySnapping(newPosition, this._ownSnapPoints);
            if (!newPosition.equals(snapped)) {
                this._translation.set(this._translation.x + snapped.x - newPosition.x, this._translation.y + snapped.y - newPosition.y);
                if (roundToPixels) {
                    this._translation.roundMutable();
                }
            }
        }
        else {
            SnapController.clearActiveSnapLines();
        }

        newPosition.free();
    }

    dragTo(event) {
        debug("Drag to x=%d y=%d", event.x, event.y);

        this._updateCurrentPosition(event);

        for (var e of this.children) {
            e.applyGlobalTranslation(this._translation, true, ChangeMode.Self);
        }
        this.applyGlobalTranslation(this._translation, true, ChangeMode.Self);
    }

    constraints() {
        if (this.children.length !== 1) {
            return null;
        }

        return this.children[0].constraints();
    }

    parentAllowSnapping(pos) {
        return this.children.every(x => x.parent().getDropData(x, pos) === null);
    }

    allowMoveOutChildren(event) {
        return this.children.every(x => x.parent().allowMoveOutChildren(undefined, event));
    }
}

DraggingElement.prototype.t = Types.DraggingElement;

PropertyMetadata.registerForType(DraggingElement, {
    stroke: {
        defaultValue: Brush.createFromColor(UserSettings.frame.stroke)
    }
});
