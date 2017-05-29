import {HorizontalAlignment, VerticalAlignment} from "./Defs";

export default {
    arrange: function(container, event, changeMode){
        var l = container.x(),
            t = container.y(),
            w = container.width(),
            h = container.height();
        var padding = container.padding();

        container.children.each(function(i, child){
            if (!child.visible()){
                return; // continue
            }

            var r = child.boundaryRect();
            var x, y, width, height;
            var leftSpace = padding.left + child.margin().left;
            var topSpace = padding.top + child.margin().top;
            var rightSpace = padding.right + child.margin().right;
            var bottomSpace = padding.bottom + child.margin().bottom;

            switch (child.horizontalAlignment()){
                case HorizontalAlignment.Left:
                    x = leftSpace;
                    break;
                case HorizontalAlignment.Center:
                    x = ~~(w / 2 - child.width() / 2);
                    break;
                case HorizontalAlignment.Right:
                    x = w - child.width() - rightSpace;
                    break;
                case HorizontalAlignment.Stretch:
                    x = leftSpace;
                    width = w - leftSpace - rightSpace;
                    break;
            }

            switch (child.verticalAlignment()){
                case VerticalAlignment.Top:
                    y = topSpace;
                    break;
                case VerticalAlignment.Middle:
                    y = ~~(h / 2 - child.height() / 2);
                    break;
                case VerticalAlignment.Bottom:
                    y = h - child.height() - bottomSpace;
                    break;
                case VerticalAlignment.Stretch:
                    y = topSpace;
                    height = h - topSpace - bottomSpace;
                    break;
            }

            if (width === undefined){
                width = child.width();
            }
            if (height === undefined){
                height = child.height();
            }

            if(r.width !== width || r.height !== height || r.x !== x || r.y !== y) {
                var newRect = {x: x, y: y, width: width, height: height};
                child.setProps(newRect, changeMode);
            }

            // TODO: move inside if, when all templates are fixed, so it won't be needed to do initial arrange
            //child.arrange({oldValue:r, newValue:newRect||{x: x, y: y, width: width, height: height}});
        });
    }
}