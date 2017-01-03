import Rectangle from "framework/Rectangle";
import PropertyMetadata from "framework/PropertyMetadata";
import Invalidate from "framework/Invalidate";
import {Types} from "./Defs";
import Rect from "../math/rect";

var fwk = sketch.framework;

class SelectFrame extends Rectangle {
    constructor(onselect) {
        super();

        this._startX = 0;
        this._startY = 0;

        this.stroke(fwk.Brush.Empty);
        this.fill(fwk.Brush.createFromColor('rgba(150,180, 250, 0.3)'));

        this.onselect = onselect;
    }

    init(event){
        this._startX = event.x;
        this._startY = event.y;
    }

    update(event){
        var br = new Rect(
            0, 0,
            Math.abs(this._startX - event.x), Math.abs(this._startY - event.y)
        );
        var t = {x: Math.min(this._startX, event.x), y: Math.min(this._startY, event.y)};
        this.applyTranslation(t, true);
        this.prepareAndSetProps({br});
        return this.getBoundingBox();
    }
    complete(event){
        event.handled = true;
        var rect = this.getBoundingBox();
        if (!rect.width && !rect.height) {
            return;
        }
        this.onselect.raise(rect);
    }

    hitTest() {
        return false;
    }

    getSnapPoints() {
        return {xs: [], ys: [], center: {}};
    }

    canMultiSelect() {
        return false;
    }
}
SelectFrame.prototype.t = Types.SelectFrame;

PropertyMetadata.registerForType(SelectFrame, {});

export default SelectFrame;