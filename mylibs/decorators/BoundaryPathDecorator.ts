import UIElementDecorator from "../framework/UIElementDecorator";
import SharedColors from "../ui/SharedColors";
import Environment from "../environment";
import { IContext, IRect, IMatrix, IUIElement } from "carbon-core";
import GlobalMatrixModifier from "../framework/GlobalMatrixModifier";

export const enum HighlightKind {
    Normal = 1,
    Thick = 2
}

export default class BoundaryPathDecorator extends UIElementDecorator {
    constructor(private boundaryPath = false, private kind = HighlightKind.Normal) {
        super();
    }

    afterInvoke(method, args) {
        if(method === 'draw') {
            BoundaryPathDecorator.draw(args[0], this.element, this.boundaryPath, this.kind);
        }
    }

    static draw(context, element, boundaryPath = false, highlightKind = HighlightKind.Thick, strokeStyle: string = SharedColors.Highlight) {
        let scale = Environment.view.scale();
        context.save();

        context.beginPath();
        if (element.hasPath() && !boundaryPath) {
            element.applyViewMatrix(context);
            let br = element.boundaryRect();
            element.drawPath(context, br.width, br.height);
            context.lineWidth = highlightKind / scale;
        }
        else {
            GlobalMatrixModifier.pushPrependScale();
            try {
                context.scale(1 / scale, 1 / scale);
                BoundaryPathDecorator.drawBoundaryPath(context, element);
                context.lineWidth = highlightKind;
            }
            finally {
                GlobalMatrixModifier.pop();
            }
        }

        context.strokeStyle = strokeStyle;
        context.stroke();
        context.restore();
    }

    static drawBoundaryPath(context, element: IUIElement, round = true) {
        BoundaryPathDecorator.drawRectAsPath(context, element.boundaryRect(), element.globalViewMatrix(), round);
    }

    static drawRectAsPath(context, rect: IRect, matrix: IMatrix, round = true) {
        let p = matrix.transformPoint2(rect.x, rect.y);
        if (round) {
            p.x = Math.round(p.x) - .5;
            p.y = Math.round(p.y) - .5;
        }
        context.moveTo(p.x, p.y);

        p = matrix.transformPoint2(rect.x + rect.width, rect.y);
        if (round) {
            p.x = Math.round(p.x) + .5;
            p.y = Math.round(p.y) - .5;
        }
        context.lineTo(p.x, p.y);

        p = matrix.transformPoint2(rect.x + rect.width, rect.y + rect.height);
        if (round) {
            p.x = Math.round(p.x) + .5;
            p.y = Math.round(p.y) + .5;
        }
        context.lineTo(p.x, p.y);

        p = matrix.transformPoint2(rect.x, rect.y + rect.height);
        if (round) {
            p.x = Math.round(p.x) - .5;
            p.y = Math.round(p.y) + .5;
        }
        context.lineTo(p.x, p.y);

        context.closePath();
    }
}