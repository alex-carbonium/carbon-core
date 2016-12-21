import PropertyMetadata from "../PropertyMetadata";
import {Types} from "../Defs";
import SnapController from "../SnapController";
import UserSettings from "../../UserSettings";
import Artboard from "../Artboard";
import {areRectsIntersecting} from "../../math/math";
import Point from "../../math/point";
import InteractiveElement from "./InteractiveElement";

var debug = require("DebugUtil")("carb:draggingElement");

function applyOrthogonalMove(pos) {
    if (Math.abs(this._startPosition.x - pos.x) > Math.abs(this._startPosition.y - pos.y)) {
        pos.y = this._startPosition.y;
    } else {
        pos.x = this._startPosition.x;
    }

    return pos;
}

class DraggingElement extends InteractiveElement {
    constructor(event, activeArtboard) {
        super(event.elements);

        this._initialPosition = this.getTranslation();

        SnapController.calculateSnappingPoints(activeArtboard);

        var holdPcnt = Math.round((event.x - this.x()) * 100 / this.width());
        this._ownSnapPoints = SnapController.prepareOwnSnapPoints(this, holdPcnt);

        this._startPosition = this.position();
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

            var index = parent.positionOf(element) + 1 || parent.count();
            var target = event.altKey ? element.clone() : element;
            this.dropElementOn(event, parent, target, phantom, index);

            elements.push(target);
        }

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

        this.applyTranslation(position.subtract(this._initialPosition), true);
    }

    // drawSelf(context, w, h, environment){
    //     context.save();
    //     context.scale(1/scale, 1/scale);
    //     context.strokeStyle = UserSettings.frame.stroke;
    //     context.strokeRect(
    //         Math.round(this._element.x()/scale),
    //         Math.round(this._element.y()/scale),
    //         this._element.width() * scale + .5|0,
    //         this._element.height() * scale + .5|0
    //     );
    //     context.restore();
    // }

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
