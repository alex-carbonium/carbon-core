var debug = require("DebugUtil")("carb:canvasArrangeStrategy");
import {ChangeMode} from "framework/Defs"

export default {
    arrange: function(container, event, changeMode){
        var autoHeight = container.autoHeight();
        var autoWidth = container.autoWidth();
        var npr = event.newValue;
        var pr = event.oldValue;
        var xMax = Number.NEGATIVE_INFINITY;
        var yMax = Number.NEGATIVE_INFINITY;
        var xMin = Number.POSITIVE_INFINITY;
        var yMin = Number.POSITIVE_INFINITY;

        var widthChanged = event.newValue.width !== event.oldValue.width;
        var heightChanged = event.newValue.height !== event.oldValue.height;

        var items = container.children;
        if(items.length === 0){
            return null;
        }

        if(!container.props.scaleChildren && !autoHeight && !autoWidth) {
            for (let i = 0, l = items.length; i < l; ++i) {
                let child = items[i];
                var r = child.getBoundaryRect();
                var anchor = child.anchor();
                var newWidth = r.width, newHeight = r.height, newX = r.x, newY = r.y;
                var needUpdate = false;
                if (anchor.left && anchor.right) { // stretch element horizontally
                    newWidth = r.width + npr.width - pr.width;
                    needUpdate = true;
                } else if (anchor.right) {
                    newX = r.x + npr.width - pr.width;
                    needUpdate = true;
                } else if (!(anchor.left || anchor.right)) {
                    var scale = npr.width / pr.width;
                    var center = r.x + r.width / 2;
                    center *= scale;
                    newX = (center - r.width / 2);
                    needUpdate = true;
                }

                if (anchor.top && anchor.bottom) { // stretch element vertically
                    newHeight = r.height + npr.height - pr.height;
                    needUpdate = true;
                } else if (anchor.bottom) {
                    newY = r.y + npr.height - pr.height;
                    needUpdate = true;
                } else if (!(anchor.top || anchor.bottom)) {
                    scale = npr.height / pr.height;
                    center = r.y + r.height / 2;
                    center *= scale;
                    newY = (center - r.height / 2);
                    needUpdate = true;
                }

                if (needUpdate) {
                    var newProps = {
                        x: newX,
                        y: newY,
                        width: newWidth,
                        height: newHeight
                    };

                    if (r.width != newWidth || r.height != newHeight || r.x != newX || r.y != newY) {
                        child.setProps(newProps, changeMode);
                    }
                }
            }
        }
        else if((widthChanged || heightChanged) && container.props.scaleChildren)
        {
            if (container.children && !container._lockAutoresize) {
                var sw = 1;
                var sh = 1;
                if (event.newValue.width !== undefined) {
                    sw = (container._originalWidth ||event.oldValue.width) / event.newValue.width;
                }

                if (event.newValue.height !== undefined) {
                    sh = (container._originalHeight || event.oldValue.height) / event.newValue.height;
                }
                if(sw === 0 || sh === 0){
                    return null;
                }
                if(sw === 1 && sh === 1){
                    return null;
                }
                var rects = container._rects;
                container.children.forEach((e, i) => {
                    if(rects) {
                        var erect = rects[i];
                    } else {
                        erect = e.getBoundaryRect();
                    }

                    var x = e._roundValue(erect.x / sw);
                    var y = e._roundValue(erect.y / sh);

                    var width = e._roundValue(erect.width / sw);
                    var height = e._roundValue(erect.height / sh);
                    var props = {x, y, width, height};

                    e.prepareAndSetProps(props, ChangeMode.Root);
                    e.performArrange && e.performArrange(erect, ChangeMode.Root);
                });
            }
        }
        else if ((autoWidth || autoHeight) && container.children.length){

            for (let i = 0, l = items.length; i < l; ++i) {
                let child = items[i];

                var outerBox = child.getBoundingBox(true);
                if (autoWidth) {
                    xMax = Math.max(xMax, outerBox.x + outerBox.width);
                    xMin = Math.min(xMin, outerBox.x);
                }
                if (autoHeight) {
                    yMax = Math.max(yMax, outerBox.y + outerBox.height);
                    yMin = Math.min(yMin, outerBox.y);
                }
            }

            var padding = container.padding();
            xMin -= padding.left;
            yMin -= padding.top;
            xMax += padding.right;
            yMax += padding.bottom;
            var shiftChildren = false;

            var rect = container.getBoundaryRect();
            if (container.autoExpandWidth()){
                container.lockAutoresize();
                rect.width = Math.max(rect.width, xMax);
            }
            else if (autoWidth){
                rect.width = xMax - xMin;
                rect.x += xMin;
                shiftChildren = true;
            }
            if (container.autoExpandHeight()){
                container.lockAutoresize();
                rect.height = Math.max(rect.height, yMax);
            }
            else if (autoHeight){
                rect.height = yMax - yMin;
                rect.y += yMin;
                shiftChildren = true;
            }

            if (shiftChildren){
                for (let i = 0, l = items.length; i < l; ++i) {
                    let e = items[i];
                    let itemProps = {
                        x: e.x() - xMin,
                        y: e.y() - yMin
                    };
                    e.prepareAndSetProps(itemProps, changeMode);
                }
            }

            container.prepareProps(rect);
            container.unlockAutoresize();
            debug("Auto-resizing %s to x=%d y=%d w=%d h=%d", container.displayName(), rect.x, rect.y, rect.width, rect.height);

            return rect;
        }

        return null;
    }
}