import UIElement from "./UIElement";
import PropertyMetadata from "./PropertyMetadata";
import Invalidate from "./Invalidate";
import Brush from "./Brush";
import {Types} from "./Defs";
import Rect from "../math/rect";
import Point from "../math/point";

class SelectFrame extends UIElement {
    constructor(onselect) {
        super();

        this.props.br = Rect.create();
        this.startPoint = new Point(0, 0);

        this.onselect = onselect;
    }

    init(event){
        this.startPoint.set(event.x, event.y);
    }

    update(event){
        var rect = this.props.br;
        rect.updateFromPointsMutable(this.startPoint, event);
        rect.roundMutable();
        return rect;
    }
    complete(event){
        event.handled = true;
        var rect = this.props.br;
        if (!rect.width && !rect.height) {
            return;
        }
        this.onselect(rect);
    }

    drawSelf(context){
        var r = this.props.br;

        context.save();
        context.rect(r.x, r.y, r.width, r.height);
        Brush.fill(this.fill(), context);
        context.restore();
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

PropertyMetadata.registerForType(SelectFrame, {
    fill: {
        defaultValue: Brush.createFromColor('rgba(150,180, 250, 0.3)')
    }
});

export default SelectFrame;