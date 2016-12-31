import PropertyMetadata from "../PropertyMetadata";
import {Types} from "../Defs";
import SnapController from "../SnapController";
import Artboard from "../Artboard";
import Invalidate from "../Invalidate";
import {areRectsIntersecting} from "../../math/math";
import Point from "../../math/point";
import InteractiveElement from "./InteractiveElement";
import ArrangeStrategy from "../ArrangeStrategy";

var debug = require("DebugUtil")("carb:draggingElement");

function applyOrthogonalMove(pos) {
    if (Math.abs(this._initialPosition.x - pos.x) > Math.abs(this._initialPosition.y - pos.y)) {
        pos.y = this._initialPosition.y;
    } else {
        pos.x = this._initialPosition.x;
    }

    return pos;
}

class DraggingElement extends InteractiveElement {
    constructor(event, activeArtboard) {
        super(event.element);

        this._initialPosition = this.getTranslation();
        this._currentPosition = this._initialPosition;

        SnapController.calculateSnappingPoints(activeArtboard);

        var holdPcnt = Math.round((event.x - this.x()) * 100 / this.width());
        this._ownSnapPoints = SnapController.prepareOwnSnapPoints(this, holdPcnt);
    }

    displayName() {
        return "DraggingElement";
    }

    detach() {
        super.detach();

        debug("Detached");
        SnapController.clearActiveSnapLines();
    }

    drawSelf(context){
        context.save();
        context.translate(this._currentPosition.x, this._currentPosition.y);
        super.drawSelf.apply(this, arguments);
        context.restore();
    }

    saveChanges(event, draggingOverElement, page){
        super.saveChanges();
        this.applyTranslation(this._currentPosition);

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
        var position = new Point(event.x, event.y);

        if (event.event.shiftKey) {
            position = applyOrthogonalMove.call(this, position);
        }

        if (this.parentAllowSnapping(event) && !(event.event.ctrlKey || event.event.metaKey)) {
            position = SnapController.applySnapping(position, this._ownSnapPoints);
        } else {
            SnapController.clearActiveSnapLines();
        }

        this._currentPosition = position.subtract(this._initialPosition);
        Invalidate.requestUpperOnly();
    }

    parentAllowSnapping(pos) {
        return !this._elements.some(x => x.parent().getDropData(x, pos) !== null);
    }

    isDropSupported(){
        return !this._elements.some(x => !x.isDropSupported());
    }

    allowMoveOutChildren(event){
        return !this._elements.some(x => !x.parent().allowMoveOutChildren(undefined, event));
    }
}
DraggingElement.prototype.t = Types.DraggingElement;

PropertyMetadata.registerForType(DraggingElement, {});

export default DraggingElement;
