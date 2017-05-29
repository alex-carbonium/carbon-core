import {StackAlign, StackOrientation, HorizontalAlignment, VerticalAlignment} from "./Defs";

function getTotalChildrenWidth(container){
    var res = 0;
    for (var i = 0; i < container.children.length; i++){
        var child = container.children[i];
        if (!child.visible()){
            continue;
        }

        res += child.margin().left + child.width() + child.margin().right;
    }

    return res;
}

function getTotalChildrenHeight(container){
    var res = 0;
    for (var i = 0; i < container.children.length; i++){
        var child = container.children[i];
        if (!child.visible()){
            continue;
        }

        res += child.margin().top + child.height() + child.margin().bottom;
    }

    return res;
}

export default {
    arrange: function(container, e, changeMode){
        if (container.props.stackOrientation === StackOrientation.Horizontal){
            return this.arrangeHorizontal(container, e, changeMode);
        }
        return this.arrangeVertical(container, e, changeMode);
    },
    arrangeHorizontal: function(container, e, changeMode){
        var x = container.x(), y = container.y(), w = container.width(), h = container.height();
        var pos = container.padding().left;
        var topPadding = container.padding().top;
        var bottomPadding = container.padding().bottom;
        var newWidth, newHeight;

        if (container.autoHeight()){
            var highestChild;

            for (var i = 0; i < container.children.length; i++){
                var child = container.children[i];
                if (!child.visible()){
                    continue;
                }
                if (!highestChild || child.height() > highestChild.height()){
                    highestChild = child;
                }
            }

            if (highestChild){
                h = highestChild.height() + topPadding + bottomPadding
                    + highestChild.margin().top + highestChild.margin().bottom;
                newHeight = h;
            }
        }

        if(container.props.stackAlign === StackAlign.Center && !container.autoWidth()){
            var childrenWidth = getTotalChildrenWidth(container);
            var containerSpace = container.width() - container.padding().right - container.padding().left;
            pos += (containerSpace - childrenWidth) / 2;
        }

        for (var i = 0; i < container.children.length; i++){
            var child = container.children[i];
            if (!child.visible()){
                continue;
            }
            var topSpace = topPadding + child.margin().top;
            var bottomSpace = bottomPadding + child.margin().bottom;

            pos += child.margin().left;
            child.x(pos);

            var r = child.boundaryRect();
            var x = r.x,
                y = r.y,
                width = r.width,
                height = r.height;

            switch (child.verticalAlignment()){
                case VerticalAlignment.Stretch:
                    y = topSpace;
                    height = h - topSpace - bottomSpace;
                    break;
                case VerticalAlignment.Top:
                    y = topSpace;
                    break;
                case VerticalAlignment.Middle:
                    y = ~~(h / 2 - child.height() / 2);
                    break;
                case VerticalAlignment.Bottom:
                    y = h - bottomSpace - child.height();
                    break;
            }

            if(r.width !== width || r.height !== height || r.x !== x || r.y !== y) {
                var newRect = {x: x, y: y, width: width, height: height};
                child.prepareAndSetProps(newRect, changeMode);
            }

            pos += child.width() + child.margin().right;
        }

        pos += container.padding().right;

        if (container.autoWidth()){
            newWidth = pos;
        }

        if (newWidth !== undefined || newHeight !== undefined){
            return {x: x, y: y, width: newWidth !== undefined ? newWidth : w, height: newHeight !== undefined ? newHeight : h};
        }
        return null;
    },
    arrangeVertical: function(container, e, changeMode){
        var x = container.x(), y = container.y(), w = container.width(), h = container.height();
        var pos = container.padding().top;
        var leftPadding = container.padding().left;
        var rightPadding = container.padding().right;
        var newWidth, newHeight;

        if (container.autoWidth()){
            var widestChild;

            for (var i = 0; i < container.children.length; i++){
                var child = container.children[i];
                if (!child.visible()){
                    continue;
                }
                if (!widestChild || child.width() > widestChild.width()){
                    widestChild = child;
                }
            }

            if (widestChild){
                w = widestChild.width() + leftPadding + rightPadding
                    + widestChild.margin().left + widestChild.margin().right;
                newWidth = w;
            }
        }

        if(container.props.stackAlign === StackAlign.Center && !container.autoHeight()){
            var childrenHeight = getTotalChildrenHeight(container);
            var containerSpace = container.height() - container.padding().top - container.padding().bottom;
            pos += (containerSpace - childrenHeight) / 2;
        }

        for (var i = 0; i < container.children.length; i++){
            var child = container.children[i];
            if (!child.visible()){
                continue;
            }
            var leftSpace = leftPadding + child.margin().left;
            var rightSpace = rightPadding + child.margin().right;

            pos += child.margin().top;
            child.y(pos);

            var r = child.boundaryRect();
            var x = r.x,
                y = r.y,
                width = r.width,
                height = r.height;

            switch (child.horizontalAlignment()){
                case HorizontalAlignment.Stretch:
                    x = leftSpace;
                    width = w - leftSpace - rightSpace;
                    break;
                case HorizontalAlignment.Left:
                    x = leftSpace;
                    break;
                case HorizontalAlignment.Center:
                    x = ~~(w / 2 - child.width() / 2);
                    break;
                case HorizontalAlignment.Right:
                    x = w - rightSpace - child.width();
                    break;
            }

            if(r.width != width || r.height != height || r.x != x || r.y != y) {
                var newRect = {x: x, y: y, width: width, height: height};
                child.prepareAndSetProps(newRect, changeMode);
            }

            // TODO: move inside if, when all templates are fixed, so it won't be needed to do initial arrange
            child.arrange({oldValue:r, newValue:newRect||{x: x, y: y, width: width, height: height}});

            pos += child.height() + child.margin().bottom;
        }

        pos += container.padding().bottom;

        if (container.autoHeight()){
            if (container.autoGrowMode() == 'up'){
                var delta = pos - container.height();
                container.y(container.y() - delta);
            }

            newHeight = pos;
        }

        if (newWidth !== undefined || newHeight !== undefined){
            return {x: container.x(), y:container.y(), width: newWidth !== undefined ? newWidth : w, height: newHeight !== undefined ? newHeight : h};
        }
        return null;
    }
}