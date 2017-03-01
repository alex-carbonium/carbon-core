import ElementDragCreator from "./ElementDragCreator";
import {ViewTool, Types} from "../../framework/Defs";
import Polygon from "../../framework/Polygon";
import GlobalMatrixModifier from "../../framework/GlobalMatrixModifier";
import Point from "../../math/point";
import Matrix from "../../math/matrix";
import UserSettings from "../../UserSettings";

export default class PolygonTool extends ElementDragCreator{
    updateElement(element: Polygon, startPoint: Point, endPoint: Point){
        var w = Math.abs(endPoint.x - startPoint.x);
        var h = Math.abs(endPoint.y - startPoint.y);
        var fx = endPoint.x < startPoint.x ? 1 : 0;
        var fy = endPoint.y < startPoint.y ? 1 : 0;

        var newRaidus = Math.round(Math.min(w, h)/2);
        element.saveOrResetLayoutProps();
        element.prepareAndSetProps({radius: newRaidus});

        var bb = element.getBoundingBox();
        var t = new Point(startPoint.x - bb.x - bb.width*fx,
            startPoint.y - bb.y - bb.height*fy);
        element.applyTranslation(t);
    }

    layerdraw(context, environment): boolean{
        var res = super.layerdraw(context, environment);
        if (res){
            context.save();
            var scale = environment.view.scale();
            context.scale(1/scale, 1/scale);

            context.beginPath();
            GlobalMatrixModifier.pushPrependScale();
            this.element.drawBoundaryPath(context);
            GlobalMatrixModifier.pop();

            context.strokeStyle = UserSettings.frame.stroke;
            context.stroke();

            context.restore();
        }

        return res;
    }
}