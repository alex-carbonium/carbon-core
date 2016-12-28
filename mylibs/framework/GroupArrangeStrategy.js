import ArrangeStrategy from "./ArrangeStrategy";
import {ArrangeStrategies} from "./Defs";
import Matrix from "../math/matrix";
import Point from "../math/point";

var GroupArrangeStrategy = {
    arrange: function(container){
        var items = container.children;
        if (items.length === 0){
            return;
        }
        if (items.length === 1){
            var props = items[0].selectLayoutProps(true);
            props.m = container.parent().globalViewMatrixInverted().appended(props.m);
            container.setProps(props);
            items[0].resetTransform();
            return;
        }

        var xMax = Number.NEGATIVE_INFINITY;
        var yMax = Number.NEGATIVE_INFINITY;
        var xMin = Number.POSITIVE_INFINITY;
        var yMin = Number.POSITIVE_INFINITY;

        for (let i = 0, l = items.length; i < l; ++i) {
            let child = items[i];

            var outerBox = child.getBoundingBox(true);
            xMax = Math.max(xMax, outerBox.x + outerBox.width);
            xMin = Math.min(xMin, outerBox.x);
            yMax = Math.max(yMax, outerBox.y + outerBox.height);
            yMin = Math.min(yMin, outerBox.y);
        }

        var padding = container.padding();
        xMin -= padding.left;
        yMin -= padding.top;
        xMax += padding.right;
        yMax += padding.bottom;

        container.prepareAndSetProps({width: xMax - xMin, height: yMax - yMin});

        if (xMin !== 0 || yMin !== 0){
            var translate = new Point(-xMin, -yMin);
            for (let i = 0, l = items.length; i < l; ++i) {
                items[i].applyTranslation(translate);
            }
            container.applyDirectedTranslation(translate.negate());
        }
    }
};

ArrangeStrategy.register(ArrangeStrategies.Group, GroupArrangeStrategy);

export default GroupArrangeStrategy;