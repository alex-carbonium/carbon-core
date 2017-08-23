import ArrangeStrategy from "./ArrangeStrategy";
import { ArrangeStrategies } from "../Defs";
import Rect from "math/rect";
import Point from "math/point";
import Matrix from "math/matrix";
import { IGroupContainer } from "carbon-core";

var GroupArrangeStrategy = {
    arrange: function (container: any, event?, changeMode?) {
        var items = container.children;
        if (items.length === 0) {
            return;
        }

        if (items.length === 1 && container.wrapSingleChild()) {
            var props = items[0].selectLayoutProps(true);
            props.m = container.parent().globalMatrixToLocal(props.m);
            container.setProps(props, changeMode);
            items[0].resetTransform(changeMode);
            return;
        }

        var angle = Math.round(items[0].getRotation());
        var sameAngle = !!angle;
        if (sameAngle) {
            for (var i = 1; i < items.length; i++) {
                if (Math.round(items[i].getRotation()) !== angle) {
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

        if (container.translateChildren()) {
            container.prepareAndSetProps({ br: container.boundaryRect().withSize(xMax - xMin, yMax - yMin) }, changeMode);

            if (xMin !== 0 || yMin !== 0) {
                var translate = new Point(-xMin, -yMin);
                for (let i = 0, l = items.length; i < l; ++i) {
                    let item = items[i];
                    if (event && item === event.exclude) {
                        continue;
                    }
                    item.applyTranslation(translate, false, changeMode);
                }
                container.applyDirectedTranslation(translate.negate(), changeMode);
            }
        }
        else {
            var w = xMax - xMin;
            var h = yMax - yMin;
            var br = null;

            br = new Rect(xMin, yMin, w, h);

            container.prepareAndSetProps({ br }, changeMode);
        }
    }
};

ArrangeStrategy.register(ArrangeStrategies.Group, GroupArrangeStrategy);

export default GroupArrangeStrategy;