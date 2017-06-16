let debug = require("DebugUtil")("carb:canvasArrangeStrategy");
import {HorizontalConstraint, VerticalConstraint} from "carbon-basics";
import Point from "math/point";
import { IContainer } from "carbon-model";

export default  {
    arrange: function(container: IContainer, event, changeMode){
        let npr = event.newRect;
        let pr = event.oldRect;

        debug("old: [%s, %s] new: [%s, %s]", pr.width, pr.height, npr.width, npr.height);

        let items = container.children;
        if (items.length === 0){
            return null;
        }

        let v = null;

        for (let i = 0, l = items.length; i < l; ++i) {
            let child = items[i];
            let constraints = child.constraints();

            let scaleX = false;
            let scaleY = false;
            let translateX = false;
            let translateY = false;
            let translateX2 = false;
            let translateY2 = false;

            if (constraints.h === HorizontalConstraint.LeftRight) { // stretch element horizontally
                scaleX = true;
            }
            else if (constraints.h === HorizontalConstraint.Right) {
                translateX = true;
            }
            else if (constraints.h === HorizontalConstraint.Center) {
                translateX = true;
                translateX2 = true;
            }
            else if (constraints.h === HorizontalConstraint.Scale){
                scaleX = true;
            }

            if (constraints.v === VerticalConstraint.TopBottom) { // stretch element vertically
                scaleY = true;
            }
            else if (constraints.v === VerticalConstraint.Bottom) {
                translateY = true;
            }
            else if (constraints.v === VerticalConstraint.Center) {
                translateY = true;
                translateY2 = true;
            }
            else if (constraints.v === VerticalConstraint.Scale) {
                scaleY = true;
            }

            if (scaleX || scaleY) {
                v = v || new Point(0, 0);
                let dw = scaleX ? npr.width - pr.width : 0;
                let dh = scaleY ? npr.height - pr.height : 0;
                let bb = child.getBoundingBox();
                let ox = bb.x;
                let oy = bb.y;
                let sx = 1 + dw/(bb.width || 1);
                let sy = 1 + dh/(bb.height || 1);
                if (constraints.h === HorizontalConstraint.Scale){
                    ox = 0;
                    sx = npr.width/(pr.width || 1);
                }
                if (constraints.v === VerticalConstraint.Scale){
                    oy = 0;
                    sy = npr.height/(pr.height || 1);
                }

                if (sx !== 1 || sy !== 1){
                    v.set(sx, sy);
                    child.applyScaling(v, new Point(ox, oy), event.options, changeMode);
                }
            }
            if (translateX || translateY){
                v = v || new Point(0, 0);
                let dx = translateX2 ? .5 : translateX ? 1 : 0;
                let dy = translateY2 ? .5 : translateY ? 1 : 0;

                v.set((npr.width - pr.width) * dx, (npr.height - pr.height) * dy);

                if (v.x || v.y){
                    let reset = event.reset;
                    let alreadyReset = scaleX || scaleY;
                    if (alreadyReset){
                        reset = false;
                    }
                    child.applyTranslation(v, reset, changeMode);
                }
            }
        }
    }
}
