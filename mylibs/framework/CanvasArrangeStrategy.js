var debug = require("DebugUtil")("carb:canvasArrangeStrategy");

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

        var items = container.children;
        for (let i = 0, l = items.length; i < l; ++i) {
            let child = items[i];
            var r = child.getBoundaryRect();
            var anchor = child.anchor();
            var newWidth = r.width, newHeight = r.height, newX = r.x, newY = r.y;
            var needUpdate = false;
            if (anchor.left && anchor.right){ // stretch element horizontally
                newWidth = r.width + npr.width - pr.width;
                needUpdate = true;
            } else if (anchor.right){
                newX = r.x + npr.width - pr.width;
                needUpdate = true;
            } else if (!(anchor.left || anchor.right)){
                var scale = npr.width / pr.width;
                var center = r.x + r.width / 2;
                center *= scale;
                newX = (center - r.width / 2);
                needUpdate = true;
            }

            if (anchor.top && anchor.bottom){ // stretch element vertically
                newHeight = r.height + npr.height - pr.height;
                needUpdate = true;
            } else if (anchor.bottom){
                newY = r.y + npr.height - pr.height;
                needUpdate = true;
            } else if (!(anchor.top || anchor.bottom)){
                scale = npr.height / pr.height;
                center = r.y + r.height / 2;
                center *= scale;
                newY = (center - r.height / 2);
                needUpdate = true;
            }

            if (needUpdate){
                var newProps = {
                    x: newX,
                    y: newY,
                    width: newWidth,
                    height: newHeight
                };

                if (r.width != newWidth || r.height != newHeight || r.x != newX || r.y != newY){
                    child.setProps(newProps, changeMode);
                }
            }

            if (autoWidth || autoHeight){
                var outerBox = child.getBoundingBox(true);
                if (autoWidth){
                    xMax = Math.max(xMax, outerBox.x + outerBox.width);
                    xMin = Math.min(xMin, outerBox.x);
                }
                if (autoHeight){
                    yMax = Math.max(yMax, outerBox.y + outerBox.height);
                    yMin = Math.min(yMin, outerBox.y);
                }
            }
        }

        if ((autoWidth || autoHeight) && container.children.length){
            var padding = container.padding();
            xMin -= padding.left;
            yMin -= padding.top;
            xMax += padding.right;
            yMax += padding.bottom;
            var shiftChildren = false;

            var rect = container.getBoundaryRect();
            if (container.autoExpandWidth()){
                rect.width = Math.max(rect.width, xMax);
            }
            else if (autoWidth){
                rect.width = xMax - xMin;
                rect.x += xMin;
                shiftChildren = true;
            }
            if (container.autoExpandHeight()){
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

            debug("Auto-resizing %s to x=%d y=%d w=%d h=%d", container.displayName(), rect.x, rect.y, rect.width, rect.height);

            return rect;
        }

        return null;
    }
}