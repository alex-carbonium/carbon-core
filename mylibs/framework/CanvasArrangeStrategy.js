export default {
    arrange: function(container, event, changeMode){
        var npr = event.newValue;
        var pr = event.oldValue;

        var items = container.children;
        if (items.length === 0){
            return null;
        }

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
}