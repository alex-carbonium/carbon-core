import {DockStyle, HorizontalAlignment, VerticalAlignment} from "../Defs";
import * as margins from "../../math/boxMargins";

export default {
    arrange: function(container, e, changeMode){
        var autoWidth = container.autoWidth();
        var autoHeight = container.autoHeight();
        if (e){
            //means manual resize
            autoWidth &= e.newValue.width === e.oldValue.width;
            autoHeight &= e.newValue.height === e.oldValue.height;
        }
        var size = getTotalSize(container, autoWidth, autoHeight);
        if (container.autoExpandWidth()){
            size.width = Math.max(container.width, size.width);
        }
        else if (!autoWidth){
            size.width = container.width;
        }
        if (container.autoExpandHeight()){
            size.height = Math.max(container.height, size.height);
        }
        else if (!autoHeight){
            size.height = container.height;
        }

        var padding = container.padding();
        var posLeft = padding.left;
        var posTop = padding.top;
        var posRight = size.width - padding.right;
        var posBottom = size.height - padding.bottom;
        var fillers = [];

        var items = container.children;
        for (let i = 0, l = items.length; i < l; ++i) {
            let child = items[i];
            if (!child.visible){
                continue;
            }

            let outerBox = child.getBoundingBox(true);
            let rect = child.boundaryRect();
            let props = {};

            switch (child.dockStyle()){
                case DockStyle.Left:
                    props.x = posLeft + margins.left(outerBox, rect);
                    posLeft += outerBox.width;
                    alignChildVertically(posTop, posBottom, child, props, outerBox, rect);
                    break;
                case DockStyle.Top:
                    props.y = posTop + margins.top(outerBox, rect);
                    posTop += outerBox.height;
                    alignChildHorizontally(posLeft, posRight, child, props, outerBox, rect);
                    break;
                case DockStyle.Right:
                    posRight -= outerBox.width;
                    props.x = posRight + margins.left(outerBox, rect);
                    alignChildVertically(posTop, posBottom, child, props, outerBox, rect);
                    break;
                case DockStyle.Bottom:
                    posBottom -= outerBox.height;
                    props.y = posBottom + margins.top(outerBox, rect);
                    alignChildHorizontally(posLeft, posRight, child, props, outerBox, rect);
                    break;
                case DockStyle.Fill:
                    fillers.push(child);
                    break;
            }

            child.prepareProps(props);
            child.setProps(props, changeMode);
        }

        var fillerWidth = (posRight - posLeft) / fillers.length |0;
        var fillerHeight = (posBottom - posTop) / fillers.length |0;

        for (var i = 0; i < fillers.length; i++){
            var child = fillers[i];
            let outerBox = child.getBoundingBox(true);
            let rect = child.boundaryRect();
            let props = {};

            props.x = posLeft + rect.x - outerBox.x;
            props.y = posTop + rect.y - outerBox.y;
            props.width = fillerWidth + rect.width - outerBox.width;
            props.height = fillerHeight + rect.height - outerBox.height;

            child.prepareProps(props);
            child.setProps(props, changeMode);
            //child.arrange({oldValue:rect, newValue:props});
        }

        if (autoWidth || autoHeight){
            var rect = container.boundaryRect();
            rect.height = size.height;
            rect.width = size.width;
            return rect;
        }
        return null;
    }
}

function alignChildHorizontally(posLeft, posRight, child, props, outerBox, rect){
    switch (child.horizontalAlignment()){
        case HorizontalAlignment.Left:
            props.x = posLeft + margins.left(outerBox, rect);
            break;
        case HorizontalAlignment.Right:
            props.x = posRight - outerBox.width + margins.left(outerBox, rect);
            break;
        case HorizontalAlignment.Center:
            props.x = (posRight - posLeft) / 2 - outerBox.width / 2;
            break;
        case HorizontalAlignment.Stretch:
            props.x = posLeft + margins.left(outerBox, rect);
            props.width = posRight - posLeft - margins.left(outerBox, rect) - margins.right(outerBox, rect);
            break;
    }
}

function alignChildVertically(posTop, posBottom, child, props, outerBox, rect){
    switch (child.verticalAlignment()){
        case VerticalAlignment.Top:
            props.y = posTop + margins.top(outerBox, rect);
            break;
        case VerticalAlignment.Bottom:
            props.y = posBottom - outerBox.height + margins.top(outerBox, rect);
            break;
        case VerticalAlignment.Middle:
            props.y = (posBottom - posTop) / 2 - outerBox.height / 2;
            break;
        case VerticalAlignment.Stretch:
            props.y = posTop + margins.top(outerBox, rect);
            props.height = posBottom - posTop - margins.top(outerBox, rect) - margins.bottom(outerBox, rect);
            break;
    }
}

function getTotalSize(container, autoWidth, autoHeight){
    if (!autoWidth && !autoHeight){
        return {width: container.width, height: container.height};
    }
    var padding = container.padding();
    var size = {width: padding.top + padding.bottom, height: padding.left + padding.right};

    var items = container.children;
    for (let i = 0, l = items.length; i < l; ++i) {
        let child = items[i];
        if (!child.visible){
            continue;
        }
        var dockStyle = child.dockStyle();
        if (dockStyle === DockStyle.Fill || dockStyle === DockStyle.None){
            continue;
        }
        var box = child.getBoundingBox(true);
        size.width += box.width;
        size.height += box.height;
    }

    return size;
}