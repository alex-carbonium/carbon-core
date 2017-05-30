import ElementDragCreator from "./ElementDragCreator";
import {ViewTool, Types} from "../../framework/Defs";
import Polygon from "../../framework/Polygon";
import GlobalMatrixModifier from "../../framework/GlobalMatrixModifier";
import Point from "../../math/point";
import Matrix from "../../math/matrix";
import UserSettings from "../../UserSettings";

export default class PolygonTool extends ElementDragCreator{
    updateElement(element: Polygon, startPoint: Point, endPoint: Point){
        let w = Math.max(1, Math.abs(endPoint.x - startPoint.x));
        let h = Math.max(1,Math.abs(endPoint.y - startPoint.y));
        let fx = endPoint.x < startPoint.x ? 1 : 0;
        let fy = endPoint.y < startPoint.y ? 1 : 0;

        let newRaidus = Math.round(Math.min(w, h)/2);
        element.saveOrResetLayoutProps();
        element.prepareAndSetProps({radius: newRaidus});

        let bb = element.getBoundingBox();
        let t = new Point(startPoint.x - bb.x - bb.width*fx, startPoint.y - bb.y - bb.height*fy);
        element.applyTranslation(t);
        element.applyScaling(new Point(w/bb.width, h/bb.height), startPoint);
    }

    layerdraw(context, environment){
        super.layerdraw(context, environment);
        if (this.canDraw()){
            context.save();
            let scale = environment.view.scale();
            context.scale(1/scale, 1/scale);

            context.beginPath();
            GlobalMatrixModifier.pushPrependScale();
            this.element.drawBoundaryPath(context);
            GlobalMatrixModifier.pop();

            context.strokeStyle = UserSettings.frame.stroke;
            context.stroke();

            context.restore();
        }
    }
}