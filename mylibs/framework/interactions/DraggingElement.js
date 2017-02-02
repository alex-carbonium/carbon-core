import PropertyMetadata from "../PropertyMetadata";
import {Types} from "../Defs";
import SnapController from "../SnapController";
import Artboard from "../Artboard";
import Invalidate from "../Invalidate";
import {areRectsIntersecting} from "../../math/math";
import Point from "../../math/point";
import InteractiveElement from "./InteractiveElement";
import ArrangeStrategy from "../ArrangeStrategy";
import Brush from "../Brush";
import Environment from "../../environment";
import DefaultSettings from "../../DefaultSettings";
import Matrix from "../../math/matrix";

var debug = require("DebugUtil")("carb:draggingElement");

function applyOrthogonalMove(pos) {
    if (Math.abs(this._initialPosition.x - pos.x) > Math.abs(this._initialPosition.y - pos.y)) {
        pos.y = this._initialPosition.y;
    } else {
        pos.x = this._initialPosition.x;
    }
}

class DraggingElement extends InteractiveElement {
    constructor(event, activeArtboard) {
        super(event.element);

        this._initialPosition = this.getBoundingBoxGlobal().topLeft();

        SnapController.calculateSnappingPoints(activeArtboard);

        var holdPcnt = Math.round((event.x - this.x()) * 100 / this.width());
        this._ownSnapPoints = SnapController.prepareOwnSnapPoints(this, holdPcnt);

        this._translation = new Point(0, 0);
        this._currentPosition = new Point(0, 0);

        this.translationMatrix = Matrix.create();
    }

    wrapSingleChild(){
        return false;
    }

    createClone(element){
        if (element.cloneWhenDragging()){
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

    saveChanges(event, draggingOverElement, page){
        super.saveChanges();

        var artboards = page.getAllArtboards();
        var elements = [];
        var oldParents = [];

        for (var i = 0; i < this.children.length; ++i){
            var phantom = this.children[i];
            var element = phantom.original;

            var phantomTarget = artboards.find(a => areRectsIntersecting(phantom.getBoundingBoxGlobal(), a.getBoundaryRectGlobal()));
            if (!phantomTarget){
                phantomTarget = page;
            }

            var parent = null;
            if (element instanceof Artboard){
                parent = page;
            }
            else if (!draggingOverElement){
                parent = element.parent();
            }
            else if (draggingOverElement.primitiveRoot() === phantomTarget.primitiveRoot()){
                parent = draggingOverElement;
            }
            else{
                parent = phantomTarget;
            }

            if (parent !== element.parent()){
                oldParents.push(element.parent());
            }

            var index = parent.positionOf(element) + 1 || parent.count();
            var target = event.altKey ? element.clone() : element;
            this.dropElementOn(event, parent, target, phantom, index);

            elements.push(target);
        }

        ArrangeStrategy.arrangeRoots(this.elements.concat(oldParents));

        this.refreshSelection();

        return elements;
    }

    dropElementOn(event, newParent, element, phantom, index) {
        debug("drop %s on %s[%d]", element.displayName(), newParent.displayName(), index);

        if (newParent !== element.parent()) {
            newParent.insert(element, index);
        }

        //hack: shapes and frames resize children themselves, think how to do it better
        if (!element.runtimeProps.resized){
            //must set new coordinates after parent is changed so that global caches are updated properly
            element.setTransform(newParent.globalViewMatrixInverted().appended(phantom.globalViewMatrix()));
        }
    }

    dragTo(event) {
        debug("Drag to x=%d y=%d", event.x, event.y);
        this._translation.set(event.x, event.y);

        if (event.event.shiftKey) {
            applyOrthogonalMove.call(this, this._translation);
        }

        this._currentPosition.set(this._translation.x, this._translation.y);

        var roundToPixels = !event.event.ctrlKey && DefaultSettings.snapTo.enabled && DefaultSettings.snapTo.pixels;
        if (roundToPixels){
            this._currentPosition.roundMutable();
        }

        if (this.parentAllowSnapping(event) && !(event.event.ctrlKey || event.event.metaKey)) {
            var snapped = SnapController.applySnapping(this._currentPosition, this._ownSnapPoints);
            if (this._currentPosition !== snapped){
                this._currentPosition.set(snapped.x, snapped.y);
                if (roundToPixels){
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
        Invalidate.requestUpperOnly();
    }

    strokeBorder(context, w, h){
        if (Brush.canApply(this.stroke())){
            context.save();

            var scale = Environment.view.scale();
            context.scale(1/scale, 1/scale);

            context.beginPath();
            for (var i = 0; i < this.children.length; i++){
                var child = this.children[i];
                child.drawBoundaryPath(context);
            }

            Brush.stroke(this.stroke(), context);
            context.restore();
        }
    }

    parentAllowSnapping(pos) {
        return !this._elements.some(x => x.parent() !== this && x.parent().getDropData(x, pos) !== null);
    }

    isDropSupported(){
        return !this._elements.some(x => !x.isDropSupported());
    }

    allowMoveOutChildren(event){
        return !this._elements.some(x => x.parent() !== this && !x.parent().allowMoveOutChildren(undefined, event));
    }
}
DraggingElement.prototype.t = Types.DraggingElement;

PropertyMetadata.registerForType(DraggingElement, {});

export default DraggingElement;
