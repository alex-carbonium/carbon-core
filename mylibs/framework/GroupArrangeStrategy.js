import ArrangeStrategy from "./ArrangeStrategy";
import {ArrangeStrategies} from "./Defs";
import Rect from "../math/rect";
import Point from "../math/point";

//this solves rounding problems
const translateChildren = true;

var GroupArrangeStrategy = {
    arrange: function(container){
        var items = container.children;
        if (items.length === 0){
            return;
        }

        if (items.length === 1 && container.wrapSingleChild()){
            var props = items[0].selectLayoutProps(true);
            props.m = container.parent().globalViewMatrixInverted().appended(props.m);
            container.setProps(props);
            items[0].resetTransform();
            return;
        }

        var angle = Math.round(items[0].getRotation());
        var sameAngle = !!angle;
        if (sameAngle){
            for (var i = 1; i < items.length; i++){
                if (Math.round(items[i].getRotation()) !== angle){
                    sameAngle = false;
                    break;
                }
            }
        }

        var xMax = Number.NEGATIVE_INFINITY;
        var yMax = Number.NEGATIVE_INFINITY;
        var xMin = Number.POSITIVE_INFINITY;
        var yMin = Number.POSITIVE_INFINITY;

        for (let i = 0, l = items.length; i < l; ++i) {
            let child = items[i];
            let outerBox = child.getBoundingBox(true);

            xMax = Math.max(xMax, outerBox.x + outerBox.width);
            xMin = Math.min(xMin, outerBox.x);
            yMax = Math.max(yMax, outerBox.y + outerBox.height);
            yMin = Math.min(yMin, outerBox.y);
        }

        if (translateChildren){
            container.br(container.br().withSize(xMax - xMin, yMax - yMin));

            if (xMin !== 0 || yMin !== 0){
                var translate = new Point(-xMin, -yMin);
                for (let i = 0, l = items.length; i < l; ++i) {
                    items[i].applyTranslation(translate);
                }
                container.applyDirectedTranslation(translate.negate());
            }
        }
        else{
            var w = xMax - xMin;
            var h = yMax - yMin;
            var br = null;

            // if (sameAngle){
            //     var center = new Point(xMin + w/2, yMin + h/2);
            //     xMax = Number.NEGATIVE_INFINITY;
            //     yMax = Number.NEGATIVE_INFINITY;
            //     xMin = Number.POSITIVE_INFINITY;
            //     yMin = Number.POSITIVE_INFINITY;
            //
            //     for (let i = 0, l = items.length; i < l; ++i) {
            //         let child = items[i];
            //         child.applyRotation(-angle, center);
            //
            //         let outerBox = child.getBoundingBox(true);
            //         xMax = Math.max(xMax, outerBox.x + outerBox.width);
            //         xMin = Math.min(xMin, outerBox.x);
            //         yMax = Math.max(yMax, outerBox.y + outerBox.height);
            //         yMin = Math.min(yMin, outerBox.y);
            //     }
            //
            //     br = new Rect(xMin, yMin, xMax - xMin, yMax - yMin);
            //
            //     container.applyRotation(angle, center);
            // }
            // else{
                br = new Rect(xMin, yMin, w, h);
            //}

            container.prepareAndSetProps({br});
        }
    }
};

ArrangeStrategy.register(ArrangeStrategies.Group, GroupArrangeStrategy);

export default GroupArrangeStrategy;