import UIElement from "framework/UIElement";

export default class RectMask extends UIElement {
    constructor() {
        super();
    }

    drawPath(context) {
        context.save();

        var r = this.br();
        context.rect(r.x, r.y, r.width, r.height);

        context.restore();
    }
}