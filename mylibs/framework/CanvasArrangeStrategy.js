var debug = require("DebugUtil")("carb:canvasArrangeStrategy");
import {HorizontalConstraint, VerticalConstraint} from "./Defs"
import Point from "../math/point";

export default {
    arrange: function(container, event, changeMode){
        var npr = event.newRect;
        var pr = event.oldRect;

        debug("old: [%s, %s] new: [%s, %s]", pr.width, pr.height, npr.width, npr.height);

        var items = container.children;
        if (items.length === 0){
            return null;
        }

        var v = null;

        for (let i = 0, l = items.length; i < l; ++i) {
            let child = items[i];
            var constraints = child.constraints();

            var scaleX = false;
            var scaleY = false;
            var translateX = false;
            var translateY = false;
            var translateX2 = false;
            var translateY2 = false;

            if (constraints.h == HorizontalConstraint.LeftRight) { // stretch element horizontally
                scaleX = true;
            } else if (constraints.h == HorizontalConstraint.Right) {
                translateX = true;
            } else if (constraints.h == HorizontalConstraint.Center) {
                translateX = true;
                translateX2 = true;
            }

            if (constraints.v == VerticalConstraint.TopBottom) { // stretch element vertically
                scaleY = true;
            } else if (constraints.v == VerticalConstraint.Bottom) {
                translateY = true;
            } else if (constraints.v == VerticalConstraint.Center) {
                translateY = true;
                translateY2 = true;
            }

            if (scaleX || scaleY) {
                v = v || new Point(0, 0);
                var dw = scaleX ? npr.width - pr.width : 0;
                var dh = scaleY ? npr.height - pr.height : 0;
                var bb = child.getBoundingBox();
                var origin = bb.topLeft();

                //for constraint = scale, use same scale and set origin to Point.Zero
                v.set(1 + dw/bb.width, 1 + dh/bb.height);
                child.applyScaling(v, origin, false, event.withReset);
            }
            if (translateX || translateY){
                v = v || new Point(0, 0);
                var dx = translateX2 ? .5 : translateX ? 1 : 0;
                var dy = translateY2 ? .5 : translateX ? 1 : 0;

                v.set((npr.width - pr.width) * dx, (npr.height - pr.height) * dy);

                var reset = event.withReset;
                var alreadyReset = scaleX || scaleY;
                if (alreadyReset){
                    reset = false;
                }
                child.applyTranslation(v, reset);
            }
        }
    }
}