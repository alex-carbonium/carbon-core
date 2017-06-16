import {
    StackAlign,
    HorizontalAlignment,
    VerticalAlignment
} from "framework/Defs";

function getTotalChildrenWidth(container) {
    let res = 0;
    for (let i = 0; i < container.children.length; i++) {
        let child = container.children[i];
        if (!child.visible()) {
            continue;
        }

        res += child.margin().left + child.width() + child.margin().right;
    }

    return res;
}

function getTotalChildrenHeight(container) {
    let res = 0;
    for (let i = 0; i < container.children.length; i++) {
        let child = container.children[i];
        if (!child.visible()) {
            continue;
        }

        res += child.margin().top + child.height() + child.margin().bottom;
    }

    return res;
}

export let HorizontalArrangeStrategy = {
    arrange: function (container: any, event?, changeMode?) {
        let x = container.x();
        let y = container.y()
        let w = container.width();
        let h = container.height();
        let pos = container.padding().left;
        let topPadding = container.padding().top;
        let bottomPadding = container.padding().bottom;
        let newWidth, newHeight;

        if (container.autoHeight()) {
            let highestChild;

            for (let child of container.children) {
                if (!child.visible()) {
                    continue;
                }
                if (!highestChild || child.height() > highestChild.height()) {
                    highestChild = child;
                }
            }

            if (highestChild) {
                h = highestChild.height() + topPadding + bottomPadding
                    + highestChild.margin().top + highestChild.margin().bottom;
                newHeight = h;
            }
        }

        if (container.props.stackAlign === StackAlign.Center && !container.autoWidth()) {
            let childrenWidth = getTotalChildrenWidth(container);
            let containerSpace = container.width() - container.padding().right - container.padding().left;
            pos += (containerSpace - childrenWidth) / 2;
        }

        for (let child of container.children) {
            if (!child.visible()) {
                continue;
            }

            let topSpace = topPadding + child.margin().top;
            let bottomSpace = bottomPadding + child.margin().bottom;

            pos += child.margin().left;

            let r = child.getBoundingBox();
            let x = pos,
                y = r.y,
                width = r.width,
                height = r.height;

            switch (child.verticalAlignment()) {
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

            if (r.width !== width || r.height !== height || r.x !== x || r.y !== y) {
                child.resetTransform();
                child.applyTranslation({ x, y }, changeMode);
                child.prepareAndSetProps({ br: child.props.br.withSize(width, height) }, changeMode);
                child.arrange({ oldRect: r, newRect: { x: x, y: y, width: width, height: height } });
            }

            pos += child.width() + child.margin().right;
        }

        pos += container.padding().right;

        if (container.autoWidth()) {
            container.setProps({br:container.props.br.withWidth(pos)});
        }
    }
}

export let VerticalArrangeStrategy = {
    arrange: function (container, e, changeMode) {
        let x = container.x(), y = container.y(), w = container.width(), h = container.height();
        let pos = container.padding().top;
        let leftPadding = container.padding().left;
        let rightPadding = container.padding().right;
        let newWidth, newHeight;

        if (container.autoWidth()) {
            let widestChild;

            for (let child of container.children) {
                if (!child.visible()) {
                    continue;
                }
                if (!widestChild || child.width() > widestChild.width()) {
                    widestChild = child;
                }
            }

            if (widestChild) {
                w = widestChild.width() + leftPadding + rightPadding
                    + widestChild.margin().left + widestChild.margin().right;
                newWidth = w;
            }
        }

        if (container.props.stackAlign === StackAlign.Center && !container.autoHeight()) {
            let childrenHeight = getTotalChildrenHeight(container);
            let containerSpace = container.height() - container.padding().top - container.padding().bottom;
            pos += (containerSpace - childrenHeight) / 2;
        }

        for (let child of container.children) {
            if (!child.visible()) {
                continue;
            }
            let leftSpace = leftPadding + child.margin().left;
            let rightSpace = rightPadding + child.margin().right;

            pos += child.margin().top;

            let r = child.getBoundingBox();
            let x = r.x,
                y = pos,
                width = r.width,
                height = r.height;

            switch (child.horizontalAlignment()) {
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

            let newRect = null;
            if (r.width !== width || r.height !== height || r.x !== x || r.y !== y) {
                child.resetTransform();
                child.applyTranslation({ x, y }, changeMode);
                child.prepareAndSetProps({ br: child.props.br.withSize(width, height) }, changeMode);
                child.arrange({ oldRect: r, newRect: { x: x, y: y, width: width, height: height } });
            }

            pos += child.height() + child.margin().bottom;
        }

        pos += container.padding().bottom;

        if (container.autoHeight()) {
            if (container.autoGrowMode() === 'up') {
                let delta = pos - container.height();
                let y = container.y() - delta;
                let x = container.x();
                container.applyTranslation({ x, y });
            }

            container.setProps({br:container.props.br.withHeight(pos)});
        }
    }
}
