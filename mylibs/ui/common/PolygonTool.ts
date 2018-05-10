import ElementDropTool from "./ElementDropTool";
import { Types } from "../../framework/Defs";
import Polygon from "../../framework/Polygon";
import GlobalMatrixModifier from "../../framework/GlobalMatrixModifier";
import Point from "../../math/point";
import Matrix from "../../math/matrix";
import UserSettings from "../../UserSettings";
import { ChangeMode, RenderEnvironment } from "carbon-core";

export default class PolygonTool extends ElementDropTool {
    updateElement(element: Polygon, startPoint: Point, endPoint: Point) {
        let w = Math.max(1, Math.abs(endPoint.x - startPoint.x));
        let h = Math.max(1, Math.abs(endPoint.y - startPoint.y));
        let fx = endPoint.x < startPoint.x ? 1 : 0;
        let fy = endPoint.y < startPoint.y ? 1 : 0;

        let newRaidus = Math.round(Math.min(w, h) / 2);
        element.saveOrResetLayoutProps(ChangeMode.Self);
        element.prepareAndSetProps({ radius: newRaidus, br: element.calculateBoundaryRect(newRaidus, element.pointsCount()) });

        let bb = element.getBoundingBox();
        let t = new Point(startPoint.x - bb.x - bb.width * fx, startPoint.y - bb.y - bb.height * fy);
        element.applyTranslation(t);
        element.applyScaling(new Point(w / bb.width, h / bb.height), startPoint);
    }

    layerdraw(context, environment: RenderEnvironment) {
        super.layerdraw(context, environment);
        if (this.canDraw()) {
            context.save();
            let scale = environment.scale;
            context.scale(1 / scale, 1 / scale);

            context.beginPath();
            GlobalMatrixModifier.pushPrependScale(environment.scaleMatrix);
            this.element.drawBoundaryPath(context);
            GlobalMatrixModifier.pop();

            context.strokeStyle = UserSettings.frame.stroke;
            context.stroke();

            context.restore();
        }
    }
}