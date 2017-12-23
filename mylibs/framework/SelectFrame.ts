import UIElement from "./UIElement";
import PropertyMetadata from "./PropertyMetadata";
import Invalidate from "./Invalidate";
import Brush from "./Brush";
import {Types} from "./Defs";
import Rect from "../math/rect";
import Point from "../math/point";
import EventHelper from "./EventHelper";
import UserSettings from "../UserSettings";
import { KeyboardState, IMouseEventData, IRect } from "carbon-core";

export class SelectFrame extends UIElement {
    private startPoint = new Point(0, 0);

    onComplete = EventHelper.createEvent2<IRect, KeyboardState>();

    constructor() {
        super();

        this.props.br = Rect.create();
    }

    init(event){
        this.props.br.reset();
        this.startPoint.set(event.x, event.y);
    }

    allowCaching() {
        return false;
    }

    update(event){
        this.props.br.updateFromPointsMutable(this.startPoint, event);
        this.props.br.roundMutable();
        Invalidate.requestInteractionOnly();
        return this.props.br;
    }

    complete(event: IMouseEventData){
        event.handled = true;
        var rect = this.props.br;
        if (!rect.width && !rect.height) {
            return;
        }
        this.onComplete.raise(rect, event);
    }

    drawSelf(context){
        var r = this.props.br;

        context.save();
        context.beginPath();
        context.rect(r.x, r.y, r.width, r.height);
        Brush.fill(this.fill, context);
        context.restore();
    }

    hitTest() {
        return false;
    }

    getSnapPoints() {
        return {xs: [], ys: []};
    }

    canMultiSelect() {
        return false;
    }
}
SelectFrame.prototype.t = Types.SelectFrame;

PropertyMetadata.registerForType(SelectFrame, {
    fill: {
        defaultValue: Brush.createFromCssColor(UserSettings.selection.frameColor)
    }
});