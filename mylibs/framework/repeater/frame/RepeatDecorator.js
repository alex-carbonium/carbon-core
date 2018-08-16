import { PointDirection, FrameCursors } from "../../Defs";
import UIElementDecorator from "../../UIElementDecorator";

var LineWidth = 2;

export default class RepeatDecorator extends UIElementDecorator {
    afterInvoke(method, args) {
        if (method === 'draw') {
            this.draw(args[0], args[1], args[2], args[3]);
        }
    }

    draw(context, w, h, env) {
        w += LineWidth * 2;
        h += LineWidth * 2;

        context.save();
        this.element.viewMatrix().applyToContext(context);

        context.lineWidth = LineWidth;
        context.strokeStyle = 'lightgreen';
        context.strokeRect(-LineWidth + .5, -LineWidth + .5, w, h);

        context.restore();
    }
}


