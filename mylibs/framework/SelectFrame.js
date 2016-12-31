import Rectangle from "framework/Rectangle";
import PropertyMetadata from "framework/PropertyMetadata";
import Invalidate from "framework/Invalidate";
import {Types} from "./Defs";

var fwk = sketch.framework;

class SelectFrame extends Rectangle {
    constructor(onselect) {
        super();

        var startX, startY;
        var that = this;

        this.stroke(fwk.Brush.Empty);
        this.fill(fwk.Brush.createFromColor('rgba(150,180, 250, 0.3)'));

        this.onselect = onselect;

        this.init = function (event) {
            startX = event.x;
            startY = event.y;
            this.resize({x: event.x, y: event.y, width: 0, height: 0});
            event.handled = true;
        };
        this.update = function (event) {
            var rect = {
                x: Math.min(startX, event.x), y: Math.min(startY, event.y),
                width: Math.abs(startX - event.x), height: Math.abs(startY - event.y)
            };
            this.resize(rect);
            event.handled = true;
            Invalidate.requestUpperOnly();

            return rect;
        };
        this.complete = function (event) {
            event.handled = true;
            var rect = this.getBoundaryRect();
            if (!rect.width && !rect.height) {
                return;
            }
            this.onselect.raise(rect);
        };
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